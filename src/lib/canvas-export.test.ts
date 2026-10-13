import { describe, expect, it } from 'vitest';

import type { CanvasScene } from './canvas-body';

import { excalidrawClipboard, excalidrawFile } from './canvas-export';

const SCENE: CanvasScene = {
    appState: { viewBackgroundColor: 'transparent' },
    elements: [
        { id: 'box', type: 'rectangle' },
        { id: 'gone', isDeleted: true, type: 'ellipse' },
    ],
};

describe('sharing a sketch', () => {
    it('copies it in the shape excalidraw.com pastes', () => {
        expect(JSON.parse(excalidrawClipboard(SCENE))).toEqual({
            elements: [{ id: 'box', type: 'rectangle' }],
            files: {},
            type: 'excalidraw/clipboard',
        });
    });

    it('writes a file excalidraw.com opens, without what was erased', () => {
        const file = JSON.parse(excalidrawFile(SCENE));

        expect(file.type).toBe('excalidraw');
        expect(file.version).toBe(2);
        expect(file.elements).toEqual([{ id: 'box', type: 'rectangle' }]);
        expect(file.appState).toEqual({ viewBackgroundColor: 'transparent' });
    });
});
