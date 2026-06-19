// Baloon — Tauri entry point.
// Plugins back the offline-first store (sql), link-metadata fetching (http),
// opening external links (opener), and the ⌥Space quick-capture global shortcut
// (global-shortcut, desktop only).

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::toggle_capture,
            commands::hide_capture
        ])
        .on_window_event(|window, event| {
            // Closing the main window hides it (tray-app pattern) so it can be
            // reopened from the tray; Quit in the tray menu is the real exit.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };

                let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
                let trigger = alt_space.clone();

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, shortcut, event| {
                            if shortcut == &trigger && event.state() == ShortcutState::Pressed {
                                commands::toggle_capture_window(app);
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(alt_space)?;

                commands::build_tray(app.handle())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
