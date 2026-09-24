import { describe, expect, it } from 'vitest';

import type { Frame } from './viewport';

import { IDENTITY, panBy, toWorld, zoomAt } from './viewport';

const frame: Frame = { base: 2, height: 400, width: 600 };

describe('toWorld', () => {
    it('puts the frame centre at the origin', () => {
        expect(toWorld({ x: 300, y: 200 }, frame, IDENTITY)).toEqual({ x: 0, y: 0 });
    });

    it('undoes the scale', () => {
        expect(toWorld({ x: 400, y: 200 }, frame, IDENTITY)).toEqual({ x: 50, y: 0 });
    });

    it('undoes a pan', () => {
        const panned = { ...IDENTITY, panX: 100, panY: 0 };

        expect(toWorld({ x: 400, y: 200 }, frame, panned)).toEqual({ x: 0, y: 0 });
    });

    it('undoes a zoom', () => {
        expect(toWorld({ x: 400, y: 200 }, frame, { ...IDENTITY, zoom: 2 })).toEqual({
            x: 25,
            y: 0,
        });
    });
});

describe('zoomAt', () => {
    it('holds the point under the cursor still', () => {
        const point = { x: 480, y: 130 };
        const before = toWorld(point, frame, IDENTITY);
        const zoomed = zoomAt(IDENTITY, point, 1.8, frame);

        const after = toWorld(point, frame, zoomed);

        expect(after.x).toBeCloseTo(before.x, 6);
        expect(after.y).toBeCloseTo(before.y, 6);
    });

    it('holds it still when zooming out too', () => {
        const point = { x: 120, y: 340 };
        const start = zoomAt(IDENTITY, point, 3, frame);
        const before = toWorld(point, frame, start);

        const after = toWorld(point, frame, zoomAt(start, point, 0.5, frame));

        expect(after.x).toBeCloseTo(before.x, 6);
        expect(after.y).toBeCloseTo(before.y, 6);
    });

    it('holds it still when the cursor is at the centre', () => {
        const point = { x: 300, y: 200 };
        const zoomed = zoomAt(IDENTITY, point, 2, frame);

        expect(toWorld(point, frame, zoomed)).toEqual({ x: 0, y: 0 });
    });

    it('zooms in', () => {
        expect(zoomAt(IDENTITY, { x: 300, y: 200 }, 2, frame).zoom).toBe(2);
    });

    it('will not zoom in past its limit', () => {
        let viewport = IDENTITY;

        for (let index = 0; index < 20; index += 1) {
            viewport = zoomAt(viewport, { x: 300, y: 200 }, 2, frame);
        }

        expect(viewport.zoom).toBe(8);
    });

    it('will not zoom out past its limit', () => {
        let viewport = IDENTITY;

        for (let index = 0; index < 20; index += 1) {
            viewport = zoomAt(viewport, { x: 300, y: 200 }, 0.5, frame);
        }

        expect(viewport.zoom).toBe(0.2);
    });

    it('does not drift the picture once the limit is reached', () => {
        let viewport = IDENTITY;

        for (let index = 0; index < 20; index += 1) {
            viewport = zoomAt(viewport, { x: 500, y: 100 }, 2, frame);
        }

        const settled = viewport;

        expect(zoomAt(settled, { x: 500, y: 100 }, 2, frame)).toBe(settled);
    });
});

describe('panBy', () => {
    it('shifts the picture', () => {
        expect(panBy(IDENTITY, 30, -12)).toEqual({ panX: 30, panY: -12, zoom: 1 });
    });

    it('moves the world under the cursor by the drag, at any zoom', () => {
        const zoomed = zoomAt(IDENTITY, { x: 300, y: 200 }, 4, frame);
        const before = toWorld({ x: 300, y: 200 }, frame, zoomed);
        const after = toWorld({ x: 300, y: 200 }, frame, panBy(zoomed, 80, 0));

        expect(after.x).toBeCloseTo(before.x - 80 / (frame.base * zoomed.zoom), 6);
    });

    it('leaves the zoom alone', () => {
        expect(panBy({ panX: 0, panY: 0, zoom: 3 }, 10, 10).zoom).toBe(3);
    });
});
