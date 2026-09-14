// Dragging a card, on pointer events rather than HTML5 drag-and-drop.
//
// The native API is three separate things a webview can refuse independently:
// `dragstart` never fires on an element that inherits `user-select: none`,
// `dataTransfer.types` is not reliably readable during `dragover`, and a
// desktop shell may claim the OS drag for file drops before the page sees it.
// Any one of them turns a drag into nothing at all, with no error to read.
//
// Pointer events have none of that surface: the drag is ours from press to
// release, and the drop target is whatever is under the cursor.

import { useCallback, useEffect, useRef, useState } from 'react';

/** Pixels the pointer must travel before a press becomes a drag, not a click. */
const THRESHOLD = 5;

/**
 * Marks the document while a drag is in flight. The cursor is painted from
 * here rather than from the card, because by then the pointer is over the
 * columns and the ghost, not over the thing it picked up — see `tailwind.css`.
 */
const DRAGGING_ATTRIBUTE = 'data-dragging';

export interface PointerDrag<TZone extends string> {
    /** The zone under the cursor, for the drop highlight. */
    over: null | TZone;
    /** Press handler for a draggable item. */
    start: (event: React.PointerEvent, id: string) => void;
    /** The item being dragged and where to paint it, or null. */
    state: DragState | null;
    /**
     * Whether the press that just ended was a drag. A card is also a button, and
     * the click that follows a drag must not also open the thing just moved.
     */
    wasDragged: () => boolean;
}

interface DragState {
    id: string;
    x: number;
    y: number;
}

/**
 * `zoneAttribute` names the data attribute that marks a drop zone; its value is
 * the zone key handed back to `onDrop`. Hit-testing reads the element under the
 * cursor, so a zone needs no listeners of its own.
 */
export function usePointerDrag<TZone extends string>(
    zoneAttribute: string,
    onDrop: (zone: TZone, id: string) => void,
): PointerDrag<TZone> {
    const [state, setState] = useState<DragState | null>(null);
    const [over, setOver] = useState<null | TZone>(null);
    const origin = useRef<{ id: string; x: number; y: number } | null>(null);
    const dragging = useRef(false);
    const dragged = useRef(false);
    // Held in a ref so the move/up listeners are installed once per drag rather
    // than re-bound on every frame of it.
    const drop = useRef(onDrop);
    drop.current = onDrop;

    const zoneAt = useCallback(
        (x: number, y: number): null | TZone => {
            const element = document.elementFromPoint(x, y);
            const zone = element?.closest(`[${zoneAttribute}]`);
            return (zone?.getAttribute(zoneAttribute) as TZone) ?? null;
        },
        [zoneAttribute],
    );

    const start = useCallback((event: React.PointerEvent, id: string) => {
        // Secondary buttons open menus; only a primary press can move a card.
        if (event.button !== 0) return;
        origin.current = { id, x: event.clientX, y: event.clientY };
        dragged.current = false;
    }, []);

    useEffect(() => {
        const finish = () => {
            origin.current = null;
            dragging.current = false;
            document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
            setState(null);
            setOver(null);
        };

        const onMove = (event: PointerEvent) => {
            const from = origin.current;
            if (!from) return;
            if (!dragging.current) {
                const travelled = Math.hypot(event.clientX - from.x, event.clientY - from.y);
                if (travelled < THRESHOLD) return;
                dragging.current = true;
                dragged.current = true;
                document.documentElement.setAttribute(DRAGGING_ATTRIBUTE, '');
            }
            // Text selection is off document-wide, but a held pointer still
            // scrolls a touch surface out from under the card.
            event.preventDefault();
            setState({ id: from.id, x: event.clientX, y: event.clientY });
            setOver(zoneAt(event.clientX, event.clientY));
        };

        const onUp = (event: PointerEvent) => {
            const from = origin.current;
            if (from && dragging.current) {
                const zone = zoneAt(event.clientX, event.clientY);
                if (zone) drop.current(zone, from.id);
            }
            finish();
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') finish();
        };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', finish);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', finish);
            window.removeEventListener('keydown', onKey);
            // Leaving mid-drag would otherwise strand the grabbing cursor on
            // the whole document.
            document.documentElement.removeAttribute(DRAGGING_ATTRIBUTE);
        };
    }, [zoneAt]);

    return { over, start, state, wasDragged: () => dragged.current };
}
