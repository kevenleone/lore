// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from '../../store/types';

import { EMPTY_CANVAS_BODY } from '../../lib/canvas-body';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { DetailPane } from './DetailPane';

// Excalidraw draws on a <canvas>, which jsdom does not have.
vi.mock('../canvas/CanvasEditor', () => ({
    CanvasEditor: ({ body }: { body?: string }) => <div data-testid="canvas">{body}</div>,
}));

const SKETCH: Item = {
    body: EMPTY_CANVAS_BODY,
    createdAt: '2026-10-13T10:00:00.000Z',
    flags: {},
    id: 'sketch-1',
    related: [],
    tags: [],
    title: 'System sketch',
    type: 'canvas',
    updatedAt: '2026-10-13T10:00:00.000Z',
};

beforeEach(async () => {
    useStore.setState({ prefs: DEFAULT_PREFS });
    await useStore.getState().refresh();
    useStore.setState((state) => ({ items: [SKETCH, ...state.items] }));
});

afterEach(cleanup);

describe('a sketch in the detail pane', () => {
    it('opens in the canvas, never in the Markdown editor', async () => {
        act(() => useStore.setState({ detail: SKETCH, selectedId: SKETCH.id }));
        render(<DetailPane />);

        expect((await screen.findByTestId('canvas')).textContent).toBe(EMPTY_CANVAS_BODY);
        expect(document.querySelector('.ProseMirror')).toBeNull();
    });

    it('waits for the body, so a list row is never drawn as an empty sketch and saved', () => {
        const { body: _body, ...listed } = SKETCH;

        act(() => useStore.setState({ detail: null, items: [listed], selectedId: SKETCH.id }));
        render(<DetailPane />);

        expect(screen.queryByTestId('canvas')).toBeNull();
    });
});
