// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { SidebarEditor } from './SidebarEditor';

afterEach(cleanup);

beforeEach(() => {
    useStore.setState({ mainView: 'library', prefs: { ...DEFAULT_PREFS, hiddenSurfaces: [] } });
});

const mount = () => render(<SidebarEditor onClose={vi.fn()} />);

describe('SidebarEditor', () => {
    it('offers every optional surface', () => {
        mount();

        expect(screen.getByText('Graph')).toBeTruthy();
        expect(screen.getByText('Calendar')).toBeTruthy();
        expect(screen.getByText('Tasks')).toBeTruthy();
    });

    it('puts one away when it is unticked', () => {
        mount();

        fireEvent.click(screen.getByText('Graph'));

        expect(useStore.getState().prefs.hiddenSurfaces).toEqual(['graph']);
    });

    it('brings it back when ticked again', () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, hiddenSurfaces: ['graph'] } });
        mount();

        fireEvent.click(screen.getByText('Graph'));

        expect(useStore.getState().prefs.hiddenSurfaces).toEqual([]);
    });

    it('leaves the surface you are on when you put it away', () => {
        useStore.setState({ mainView: 'graph' });
        mount();

        fireEvent.click(screen.getByText('Graph'));

        expect(useStore.getState().mainView).toBe('library');
    });

    it('stays where you are when you put away one you are not on', () => {
        useStore.setState({ mainView: 'graph' });
        mount();

        fireEvent.click(screen.getByText('Calendar'));

        expect(useStore.getState().mainView).toBe('graph');
    });

    it('closes on Escape', () => {
        const onClose = vi.fn();

        render(<SidebarEditor onClose={onClose} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(onClose).toHaveBeenCalled();
    });
});
