// Which Lore this binary is: the production app, your dev build, or an agent's.
//
// The values come from `build.rs`, which reads `lore.modes.json` — the same file
// `vite.config.ts` and the sidecar read, so a port or a name is never written
// twice. They are compile-time constants because `identifier` is one too: the
// vault an instance opens is derived from it by Tauri itself, and a build cannot
// change its mind about which vault it owns.

pub const MODE: &str = env!("LORE_MODE");
pub const PRODUCT_NAME: &str = env!("LORE_PRODUCT_NAME");
pub const CAPTURE_SHORTCUT: &str = env!("LORE_CAPTURE_SHORTCUT");
pub const SIDECAR_DEV_PORT: &str = env!("LORE_SIDECAR_DEV_PORT");

const LABEL: &str = env!("LORE_MODE_LABEL");

/// `DEV` / `AGENT`, or `None` in production — the marker the menu bar and the
/// title bar show. Production is the mode that says nothing about itself.
pub fn label() -> Option<&'static str> {
    match LABEL.is_empty() {
        true => None,
        false => Some(LABEL),
    }
}

pub fn is_prod() -> bool {
    LABEL.is_empty()
}

/// The window title for a labelled mode: `Focus` becomes `Focus — Dev`.
pub fn window_title(base: &str) -> String {
    match label() {
        Some(_) => format!("{base} — {}", suffix()),
        None => base.to_string(),
    }
}

/// `Dev` / `Agent` — the label in title case, for prose rather than the menu bar.
fn suffix() -> String {
    let label = LABEL.to_lowercase();
    let mut chars = label.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => label,
    }
}
