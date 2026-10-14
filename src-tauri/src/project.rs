use crate::atomic::{remove_stale_temps, write_inside};
use crate::paths::AppError;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

/// Максимальный размер `roadmap.json` в байтах (10 МБ).
const MAX_ROADMAP_SIZE: u64 = 10 * 1024 * 1024;

/// Вид выбранной папки: с проектом или пустая.
#[derive(Debug, Clone)]
pub enum PendingView {
    /// В папке найден `roadmap.json`.
    Roadmap,
    /// Папка пустая (или содержит только скрытые файлы).
    Empty,
}

/// Кандидат на открытие, выбранный в диалоге, но ещё не подтверждённый UI.
#[derive(Debug, Clone)]
pub struct PendingProject {
    pub dir: PathBuf,
    pub view: PendingView,
}

/// Состояние открытого проекта в бэкенде.
///
/// `pending` — папка, выбранная в диалоге `open_project`, но пока не принятая
/// через `commit_project`. `root` — папка уже подтверждённого проекта.
/// Оба поля защищены `Mutex`, потому что команды Tauri могут приходить
/// из разных потоков.
pub struct ProjectState {
    pending: Option<PendingProject>,
    root: Option<PathBuf>,
}

impl ProjectState {
    /// Создаёт пустое состояние: нет ни кандидата, ни открытого проекта.
    pub fn new() -> Self {
        Self {
            pending: None,
            root: None,
        }
    }

    /// Запоминает кандидат на открытие с указанным видом.
    /// Новый кандидат заменяет старый; уже открытый `root` не затрагивается.
    pub fn set_pending(&mut self, dir: PathBuf, view: PendingView) {
        self.pending = Some(PendingProject { dir, view });
    }

    /// Подтверждает кандидат как текущий открытый проект.
    ///
    /// # Ошибки
    /// - `NO_PENDING_PROJECT` — кандидат не выбран.
    /// - `PENDING_NOT_PROJECT` — выбрана пустая папка, а не проект.
    pub fn commit(&mut self) -> Result<(), AppError> {
        let pending = self
            .pending
            .take()
            .ok_or_else(|| AppError::new("NO_PENDING_PROJECT", "no project is pending"))?;
        match pending.view {
            PendingView::Roadmap => {
                self.root = Some(pending.dir.clone());
                // Лучше убрать мусор от предыдущих сбоев сразу, чем оставлять
                // пользователю полузаписанные `.tmp`. Ошибки игнорируем.
                remove_stale_temps(&pending.dir);
                Ok(())
            }
            PendingView::Empty => Err(AppError::new(
                "PENDING_NOT_PROJECT",
                "selected folder is empty, not a project",
            )),
        }
    }

    /// Проверяет, что `path` — это `descriptions/<name>.md`, где `<name>`
    /// состоит только из латиницы, цифр, подчёркивания и дефиса.
    ///
    /// # Ошибки
    /// - `INVALID_PATH` — путь не соответствует шаблону.
    fn validate_description_path(path: &str) -> Result<(), AppError> {
        const PREFIX: &str = "descriptions/";
        const SUFFIX: &str = ".md";

        if !path.starts_with(PREFIX) || !path.ends_with(SUFFIX) {
            return Err(AppError::new(
                "INVALID_PATH",
                "description path must be descriptions/<name>.md",
            ));
        }

        let name = &path[PREFIX.len()..path.len() - SUFFIX.len()];
        if name.is_empty() {
            return Err(AppError::new("INVALID_PATH", "description name is empty"));
        }

        if !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        {
            return Err(AppError::new(
                "INVALID_PATH",
                "description name contains invalid characters",
            ));
        }

        Ok(())
    }

    /// Атомарно сохраняет `content` как `roadmap.json` в открытом проекте.
    ///
    /// # Ошибки
    /// - `NO_PROJECT_OPEN` — проект ещё не подтверждён.
    /// - `INVALID_JSON` — содержимое не является валидным JSON; файл не трогается.
    /// - Ошибки `write_inside` передаются без изменений.
    pub fn save_roadmap(&self, content: &str) -> Result<(), AppError> {
        let root = self
            .root
            .as_deref()
            .ok_or_else(|| AppError::new("NO_PROJECT_OPEN", "no project is currently open"))?;

        // Проверяем синтаксис JSON, но не схему: схема — ответственность домена.
        if serde_json::from_str::<serde_json::Value>(content).is_err() {
            return Err(AppError::new("INVALID_JSON", "content is not valid JSON"));
        }

        write_inside(root, "roadmap.json", content.as_bytes())?;
        remove_stale_temps(root);
        Ok(())
    }

    /// Атомарно записывает `content` в файл описания внутри открытого проекта.
    ///
    /// # Ошибки
    /// - `NO_PROJECT_OPEN` — проект ещё не подтверждён.
    /// - `INVALID_PATH` — путь не `descriptions/<name>.md`.
    /// - Ошибки `write_inside` передаются без изменений.
    pub fn write_description(&self, path: &str, content: &str) -> Result<(), AppError> {
        let root = self
            .root
            .as_deref()
            .ok_or_else(|| AppError::new("NO_PROJECT_OPEN", "no project is currently open"))?;

        Self::validate_description_path(path)?;

        let descriptions_dir = root.join("descriptions");
        if !descriptions_dir.exists() {
            fs::create_dir(&descriptions_dir)
                .map_err(|e| AppError::io(format!("cannot create descriptions directory: {e}")))?;
        }

        write_inside(root, path, content.as_bytes())?;
        remove_stale_temps(root);
        Ok(())
    }

    /// Возвращает папку открытого проекта, если он есть.
    #[allow(dead_code)]
    pub fn root(&self) -> Option<&Path> {
        self.root.as_deref()
    }

    /// Перечитывает `roadmap.json` из открытого проекта.
    ///
    /// # Ошибки
    /// - `NO_PROJECT_OPEN` — проект ещё не подтверждён через `commit_project`.
    /// - Ошибки `read_roadmap` передаются без изменений.
    pub fn reload(&self) -> Result<String, AppError> {
        let root = self
            .root
            .as_deref()
            .ok_or_else(|| AppError::new("NO_PROJECT_OPEN", "no project is currently open"))?;
        read_roadmap(root)
    }
}

impl Default for ProjectState {
    fn default() -> Self {
        Self::new()
    }
}

/// Читает содержимое `roadmap.json` из папки проекта.
///
/// # Ошибки
/// - `NOT_A_DIRECTORY` — переданный путь не является папкой.
/// - `EMPTY_FOLDER` — папка пустая или содержит только скрытые файлы (`.*`).
/// - `NO_ROADMAP_FILE` — видимые файлы есть, но `roadmap.json` отсутствует.
/// - `IO_ERROR` — `roadmap.json` является папкой или другая ошибка ввода-вывода.
/// - `FILE_TOO_LARGE` — размер файла превышает 10 МБ.
/// - `NOT_UTF8` — файл не является валидным UTF-8.
///
/// Скрытые файлы игнорируются при определении «пустоты» папки,
/// потому что системные файлы вроде `.DS_Store` не делают папку проектом.
pub fn read_roadmap(dir: &Path) -> Result<String, AppError> {
    if !dir.is_dir() {
        return Err(AppError::new(
            "NOT_A_DIRECTORY",
            "selected path is not a directory",
        ));
    }

    let mut has_visible_files = false;
    for entry in
        fs::read_dir(dir).map_err(|e| AppError::io(format!("cannot read directory: {e}")))?
    {
        let entry = entry.map_err(|e| AppError::io(format!("cannot read directory entry: {e}")))?;
        let name = entry.file_name();
        if let Some(first) = name.to_string_lossy().chars().next()
            && first != '.'
        {
            has_visible_files = true;
            break;
        }
    }

    if !has_visible_files {
        return Err(AppError::new(
            "EMPTY_FOLDER",
            "folder is empty or contains only hidden files",
        ));
    }

    let roadmap_path = dir.join("roadmap.json");

    if !roadmap_path.exists() {
        return Err(AppError::new(
            "NO_ROADMAP_FILE",
            "folder does not contain roadmap.json",
        ));
    }

    if roadmap_path.is_dir() {
        return Err(AppError::io("roadmap.json is a directory"));
    }

    let metadata = fs::metadata(&roadmap_path)
        .map_err(|e| AppError::io(format!("cannot read roadmap.json metadata: {e}")))?;
    if metadata.len() > MAX_ROADMAP_SIZE {
        return Err(AppError::new(
            "FILE_TOO_LARGE",
            format!("roadmap.json exceeds the {} byte limit", MAX_ROADMAP_SIZE),
        ));
    }

    fs::read_to_string(&roadmap_path).map_err(|e| {
        if e.kind() == ErrorKind::InvalidData {
            AppError::new("NOT_UTF8", "roadmap.json is not valid UTF-8")
        } else {
            AppError::io(format!("cannot read roadmap.json: {e}"))
        }
    })
}

/// Открывает диалог выбора папки, запоминает кандидат и возвращает
/// сырой текст `roadmap.json`.
///
/// Если пользователь нажал «Отмена», возвращает `Ok(None)` — это не ошибка.
/// При успехе возвращает `Ok(Some(content))`; содержимое затем парсится
/// во фронтенде через `parseProject`.
///
/// Папка сначала сохраняется как `PendingView::Empty`; если `read_roadmap`
/// успешна, вид меняется на `Roadmap`. При ошибке `EMPTY_FOLDER` папка
/// остаётся пустым кандидатом для будущего создания проекта (T-007).
#[tauri::command]
pub async fn open_project(
    app: AppHandle,
    state: State<'_, Mutex<ProjectState>>,
) -> Result<Option<String>, AppError> {
    let Some(file_path) = app
        .dialog()
        .file()
        .set_can_create_directories(true)
        .blocking_pick_folder()
    else {
        return Ok(None);
    };

    let dir = file_path
        .into_path()
        .map_err(|e| AppError::io(format!("selected folder is not a valid path: {e}")))?;

    if !dir.is_dir() {
        return Err(AppError::new(
            "NOT_A_DIRECTORY",
            "selected path is not a directory",
        ));
    }

    let dir = dir
        .canonicalize()
        .map_err(|e| AppError::io(format!("failed to canonicalize selected folder: {e}")))?;

    let mut state = state.lock().unwrap();
    state.set_pending(dir.clone(), PendingView::Empty);

    let content = read_roadmap(&dir)?;
    state.set_pending(dir, PendingView::Roadmap);
    Ok(Some(content))
}

/// Подтверждает кандидат, выбранный через `open_project`, как открытый проект.
///
/// # Ошибки
/// - `NO_PENDING_PROJECT` — кандидат не выбран.
/// - `PENDING_NOT_PROJECT` — кандидат является пустой папкой.
#[tauri::command]
pub fn commit_project(state: State<'_, Mutex<ProjectState>>) -> Result<(), AppError> {
    state.lock().unwrap().commit()
}

/// Перезагружает `roadmap.json` уже открытого проекта с диска.
///
/// # Ошибки
/// - `NO_PROJECT_OPEN` — проект ещё не подтверждён.
/// - Ошибки `read_roadmap` передаются без изменений.
#[tauri::command]
pub fn reload_project(state: State<'_, Mutex<ProjectState>>) -> Result<String, AppError> {
    state.lock().unwrap().reload()
}

/// Сохраняет `roadmap.json` в открытом проекте атомарно.
///
/// # Ошибки
/// - `NO_PROJECT_OPEN` — проект ещё не подтверждён.
/// - `INVALID_JSON` — содержимое не является валидным JSON.
/// - Ошибки записи передаются без изменений.
#[tauri::command]
pub fn save_roadmap(
    state: State<'_, Mutex<ProjectState>>,
    content: String,
) -> Result<(), AppError> {
    state.lock().unwrap().save_roadmap(&content)
}

/// Записывает файл описания в открытый проект атомарно.
///
/// # Ошибки
/// - `NO_PROJECT_OPEN` — проект ещё не подтверждён.
/// - `INVALID_PATH` — путь не соответствует шаблону `descriptions/<name>.md`.
/// - Ошибки записи передаются без изменений.
#[tauri::command]
pub fn write_description(
    state: State<'_, Mutex<ProjectState>>,
    path: String,
    content: String,
) -> Result<(), AppError> {
    state.lock().unwrap().write_description(&path, &content)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Создаёт временную папку для тестов.
    fn temp_dir() -> PathBuf {
        tempfile::tempdir().unwrap().keep()
    }

    /// Валидный `roadmap.json` читается как строка.
    #[test]
    fn reads_valid_roadmap() {
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), r#"{"version":1}"#).unwrap();
        let content = read_roadmap(&dir).unwrap();
        assert_eq!(content, r#"{"version":1}"#);
    }

    /// Если путь не существует или не является папкой — ошибка `NOT_A_DIRECTORY`.
    #[test]
    fn rejects_non_directory() {
        let dir = temp_dir();
        let file = dir.join("not_a_dir");
        fs::write(&file, "x").unwrap();
        let err = read_roadmap(&file).unwrap_err();
        assert_eq!(err.code, "NOT_A_DIRECTORY");
    }

    /// Пустая папка даёт ошибку `EMPTY_FOLDER`.
    #[test]
    fn empty_folder_is_empty() {
        let dir = temp_dir();
        let err = read_roadmap(&dir).unwrap_err();
        assert_eq!(err.code, "EMPTY_FOLDER");
    }

    /// Скрытый файл `.DS_Store` не считается содержимым папки.
    #[test]
    fn hidden_files_only_is_empty() {
        let dir = temp_dir();
        fs::write(dir.join(".DS_Store"), "x").unwrap();
        let err = read_roadmap(&dir).unwrap_err();
        assert_eq!(err.code, "EMPTY_FOLDER");
    }

    /// Видимые файлы есть, но `roadmap.json` отсутствует.
    #[test]
    fn no_roadmap_file() {
        let dir = temp_dir();
        fs::write(dir.join("readme.txt"), "x").unwrap();
        let err = read_roadmap(&dir).unwrap_err();
        assert_eq!(err.code, "NO_ROADMAP_FILE");
    }

    /// `roadmap.json` не может быть папкой.
    #[test]
    fn roadmap_is_directory() {
        let dir = temp_dir();
        fs::create_dir(dir.join("roadmap.json")).unwrap();
        let err = read_roadmap(&dir).unwrap_err();
        assert_eq!(err.code, "IO_ERROR");
    }

    /// Файл размером 10 МБ + 1 байт отклоняется.
    #[test]
    fn rejects_oversized_roadmap() {
        let dir = temp_dir();
        let big = vec![b'x'; (MAX_ROADMAP_SIZE + 1) as usize];
        fs::write(dir.join("roadmap.json"), big).unwrap();
        let err = read_roadmap(&dir).unwrap_err();
        assert_eq!(err.code, "FILE_TOO_LARGE");
    }

    /// Невалидный UTF-8 в файле даёт ошибку `NOT_UTF8`.
    #[test]
    fn rejects_non_utf8() {
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), [0x80u8, 0x81, 0x82].as_slice()).unwrap();
        let err = read_roadmap(&dir).unwrap_err();
        assert_eq!(err.code, "NOT_UTF8");
    }

    /// `commit` без кандидата возвращает `NO_PENDING_PROJECT`.
    #[test]
    fn commit_without_pending_fails() {
        let mut state = ProjectState::new();
        let err = state.commit().unwrap_err();
        assert_eq!(err.code, "NO_PENDING_PROJECT");
    }

    /// `commit` с пустым кандидатом возвращает `PENDING_NOT_PROJECT`.
    #[test]
    fn commit_empty_pending_fails() {
        let mut state = ProjectState::new();
        state.set_pending(temp_dir(), PendingView::Empty);
        let err = state.commit().unwrap_err();
        assert_eq!(err.code, "PENDING_NOT_PROJECT");
    }

    /// `commit` с проектом сохраняет папку в `root`.
    #[test]
    fn commit_roadmap_succeeds() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();
        assert_eq!(state.root(), Some(dir.as_path()));
    }

    /// Новый кандидат заменяет старый, а `root` остаётся нетронутым.
    #[test]
    fn new_pending_replaces_old_and_keeps_root() {
        let mut state = ProjectState::new();
        let first = temp_dir();
        state.set_pending(first.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        let second = temp_dir();
        state.set_pending(second, PendingView::Empty);

        // root не изменился
        assert_eq!(state.root(), Some(first.as_path()));
        // commit должен теперь вернуть ошибку пустого кандидата
        let err = state.commit().unwrap_err();
        assert_eq!(err.code, "PENDING_NOT_PROJECT");
    }

    /// `reload` без открытого проекта возвращает `NO_PROJECT_OPEN`.
    #[test]
    fn reload_without_root_fails() {
        let state = ProjectState::new();
        let err = state.reload().unwrap_err();
        assert_eq!(err.code, "NO_PROJECT_OPEN");
    }

    /// `reload` возвращает содержимое `roadmap.json` из открытого проекта.
    #[test]
    fn reload_reads_from_root() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), r#"{"version":1}"#).unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        let content = state.reload().unwrap();
        assert_eq!(content, r#"{"version":1}"#);
    }

    /// `save_roadmap` без открытого проекта возвращает `NO_PROJECT_OPEN`.
    #[test]
    fn save_roadmap_without_root_fails() {
        let state = ProjectState::new();
        let err = state.save_roadmap(r#"{"version":1}"#).unwrap_err();
        assert_eq!(err.code, "NO_PROJECT_OPEN");
    }

    /// Невалидный JSON не трогает файл.
    #[test]
    fn save_roadmap_rejects_invalid_json() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), "old").unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        let err = state.save_roadmap("{").unwrap_err();
        assert_eq!(err.code, "INVALID_JSON");
        assert_eq!(fs::read_to_string(dir.join("roadmap.json")).unwrap(), "old");
    }

    /// Валидный JSON атомарно записывается в `roadmap.json`.
    #[test]
    fn save_roadmap_writes_valid_json() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), "old").unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        state.save_roadmap(r#"{"version":1}"#).unwrap();
        assert_eq!(
            fs::read_to_string(dir.join("roadmap.json")).unwrap(),
            r#"{"version":1}"#
        );
    }

    /// `commit` для проекта убирает устаревшие `.tmp`.
    #[test]
    fn commit_cleans_stale_temps() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::write(dir.join(".roadmap.json.tmp"), "x").unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();
        assert!(!dir.join(".roadmap.json.tmp").exists());
    }

    /// `write_description` без открытого проекта возвращает `NO_PROJECT_OPEN`.
    #[test]
    fn write_description_without_root_fails() {
        let state = ProjectState::new();
        let err = state
            .write_description("descriptions/n_a.md", "# hi")
            .unwrap_err();
        assert_eq!(err.code, "NO_PROJECT_OPEN");
    }

    /// Недопустимые пути описаний отклоняются до записи.
    #[test]
    fn write_description_rejects_invalid_paths() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::create_dir(dir.join("descriptions")).unwrap();
        fs::write(dir.join("roadmap.json"), "{}").unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        let invalid = vec![
            "roadmap.json",
            "descriptions/a.txt",
            "descriptions/sub/a.md",
            "descriptions/../a.md",
            "descriptions/a b.md",
            "descriptions/.md",
        ];

        for path in invalid {
            let err = state.write_description(path, "x").unwrap_err();
            assert_eq!(err.code, "INVALID_PATH", "path: {}", path);
        }
    }

    /// Если папки `descriptions/` нет, она создаётся, и файл записывается.
    #[test]
    fn write_description_creates_descriptions_dir() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), "{}").unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        state
            .write_description("descriptions/n_a.md", "# hello")
            .unwrap();
        assert_eq!(
            fs::read_to_string(dir.join("descriptions/n_a.md")).unwrap(),
            "# hello"
        );
    }

    /// Пустое содержимое тоже записывается.
    #[test]
    fn write_description_writes_empty_content() {
        let mut state = ProjectState::new();
        let dir = temp_dir();
        fs::write(dir.join("roadmap.json"), "{}").unwrap();
        state.set_pending(dir.clone(), PendingView::Roadmap);
        state.commit().unwrap();

        state.write_description("descriptions/n_a.md", "").unwrap();
        assert_eq!(fs::read(dir.join("descriptions/n_a.md")).unwrap(), b"");
    }
}
