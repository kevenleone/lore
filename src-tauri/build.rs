use std::path::Path;

fn main() {
    emit_mode();
    tauri_build::build()
}

/// Resolves the build mode and hands it to the compiler as `env!` constants.
///
/// `scripts/tauri.mjs` puts LORE_MODE in the environment; the fallback matches
/// its own — debug builds are `dev`, release builds are `prod` — so a bare
/// `cargo build` behaves the way `pnpm tauri` would.
fn emit_mode() {
    println!("cargo:rerun-if-env-changed=LORE_MODE");
    println!("cargo:rerun-if-changed=../lore.modes.json");

    let table = std::fs::read_to_string(Path::new("../lore.modes.json"))
        .expect("lore.modes.json is missing; it is the source of truth for build modes");
    let table: serde_json::Value =
        serde_json::from_str(&table).expect("lore.modes.json is not valid JSON");

    let fallback = if std::env::var("PROFILE").as_deref() == Ok("release") {
        "prod"
    } else {
        "dev"
    };
    let mode = std::env::var("LORE_MODE").unwrap_or_else(|_| fallback.to_string());
    let entry = table
        .get(&mode)
        .unwrap_or_else(|| panic!("LORE_MODE={mode} is not a mode in lore.modes.json"));

    let string = |key: &str| entry[key].as_str().unwrap_or_default().to_string();

    println!("cargo:rustc-env=LORE_MODE={mode}");
    println!("cargo:rustc-env=LORE_MODE_LABEL={}", string("label"));
    println!("cargo:rustc-env=LORE_PRODUCT_NAME={}", string("productName"));
    println!(
        "cargo:rustc-env=LORE_CAPTURE_SHORTCUT={}",
        string("captureShortcut")
    );
    println!(
        "cargo:rustc-env=LORE_SIDECAR_DEV_PORT={}",
        entry["sidecarDevPort"]
    );
}
