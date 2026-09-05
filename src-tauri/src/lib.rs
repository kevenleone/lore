// Lore — Tauri entry point.
// Plugins back the one-shot import of the legacy store (sql), opening external
// links (opener), the ⌥Space quick-capture global shortcut (global-shortcut,
// desktop only), and spawning the Bun data engine (shell).
//
// `sql` is only still here for the legacy import; nothing else in the app
// touches a database. Link metadata moved into the engine, so `http` and its
// `http://**` grant are gone.
//
// `shell` is registered for Rust's use only — the webview is granted no
// `shell:` permission, so nothing in the renderer can start a process.
// `dialog` is granted to the webview, but only `dialog:allow-open`: picking a
// folder is the one filesystem decision the user makes directly.

mod commands;
mod focus_tray;
mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(sidecar::SidecarState::default())
        .manage(focus_tray::FocusTray::default())
        .invoke_handler(tauri::generate_handler![
            commands::hide_capture,
            commands::open_focus_mode,
            focus_tray::focus_snapshot,
            focus_tray::sync_focus,
            sidecar::sidecar_endpoint,
            sidecar::default_vault_path,
            sidecar::backup_legacy_db
        ])
        .on_window_event(|window, event| {
            // Closing the main window hides it (tray-app pattern) so it can be
            // reopened from the tray; Quit in the tray menu is the real exit.
            // hide_main also drops the Dock/Cmd-Tab entry, so a hidden Lore is
            // only in the menu bar.
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                    api.prevent_close();
                    commands::hide_main(window.app_handle());
                }
                // A menu-bar popover goes away as soon as you look elsewhere.
                tauri::WindowEvent::Focused(false)
                    if window.label() == focus_tray::PANEL_LABEL =>
                {
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .setup(|app| {
            // Start the data engine before anything asks for it. A failure here
            // must not stop the app booting — the UI reports the engine as
            // unavailable rather than showing a blank window.
            if let Err(e) = sidecar::start(app.handle()) {
                eprintln!("lore: data engine unavailable: {e}");
            }

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
                // The tray has to exist before anything tries to paint it.
                focus_tray::start_painter(app.handle());
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            // Tauri does not reap child processes, so without this quitting Lore
            // would leave the engine running and holding the vault.
            tauri::RunEvent::Exit => app.state::<sidecar::SidecarState>().shutdown(),
            // Clicking the Dock icon while the window is hidden.
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => commands::show_main(app),
            _ => {}
        });
}
