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

/**
 * A pointer event's position inside the frame, in the frame's own pixels.
 *
 * `clientX` and a bounding rect are both in visual pixels — after the CSS
 * `zoom` App puts on the whole tree for the Text size preference — while the
 * frame is measured with `clientWidth`, which is in layout pixels and ignores
 * that zoom. At a text size of 1.2 the two disagree by a sixth, growing with
 * the distance from the corner: near the top left a click landed on the dot,
 * and further out it missed by more and more.
 *
 * The ratio is measured rather than read from the preference, so it stays right
 * whatever else scales this subtree.
 */
export function toFramePoint(
    client: { x: number; y: number },
    rect: { height: number; left: number; top: number; width: number },
    layout: { height: number; width: number },
): { x: number; y: number } {
    const scaleX = rect.width > 0 ? layout.width / rect.width : 1;
    const scaleY = rect.height > 0 ? layout.height / rect.height : 1;

    return { x: (client.x - rect.left) * scaleX, y: (client.y - rect.top) * scaleY };
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
