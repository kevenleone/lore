// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { GeneralPane } from './panes';

afterEach(() => {
    cleanup();
    useStore.setState({ collections: [], prefs: DEFAULT_PREFS });
});

const COLLECTIONS = [
    { color: '#8a92b8', id: 'reading', name: 'Reading List' },
    { color: '#a88f6e', id: 'work', name: 'Work' },
];

describe('GeneralPane', () => {
    it('offers the menu-bar icon but not the Dock one, which is always there', () => {
        render(<GeneralPane />);

        expect(screen.getByRole('switch', { name: 'Show icon in the menu bar' })).toBeTruthy();
        expect(screen.queryByRole('switch', { name: 'Show icon in the Dock' })).toBeNull();
    });

    it('offers the Inbox and every collection, and files the choice', () => {
        useStore.setState({ collections: COLLECTIONS });
        render(<GeneralPane />);

        fireEvent.click(screen.getByRole('button', { name: 'File new captures into' }));
        expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
            'Inbox',
            'Reading List',
            'Work',
        ]);

        fireEvent.click(screen.getByRole('option', { name: 'Work' }));
        expect(useStore.getState().prefs.defaultCollection).toBe('work');
    });

    it('picks a capture type rather than cycling to the next one', () => {
        render(<GeneralPane />);

        fireEvent.click(screen.getByRole('button', { name: 'Default capture type' }));
        fireEvent.click(screen.getByRole('option', { name: 'Task' }));

        expect(useStore.getState().prefs.defaultCaptureType).toBe('task');
        // The menu closes on a choice, and the trigger reads the new value.
        expect(screen.queryByRole('option')).toBeNull();
        expect(screen.getByRole('button', { name: 'Default capture type' }).textContent).toContain(
            'Task',
        );
    });

    it('falls back to the Inbox when the chosen collection is gone', () => {
        useStore.setState({
            collections: COLLECTIONS,
            prefs: { ...DEFAULT_PREFS, defaultCollection: 'deleted-collection' },
        });
        render(<GeneralPane />);

        expect(
            screen.getByRole('button', { name: 'File new captures into' }).textContent,
        ).toContain('Inbox');
    });
});
