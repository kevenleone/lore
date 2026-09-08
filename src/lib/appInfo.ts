// The version ships from `package.json`; release-please keeps it in lockstep
// with `tauri.conf.json` and `Cargo.toml`, so the bundled string is the one the
// packaged app was cut from.
import { version } from '../../package.json';

export const APP_VERSION: string = version;

const REPOSITORY = 'https://github.com/kevenleone/lore';

export const APP_LINKS = {
    issues: `${REPOSITORY}/issues`,
    readme: REPOSITORY,
    releaseNotes: `${REPOSITORY}/blob/main/CHANGELOG.md`,
} as const;

/** Hands a URL to the OS browser; falls back to the webview outside Tauri. */
export async function openExternal(url: string): Promise<void> {
    try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
    } catch {
        window.open(url, '_blank');
    }
}
