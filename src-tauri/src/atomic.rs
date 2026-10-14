use crate::paths::{AppError, resolve_inside};
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

/// Максимальный размер одного файла проекта в байтах (10 МБ).
const MAX_FILE_SIZE: usize = 10 * 1024 * 1024;

/// Проверяет, что целевой файл существует и доступен только для чтения.
///
/// На Unix смотрит на отсутствие бита записи владельца (`0o200`).
/// На Windows проверяет атрибут `FILE_ATTRIBUTE_READONLY`.
/// Если файла нет, возвращает `false` — его можно создавать.
fn is_read_only(path: &Path) -> Result<bool, AppError> {
    let meta =
        fs::metadata(path).map_err(|e| AppError::io(format!("cannot read metadata: {e}")))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        Ok(meta.permissions().mode() & 0o200 == 0)
    }

    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_READONLY: u32 = 0x0000_0001;
        Ok(meta.file_attributes() & FILE_ATTRIBUTE_READONLY != 0)
    }

    #[cfg(not(any(unix, windows)))]
    {
        Ok(meta.permissions().readonly())
    }
}

/// Возвращает путь, по которому реально нужно писать данные.
///
/// Если `candidate` — symlink внутри проекта, следуем по нему и пишем в реальный
/// файл, а сам symlink оставляем на месте (Q12). Если symlink ведёт наружу,
/// `resolve_inside` уже отклонил бы путь на этапе канонизации.
/// Для обычных файлов возвращает сам `candidate`.
fn resolve_symlink(root: &Path, candidate: &Path) -> Result<PathBuf, AppError> {
    let meta = match fs::symlink_metadata(candidate) {
        Ok(m) => m,
        Err(_) => return Ok(candidate.to_path_buf()),
    };

    if !meta.file_type().is_symlink() {
        return Ok(candidate.to_path_buf());
    }

    let real = fs::canonicalize(candidate)
        .map_err(|e| AppError::io(format!("cannot follow symlink: {e}")))?;

    let canonical_root = root
        .canonicalize()
        .map_err(|e| AppError::io(format!("failed to canonicalize project root: {e}")))?;

    if !real.starts_with(&canonical_root) {
        return Err(AppError::new(
            "PATH_OUTSIDE_PROJECT",
            "symlink resolves outside the project root",
        ));
    }

    Ok(real)
}

/// Удаляет устаревший временный файл, если он есть.
///
/// Важно удалять именно по `symlink_metadata`: `.tmp` может оказаться
/// битым symlink, и тогда `exists` вернул бы `false`, а `create_new`
/// упал бы с ошибкой «уже существует».
fn remove_stale_temp(temp_path: &Path) -> Result<(), AppError> {
    if temp_path.symlink_metadata().is_ok() {
        fs::remove_file(temp_path)
            .map_err(|e| AppError::io(format!("cannot remove stale temp: {e}")))?;
    }
    Ok(())
}

/// Копирует права доступа существующего целевого файла на временный.
///
/// Нужно, чтобы замена происходила с сохранением прав (например, `600`).
/// Если целевого файла нет, ничего не делает.
fn copy_permissions(target: &Path, temp: &Path) -> Result<(), AppError> {
    if !target.exists() {
        return Ok(());
    }

    let perms = fs::metadata(target)
        .map_err(|e| AppError::io(format!("cannot read target permissions: {e}")))?
        .permissions();

    fs::set_permissions(temp, perms)
        .map_err(|e| AppError::io(format!("cannot copy permissions to temp: {e}")))?;

    Ok(())
}

/// Атомарно записывает `bytes` в файл `rel` внутри папки проекта `root`.
///
/// Алгоритм (ADR 0011):
/// 1. `resolve_inside` проверяет, что путь не выходит за пределы проекта.
/// 2. Проверка размера: больше 10 МБ → `FILE_TOO_LARGE`.
/// 3. Если цель — symlink внутрь, пишем в реальный файл (ссылка остаётся).
/// 4. Если цель существует и read-only → `READ_ONLY`, файл не трогается.
/// 5. Временный файл `.<имя>.tmp` создаётся в той же папке через `create_new`.
/// 6. Пишем байты, копируем права с цели, делаем `sync_all`.
/// 7. `rename` заменяет цель; при ошибке временный файл удаляется.
/// 8. `fsync` папки на Unix, чтобы метаданные гарантированно попали на диск.
///
/// # Ошибки
/// - `INVALID_PATH` — путь пустой, содержит `..`, абсолютный и т.п.
/// - `PATH_OUTSIDE_PROJECT` — путь разрешается за пределами `root`.
/// - `FILE_TOO_LARGE` — размер данных больше 10 МБ.
/// - `READ_ONLY` — существующий файл доступен только для чтения.
/// - `IO_ERROR` — любая другая ошибка ввода-вывода.
pub fn write_inside(root: &Path, rel: &str, bytes: &[u8]) -> Result<(), AppError> {
    if bytes.len() > MAX_FILE_SIZE {
        return Err(AppError::new(
            "FILE_TOO_LARGE",
            format!("file exceeds the {} byte limit", MAX_FILE_SIZE),
        ));
    }

    let candidate = resolve_inside(root, rel)?;
    let target = resolve_symlink(root, &candidate)?;

    if target.is_dir() {
        return Err(AppError::io("target path is a directory"));
    }

    if target.exists() && is_read_only(&target)? {
        return Err(AppError::new("READ_ONLY", "target file is read-only"));
    }

    let parent = target
        .parent()
        .ok_or_else(|| AppError::io("target path has no parent directory"))?;

    let file_name = target
        .file_name()
        .ok_or_else(|| AppError::io("target path has no file name"))?;
    let temp_name = format!(".{}.tmp", file_name.to_string_lossy());
    let temp_path = parent.join(&temp_name);

    remove_stale_temp(&temp_path)?;

    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp_path)
        .map_err(|e| AppError::io(format!("cannot create temp file: {e}")))?;

    let result = write_atomic(&mut file, &temp_path, &target, bytes);

    if result.is_err() {
        // Лучше удалить незавершённый temp, чем оставить его пользователю.
        let _ = fs::remove_file(&temp_path);
    }

    result
}

/// Пишет байты, синхронизирует и переименовывает temp в цель.
fn write_atomic(
    file: &mut File,
    temp_path: &Path,
    target: &Path,
    bytes: &[u8],
) -> Result<(), AppError> {
    file.write_all(bytes)
        .map_err(|e| AppError::io(format!("cannot write temp file: {e}")))?;

    copy_permissions(target, temp_path)?;

    file.sync_all()
        .map_err(|e| AppError::io(format!("cannot sync temp file: {e}")))?;

    fs::rename(temp_path, target)
        .map_err(|e| AppError::io(format!("cannot rename temp to target: {e}")))?;

    #[cfg(unix)]
    {
        if let Some(parent) = target.parent() {
            let _ = sync_dir(parent);
        }
    }

    Ok(())
}

/// Синхронизирует каталог на диске (Unix only).
///
/// Открываем папку как файл и вызываем `sync_all`: на Unix это приводит
/// к `fsync` файлового дескриптора каталога, гарантируя запись метаданных.
#[cfg(unix)]
fn sync_dir(path: &Path) -> io::Result<()> {
    File::open(path)?.sync_all()
}

/// Удаляет устаревшие временные файлы, оставшиеся после сбоев.
///
/// Удаляет:
/// - `root/.` + что-угодно + `.tmp`
/// - `root/descriptions/.` + что-угодно + `.tmp`
///
/// Ошибки удаления игнорируются (best effort). Скрытые файлы вроде
/// `.DS_Store` не трогаются, потому что не заканчиваются на `.tmp`.
pub fn remove_stale_temps(root: &Path) {
    fn clean_dir(dir: &Path) {
        let Ok(entries) = fs::read_dir(dir) else {
            return;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_lossy = name.to_string_lossy();
            if name_lossy.starts_with('.') && name_lossy.ends_with(".tmp") {
                let _ = fs::remove_file(entry.path());
            }
        }
    }

    clean_dir(root);
    clean_dir(&root.join("descriptions"));
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Создаёт временную папку и использует её как корень проекта.
    fn make_root() -> PathBuf {
        tempfile::tempdir().unwrap().keep()
    }

    #[test]
    fn creates_new_file() {
        let root = make_root();
        write_inside(&root, "a.txt", b"hello").unwrap();
        assert_eq!(fs::read_to_string(root.join("a.txt")).unwrap(), "hello");
    }

    #[test]
    fn overwrites_existing_file() {
        let root = make_root();
        fs::write(root.join("a.txt"), "old").unwrap();
        write_inside(&root, "a.txt", b"new").unwrap();
        assert_eq!(fs::read_to_string(root.join("a.txt")).unwrap(), "new");
    }

    #[test]
    fn no_temp_left_after_success() {
        let root = make_root();
        write_inside(&root, "a.txt", b"x").unwrap();
        assert!(!root.join(".a.txt.tmp").exists());
    }

    #[test]
    fn rejects_parent_component() {
        let root = make_root();
        let err = write_inside(&root, "../x", b"x").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    #[test]
    fn rejects_oversized_content() {
        let root = make_root();
        let big = vec![b'x'; MAX_FILE_SIZE + 1];
        let err = write_inside(&root, "a.txt", &big).unwrap_err();
        assert_eq!(err.code, "FILE_TOO_LARGE");
    }

    #[test]
    #[cfg(unix)]
    fn rejects_read_only_target_and_leaves_it_unchanged() {
        use std::os::unix::fs::PermissionsExt;

        let root = make_root();
        let target = root.join("a.txt");
        fs::write(&target, "old").unwrap();

        let mut perms = fs::metadata(&target).unwrap().permissions();
        perms.set_mode(0o444);
        fs::set_permissions(&target, perms).unwrap();

        let err = write_inside(&root, "a.txt", b"new").unwrap_err();
        assert_eq!(err.code, "READ_ONLY");
        assert_eq!(fs::read_to_string(&target).unwrap(), "old");
    }

    #[test]
    fn removes_stale_temp_before_writing() {
        let root = make_root();
        let stale = root.join(".a.txt.tmp");
        fs::write(&stale, "garbage").unwrap();

        write_inside(&root, "a.txt", b"real").unwrap();

        assert!(!stale.exists());
        assert_eq!(fs::read_to_string(root.join("a.txt")).unwrap(), "real");
    }

    #[test]
    fn target_is_directory_returns_io_error_and_no_temp() {
        let root = make_root();
        fs::create_dir(root.join("a.txt")).unwrap();

        let err = write_inside(&root, "a.txt", b"x").unwrap_err();
        assert_eq!(err.code, "IO_ERROR");
        assert!(!root.join(".a.txt.tmp").exists());
    }

    #[test]
    #[cfg(unix)]
    fn preserves_unix_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let root = make_root();
        let target = root.join("a.txt");
        fs::write(&target, "x").unwrap();

        let mut perms = fs::metadata(&target).unwrap().permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&target, perms).unwrap();

        write_inside(&root, "a.txt", b"y").unwrap();

        let mode = fs::metadata(&target).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, 0o600);
    }

    #[test]
    #[cfg(unix)]
    fn temp_symlink_outside_keeps_external_file_intact() {
        let root = make_root();
        let outside = tempfile::tempdir().unwrap().keep();
        let external = outside.join("secret.txt");
        fs::write(&external, "secret").unwrap();

        let stale = root.join(".a.txt.tmp");
        std::os::unix::fs::symlink(&external, &stale).unwrap();

        write_inside(&root, "a.txt", b"app data").unwrap();

        assert!(!stale.exists());
        assert_eq!(fs::read_to_string(&external).unwrap(), "secret");
        assert_eq!(fs::read_to_string(root.join("a.txt")).unwrap(), "app data");
    }

    #[test]
    #[cfg(unix)]
    fn symlink_inside_target_updates_real_file_and_keeps_link() {
        let root = make_root();
        fs::create_dir(root.join("descriptions")).unwrap();

        let real = root.join("descriptions/real.md");
        fs::write(&real, "old").unwrap();

        let link = root.join("descriptions/link.md");
        std::os::unix::fs::symlink(&real, &link).unwrap();

        write_inside(&root, "descriptions/link.md", b"new").unwrap();

        assert!(link.symlink_metadata().unwrap().file_type().is_symlink());
        assert_eq!(fs::read_to_string(&real).unwrap(), "new");
        assert_eq!(fs::read_to_string(&link).unwrap(), "new");
    }

    #[test]
    fn remove_stale_temps_cleans_reserved_files() {
        let root = make_root();
        fs::create_dir(root.join("descriptions")).unwrap();

        fs::write(root.join(".roadmap.json.tmp"), "x").unwrap();
        fs::write(root.join("descriptions/.n_a.md.tmp"), "x").unwrap();

        // Не должны трогаться.
        fs::write(root.join(".DS_Store"), "x").unwrap();
        fs::write(root.join("notes.tmp"), "x").unwrap();
        fs::write(root.join("descriptions/n_a.md"), "x").unwrap();

        remove_stale_temps(&root);

        assert!(!root.join(".roadmap.json.tmp").exists());
        assert!(!root.join("descriptions/.n_a.md.tmp").exists());
        assert!(root.join(".DS_Store").exists());
        assert!(root.join("notes.tmp").exists());
        assert!(root.join("descriptions/n_a.md").exists());
    }

    #[test]
    fn remove_stale_temps_ignores_missing_descriptions() {
        let root = make_root();
        fs::write(root.join(".roadmap.json.tmp"), "x").unwrap();
        remove_stale_temps(&root);
        assert!(!root.join(".roadmap.json.tmp").exists());
    }
}
