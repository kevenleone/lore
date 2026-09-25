import { describe, expect, it } from 'vitest';

import type { Frame } from './viewport';

import { IDENTITY, panBy, toFramePoint, toWorld, zoomAt } from './viewport';

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

describe('toFramePoint', () => {
    const rect = { height: 400, left: 100, top: 50, width: 600 };
    const layout = { height: 400, width: 600 };

    it('subtracts the frame’s own position', () => {
        expect(toFramePoint({ x: 100, y: 50 }, rect, layout)).toEqual({ x: 0, y: 0 });
    });

    it('is the plain offset when nothing is zoomed', () => {
        expect(toFramePoint({ x: 400, y: 150 }, rect, layout)).toEqual({ x: 300, y: 100 });
    });

    it('converts visual pixels back to layout pixels under a zoom', () => {
        // A 500x400 box drawn at 1.2 measures 600x480 on screen.
        const zoomed = { height: 480, left: 0, top: 0, width: 600 };

        expect(toFramePoint({ x: 600, y: 480 }, zoomed, { height: 400, width: 500 })).toEqual({
            x: 500,
            y: 400,
        });
    });

    it('lands on the far corner exactly, which is where the error was largest', () => {
        const zoomed = { height: 480, left: 12, top: 34, width: 600 };
        const point = toFramePoint({ x: 612, y: 514 }, zoomed, { height: 400, width: 500 });

        expect(point.x).toBeCloseTo(500, 9);
        expect(point.y).toBeCloseTo(400, 9);
    });

    it('leaves the origin alone however far the zoom goes', () => {
        const zoomed = { height: 800, left: 5, top: 5, width: 1200 };

        expect(toFramePoint({ x: 5, y: 5 }, zoomed, { height: 400, width: 600 })).toEqual({
            x: 0,
            y: 0,
        });
    });

    it('does not divide by a frame that has not been laid out yet', () => {
        const empty = { height: 0, left: 0, top: 0, width: 0 };

        expect(toFramePoint({ x: 10, y: 10 }, empty, { height: 0, width: 0 })).toEqual({
            x: 10,
            y: 10,
        });
    });
});
