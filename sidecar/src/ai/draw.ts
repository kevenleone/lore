// Turns the few shapes a model may ask for into Excalidraw elements. Excalidraw's
// own converter needs a browser, and the engine has none.

import type { CanvasElement } from '@lore/canvas';

import { newId } from '../slug';

export const SHAPE_KINDS = ['rectangle', 'ellipse', 'diamond', 'text'] as const;
export const SHAPE_COLORS = ['blue', 'green', 'red', 'yellow', 'violet', 'gray'] as const;

export interface ArrowRequest {
    from: string;
    label?: string;
    to: string;
}

export interface DrawRequest {
    arrows: readonly ArrowRequest[];
    shapes: readonly ShapeRequest[];
}

export interface ShapeRequest {
    color?: (typeof SHAPE_COLORS)[number];
    column?: number;
    key: string;
    kind?: (typeof SHAPE_KINDS)[number];
    label: string;
    row?: number;
}

interface Box {
    height: number;
    width: number;
    x: number;
    y: number;
}

interface Label {
    height: number;
    lines: string[];
    width: number;
}

interface Point {
    x: number;
    y: number;
}

export class DrawError extends Error {}

// Excalidraw's wire format: Excalifont is family 5, and these are its defaults.
const FONT_FAMILY = 5;
const FONT_SIZE = 20;
const LINE_HEIGHT = 1.25;
const STROKE = '#1e1e1e';
const ROUNDNESS = { arrow: 2, diamond: 2, rectangle: 3 };
const FILLS: Record<(typeof SHAPE_COLORS)[number], string> = {
    blue: '#a5d8ff',
    gray: '#e9ecef',
    green: '#b2f2bb',
    red: '#ffc9c9',
    violet: '#d0bfff',
    yellow: '#ffec99',
};

// An estimate, on the wide side: the engine has no font to measure with, and
// Excalidraw clips a label to its box but centres it there.
const CHARACTER_WIDTH = 13;
const WRAP_AT = 24;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 70;
const PADDING = 24;
// A label only fits the middle of an ellipse or a diamond.
const LABEL_ROOM = { diamond: 2, ellipse: 1.42, rectangle: 1 };
const COLUMN_GAP = 100;
const LABEL_CLEARANCE = 90;
const ROW_GAP = 80;
const BLOCK_GAP = 120;
const ARROW_GAP = 6;

/**
 * The scene with the request drawn below whatever is already there. Existing
 * elements are kept as they are, apart from learning which new arrows touch them.
 */
export function drawOnto(
    existing: readonly CanvasElement[],
    request: DrawRequest,
): CanvasElement[] {
    const elements = existing.map((element) => ({ ...element }));
    const targets = new Map<string, CanvasElement>();
    const origin = originBelow(elements);
    const sizes = request.shapes.map((shape) => sizeOf(shape, wrap(shape.label)));
    const cells = placeInGrid(request.shapes);
    // An arrow's label sits on its line, so the gap has to be longer than the label.
    const labelWidth = Math.max(0, ...request.arrows.map((arrow) => wrap(arrow.label ?? '').width));
    const columnWidth =
        Math.max(...sizes.map((size) => size.width), MIN_WIDTH) +
        Math.max(COLUMN_GAP, labelWidth + LABEL_CLEARANCE);
    const rowHeight = Math.max(...sizes.map((size) => size.height), MIN_HEIGHT) + ROW_GAP;

    request.shapes.forEach((shape, index) => {
        if (targets.has(shape.key)) {
            throw new DrawError(`Two shapes share the key "${shape.key}".`);
        }

        const size = sizes[index];
        const box: Box = {
            ...size,
            x: origin.x + cells[index].column * columnWidth + (columnWidth - size.width) / 2,
            y: origin.y + cells[index].row * rowHeight + (rowHeight - size.height) / 2,
        };
        const drawn = shapeElements(shape, box);

        targets.set(shape.key, drawn[0]);
        elements.push(...drawn);
    });

    for (const arrow of request.arrows) {
        const from = targets.get(arrow.from) ?? labelled(elements, arrow.from);
        const to = targets.get(arrow.to) ?? labelled(elements, arrow.to);

        if (from.id === to.id) {
            throw new DrawError(`An arrow cannot join "${arrow.from}" to itself.`);
        }

        elements.push(...arrowElements(arrow, from, to));
    }

    return elements;
}

function arrowElements(
    arrow: ArrowRequest,
    from: CanvasElement,
    to: CanvasElement,
): CanvasElement[] {
    const start = edgePoint(from, centreOf(to));
    const end = edgePoint(to, centreOf(from));
    const id = newId();
    const label = arrow.label?.trim() ? wrap(arrow.label) : null;
    const line: CanvasElement = {
        ...base(id, 'arrow', {
            height: Math.abs(end.y - start.y),
            width: Math.abs(end.x - start.x),
            x: start.x,
            y: start.y,
        }),
        elbowed: false,
        endArrowhead: 'arrow',
        endBinding: binding(to),
        lastCommittedPoint: null,
        points: [
            [0, 0],
            [end.x - start.x, end.y - start.y],
        ],
        roundness: { type: ROUNDNESS.arrow },
        startArrowhead: null,
        startBinding: binding(from),
    };

    bind(from, 'arrow', id);
    bind(to, 'arrow', id);

    if (!label) {
        return [line];
    }

    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const text = textElement(label, arrow.label ?? '', {
        height: label.height,
        width: label.width,
        x: middle.x - label.width / 2,
        y: middle.y - label.height / 2,
    });

    text.containerId = id;
    bind(line, 'text', text.id);

    return [line, text];
}

function base(id: string, type: string, box: Box): CanvasElement {
    return {
        angle: 0,
        backgroundColor: 'transparent',
        boundElements: [],
        fillStyle: 'solid',
        frameId: null,
        groupIds: [],
        height: box.height,
        id,
        isDeleted: false,
        link: null,
        locked: false,
        opacity: 100,
        roughness: 1,
        roundness: null,
        seed: randomInteger(),
        strokeColor: STROKE,
        strokeStyle: 'solid',
        strokeWidth: 2,
        type,
        updated: Date.now(),
        version: 1,
        versionNonce: randomInteger(),
        width: box.width,
        x: box.x,
        y: box.y,
    };
}

function bind(element: CanvasElement, type: 'arrow' | 'text', id: string): void {
    const bound = Array.isArray(element.boundElements) ? element.boundElements : [];

    element.boundElements = [...bound, { id, type }];
    // Excalidraw only redraws an element whose version moved.
    element.version = (typeof element.version === 'number' ? element.version : 1) + 1;
    element.versionNonce = randomInteger();
}

function binding(element: CanvasElement): Record<string, unknown> {
    return { elementId: element.id, fixedPoint: null, focus: 0, gap: ARROW_GAP };
}

function boxOf(element: CanvasElement): Box {
    return {
        height: numberOf(element.height),
        width: numberOf(element.width),
        x: numberOf(element.x),
        y: numberOf(element.y),
    };
}

function centreOf(element: CanvasElement): Point {
    const box = boxOf(element);

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Where the line from an element's centre towards `target` leaves its outline. */
function edgePoint(element: CanvasElement, target: Point): Point {
    const box = boxOf(element);
    const centre = centreOf(element);
    const deltaX = target.x - centre.x;
    const deltaY = target.y - centre.y;
    const halfWidth = box.width / 2 + ARROW_GAP;
    const halfHeight = box.height / 2 + ARROW_GAP;

    if (deltaX === 0 && deltaY === 0) {
        return centre;
    }

    let scale: number;

    if (element.type === 'ellipse') {
        scale = 1 / Math.hypot(deltaX / halfWidth, deltaY / halfHeight);
    } else if (element.type === 'diamond') {
        scale = 1 / (Math.abs(deltaX) / halfWidth + Math.abs(deltaY) / halfHeight);
    } else {
        scale = Math.min(
            deltaX === 0 ? Infinity : halfWidth / Math.abs(deltaX),
            deltaY === 0 ? Infinity : halfHeight / Math.abs(deltaY),
        );
    }

    return { x: centre.x + deltaX * scale, y: centre.y + deltaY * scale };
}

/** The shape already in the sketch that carries this label. */
function labelled(elements: readonly CanvasElement[], label: string): CanvasElement {
    const wanted = normalise(label);
    const byId = new Map(elements.map((element) => [element.id, element]));
    const matches = new Set<CanvasElement>();

    for (const element of elements) {
        const text = element.originalText ?? element.text;

        if (element.type !== 'text' || typeof text !== 'string' || normalise(text) !== wanted) {
            continue;
        }

        const container =
            typeof element.containerId === 'string' ? byId.get(element.containerId) : undefined;

        // A label on an arrow names the arrow, which nothing can be joined to.
        if (container?.type !== 'arrow') {
            matches.add(container ?? element);
        }
    }

    if (matches.size === 0) {
        throw new DrawError(
            `No shape with the key or label "${label}". An arrow joins shapes from this call by key, or shapes already in the sketch by their exact label.`,
        );
    }

    if (matches.size > 1) {
        throw new DrawError(`${matches.size} shapes in the sketch are labelled "${label}".`);
    }

    return [...matches][0];
}

function normalise(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function numberOf(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function originBelow(elements: readonly CanvasElement[]): Point {
    const boxes = elements.filter((element) => !element.isDeleted).map(boxOf);

    if (!boxes.length) {
        return { x: 0, y: 0 };
    }

    return {
        x: Math.min(...boxes.map((box) => box.x)),
        y: Math.max(...boxes.map((box) => box.y + box.height)) + BLOCK_GAP,
    };
}

/** A shape without a cell takes the next free one in the first row. */
function placeInGrid(shapes: readonly ShapeRequest[]): { column: number; row: number }[] {
    const taken = new Set<string>();
    const cells: ({ column: number; row: number } | null)[] = shapes.map((shape) => {
        if (shape.column === undefined && shape.row === undefined) {
            return null;
        }

        const cell = { column: shape.column ?? 0, row: shape.row ?? 0 };

        if (taken.has(`${cell.column}:${cell.row}`)) {
            throw new DrawError(`Two shapes are placed at column ${cell.column}, row ${cell.row}.`);
        }

        taken.add(`${cell.column}:${cell.row}`);

        return cell;
    });

    let column = 0;

    return cells.map((cell) => {
        if (cell) {
            return cell;
        }

        while (taken.has(`${column}:0`)) {
            column += 1;
        }

        taken.add(`${column}:0`);

        return { column, row: 0 };
    });
}

function randomInteger(): number {
    return Math.floor(Math.random() * 2 ** 31);
}

function shapeElements(shape: ShapeRequest, box: Box): CanvasElement[] {
    const label = wrap(shape.label);
    const kind = shape.kind ?? 'rectangle';

    if (kind === 'text') {
        return [textElement(label, shape.label, box)];
    }

    const container: CanvasElement = {
        ...base(newId(), kind, box),
        backgroundColor: shape.color ? FILLS[shape.color] : 'transparent',
        roundness: kind === 'ellipse' ? null : { type: ROUNDNESS[kind] },
    };
    const text = textElement(label, shape.label, {
        height: label.height,
        width: label.width,
        x: box.x + (box.width - label.width) / 2,
        y: box.y + (box.height - label.height) / 2,
    });

    text.containerId = container.id;
    bind(container, 'text', text.id);

    return [container, text];
}

function sizeOf(shape: ShapeRequest, label: Label): { height: number; width: number } {
    const kind = shape.kind ?? 'rectangle';

    if (kind === 'text') {
        return { height: label.height, width: label.width };
    }

    return {
        height: Math.max(MIN_HEIGHT, Math.round(label.height * LABEL_ROOM[kind] + PADDING * 2)),
        width: Math.max(MIN_WIDTH, Math.round(label.width * LABEL_ROOM[kind] + PADDING * 2)),
    };
}

function textElement(label: Label, original: string, box: Box): CanvasElement {
    return {
        ...base(newId(), 'text', box),
        autoResize: true,
        containerId: null,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
        lineHeight: LINE_HEIGHT,
        originalText: original.replace(/\s+/g, ' ').trim(),
        text: label.lines.join('\n'),
        textAlign: 'center',
        verticalAlign: 'middle',
    };
}

function wrap(text: string): Label {
    const lines: string[] = [];
    let line = '';

    for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
        if (line && line.length + 1 + word.length > WRAP_AT) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }

    lines.push(line);

    return {
        height: lines.length * FONT_SIZE * LINE_HEIGHT,
        lines,
        width: Math.max(...lines.map((entry) => entry.length)) * CHARACTER_WIDTH,
    };
}
