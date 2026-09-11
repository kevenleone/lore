// Lore — Tauri entry point.
// Plugins back the one-shot import of the legacy store (sql), opening external
// links (opener), the quick-capture global shortcut (global-shortcut, desktop
// only — the combination is per build mode, see `mode.rs`), and spawning the
// Bun data engine (shell).
//
// `sql` is only still here for the legacy import; nothing else in the app
// touches a database. Link metadata moved into the engine, so `http` and its
// `http://**` grant are gone.
//
// `shell` is registered for Rust's use only — the webview is granted no
// `shell:` permission, so nothing in the renderer can start a process.
// `dialog` is granted to the webview, but only `dialog:allow-open`: picking a
// folder is the one filesystem decision the user makes directly.
// `notification` is what tells the user a focus interval ended while they were
// looking at something else.
// `autostart` owns the login item behind Settings → General → Launch at login.

mod app_menu;
mod commands;
mod focus_tray;
mod mode;
mod print_pdf;
mod sidecar;
#[cfg(target_os = "macos")]
mod window_frame;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        // The panels are placed by the app — the capture window centres itself
        // on every open, and the print window is parked offscreen — so only the
        // main window's geometry is the user's.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_denylist(&["capture", "focus", "print"])
                .build(),
        )
        .manage(sidecar::SidecarState::default())
        .manage(focus_tray::FocusTray::default())
        .manage({
            #[cfg(target_os = "macos")]
            {
                window_frame::TitleBarHeight::default()
            }
        })
        .manage(commands::TrayVisible::default())
        .invoke_handler(tauri::generate_handler![
            commands::hide_capture,
            commands::open_focus_mode,
            commands::set_tray_visible,
            commands::trash_path,
            print_pdf::export_webview_pdf,
            focus_tray::focus_snapshot,
            focus_tray::sync_focus,
            sidecar::sidecar_endpoint,
            sidecar::default_vault_path,
            sidecar::backup_legacy_db,
            #[cfg(target_os = "macos")]
            window_frame::set_title_bar_height
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
                tauri::WindowEvent::Focused(false) if window.label() == focus_tray::PANEL_LABEL => {
                    let _ = window.hide();
                }
                // AppKit re-lays the titlebar out on resize, which puts the
                // window buttons back where it wants them.
                #[cfg(target_os = "macos")]
                tauri::WindowEvent::Resized(_) if window.label() == "main" => {
                    window_frame::restore_button_position(window);
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

            // A labelled build says so in the window list too — the windows are
            // `decorations: false`, so this is what Mission Control and the
            // Window menu show.
            for label in ["main", "focus", "capture", "print"] {
                if let Some(window) = app.get_webview_window(label) {
                    let title = window.title().unwrap_or_default();
                    let _ = window.set_title(&mode::window_title(&title));
                }
            }

            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                window_frame::adopt_system_frame(&window.as_ref().window());
            }

            #[cfg(desktop)]
            {
                use std::str::FromStr;

                use tauri_plugin_autostart::MacosLauncher;
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

                // Launch at login. The plugin owns the login item, so it — not
                // the renderer's stored preference — is the truth about whether
                // Lore starts with the machine; `App.tsx` reads it back on boot.
                app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    None,
                ))?;

                let capture = Shortcut::from_str(mode::CAPTURE_SHORTCUT)
                    .expect("the mode's capture shortcut is not a shortcut");
                let trigger = capture;

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, shortcut, event| {
                            if shortcut == &trigger && event.state() == ShortcutState::Pressed {
                                commands::toggle_capture_window(app);
                            }
                        })
                        .build(),
                )?;

                // Losing the shortcut must not stop the app booting. Each mode
                // has its own combination, but another Lore in the same mode —
                // or any other app — can already hold it, and an instance with
                // no global shortcut is still a working instance.
                if let Err(e) = app.global_shortcut().register(capture) {
                    eprintln!(
                        "lore: {} is taken; quick capture is tray-only: {e}",
                        mode::CAPTURE_SHORTCUT
                    );
                }

                app_menu::install(app)?;
                commands::build_tray(app.handle())?;
                #[cfg(target_os = "macos")]
                focus_tray::use_monospaced_digits();
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
