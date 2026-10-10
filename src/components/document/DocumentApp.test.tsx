// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentApp } from './DocumentApp';

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

/** The Markdown source editor: a textarea, which jsdom can type into. */
async function openSource(): Promise<HTMLTextAreaElement> {
    await screen.findByText('note.md');
    fireEvent.click(screen.getByRole('button', { name: 'Source' }));

    return (await screen.findByRole('textbox')) as HTMLTextAreaElement;
}

function serve(disk: Disk, writes: unknown[]): void {
    invoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
        if (command === 'read_document') {
            return { ...disk, name: 'note.md', path: '/tmp/note.md' };
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
});
afterEach(cleanup);

describe('DocumentApp', () => {
    it('shows the body without the frontmatter', async () => {
        serve({ modified: 1, text: `${FRONTMATTER}Hello\n` }, []);
        render(<DocumentApp />);

        expect((await openSource()).value).toBe('Hello\n');
    });

    it('saves an edit with the frontmatter untouched', async () => {
        const disk = { modified: 1, text: `${FRONTMATTER}Hello\n` };
        const writes: unknown[] = [];

        serve(disk, writes);
        render(<DocumentApp />);
        fireEvent.change(await openSource(), { target: { value: 'Hello, edited\n' } });

        await waitFor(() => expect(writes).toHaveLength(1), SAVE_TIMEOUT);
        expect(writes[0]).toEqual({ expectedModified: 1, text: `${FRONTMATTER}Hello, edited\n` });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('asks before writing over a file that changed on disk', async () => {
        const disk = { modified: 1, text: 'Mine\n' };
        const writes: unknown[] = [];

        serve(disk, writes);
        render(<DocumentApp />);

        const source = await openSource();

        disk.modified = 7;
        disk.text = 'Theirs\n';
        fireEvent.change(source, { target: { value: 'Mine, edited\n' } });

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
        render(<DocumentApp />);

        const source = await openSource();

        disk.modified = 7;
        disk.text = 'Theirs\n';
        fireEvent.change(source, { target: { value: 'Mine, edited\n' } });
        await screen.findByRole('alert', undefined, SAVE_TIMEOUT);

        const attempts = writes.length;

        fireEvent.click(screen.getByRole('button', { name: 'Reload from disk' }));

        await waitFor(() =>
            expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Theirs\n'),
        );
        expect(disk.text).toBe('Theirs\n');
        expect(writes).toHaveLength(attempts);
    });

    it('picks up an outside edit when the window is focused again', async () => {
        const disk = { modified: 1, text: 'Before\n' };

        serve(disk, []);
        render(<DocumentApp />);

        const source = await openSource();

        expect(source.value).toBe('Before\n');
        disk.modified = 2;
        disk.text = 'After\n';
        fireEvent.focus(window);

        await waitFor(() =>
            expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('After\n'),
        );
    });
});
