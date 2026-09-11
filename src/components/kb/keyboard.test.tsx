// @vitest-environment jsdom

// Half of Lore's interactive surface used to be `<div onClick>`: reachable by
// pointer and by nothing else. These pin the parts that carry state, where the
// missing semantics cost more than the missing tab stop — a tick box that
// announces itself as a tick box, and navigation that says which row is current.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { Sidebar } from './Sidebar';

afterEach(() => {
    cleanup();
    useStore.setState({ prefs: DEFAULT_PREFS, view: { kind: 'all', val: null } });
});

describe('the sidebar', () => {
    it('is a column of buttons, not of clickable text', () => {
        render(<Sidebar onCapture={vi.fn()} />);

        for (const name of ['All Items', 'Inbox', 'Today', 'Starred', 'Calendar', 'Settings']) {
            expect(screen.getByRole('button', { name: new RegExp(name) }), name).toBeTruthy();
        }
    });

    it('marks the open view as current, so it is not colour alone', () => {
        useStore.setState({ view: { kind: 'inbox', val: null } });
        render(<Sidebar onCapture={vi.fn()} />);

        const inbox = screen.getByRole('button', { name: /Inbox/ });
        expect(inbox.getAttribute('aria-current')).toBe('page');
        expect(
            screen.getByRole('button', { name: /All Items/ }).getAttribute('aria-current'),
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
