// The vault's link structure, drawn.
//
// Canvas rather than SVG: a vault of a couple of thousand notes is a couple of
// thousand nodes and several thousand edges, and that many DOM elements is a
// scroll janking at every frame. The whole picture is one element here.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GraphNode, ItemType } from '../../store/types';

import { cn } from '../../lib/cn';
import { type LayoutNode, seed, SETTLE_STEPS, step } from '../../lib/forceLayout';
import { useStore } from '../../store/useStore';

/** Node radius by how many links touch it, so hubs read as hubs. */
const RADIUS = { base: 3.5, max: 11, perDegree: 0.9 };

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
    const selectItem = useStore((state) => state.selectItem);
    const setMainView = useStore((state) => state.setMainView);
    const reduceMotion = useStore((state) => state.prefs.switches.motion);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef<LayoutNode[]>([]);
    const [hovered, setHovered] = useState<GraphNode | null>(null);
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

        const degrees = new Map(graph.nodes.map((node) => [node.id, node.degree]));
        const laid = seed(
            graph.nodes.map((node) => node.id),
            degrees,
        );

        for (let index = 0; index < SETTLE_STEPS; index += 1) {
            step(laid, graph.edges, 1 - index / SETTLE_STEPS);
        }

        nodesRef.current = laid;
        setReady(true);
    }, [graph]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const nodes = nodesRef.current;

        if (!canvas || !graph) {
            return;
        }

        const context = canvas.getContext('2d');
        const frame = canvas.parentElement;

        if (!context || !frame) {
            return;
        }

        const ratio = window.devicePixelRatio || 1;
        const width = frame.clientWidth;
        const height = frame.clientHeight;

        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.height = `${height}px`;
        canvas.style.width = `${width}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const styles = getComputedStyle(document.documentElement);
        const token = (name: string) => styles.getPropertyValue(name).trim() || '#888';
        const scale = fitScale(nodes, width, height);

        context.save();
        context.translate(width / 2, height / 2);
        context.scale(scale, scale);

        const positions = new Map(nodesRef.current.map((node) => [node.id, node]));

        context.lineWidth = 1 / scale;

        for (const edge of graph.edges) {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);

            if (!from || !to) {
                continue;
            }

            const touchesSelection = edge.source === selectedId || edge.target === selectedId;

            context.strokeStyle = token(touchesSelection ? '--color-accent' : '--color-border');
            // A curated relation is a firmer claim than a passing mention, and
            // the picture should not present them as the same thing.
            context.setLineDash(edge.via === 'body' ? [3 / scale, 3 / scale] : []);
            context.globalAlpha = touchesSelection ? 0.9 : 0.5;
            context.beginPath();
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.stroke();
        }

        context.setLineDash([]);
        context.globalAlpha = 1;

        for (const node of nodes) {
            const meta = byId.get(node.id);

            if (!meta) {
                continue;
            }

            context.beginPath();
            context.arc(node.x, node.y, radiusFor(node.degree) / scale, 0, Math.PI * 2);
            context.fillStyle = token(TYPE_TOKEN[meta.type]);
            context.fill();

            if (node.id === selectedId || node.id === hovered?.id) {
                context.strokeStyle = token('--color-accent');
                context.lineWidth = 2 / scale;
                context.stroke();
                context.lineWidth = 1 / scale;
            }
        }

        context.restore();
    }, [byId, graph, hovered, selectedId]);

    useEffect(() => {
        if (!ready) {
            return;
        }

        draw();

        const onResize = () => draw();

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [draw, ready]);

    const nodeAt = (event: React.MouseEvent<HTMLCanvasElement>): GraphNode | null => {
        const canvas = canvasRef.current;
        const frame = canvas?.parentElement;

        if (!canvas || !frame) {
            return null;
        }

        const bounds = canvas.getBoundingClientRect();
        const scale = fitScale(nodesRef.current, frame.clientWidth, frame.clientHeight);
        const x = (event.clientX - bounds.left - frame.clientWidth / 2) / scale;
        const y = (event.clientY - bounds.top - frame.clientHeight / 2) / scale;

        let closest: { distance: number; node: LayoutNode } | null = null;

        for (const node of nodesRef.current) {
            const distance = Math.hypot(node.x - x, node.y - y);
            const reach = Math.max(radiusFor(node.degree), 6) / scale;

            if (distance <= reach && (!closest || distance < closest.distance)) {
                closest = { distance, node };
            }
        }

        return closest ? (byId.get(closest.node.id) ?? null) : null;
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
            <div className="relative min-h-0 flex-1">
                <canvas
                    className="absolute inset-0"
                    onClick={(event) => {
                        const node = nodeAt(event);

                        if (node) {
                            selectItem(node.id);
                            setMainView('library');
                        }
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onMouseMove={(event) => setHovered(nodeAt(event))}
                    ref={canvasRef}
                />
                {hovered && (
                    <div
                        className={cn(
                            'pointer-events-none absolute top-3 left-3 max-w-[280px] truncate rounded-7 border border-border bg-surface2 px-[10px] py-[6px] text-body shadow-float',
                            !reduceMotion && 'transition-opacity duration-100',
                        )}
                    >
                        {hovered.title}
                    </div>
                )}
            </div>
            <div className="flex flex-none items-center gap-3 border-t border-border px-4 py-[9px] text-caption text-text3">
                <span>
                    {graph?.nodes.length ?? 0} notes · {graph?.edges.length ?? 0} links
                </span>
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
