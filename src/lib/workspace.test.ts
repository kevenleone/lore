import { describe, expect, it } from 'vitest';

import type { WorkspaceRef } from '../store/persisted';

import { rememberWorkspace, tildePath, workspaceName } from './workspace';

const ref = (path: string, at = '2026-01-01T00:00:00.000Z'): WorkspaceRef => ({
    lastOpenedAt: at,
    name: workspaceName(path),
    path,
});

describe('workspaceName', () => {
    it("uses the folder's own name", () => {
        expect(workspaceName('/Users/x/Notes/Research')).toBe('Research');
    });

    it('tolerates a trailing slash', () => {
        expect(workspaceName('/Users/x/Research/')).toBe('Research');
    });

    it('falls back to the path when there is no basename', () => {
        expect(workspaceName('/')).toBe('/');
    });
});

describe('rememberWorkspace', () => {
    it('puts the newest first', () => {
        const next = rememberWorkspace([ref('/a'), ref('/b')], '/c');
        expect(next.map((r) => r.path)).toEqual(['/c', '/a', '/b']);
    });

    it('moves an existing entry to the front instead of duplicating it', () => {
        const next = rememberWorkspace([ref('/a'), ref('/b')], '/b');
        expect(next.map((r) => r.path)).toEqual(['/b', '/a']);
    });

    it('caps the list so it cannot grow without bound', () => {
        let recents: WorkspaceRef[] = [];
        for (let i = 0; i < 12; i += 1) recents = rememberWorkspace(recents, `/vault-${i}`);
        expect(recents).toHaveLength(8);
        expect(recents[0].path).toBe('/vault-11');
    });

    it('stamps the open time', () => {
        const before = Date.now();
        const [entry] = rememberWorkspace([], '/x');
        expect(new Date(entry.lastOpenedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });
});

describe('tildePath', () => {
    it('shortens a path under the home directory', () => {
        expect(tildePath('/Users/x/Documents/Lore Vault', '/Users/x')).toBe(
            '~/Documents/Lore Vault',
        );
    });

    it('leaves a path outside the home directory alone', () => {
        expect(tildePath('/Volumes/Archive/Notes', '/Users/x')).toBe('/Volumes/Archive/Notes');
    });

    it('leaves the home directory itself alone — `~` is not a folder name', () => {
        expect(tildePath('/Users/x', '/Users/x')).toBe('/Users/x');
    });

    it('does not treat a sibling with a shared prefix as being inside home', () => {
        expect(tildePath('/Users/xavier/Notes', '/Users/x')).toBe('/Users/xavier/Notes');
    });

    it('passes the path through when there is no home to resolve against', () => {
        expect(tildePath('/Users/x/Notes', null)).toBe('/Users/x/Notes');
    });
});
