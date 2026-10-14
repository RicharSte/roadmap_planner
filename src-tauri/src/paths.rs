use serde::Serialize;
use std::path::{Component, Path, PathBuf};

/// Ошибка приложения в формате `{ code, message }`.
/// Передаётся через IPC в UI; сообщения на английском, чтобы не зависеть
/// от локали системы (русские тексты — задача T-013).
#[derive(Debug, Clone, Serialize)]
pub struct AppError {
    /// Машинный код ошибки (например, `INVALID_PATH`).
    pub code: String,
    /// Человекочитаемое сообщение на английском.
    pub message: String,
}

impl AppError {
    /// Создаёт ошибку с произвольным кодом и сообщением.
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    /// Ошибка ввода-вывода с пояснением.
    pub fn io(message: impl Into<String>) -> Self {
        Self::new("IO_ERROR", message)
    }
}

/// Проверяет, что строка — безопасный относительный путь внутри проекта.
/// Запрещает: пустую строку, абсолютные пути, компоненты `.`/`..`,
/// пустые компоненты (`//`), разделитель Windows `\` и двоеточие (`:`).
#[allow(dead_code)]
fn validate_relative_path(rel: &str) -> Result<(), AppError> {
    if rel.is_empty() {
        return Err(AppError::new("INVALID_PATH", "relative path is empty"));
    }
    if rel.starts_with('/') {
        return Err(AppError::new(
            "INVALID_PATH",
            "absolute paths are not allowed",
        ));
    }
    if rel.ends_with('/') {
        return Err(AppError::new(
            "INVALID_PATH",
            "trailing separator is not allowed",
        ));
    }
    if rel.contains("//") {
        return Err(AppError::new(
            "INVALID_PATH",
            "empty path component is not allowed",
        ));
    }
    if rel.contains('\\') {
        return Err(AppError::new(
            "INVALID_PATH",
            "backslash is not allowed in path",
        ));
    }
    if rel.contains(':') {
        return Err(AppError::new(
            "INVALID_PATH",
            "colon is not allowed in path",
        ));
    }

    for component in Path::new(rel).components() {
        match component {
            Component::Normal(part) => {
                if part.is_empty() {
                    return Err(AppError::new(
                        "INVALID_PATH",
                        "empty path component is not allowed",
                    ));
                }
            }
            _ => {
                return Err(AppError::new(
                    "INVALID_PATH",
                    "only plain path components are allowed",
                ));
            }
        }
    }

    Ok(())
}

/// Разрешает относительный путь `rel` внутри папки `root`.
///
/// Проверяет, что `rel` не пытается выйти за пределы проекта: ближайший
/// существующий предок `root/rel` канонизируется и должен лежать внутри
/// канонизированного `root`. Это ловит symlink, указывающий наружу.
/// Путь `rel` может указывать на ещё не существующий файл (например,
/// `descriptions/<id>.md` при создании) — тогда проверяется его родитель.
///
/// # Ошибки
/// - `INVALID_PATH` — путь пустой, абсолютный, содержит `..`/`.` и т.п.
/// - `PATH_OUTSIDE_PROJECT` — канонизированный предок выходит за `root`.
/// - `IO_ERROR` — не удалось канонизировать существующий путь.
#[allow(dead_code)]
pub fn resolve_inside(root: &Path, rel: &str) -> Result<PathBuf, AppError> {
    validate_relative_path(rel)?;

    let candidate = root.join(rel);
    let mut current: &Path = &candidate;

    // Идём вверх от целевого пути, пока не найдём существующий предок.
    let nearest_existing = loop {
        if current.exists() {
            break current;
        }
        match current.parent() {
            Some(parent) => current = parent,
            None => {
                return Err(AppError::new(
                    "PATH_OUTSIDE_PROJECT",
                    "resolved path has no ancestor inside project root",
                ));
            }
        }
    };

    let canonical_root = root
        .canonicalize()
        .map_err(|e| AppError::io(format!("failed to canonicalize project root: {e}")))?;
    let canonical_nearest = nearest_existing
        .canonicalize()
        .map_err(|e| AppError::io(format!("failed to canonicalize path: {e}")))?;

    if !canonical_nearest.starts_with(&canonical_root) {
        return Err(AppError::new(
            "PATH_OUTSIDE_PROJECT",
            "path resolves outside the project root",
        ));
    }

    Ok(candidate)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Создаёт временную папку, используемую как корень проекта.
    fn make_root() -> PathBuf {
        tempfile::tempdir().unwrap().keep()
    }

    /// `descriptions/a.md` внутри существующего корня разрешается,
    /// даже если сам файл пока не существует.
    #[test]
    fn resolves_existing_root_with_missing_file() {
        let root = make_root();
        let resolved = resolve_inside(&root, "descriptions/a.md").unwrap();
        assert_eq!(resolved, root.join("descriptions/a.md"));
    }

    /// Пустой относительный путь отклоняется.
    #[test]
    fn rejects_empty_path() {
        let root = make_root();
        let err = resolve_inside(&root, "").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// Абсолютный путь отклоняется.
    #[test]
    fn rejects_absolute_path() {
        let root = make_root();
        let err = resolve_inside(&root, "/etc/passwd").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// Выход вверх по дереву через `..` отклоняется.
    #[test]
    fn rejects_parent_component() {
        let root = make_root();
        let err = resolve_inside(&root, "../x").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// `a/../b` тоже содержит запрещённый компонент `..`.
    #[test]
    fn rejects_parent_component_in_middle() {
        let root = make_root();
        let err = resolve_inside(&root, "a/../b").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// Текущая директория `.` отклоняется.
    #[test]
    fn rejects_current_dir_component() {
        let root = make_root();
        let err = resolve_inside(&root, "./a").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// Обратный слэш отклоняется независимо от платформы.
    #[test]
    fn rejects_backslash() {
        let root = make_root();
        let err = resolve_inside(&root, "a\\b").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// Двоеточие (Windows-диск или разделитель) отклоняется.
    #[test]
    fn rejects_colon() {
        let root = make_root();
        let err = resolve_inside(&root, "C:a").unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    /// Symlink на папку снаружи проекта должен быть отклонён.
    #[test]
    #[cfg(unix)]
    fn rejects_symlink_pointing_outside() {
        let root = make_root();
        let outside = tempfile::tempdir().unwrap().keep();
        let link = root.join("outside_link");
        std::os::unix::fs::symlink(&outside, &link).unwrap();

        let err = resolve_inside(&root, "outside_link/file.txt").unwrap_err();
        assert_eq!(err.code, "PATH_OUTSIDE_PROJECT");
    }

    /// Symlink, указывающий внутрь проекта, разрешён.
    #[test]
    #[cfg(unix)]
    fn allows_symlink_pointing_inside() {
        let root = make_root();
        fs::create_dir(root.join("descriptions")).unwrap();
        let real = root.join("descriptions/real.md");
        fs::write(&real, "x").unwrap();
        let link = root.join("descriptions/link.md");
        std::os::unix::fs::symlink(&real, &link).unwrap();

        let resolved = resolve_inside(&root, "descriptions/link.md").unwrap();
        assert_eq!(resolved, root.join("descriptions/link.md"));
    }
}
