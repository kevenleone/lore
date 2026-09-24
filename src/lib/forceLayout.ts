// A small force-directed layout.
//
// Hand-rolled rather than pulled in: the whole of what a graph of notes needs is
// repulsion, spring edges and a pull toward the middle, which is the code below.
// A layout library would be a dependency an order of magnitude larger than the
// thing it replaces, and this way the constants can be tuned against how a vault
// of notes actually looks rather than against a general-purpose default.
//
// Deterministic on purpose: the starting ring is derived from the node's index,
// not from a random seed, so the same vault lays out the same way twice. A graph
// that rearranges itself on every visit cannot be learned.

export interface LayoutNode {
    degree: number;
    id: string;
    x: number;
    y: number;
}

export interface LayoutOptions {
    /** Pulls everything toward the origin so islands cannot drift away. */
    gravity?: number;
    /** How far apart an edge would like its ends to be. */
    linkDistance?: number;
    /** How hard nodes push each other apart. */
    repulsion?: number;
}

/**
 * `linkDistance` is deliberately shorter than the spacing repulsion alone
 * settles at, or an edge would hold its ends no closer than two unrelated notes
 * and a cluster would not read as one.
 */
const DEFAULTS = { gravity: 0.015, linkDistance: 45, repulsion: 1400 };

/** Past this, repulsion moves a node by less than a pixel — see `step`. */
const CUTOFF = 260;

/** A stable number from an id, for separating two nodes at the same point. */
function hash(id: string): number {
    let value = 0;

    for (let index = 0; index < id.length; index += 1) {
        value = (value * 31 + id.charCodeAt(index)) | 0;
    }

    return Math.abs(value);
}

/** The node's own cell and the eight around it. */
function* neighbours(grid: Map<string, LayoutNode[]>, node: LayoutNode): Generator<LayoutNode> {
    const column = Math.floor(node.x / CUTOFF);
    const row = Math.floor(node.y / CUTOFF);

    for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
            for (const other of grid.get(`${column + dx},${row + dy}`) ?? []) {
                yield other;
            }
        }
    }
}

/** Enough for the layout to settle; beyond this the picture stops changing. */
export const SETTLE_STEPS = 220;

/**
 * Starting positions: a ring, widened as the count grows so a large vault does
 * not begin as one dense knot the repulsion has to spend its whole budget
 * unpicking.
 */
export function seed(ids: readonly string[], degrees: ReadonlyMap<string, number>): LayoutNode[] {
    const radius = 40 + ids.length * 2.2;

    return ids.map((id, index) => {
        const angle = (index / Math.max(ids.length, 1)) * Math.PI * 2;

        return {
            degree: degrees.get(id) ?? 0,
            id,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
        };
    });
}

/** Runs the simulation to rest, cooling as it goes. */
export function settle(
    nodes: LayoutNode[],
    edges: readonly { source: string; target: string }[],
    options: LayoutOptions = {},
    steps = stepsFor(nodes.length),
): LayoutNode[] {
    for (let index = 0; index < steps; index += 1) {
        step(nodes, edges, 1 - index / steps, options);
    }

    return nodes;
}

/**
 * One step of the simulation, in place.
 *
 * Velocity is not carried between steps — each is computed from positions alone
 * and damped by `alpha`, which the caller cools. That makes a step idempotent
 * with respect to everything but position, so a paused graph can be resumed, a
 * dragged node can be pinned by simply not moving it, and there is no hidden
 * state to get out of step with the node list.
 */
export function step(
    nodes: LayoutNode[],
    edges: readonly { source: string; target: string }[],
    alpha: number,
    options: LayoutOptions = {},
): void {
    const { gravity, linkDistance, repulsion } = { ...DEFAULTS, ...options };
    const byId = new Map(nodes.map((node) => [node.id, node]));

    // Repulsion falls off with the square of the distance, so past a few cells
    // away it moves a node by less than a pixel — and checking every pair to
    // work that out is what made a 2,000-note vault take five seconds a layout,
    // with the whole app stopped while it ran. Nodes go into a grid of
    // `CUTOFF`-sized cells and only their own cell and its neighbours are
    // considered, which is linear in the node count rather than quadratic.
    const grid = new Map<string, LayoutNode[]>();

    for (const node of nodes) {
        const key = `${Math.floor(node.x / CUTOFF)},${Math.floor(node.y / CUTOFF)}`;
        const cell = grid.get(key);

        if (cell) {
            cell.push(node);
        } else {
            grid.set(key, [node]);
        }
    }

    for (const first of nodes) {
        for (const second of neighbours(grid, first)) {
            // Each pair is pushed apart once, by whichever of the two the outer
            // loop reaches first.
            if (second.id <= first.id) {
                continue;
            }

            let deltaX = second.x - first.x;
            let deltaY = second.y - first.y;
            let distanceSquared = deltaX * deltaX + deltaY * deltaY;

            if (distanceSquared > CUTOFF * CUTOFF) {
                continue;
            }

            // Two nodes at the same point have no direction to separate along.
            // Derived from the ids rather than drawn at random, so a layout is
            // repeatable.
            if (distanceSquared < 0.01) {
                deltaX = (hash(first.id) % 7) * 0.1 - 0.3 || 0.1;
                deltaY = (hash(second.id) % 5) * 0.1 - 0.2 || 0.1;
                distanceSquared = deltaX * deltaX + deltaY * deltaY;
            }

            // Weighted by degree: a hub is drawn larger, so it needs more room
            // than a leaf or the dots at the centre of a cluster overlap.
            const weight = 1 + (first.degree + second.degree) * 0.12;
            const push = (repulsion * weight * alpha) / distanceSquared;
            const distance = Math.sqrt(distanceSquared);
            const shiftX = (deltaX / distance) * push;
            const shiftY = (deltaY / distance) * push;

            first.x -= shiftX;
            first.y -= shiftY;
            second.x += shiftX;
            second.y += shiftY;
        }
    }

    for (const edge of edges) {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);

        if (!source || !target || source === target) {
            continue;
        }

        const deltaX = target.x - source.x;
        const deltaY = target.y - source.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 0.01;
        const pull = ((distance - linkDistance) / distance) * alpha * 0.5;
        const shiftX = deltaX * pull;
        const shiftY = deltaY * pull;

        source.x += shiftX;
        source.y += shiftY;
        target.x -= shiftX;
        target.y -= shiftY;
    }

    for (const node of nodes) {
        node.x -= node.x * gravity * alpha;
        node.y -= node.y * gravity * alpha;
    }
}

/**
 * How many steps a graph of this size is worth.
 *
 * A large graph is settled by its overall shape long before a small one is, and
 * every step costs more, so running the full count on a big vault spends
 * seconds to move dots by a pixel. Fewer steps there keeps opening the graph
 * quick without the picture visibly suffering.
 */
export function stepsFor(count: number): number {
    if (count <= 200) {
        return SETTLE_STEPS;
    }

    return Math.max(70, Math.round(SETTLE_STEPS * Math.sqrt(200 / count)));
}
