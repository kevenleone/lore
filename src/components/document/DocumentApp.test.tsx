// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideRepository } from '../../data';
import { DocumentRepository } from '../../data/documentRepository';
import { forgetEndpoint } from '../../data/sidecarClient';
import { useStore } from '../../store/useStore';
import { DocumentApp } from './DocumentApp';
import { borrowPreferences } from './standalone';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/api/path', () => ({ homeDir: () => Promise.resolve('/tmp') }));

const FRONTMATTER = '---\ntitle: Kept\nx-unknown: [1,  2]\n---\n';
// Past the editor's 600ms autosave.
const SAVE_TIMEOUT = { timeout: 5000 };

interface Disk {
    modified: number;
    text: string;
}

interface EngineCall {
    patch?: Record<string, unknown>;
    text: string;
}

/**
 * A stand-in for the engine's two document routes. The real ones have their
 * own fixtures; what matters here is what this side sends and what it does
 * with the answer, so the body it returns is deliberately not the file's.
 */
function engine(calls: EngineCall[], down = false): void {
    const item = (text: string) => ({
        body: 'the engine trims its own way',
        createdAt: '2026-01-01T00:00:00.000Z',
        flags: /^starred: true$/m.test(text) ? { starred: true } : {},
        id: 'engine',
        related: [],
        tags: [],
        title: /^title: (.+)$/m.exec(text)?.[1] ?? 'note',
        type: 'note',
        updatedAt: '2026-01-01T00:00:00.000Z',
    });

    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
            if (down) {
                throw new TypeError('connection refused');
            }

            const call = JSON.parse(String(init.body)) as EngineCall;

            calls.push(call);

            if (url.endsWith('/documents/parse')) {
                return new Response(JSON.stringify(item(call.text)));
            }

            const text = call.text.replace('\n---\n', '\nstarred: true\n---\n');

            return new Response(JSON.stringify({ item: item(text), text }));
        }),
    );
}

function open(): void {
    const repository = new DocumentRepository();

    provideRepository(repository);
    render(<DocumentApp repository={repository} />);
}

/** The Markdown source editor: a textarea, which jsdom can type into. */
async function openSource(): Promise<HTMLTextAreaElement> {
    fireEvent.click(await screen.findByTitle('Edit raw Markdown'));

    return (await screen.findByRole('textbox')) as HTMLTextAreaElement;
}

function serve(disk: Disk, writes: unknown[]): void {
    invoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
        if (command === 'sidecar_endpoint') {
            return { token: 'tok', url: 'http://127.0.0.1:5000' };
        }

        if (command === 'read_document') {
            return { ...disk, created: 0, name: 'note.md', path: '/tmp/note.md' };
        }

        if (command !== 'write_document') {
            throw new Error(`unexpected command ${command}`);
        }

        writes.push(args);

        if (args?.expectedModified !== null && args?.expectedModified !== disk.modified) {
            throw 'changed_on_disk';
        }

        disk.text = String(args?.text);
        disk.modified += 1;

        return disk.modified;
    });
}

// Braces matter: Vitest would call a returned mock as the teardown.
beforeEach(() => {
    invoke.mockReset();
    forgetEndpoint();
    engine([]);
    borrowPreferences();
    useStore.setState({
        detail: null,
        editorDirtyId: null,
        itemMeta: null,
        items: [],
        selectedId: null,
    });
});

afterEach(() => {
    cleanup();
    provideRepository(null);
    vi.unstubAllGlobals();
});

describe('DocumentApp', () => {
    it('shows the file the way the library shows an item', async () => {
        serve({ modified: 1, text: `${FRONTMATTER}\nHello\n` }, []);
        open();

        expect(await screen.findByRole('heading', { name: 'Kept' })).toBeTruthy();
        expect(screen.getByTitle('Star')).toBeTruthy();
        expect(screen.getAllByText('note.md').length).toBeGreaterThan(0);
        expect((await openSource()).value).toBe('Hello');
    });

    it('leaves out what only a vault can answer', async () => {
        serve({ modified: 1, text: 'Hello\n' }, []);
        open();
        fireEvent.click(await screen.findByTitle(/^Properties/));

        expect(await screen.findByText('Thumbnail')).toBeTruthy();
        expect(screen.queryByText('Collection')).toBeNull();
        expect(screen.queryByText('Relationships')).toBeNull();
        expect(screen.queryByText('Unfiled')).toBeNull();
        expect(screen.queryByTitle('Delete')).toBeNull();
    });

    it('saves an edit with every byte around the body untouched', async () => {
        const disk = { modified: 1, text: `${FRONTMATTER}\n\nHello\n\n` };
        const writes: unknown[] = [];

        serve(disk, writes);
        open();
        fireEvent.change(await openSource(), { target: { value: 'Hello, edited' } });

        await waitFor(() => expect(writes).toHaveLength(1), SAVE_TIMEOUT);
        expect(writes[0]).toEqual({
            expectedModified: 1,
            text: `${FRONTMATTER}\n\nHello, edited\n\n`,
        });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('sends a property edit to the engine and writes what it answers', async () => {
        const disk = { modified: 1, text: `${FRONTMATTER}Hello\n` };
        const writes: unknown[] = [];
        const calls: EngineCall[] = [];

        serve(disk, writes);
        engine(calls);
        open();
        fireEvent.click(await screen.findByTitle('Star'));

        await waitFor(() => expect(writes).toHaveLength(1));
        expect(calls[calls.length - 1]).toMatchObject({
            patch: { flags: { starred: true } },
            text: `${FRONTMATTER}Hello\n`,
        });
        expect(disk.text).toBe('---\ntitle: Kept\nx-unknown: [1,  2]\nstarred: true\n---\nHello\n');
        expect(await screen.findByTitle('Unstar')).toBeTruthy();
    });

    it('still edits the body when the engine cannot be reached', async () => {
        const disk = { modified: 1, text: `${FRONTMATTER}Hello\n` };
        const writes: unknown[] = [];

        serve(disk, writes);
        engine([], true);
        open();

        expect(await screen.findByRole('heading', { name: 'note' })).toBeTruthy();
        fireEvent.change(await openSource(), { target: { value: 'Hello, edited' } });

        await waitFor(() => expect(writes).toHaveLength(1), SAVE_TIMEOUT);
        expect(disk.text).toBe(`${FRONTMATTER}Hello, edited\n`);
    });

    it('asks before writing over a file that changed on disk', async () => {
        const disk = { modified: 1, text: 'Mine\n' };
        const writes: unknown[] = [];

        serve(disk, writes);
        open();

        const source = await openSource();

        disk.modified = 7;
        disk.text = 'Theirs\n';
        fireEvent.change(source, { target: { value: 'Mine, edited' } });

        await screen.findByRole('alert', undefined, SAVE_TIMEOUT);
        expect(disk.text).toBe('Theirs\n');

        fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));

        await waitFor(() => expect(disk.text).toBe('Mine, edited\n'));
        expect(writes[writes.length - 1]).toEqual({
            expectedModified: null,
            text: 'Mine, edited\n',
        });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('drops the edit and shows the disk copy on reload', async () => {
        const disk = { modified: 1, text: 'Mine\n' };
        const writes: unknown[] = [];

        serve(disk, writes);
        open();

        const source = await openSource();

        disk.modified = 7;
        disk.text = 'Theirs\n';
        fireEvent.change(source, { target: { value: 'Mine, edited' } });
        await screen.findByRole('alert', undefined, SAVE_TIMEOUT);

        const attempts = writes.length;

        fireEvent.click(screen.getByRole('button', { name: 'Reload from disk' }));

        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
        expect((await openSource()).value).toBe('Theirs');
        expect(disk.text).toBe('Theirs\n');
        expect(writes).toHaveLength(attempts);
    });

    it('picks up an outside edit when the window is focused again', async () => {
        const disk = { modified: 1, text: 'Before\n' };

        serve(disk, []);
        open();

        expect((await openSource()).value).toBe('Before');
        disk.modified = 2;
        disk.text = 'After\n';
        fireEvent.focus(window);

        await waitFor(async () => expect((await openSource()).value).toBe('After'));
    });
});
