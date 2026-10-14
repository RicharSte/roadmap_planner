mod paths;
mod project;

use project::{ProjectState, commit_project, open_project, reload_project};
use std::sync::Mutex;

/// Демо-команда из шаблона Tauri. Принимает имя и возвращает приветствие.
/// Это заглушка: реальные команды приложения (открытие/чтение/запись
/// roadmap-проекта) появятся в задачах T-005+. Безопасность: ввод пока
/// не валидируется, потому что команда временная и не обращается к диску.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Собирает и запускает Tauri-приложение. Регистрирует плагин `opener`
/// (нужен для шаблона), плагин `dialog` (выбор папки проекта),
/// общее состояние `ProjectState` и команды для работы с проектом.
/// На мобильных платформах Tauri подменяет `main` на `mobile_entry_point`,
/// поэтому вся логика приложения живёт здесь, а не в `main.rs`.
///
/// Ошибки: при неудаче `tauri::Builder::run` вернёт `tauri::Error`,
/// который мы пробрасываем через `expect`, потому что без UI приложение
/// не имеет смысла продолжать.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(ProjectState::new()))
        .invoke_handler(tauri::generate_handler![
            greet,
            open_project,
            commit_project,
            reload_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
