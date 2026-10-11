// The renderer's half of the standalone file's round trip: whatever the body
// is surrounded by on disk is still around it after an edit.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

const { DocumentRepository } = await import('./documentRepository');
const { forgetEndpoint } = await import('./sidecarClient');

let disk: string;
let status: number;

beforeEach(() => {
    status = 200;
    forgetEndpoint();
    invoke.mockReset();
    invoke.mockImplementation(async (command: string, args?: { text: string }) => {
        if (command === 'sidecar_endpoint') {
            return { token: 'tok', url: 'http://127.0.0.1:5000' };
        }

        if (command === 'write_document') {
            disk = args!.text;
        }

        return { created: null, modified: 1, name: 'Notes.MARKDOWN', path: '/tmp/n', text: disk };
    });
    vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init: RequestInit) => {
            const { text } = JSON.parse(String(init.body)) as { text: string };
            const item = { flags: {}, id: 'engine', related: [], tags: [], title: 'T' };

            return new Response(
                JSON.stringify(
                    status === 200
                        ? { ...item, item, text: `---\nurl: x\n---\n\n${text}` }
                        : { error: 'frontmatter_unreadable' },
                ),
                { status },
            );
        }),
    );
});

const edit = async (text: string, body: string | undefined): Promise<string> => {
    disk = text;
    await new DocumentRepository().updateItem('any', { body });

    return disk;
};

describe('a body edit', () => {
    const cases: [name: string, before: string, body: string | undefined, after: string][] = [
        [
            'keeps the frontmatter verbatim',
            '---\nx:  [1]\n---\nOld\n',
            'New',
            '---\nx:  [1]\n---\nNew\n',
        ],
        [
            'keeps the blank lines on both sides',
            '---\n---\n\n\nOld\n\n\n',
            'New',
            '---\n---\n\n\nNew\n\n\n',
        ],
        [
            'keeps CRLF around the body',
            '---\r\n---\r\n\r\nOld\r\n',
            'New',
            '---\r\n---\r\n\r\nNew\r\n',
        ],
        ['keeps a file that ends without a line end that way', 'Old', 'New', 'New'],
        [
            'keeps the indentation of an opening code block',
            '\n    code\n',
            '    more',
            '\n    more\n',
        ],
        ['ends an empty file with a line end', '', 'New', 'New\n'],
        [
            'empties the body and leaves the rest',
            '---\na: 1\n---\n\nOld\n',
            undefined,
            '---\na: 1\n---\n\n\n',
        ],
    ];

    for (const [name, before, body, after] of cases) {
        it(name, async () => {
            expect(await edit(before, body)).toBe(after);
        });
    }

    it('does not write a body that did not change', async () => {
        disk = 'Same\n';
        await new DocumentRepository().updateItem('any', { body: 'Same' });

        expect(invoke).not.toHaveBeenCalledWith('write_document', expect.anything());
    });
});

describe('the item', () => {
    it('carries the body as split here, the path as its id and the file name', async () => {
        disk = '---\ntitle: T\n---\n\nBody\n';

        const item = await new DocumentRepository().getItem();

        expect(item).toMatchObject({ body: 'Body', id: '/tmp/n', path: 'Notes.MARKDOWN' });
    });
});

describe('a property edit', () => {
    it('writes what the engine answers, split again into its parts', async () => {
        disk = 'Body\n';

        const repository = new DocumentRepository();

        await repository.updateItem('any', { url: 'x' });
        expect(disk).toBe('---\nurl: x\n---\n\nBody\n');

        await repository.updateItem('any', { body: 'Next' });
        expect(disk).toBe('---\nurl: x\n---\n\nNext\n');
    });

    it('still lands the body when the engine refuses the frontmatter', async () => {
        disk = '---\ntitle: [unclosed\n---\nOld\n';

        const repository = new DocumentRepository();

        await repository.getItem();
        status = 422;
        await repository.updateItem('any', { body: 'New', description: undefined });

        expect(disk).toBe('---\ntitle: [unclosed\n---\nNew\n');
        expect(repository.status.error).toMatch(/frontmatter/);
    });
});
