// Panning and zooming the graph canvas.
//
// Kept apart from the component because the arithmetic is the part that is easy
// to get subtly wrong — a zoom that does not hold the point under the cursor, or
// a hit test that disagrees with what was drawn — and it is testable on its own.

export interface Frame {
    /** The scale that fits the laid-out graph into the frame. */
    base: number;
    height: number;
    width: number;
}

export interface Viewport {
    /** Screen pixels the picture is shifted by, from centred. */
    panX: number;
    panY: number;
    /** Multiplier on top of the fit-to-frame scale. 1 is "everything visible". */
    zoom: number;
}

export const IDENTITY: Viewport = { panX: 0, panY: 0, zoom: 1 };

const MAX_ZOOM = 8;
const MIN_ZOOM = 0.2;

export function panBy(viewport: Viewport, deltaX: number, deltaY: number): Viewport {
    return { ...viewport, panX: viewport.panX + deltaX, panY: viewport.panY + deltaY };
}

/** Screen point → graph coordinates. The inverse of what `draw` applies. */
export function toWorld(
    point: { x: number; y: number },
    frame: Frame,
    viewport: Viewport,
): { x: number; y: number } {
    const scale = frame.base * viewport.zoom;

    return {
        x: (point.x - frame.width / 2 - viewport.panX) / scale,
        y: (point.y - frame.height / 2 - viewport.panY) / scale,
    };
}

/**
 * Zooms about a point, which stays put.
 *
 * Anchoring on the cursor rather than the centre is what makes a wheel zoom
 * feel like moving closer to the thing under the pointer instead of watching it
 * slide off the edge.
 */
export function zoomAt(
    viewport: Viewport,
    point: { x: number; y: number },
    factor: number,
    frame: Frame,
): Viewport {
    const zoom = clamp(viewport.zoom * factor);

    // Nothing moves when the zoom is already at its limit, so the anchor
    // arithmetic would otherwise drift the picture for no reason.
    if (zoom === viewport.zoom) {
        return viewport;
    }

    const before = toWorld(point, frame, viewport);
    const after = toWorld(point, frame, { ...viewport, zoom });

    return {
        panX: viewport.panX + (after.x - before.x) * frame.base * zoom,
        panY: viewport.panY + (after.y - before.y) * frame.base * zoom,
        zoom,
    };
}

function clamp(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}
