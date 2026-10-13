// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Точка входа бинарника. Делегирует всю работу `tauri_app_lib::run`,
/// чтобы код был доступен и на мобильных платформах (там `main` подменяется
/// на `mobile_entry_point`).
fn main() {
    tauri_app_lib::run()
}
