// The menu bar. Without one macOS hands the app Tauri's default — File, Edit,
// View, Window, Help with nothing of Lore's in them — so every command lives in
// a keydown handler the menu bar cannot show.
//
// Items carry no logic: each sends its id to the main window, which runs the
// same store action its shortcut always ran. What the system can do itself —
// About, Services, Hide, Quit, the clipboard, Minimize, Zoom, Full Screen —
// stays a predefined item, so it behaves the way every other app's does.

use tauri::{
    menu::{AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    App, Emitter, Runtime,
};

use crate::mode;

/// Namespaces this menu's ids. A menu event reaches every handler in the app,
/// and the tray has a `capture` of its own: without the prefix, one ⌘N opened
/// the drawer here and the floating panel there, which closed the drawer again.
const MENU_PREFIX: &str = "menu:";

/// A command the menu sends to the window, by id.
struct Command {
    accelerator: &'static str,
    id: &'static str,
    label: &'static str,
}

const FILE_COMMANDS: [Command; 2] = [
    Command {
        accelerator: "CmdOrCtrl+N",
        id: "capture",
        label: "Quick Capture",
    },
    Command {
        accelerator: "",
        id: "open-vault",
        label: "Open Vault…",
    },
];

const VIEW_COMMANDS: [Command; 8] = [
    Command {
        accelerator: "CmdOrCtrl+B",
        id: "sidebar",
        label: "Toggle Sidebar",
    },
    Command {
        accelerator: "CmdOrCtrl+L",
        id: "properties",
        label: "Toggle Properties",
    },
    Command {
        accelerator: "CmdOrCtrl+1",
        id: "view-all",
        label: "All Items",
    },
    Command {
        accelerator: "CmdOrCtrl+2",
        id: "view-inbox",
        label: "Inbox",
    },
    Command {
        accelerator: "CmdOrCtrl+3",
        id: "view-today",
        label: "Today",
    },
    Command {
        accelerator: "CmdOrCtrl+4",
        id: "view-starred",
        label: "Starred",
    },
    Command {
        accelerator: "CmdOrCtrl+5",
        id: "view-calendar",
        label: "Calendar",
    },
    Command {
        accelerator: "CmdOrCtrl+K",
        id: "search",
        label: "Search",
    },
];

const HELP_COMMANDS: [Command; 2] = [
    Command {
        accelerator: "",
        id: "documentation",
        label: "Lore Documentation",
    },
    Command {
        accelerator: "",
        id: "contribute",
        label: "Contribute",
    },
];

pub fn install<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let name = mode::PRODUCT_NAME;

    let about = AboutMetadata {
        name: Some(name.to_string()),
        version: Some(app.package_info().version.to_string()),
        ..Default::default()
    };

    let lore = SubmenuBuilder::new(app, name)
        .about(Some(about))
        .separator()
        .item(&command_item(app, &settings_command())?)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file = SubmenuBuilder::new(app, "File")
        .item(&command_item(app, &FILE_COMMANDS[0])?)
        .separator()
        .item(&command_item(app, &FILE_COMMANDS[1])?)
        .separator()
        .close_window()
        .build()?;

    // Select All is ours: the predefined one hands ⌘A to the webview, which
    // answers by selecting the sidebar, the toolbar and the status bar.
    let edit = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .item(&command_item(app, &select_all_command())?)
        .build()?;

    let mut view = SubmenuBuilder::new(app, "View");
    for (index, command) in VIEW_COMMANDS.iter().enumerate() {
        // The two panel toggles, then the library views, then search.
        if index == 2 || index == 7 {
            view = view.separator();
        }
        view = view.item(&command_item(app, command)?);
    }
    let view = view.separator().fullscreen().build()?;

    let window = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .build()?;

    let mut help = SubmenuBuilder::new(app, "Help");
    for command in HELP_COMMANDS.iter() {
        help = help.item(&command_item(app, command)?);
    }
    let help = help.build()?;

    let menu = MenuBuilder::new(app)
        .items(&[&lore, &file, &edit, &view, &window, &help])
        .build()?;

    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        // The tray's items arrive here too; they are `commands.rs`'s to answer.
        let Some(command) = event.id().0.strip_prefix(MENU_PREFIX) else {
            return;
        };
        let _ = app.emit_to("main", "menu", command);
    });

    Ok(())
}

fn command_item<R: Runtime>(
    app: &App<R>,
    command: &Command,
) -> tauri::Result<tauri::menu::MenuItem<R>> {
    let item = MenuItemBuilder::with_id(format!("{MENU_PREFIX}{}", command.id), command.label);
    match command.accelerator.is_empty() {
        true => item.build(app),
        false => item.accelerator(command.accelerator).build(app),
    }
}

fn select_all_command() -> Command {
    Command {
        accelerator: "CmdOrCtrl+A",
        id: "select-all",
        label: "Select All",
    }
}

fn settings_command() -> Command {
    Command {
        accelerator: "CmdOrCtrl+,",
        id: "settings",
        label: "Settings…",
    }
}
