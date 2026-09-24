// The vault's link structure, drawn.
//
// Canvas rather than SVG: a vault of a couple of thousand notes is a couple of
// thousand nodes and several thousand edges, and that many DOM elements is a
// scroll janking at every frame. The whole picture is one element here.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GraphNode, ItemType } from '../../store/types';
import type { Frame } from './viewport';

import { cn } from '../../lib/cn';
import { type LayoutNode, seed, SETTLE_STEPS, step } from '../../lib/forceLayout';
import { useStore } from '../../store/useStore';
import { GraphPreview } from './GraphPreview';
import { labelDetailFor, shortTitle, showsLabel } from './labels';
import { IDENTITY, panBy, toWorld, type Viewport, zoomAt } from './viewport';

/** Node radius by how many links touch it, so hubs read as hubs. */
const RADIUS = { base: 4, max: 13, perDegree: 1 };

/** Slack around a dot, so a link does not need the pointer on its centre. */
const HIT_SLACK = 7;

/** No dot is harder to hit than this, however small it is drawn. */
const MIN_HIT = 12;

const TYPE_TOKEN: Record<ItemType, string> = {
    code: '--color-type-code-fg',
    image: '--color-type-image-fg',
    link: '--color-type-link-fg',
    note: '--color-type-note-fg',
    task: '--color-type-task-fg',
};

export function GraphView() {
    const graph = useStore((state) => state.graph);
    const loadGraph = useStore((state) => state.loadGraph);
    const selectedId = useStore((state) => state.selectedId);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef<LayoutNode[]>([]);
    const dragRef = useRef<{ moved: boolean; x: number; y: number } | null>(null);

    const [viewport, setViewport] = useState<Viewport>(IDENTITY);
    const [previewId, setPreviewId] = useState<null | string>(null);
    const [hovered, setHovered] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        void loadGraph();
    }, [loadGraph]);

    const byId = useMemo(
        () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
        [graph],
    );

    // Laid out once per graph, not per frame: the picture is the same every
    // time, so there is nothing to animate toward and no reason to keep a
    // simulation running behind a surface nobody is looking at.
    useEffect(() => {
        if (!graph) {
            return;
        }

        const laid = seed(
            graph.nodes.map((node) => node.id),
            new Map(graph.nodes.map((node) => [node.id, node.degree])),
        );

        for (let index = 0; index < SETTLE_STEPS; index += 1) {
            step(laid, graph.edges, 1 - index / SETTLE_STEPS);
        }

        nodesRef.current = laid;
        setViewport(IDENTITY);
        setReady(true);
    }, [graph]);

    /**
     * Measured from the canvas itself wherever possible, because this is what
     * both the drawing and the hit test read. Taking the size from the parent
     * and the pointer from the canvas leaves any disagreement between the two
     * as a constant offset between where a dot is drawn and where it can be
     * clicked — which is exactly what it looked like.
     */
    const frameOf = useCallback((): Frame | null => {
        const canvas = canvasRef.current;
        const box = canvas?.parentElement;

        if (!canvas || !box) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();
        // Before the first draw the canvas has no size of its own; the parent
        // is what it is about to be sized to.
        const width = rect.width || box.clientWidth;
        const height = rect.height || box.clientHeight;

        return { base: fitScale(nodesRef.current, width, height), height, width };
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const frame = frameOf();

        if (!canvas || !frame || !graph) {
            return;
        }

        const context = canvas.getContext('2d');

        if (!context) {
            return;
        }

        const ratio = window.devicePixelRatio || 1;
        const { height, width } = frame;

        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.height = `${height}px`;
        canvas.style.width = `${width}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const styles = getComputedStyle(document.documentElement);
        const token = (name: string) => styles.getPropertyValue(name).trim() || '#888';
        const scale = frame.base * viewport.zoom;
        const positions = new Map(nodesRef.current.map((node) => [node.id, node]));
        const focus = hovered?.node.id ?? selectedId;

        context.save();
        context.translate(width / 2 + viewport.panX, height / 2 + viewport.panY);
        context.scale(scale, scale);

        for (const edge of graph.edges) {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);

            if (!from || !to) {
                continue;
            }

            const lit = edge.source === focus || edge.target === focus;

            context.strokeStyle = token(lit ? '--color-accent' : '--color-text3');
            // A curated relation is a firmer claim than a passing mention, and
            // the picture should not present them as the same thing.
            context.setLineDash(edge.via === 'body' ? [3 / scale, 3 / scale] : []);
            context.globalAlpha = lit ? 1 : 0.55;
            context.lineWidth = (lit ? 1.6 : 1) / scale;
            context.beginPath();
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.stroke();
        }

        context.setLineDash([]);

        for (const node of nodesRef.current) {
            const meta = byId.get(node.id);

            if (!meta) {
                continue;
            }

            const lit = node.id === focus;

            context.beginPath();
            context.arc(node.x, node.y, radiusFor(node.degree) / scale, 0, Math.PI * 2);
            context.fillStyle = token(TYPE_TOKEN[meta.type]);
            // With something in focus, its neighbours keep full weight and the
            // rest of the vault recedes — which is what makes a hairball
            // readable without filtering anything out of it.
            context.globalAlpha = !focus || lit || touches(graph.edges, focus, node.id) ? 1 : 0.3;
            context.fill();

            if (lit || node.id === selectedId || node.id === previewId) {
                context.globalAlpha = 1;
                context.strokeStyle = token('--color-accent');
                context.lineWidth = 2 / scale;
                context.stroke();
            }
        }

        // Labels last, so no dot is drawn over a name.
        const detail = labelDetailFor(scale);

        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.font = `${12 / scale}px ui-sans-serif, system-ui, sans-serif`;

        for (const node of nodesRef.current) {
            const meta = byId.get(node.id);
            const near = node.id === focus || (!!focus && touches(graph.edges, focus, node.id));

            if (!meta || !showsLabel(node, detail, near)) {
                continue;
            }

            const top = node.y + (radiusFor(node.degree) + 5) / scale;

            context.globalAlpha = !focus || near ? 1 : 0.35;
            context.fillStyle = token(near && focus ? '--color-text' : '--color-text2');
            // Drawn twice: the ground behind a label is whatever the graph put
            // there, and a name over an edge is unreadable without it.
            context.lineWidth = 3 / scale;
            context.strokeStyle = token('--color-canvas');
            context.strokeText(shortTitle(meta.title), node.x, top);
            context.fillText(shortTitle(meta.title), node.x, top);
        }

        context.restore();
    }, [byId, frameOf, graph, hovered, previewId, selectedId, viewport]);

    useEffect(() => {
        if (!ready) {
            return;
        }

        draw();

        const onResize = () => draw();

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [draw, ready]);

    const pointIn = (event: { clientX: number; clientY: number }) => {
        const bounds = canvasRef.current?.getBoundingClientRect();

        return bounds
            ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
            : { x: 0, y: 0 };
    };

    const nodeAt = (point: { x: number; y: number }): GraphNode | null => {
        const frame = frameOf();

        if (!frame) {
            return null;
        }

        const world = toWorld(point, frame, viewport);
        const scale = frame.base * viewport.zoom;
        let closest: { distance: number; id: string } | null = null;

        for (const node of nodesRef.current) {
            const distance = Math.hypot(node.x - world.x, node.y - world.y);
            const reach = Math.max(radiusFor(node.degree) + HIT_SLACK, MIN_HIT) / scale;

            if (distance <= reach && (!closest || distance < closest.distance)) {
                closest = { distance, id: node.id };
            }
        }

        return closest ? (byId.get(closest.id) ?? null) : null;
    };

    if (graph && graph.nodes.length === 0) {
        return (
            <Empty
                body="Write a note and link to another with [[double brackets]], or add one to a note's Related list."
                title="Nothing to draw yet"
            />
        );
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden">
                <canvas
                    className={cn('absolute inset-0', hovered ? 'cursor-pointer' : 'cursor-grab')}
                    onMouseDown={(event) => {
                        dragRef.current = { moved: false, x: event.clientX, y: event.clientY };
                    }}
                    onMouseLeave={() => {
                        dragRef.current = null;
                        setHovered(null);
                    }}
                    onMouseMove={(event) => {
                        const drag = dragRef.current;

                        if (drag) {
                            const deltaX = event.clientX - drag.x;
                            const deltaY = event.clientY - drag.y;

                            // A few pixels of travel is a click with a shaky
                            // hand, not a pan; past that the click is cancelled.
                            if (drag.moved || Math.hypot(deltaX, deltaY) > 3) {
                                dragRef.current = {
                                    moved: true,
                                    x: event.clientX,
                                    y: event.clientY,
                                };
                                setViewport((current) => panBy(current, deltaX, deltaY));
                                setHovered(null);

                                return;
                            }
                        }

                        const point = pointIn(event);
                        const node = nodeAt(point);

                        setHovered(node ? { node, x: point.x, y: point.y } : null);
                    }}
                    onMouseUp={(event) => {
                        const dragged = dragRef.current?.moved ?? false;

                        dragRef.current = null;

                        if (dragged) {
                            return;
                        }

                        const node = nodeAt(pointIn(event));

                        setPreviewId(node ? node.id : null);
                    }}
                    onWheel={(event) => {
                        const frame = frameOf();

                        if (frame) {
                            setViewport((current) =>
                                zoomAt(
                                    current,
                                    pointIn(event),
                                    Math.exp(-event.deltaY * 0.002),
                                    frame,
                                ),
                            );
                        }
                    }}
                    ref={canvasRef}
                />
                <GraphPreview id={previewId} onClose={() => setPreviewId(null)} />
                {hovered && !previewId && (
                    <div
                        className="pointer-events-none absolute max-w-[260px] truncate rounded-7 border border-border bg-surface2 px-[10px] py-[5px] text-body shadow-float"
                        // Follows the pointer: a label pinned to a corner makes
                        // you look away from the dot you are asking about.
                        style={{ left: hovered.x + 14, top: hovered.y + 14 }}
                    >
                        {hovered.node.title}
                    </div>
                )}
            </div>
            <div className="flex flex-none items-center gap-4 border-t border-border px-4 py-[9px] text-caption text-text3">
                <span>
                    {graph?.nodes.length ?? 0} notes · {graph?.edges.length ?? 0} links
                </span>
                <button
                    className="rounded-5 border border-border bg-transparent px-[8px] py-[2px] text-caption text-text2"
                    onClick={() => setViewport(IDENTITY)}
                    type="button"
                >
                    Fit
                </button>
                <span className="text-faint">{Math.round(viewport.zoom * 100)}%</span>
                <span className="ml-auto flex items-center gap-[6px]">
                    <svg height="7" width="22">
                        <line stroke="currentColor" x1="0" x2="22" y1="3.5" y2="3.5" />
                    </svg>
                    Related
                </span>
                <span className="flex items-center gap-[6px]">
                    <svg height="7" width="22">
                        <line
                            stroke="currentColor"
                            strokeDasharray="3 3"
                            x1="0"
                            x2="22"
                            y1="3.5"
                            y2="3.5"
                        />
                    </svg>
                    Mentioned in the body
                </span>
            </div>
        </div>
    );
}

function Empty({ body, title }: { body: string; title: string }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] px-8 text-center">
            <div className="text-subhead font-semibold">{title}</div>
            <div className="max-w-[420px] text-body text-text3">{body}</div>
        </div>
    );
}

/** Fits the laid-out graph into the frame, with room for the outermost dots. */
function fitScale(nodes: readonly LayoutNode[], width: number, height: number): number {
    if (nodes.length === 0 || width === 0 || height === 0) {
        return 1;
    }

    const reach = Math.max(...nodes.map((node) => Math.max(Math.abs(node.x), Math.abs(node.y))), 1);

    return Math.min(width, height) / 2 / (reach + 30);
}

function radiusFor(degree: number): number {
    return Math.min(RADIUS.base + degree * RADIUS.perDegree, RADIUS.max);
}

/** Whether an edge joins these two, so a neighbour stays lit while the rest dim. */
function touches(
    edges: readonly { source: string; target: string }[],
    focus: string,
    id: string,
): boolean {
    return edges.some(
        (edge) =>
            (edge.source === focus && edge.target === id) ||
            (edge.target === focus && edge.source === id),
    );
}
