// @vitest-environment jsdom

// The panel dismisses itself on blur, and a native file dialog blurs it — so
// picking an image used to close Quick Capture before the file arrived, which
// left the main window in front and made the image tab unusable from the panel.

import { act, cleanup, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { holdCaptureDismiss, releaseCaptureDismiss } from '../../lib/captureActions';

const invoke = vi.fn().mockResolvedValue(undefined);
let emitFocus: ((focused: boolean) => void) | undefined;
let emitShown: (() => void) | undefined;

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        listen: (event: string, handler: () => void) => {
            if (event === 'capture:shown') emitShown = handler;
            return Promise.resolve(() => {});
        },
        onFocusChanged: (handler: (event: { payload: boolean }) => void) => {
            emitFocus = (focused) => handler({ payload: focused });
            return Promise.resolve(() => {});
        },
    }),
}));

import { CaptureApp } from './CaptureApp';

/** Whether the Image tab is the open one — the state a reset throws away. */
function imageTabIsOpen(): boolean {
    const tab = within(document.body)
        .getAllByRole('button', { name: 'Image' })
        .find((button) => button.getAttribute('aria-pressed'));
    return tab?.getAttribute('aria-pressed') === 'true';
}

async function mountPanel() {
    render(<CaptureApp />);
    await waitFor(() => expect(emitFocus).toBeTypeOf('function'));
    await waitFor(() => expect(emitShown).toBeTypeOf('function'));
    return emitFocus!;
}

afterEach(() => {
    cleanup();
    invoke.mockClear();
    releaseCaptureDismiss();
    emitFocus = undefined;
    emitShown = undefined;
});

describe('the Quick Capture panel', () => {
    it('closes when it loses focus to another app', async () => {
        const focus = await mountPanel();

        focus(false);

        await waitFor(() => expect(invoke).toHaveBeenCalledWith('hide_capture'));
    });

    it('stays open while a file dialog holds the focus', async () => {
        const focus = await mountPanel();

        holdCaptureDismiss();
        focus(false);

        expect(invoke).not.toHaveBeenCalled();
    });

    // macOS raises the panel more than once as a file dialog closes. Resetting on
    // focus meant the second one wiped the image the first one had just accepted.
    it('keeps the open capture when the dialog hands focus back, twice', async () => {
        const focus = await mountPanel();
        within(document.body).getByText('Composer').click();
        await waitFor(() => expect(imageTabIsOpen()).toBe(false));
        within(document.body).getAllByRole('button', { name: 'Image' })[0].click();
        await waitFor(() => expect(imageTabIsOpen()).toBe(true));

        holdCaptureDismiss();
        await act(async () => {
            focus(false);
            focus(true);
            focus(true);
        });

        expect(imageTabIsOpen()).toBe(true);
    });

    it('resets the form when the window is shown for a new capture', async () => {
        await mountPanel();

        emitShown!();

        expect(invoke).not.toHaveBeenCalled();
    });

    it('closes again on the next blur, once the dialog has returned focus', async () => {
        const focus = await mountPanel();

        holdCaptureDismiss();
        focus(false);
        focus(true);
        focus(false);

        await waitFor(() => expect(invoke).toHaveBeenCalledWith('hide_capture'));
    });
});
