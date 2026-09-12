// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { Toasts } from './Toasts';

afterEach(() => {
    cleanup();
    useStore.setState({ prefs: DEFAULT_PREFS, toasts: [] });
});

describe('Toasts', () => {
    it('shows a plain confirmation with nothing to click', () => {
        useStore.getState().pushToast('Copied');
        render(<Toasts />);

        expect(screen.getByText('Copied')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('runs the action and takes the toast away with it', () => {
        const run = vi.fn();
        useStore.getState().pushToast('Exported note.pdf.', { label: 'Show in Finder', run });
        render(<Toasts />);

        screen.getByRole('button', { name: 'Show in Finder' }).click();

        expect(run).toHaveBeenCalledOnce();
        expect(useStore.getState().toasts).toHaveLength(0);
    });

    it('takes back the pointer, which the stack above it gives up', () => {
        // The stack is pointer-events-none so it never blocks the list beneath;
        // a chip with a button has to opt back in or the button is unclickable.
        useStore.getState().pushToast('Exported note.pdf.', { label: 'Show in Finder', run() {} });
        const { container } = render(<Toasts />);

        const chip = container.querySelector('[role="status"]');
        expect(chip?.className).toContain('pointer-events-auto');
    });
});
