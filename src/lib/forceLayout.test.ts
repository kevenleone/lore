import { describe, expect, it } from 'vitest';

import { seed, settle, step } from './forceLayout';

const degrees = (ids: string[]) => new Map(ids.map((id) => [id, 1]));

const spread = (nodes: { x: number; y: number }[]) => {
    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);

    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
};

const gap = (nodes: { id: string; x: number; y: number }[], first: string, second: string) => {
    const one = nodes.find((node) => node.id === first)!;
    const two = nodes.find((node) => node.id === second)!;

    return Math.hypot(one.x - two.x, one.y - two.y);
};

describe('seed', () => {
    it('places every node', () => {
        expect(seed(['a', 'b', 'c'], degrees(['a', 'b', 'c']))).toHaveLength(3);
    });

    it('starts them apart rather than stacked', () => {
        const nodes = seed(['a', 'b', 'c'], degrees(['a', 'b', 'c']));

        expect(gap(nodes, 'a', 'b')).toBeGreaterThan(1);
    });

    it('lays a vault out the same way twice', () => {
        const ids = ['a', 'b', 'c', 'd'];
        const first = settle(seed(ids, degrees(ids)), [{ source: 'a', target: 'b' }]);
        const second = settle(seed(ids, degrees(ids)), [{ source: 'a', target: 'b' }]);

        expect(first).toEqual(second);
    });

    it('carries the degree through, which is what sizes a dot', () => {
        const nodes = seed(['a'], new Map([['a', 5]]));

        expect(nodes[0].degree).toBe(5);
    });
});

describe('step', () => {
    it('pushes two unlinked nodes apart', () => {
        const nodes = [
            { degree: 0, id: 'a', x: 5, y: 0 },
            { degree: 0, id: 'b', x: -5, y: 0 },
        ];
        const before = gap(nodes, 'a', 'b');

        step(nodes, [], 1);

        expect(gap(nodes, 'a', 'b')).toBeGreaterThan(before);
    });

    it('separates two nodes sitting on the same point', () => {
        const nodes = [
            { degree: 0, id: 'a', x: 0, y: 0 },
            { degree: 0, id: 'b', x: 0, y: 0 },
        ];

        step(nodes, [], 1);

        expect(gap(nodes, 'a', 'b')).toBeGreaterThan(0);
        expect(Number.isFinite(nodes[0].x)).toBe(true);
    });

    it('pulls a stretched edge back together', () => {
        const nodes = [
            { degree: 1, id: 'a', x: 600, y: 0 },
            { degree: 1, id: 'b', x: -600, y: 0 },
        ];
        const before = gap(nodes, 'a', 'b');

        step(nodes, [{ source: 'a', target: 'b' }], 1);

        expect(gap(nodes, 'a', 'b')).toBeLessThan(before);
    });

    it('ignores an edge naming a node that is not here', () => {
        const nodes = [{ degree: 0, id: 'a', x: 1, y: 1 }];

        step(nodes, [{ source: 'a', target: 'gone' }], 1);

        expect(Number.isFinite(nodes[0].x)).toBe(true);
    });

    it('ignores a node linked to itself', () => {
        const nodes = [{ degree: 1, id: 'a', x: 3, y: 4 }];

        step(nodes, [{ source: 'a', target: 'a' }], 1);

        expect(Number.isFinite(nodes[0].x)).toBe(true);
    });
});

describe('settle', () => {
    it('brings linked nodes closer than unlinked ones', () => {
        const ids = ['a', 'b', 'c'];
        const nodes = settle(seed(ids, degrees(ids)), [{ source: 'a', target: 'b' }]);

        expect(gap(nodes, 'a', 'b')).toBeLessThan(gap(nodes, 'a', 'c'));
    });

    it('keeps everything finite on a graph with no edges at all', () => {
        const ids = ['a', 'b', 'c', 'd', 'e'];
        const nodes = settle(seed(ids, degrees(ids)), []);

        expect(nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(
            true,
        );
    });

    it('does not let an unlinked vault drift off without bound', () => {
        const ids = Array.from({ length: 30 }, (_unused, index) => `n${index}`);
        const nodes = settle(seed(ids, degrees(ids)), []);

        expect(spread(nodes)).toBeLessThan(6000);
    });

    it('handles a single node', () => {
        const nodes = settle(seed(['only'], degrees(['only'])), []);

        expect(Number.isFinite(nodes[0].x)).toBe(true);
    });

    it('handles an empty graph', () => {
        expect(settle([], [])).toEqual([]);
    });
});
