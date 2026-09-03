// A one-off message across the top of the window.
//
// Exists because the legacy import used to happen in complete silence: the
// library moved out of a database and into a folder of files, and the app never
// said so. A migration you are not told about is indistinguishable from one
// that went wrong.

import { useStore } from '../../store/useStore';
import { SettingsIcon } from '../common/settingsGlyphs';
import { iconButton } from '../settings/SettingsModal.css';

export function Notice() {
    const message = useStore((s) => s.migrationNotice);
    const dismiss = useStore((s) => s.dismissMigrationNotice);

    if (!message) return null;

    return (
        <div
            role="status"
            style={{
                alignItems: 'center',
                background: 'var(--ac-tint, #eeeef2)',
                borderBottom: '1px solid var(--ac-border, #dedee5)',
                color: 'var(--text, #1a1a1f)',
                display: 'flex',
                flex: 'none',
                fontSize: 13,
                gap: 10,
                padding: '9px 14px',
            }}
        >
            <span style={{ color: 'var(--ac)', display: 'inline-flex', flex: 'none' }}>
                <SettingsIcon name="check" size={15} sw={2.2} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
            <button
                aria-label="Dismiss"
                className={iconButton}
                onClick={dismiss}
                style={{ height: 24, width: 24 }}
                type="button"
            >
                <SettingsIcon name="close" size={14} sw={2} />
            </button>
        </div>
    );
}
