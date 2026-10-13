export interface CanvasAppState {
    gridSize?: number;
    viewBackgroundColor?: string;
}

export interface CanvasElement {
    [key: string]: unknown;
    id: string;
    isDeleted?: boolean;
    type: string;
}

export interface CanvasScene {
    appState: CanvasAppState;
    elements: readonly CanvasElement[];
}

export interface ParsedCanvasBody {
    /** Set when the drawing is there but unreadable; the body must not be rewritten. */
    error?: string;
    scene: CanvasScene | null;
}

interface Region {
    end: number;
    start: number;
}

const TEXT_HEADING = /^## Text[ \t]*\r?$/m;
const DRAWING_HEADING = /^## Drawing[ \t]*\r?$/m;
const NEXT_HEADING = /^## /m;
const FENCE_OPEN = /^```json[ \t]*\r?\n/m;
const FENCE_CLOSE = /^```[ \t]*\r?$/m;
const LABEL_PREFIX = '- ';

const EMPTY_SCENE: CanvasScene = { appState: {}, elements: [] };

export const EMPTY_CANVAS_BODY = writeCanvasBody(undefined, EMPTY_SCENE);

/** The sketch's labels, one per line: what search indexes in place of the scene. */
export function canvasText(body: string | undefined): string {
    const source = body ?? '';
    const region = textRegion(source);

    if (!region) {
        return '';
    }

    return source
        .slice(region.start, region.end)
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => line.startsWith(LABEL_PREFIX))
        .map((line) => line.slice(LABEL_PREFIX.length))
        .join('\n');
}

export function parseCanvasBody(body: string | undefined): ParsedCanvasBody {
    const source = body ?? '';
    const heading = DRAWING_HEADING.exec(source);

    if (!heading) {
        return { scene: EMPTY_SCENE };
    }

    const fence = fencedJson(source, heading.index + heading[0].length);

    if (!fence) {
        return { error: 'The Drawing section has no json block.', scene: null };
    }

    let raw: unknown;

    try {
        raw = JSON.parse(source.slice(fence.start, fence.end));
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error), scene: null };
    }

    if (!isRecord(raw) || !Array.isArray(raw.elements) || !raw.elements.every(isElement)) {
        return { error: 'The drawing is not an Excalidraw scene.', scene: null };
    }

    const appState = isRecord(raw.appState) ? raw.appState : {};

    return { scene: { appState: ownedAppState(appState), elements: raw.elements } };
}

/**
 * Replaces the two sections Lore owns and nothing else. Whatever else the body
 * holds — prose above, a heading of the user's own — comes through untouched.
 */
export function writeCanvasBody(previousBody: string | undefined, scene: CanvasScene): string {
    const text = textSection(scene);
    const drawing = drawingSection(previousBody ?? '', scene);

    let body = previousBody ?? '';

    const drawingAt = drawingRegion(body);

    if (drawingAt) {
        body = body.slice(0, drawingAt.start) + drawing + body.slice(drawingAt.end);
    } else {
        body = appendSection(body, drawing);
    }

    const textAt = textRegion(body);

    if (textAt) {
        return `${body.slice(0, textAt.start)}${text}\n\n${body.slice(textAt.end)}`;
    }

    const insertAt = DRAWING_HEADING.exec(body)?.index ?? body.length;

    return `${body.slice(0, insertAt)}${text}\n\n${body.slice(insertAt)}`;
}

function appendSection(body: string, section: string): string {
    const trimmed = body.replace(/\s+$/, '');

    if (!trimmed) {
        return `${section}\n`;
    }

    return `${trimmed}\n\n${section}\n`;
}

function drawingRegion(body: string): null | Region {
    const heading = DRAWING_HEADING.exec(body);

    if (!heading) {
        return null;
    }

    const fence = fencedJson(body, heading.index + heading[0].length);

    if (!fence) {
        return { end: heading.index + heading[0].length, start: heading.index };
    }

    return { end: fence.close, start: heading.index };
}

function drawingSection(previousBody: string, scene: CanvasScene): string {
    const json = JSON.stringify(
        sortKeys({
            ...previousExtras(previousBody),
            appState: ownedAppState(scene.appState),
            elements: scene.elements.filter((element) => !element.isDeleted),
            source: 'lore',
            type: 'excalidraw',
            version: 2,
        }),
        null,
        2,
    );

    return `## Drawing\n\n\`\`\`json\n${json}\n\`\`\``;
}

/** Offsets of the JSON inside the first fenced block after `from`, and of the fence's end. */
function fencedJson(body: string, from: number): ({ close: number } & Region) | null {
    const rest = body.slice(from);
    const open = FENCE_OPEN.exec(rest);

    if (!open) {
        return null;
    }

    const start = from + open.index + open[0].length;
    const close = FENCE_CLOSE.exec(body.slice(start));

    if (!close) {
        return null;
    }

    return {
        close: start + close.index + close[0].replace(/\r$/, '').length,
        end: start + close.index,
        start,
    };
}

function isElement(value: unknown): value is CanvasElement {
    return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function labelOf(element: CanvasElement): string {
    const text = element.originalText ?? element.text;

    if (element.type !== 'text' || typeof text !== 'string') {
        return '';
    }

    return text.replace(/\s+/g, ' ').trim();
}

/** Selection, scroll and zoom change on every pointer move and would churn the file. */
function ownedAppState(appState: CanvasAppState | Record<string, unknown>): CanvasAppState {
    const owned: CanvasAppState = {};

    if (typeof appState.viewBackgroundColor === 'string') {
        owned.viewBackgroundColor = appState.viewBackgroundColor;
    }

    if (typeof appState.gridSize === 'number') {
        owned.gridSize = appState.gridSize;
    }

    return owned;
}

/** Top-level keys of the stored scene this version does not write, such as `files`. */
function previousExtras(previousBody: string): Record<string, unknown> {
    const heading = DRAWING_HEADING.exec(previousBody);

    if (!heading) {
        return {};
    }

    const fence = fencedJson(previousBody, heading.index + heading[0].length);

    if (!fence) {
        return {};
    }

    try {
        const raw: unknown = JSON.parse(previousBody.slice(fence.start, fence.end));

        return isRecord(raw) ? raw : {};
    } catch {
        return {};
    }
}

/** Sorted keys keep a git diff to the element that moved; array order is z-order and stays. */
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }

    if (!isRecord(value)) {
        return value;
    }

    return Object.fromEntries(
        Object.keys(value)
            .sort()
            .map((key) => [key, sortKeys(value[key])]),
    );
}

function textRegion(body: string): null | Region {
    const heading = TEXT_HEADING.exec(body);

    if (!heading) {
        return null;
    }

    const after = heading.index + heading[0].length;
    const next = NEXT_HEADING.exec(body.slice(after));

    return { end: next ? after + next.index : body.length, start: heading.index };
}

function textSection(scene: CanvasScene): string {
    const labels = scene.elements
        .filter((element) => !element.isDeleted)
        .map(labelOf)
        .filter(Boolean)
        .map((label) => `${LABEL_PREFIX}${label}`);

    return ['## Text', '', ...labels].join('\n').replace(/\n+$/, '');
}
