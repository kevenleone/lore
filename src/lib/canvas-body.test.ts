import { describe, expect, it } from 'vitest';

import type { CanvasScene } from './canvas-body';

import { canvasText, EMPTY_CANVAS_BODY, parseCanvasBody, writeCanvasBody } from './canvas-body';

const box = { height: 80, id: 'box-1', type: 'rectangle', width: 120, x: 10, y: 20 };
const label = { id: 'text-1', originalText: 'API gateway', text: 'API\ngateway', type: 'text' };

const SCENE: CanvasScene = {
    appState: { viewBackgroundColor: '#ffffff' },
    elements: [box, label],
};

const HANDWRITTEN = `Why this exists: the queue kept backing up.

## Text

- stale label

## Drawing

\`\`\`json
{ "type": "excalidraw", "elements": [], "files": { "f1": { "id": "f1" } } }
\`\`\`

## Open questions

- [ ] who owns the worker?
`;

describe('a sketch body', () => {
    it('reads back the scene it wrote', () => {
        const parsed = parseCanvasBody(writeCanvasBody(undefined, SCENE));

        expect(parsed.error).toBeUndefined();
        expect(parsed.scene).toEqual(SCENE);
    });

    it('starts as two empty sections that parse', () => {
        expect(EMPTY_CANVAS_BODY.startsWith('## Text\n\n## Drawing\n\n```json\n')).toBe(true);
        expect(parseCanvasBody(EMPTY_CANVAS_BODY).scene?.elements).toEqual([]);
    });

    it('writes the same bytes for the same scene', () => {
        const once = writeCanvasBody(undefined, SCENE);

        expect(writeCanvasBody(once, SCENE)).toBe(once);
    });

    it('lists each label on one line, where search and a plain editor can read it', () => {
        expect(canvasText(writeCanvasBody(undefined, SCENE))).toBe('API gateway');
    });

    it('leaves out what was erased', () => {
        const erased = { ...SCENE, elements: [box, { ...label, isDeleted: true }] };
        const body = writeCanvasBody(undefined, erased);

        expect(canvasText(body)).toBe('');
        expect(parseCanvasBody(body).scene?.elements).toEqual([box]);
    });

    it('keeps everything it does not own byte-for-byte', () => {
        const body = writeCanvasBody(HANDWRITTEN, SCENE);

        expect(body.startsWith('Why this exists: the queue kept backing up.\n\n## Text\n')).toBe(
            true,
        );
        expect(body.endsWith('\n\n## Open questions\n\n- [ ] who owns the worker?\n')).toBe(true);
        expect(canvasText(body)).toBe('API gateway');
        expect(body).not.toContain('stale label');
    });

    it('carries scene keys this version does not write', () => {
        const body = writeCanvasBody(HANDWRITTEN, SCENE);
        const json = body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1);

        expect(JSON.parse(json).files).toEqual({ f1: { id: 'f1' } });
    });

    it('drops the view state that changes on every pointer move', () => {
        const noisy = {
            ...SCENE,
            appState: { ...SCENE.appState, scrollX: 412, selectedElementIds: { 'box-1': true } },
        };

        expect(writeCanvasBody(undefined, noisy)).toBe(writeCanvasBody(undefined, SCENE));
    });

    it('treats a body with no drawing as an empty sketch', () => {
        expect(parseCanvasBody('Just a thought.').scene?.elements).toEqual([]);
        expect(parseCanvasBody(undefined).scene?.elements).toEqual([]);
    });

    it('reports a drawing it cannot read instead of answering with an empty one', () => {
        const broken = '## Drawing\n\n```json\n{ "elements": [ \n```\n';

        expect(parseCanvasBody(broken).scene).toBeNull();
        expect(parseCanvasBody(broken).error).toBeTruthy();
        expect(parseCanvasBody('## Drawing\n\nno fence here\n').scene).toBeNull();
        expect(parseCanvasBody('## Drawing\n\n```json\n{ "elements": 3 }\n```\n').scene).toBeNull();
    });

    it('is not fooled by a label that looks like Markdown', () => {
        const heading = { id: 'text-2', text: '## Drawing', type: 'text' };
        const fence = { id: 'text-3', text: '```', type: 'text' };
        const scene = { ...SCENE, elements: [heading, fence, box] };
        const body = writeCanvasBody(undefined, scene);

        expect(parseCanvasBody(body).scene?.elements).toEqual(scene.elements);
        expect(writeCanvasBody(body, scene)).toBe(body);
    });
});
