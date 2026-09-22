// @vitest-environment jsdom

// Half of Lore's interactive surface used to be `<div onClick>`: reachable by
// pointer and by nothing else. These pin the parts that carry state, where the
// missing semantics cost more than the missing tab stop — a tick box that
// announces itself as a tick box, and navigation that says which row is current.

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { Sidebar } from './Sidebar';

afterEach(() => {
    cleanup();
    useStore.setState({ prefs: DEFAULT_PREFS, view: { kind: 'all', val: null } });
});

/** The Library landmark, which scopes the rows Tasks also has a name for. */
function library(): HTMLElement {
    return screen.getByRole('navigation', { name: 'Library' });
}

describe('the sidebar', () => {
    it('is a column of buttons, not of clickable text', () => {
        render(<Sidebar onCapture={vi.fn()} />);

        for (const name of ['Calendar', 'Settings']) {
            expect(screen.getByRole('button', { name: new RegExp(name) }), name).toBeTruthy();
        }

        for (const name of ['Everything', 'Inbox', 'Notes', 'Links', 'Files']) {
            expect(
                within(library()).getByRole('button', { name: new RegExp(name) }),
                name,
            ).toBeTruthy();
        }
    });

    // The Library names the five rows the design gives it; Today and Starred
    // are views without a row, reachable from the View menu.
    it('gives the Library exactly the rows the design names', () => {
        render(<Sidebar onCapture={vi.fn()} />);

        const labels = within(library())
            .getAllByRole('button')
            .map((b) => b.textContent?.replace(/[\d,]+|⌘\d|Ctrl\+\d/g, '').trim());

        expect(labels).toEqual(['Everything', 'Inbox', 'Notes', 'Links', 'Files']);
    });

    it('keeps the task views out of the Library', () => {
        render(<Sidebar onCapture={vi.fn()} />);

        expect(within(library()).queryByRole('button', { name: /Summary/ })).toBeNull();
        expect(
            within(screen.getByRole('navigation', { name: 'Tasks' })).getByRole('button', {
                name: /Summary/,
            }),
        ).toBeTruthy();
    });

    it('marks the open view as current, so it is not colour alone', () => {
        useStore.setState({ view: { kind: 'inbox', val: null } });
        render(<Sidebar onCapture={vi.fn()} />);

        const inbox = within(library()).getByRole('button', { name: /Inbox/ });

        expect(inbox.getAttribute('aria-current')).toBe('page');
        expect(
            within(library())
                .getByRole('button', { name: /Everything/ })
                .getAttribute('aria-current'),
        ).toBeNull();
    });

    it('fires from the keyboard, not only the pointer', () => {
        const onCapture = vi.fn();

        render(<Sidebar onCapture={onCapture} />);

        // A button answers Return and Space through the platform's click; a
        // `<div onClick>` answers neither.
        screen.getByRole('button', { name: /Quick Capture/ }).click();
        expect(onCapture).toHaveBeenCalledOnce();
    });
});
