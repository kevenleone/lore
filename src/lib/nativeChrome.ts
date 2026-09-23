import { isTypingTarget } from './typingTarget';

/** Where the engine's own menu is worth more than suppressing it. */
const TEXT_SURFACE = '.lore-editor, .lore-document, .select-text';

/**
 * Takes the webview's own behaviours off the window.
 *
 * Right-click anywhere in a desktop app gives that app's menu or nothing at all,
 * never Reload and Inspect Element — except over text, where Copy, Look Up and
 * the spelling menu are the system's to offer. A file dropped on a window is
 * either something the app takes or nothing; a webview would navigate to it,
 * which is the one failure that leaves the app unreachable until it restarts.
 *
 * Called by each window's entry point: they are separate webviews, each with
 * its own document.
 */
export function installNativeChrome(): void {
    // Autocorrect belongs to prose, and almost nothing typed into this app is
    // prose: a query, a tag, a filename, a collection. Rewriting `cnapp` to
    // `snap` mid-search is the system helping with something it cannot read.
    // Both attributes inherit, so the root is the only place they are needed.
    //
    // Spellcheck is deliberately left alone — it underlines a word without
    // touching it, which is the half worth keeping in a note body.
    document.documentElement.setAttribute('autocorrect', 'off');
    document.documentElement.setAttribute('autocapitalize', 'off');

    document.addEventListener('contextmenu', (event) => {
        if (isTextSurface(event.target) || !document.getSelection()?.isCollapsed) {
            return;
        }

        event.preventDefault();
    });

    // A drop that reaches the document was over no drop target of ours.
    document.addEventListener('dragover', (event) => event.preventDefault());
    document.addEventListener('drop', (event) => event.preventDefault());
}

function isTextSurface(target: EventTarget | null): boolean {
    if (isTypingTarget(target)) {
        return true;
    }

    if (!(target instanceof Element)) {
        return false;
    }

    return target.closest(TEXT_SURFACE) !== null;
}
