// A one-off message across the top of the window.
//
// Exists because the legacy import used to happen in complete silence: the
// library moved out of a database and into a folder of files, and the app never
// said so. A migration you are not told about is indistinguishable from one
// that went wrong.

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { SettingsIcon } from '../common/settingsGlyphs';
import { ICON_BUTTON } from '../settings/controls';

export function Notice() {
    const message = useStore((s) => s.migrationNotice);
    const dismiss = useStore((s) => s.dismissMigrationNotice);

    if (!message) return null;

    return (
        <div
            className="flex flex-none items-center gap-[10px] border-b border-accent-border bg-accent-tint px-[14px] py-[9px] text-body-lg text-text"
            role="status"
        >
            <span className="inline-flex flex-none text-accent">
                <SettingsIcon name="check" size={15} sw={2.2} />
            </span>
            <span className="min-w-0 flex-1">{message}</span>
            <button
                aria-label="Dismiss"
                className={cn(ICON_BUTTON, 'h-6 w-6')}
                onClick={dismiss}
                type="button"
            >
                <SettingsIcon name="close" size={14} sw={2} />
            </button>
        </div>
    );
}
