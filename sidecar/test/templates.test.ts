// `.lore/templates/` — hand-written Markdown, so the tests that matter are the
// ones about a file someone wrote without reading a spec.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { listTemplates, TEMPLATES_DIR } from '../src/templates';
import { Vault } from '../src/vault';

let root: string;
let vault: Vault;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-tpl-'));
    vault = new Vault(root);
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

const write = async (filename: string, text: string): Promise<void> => {
    await mkdir(join(root, TEMPLATES_DIR), { recursive: true });
    await writeFile(join(root, TEMPLATES_DIR, filename), text, 'utf8');
};

describe('listTemplates', () => {
    it('answers empty when the vault has no templates folder', async () => {
        expect(await listTemplates(vault)).toEqual([]);
    });

    it('reads the frontmatter as the item it will make', async () => {
        await write(
            'Meeting.md',
            [
                '---',
                'type: note',
                'tags:',
                '  - meeting',
                'collection: Work',
                '---',
                '',
                '## Agenda',
                '',
            ].join('\n'),
        );

        expect(await listTemplates(vault)).toEqual([
            {
                body: '## Agenda\n',
                collectionId: 'Work',
                name: 'Meeting',
                tags: ['meeting'],
                title: undefined,
                type: 'note',
            },
        ]);
    });

    it('takes a plain Markdown file with no frontmatter as a note', async () => {
        await write('Scratch.md', '# Heading\n');

        const [template] = await listTemplates(vault);

        expect(template.type).toBe('note');
        expect(template.body).toBe('# Heading\n');
        expect(template.tags).toEqual([]);
    });

    it('falls back to a note rather than dropping an unknown type', async () => {
        await write('Odd.md', '---\ntype: spreadsheet\n---\n\nbody\n');

        expect((await listTemplates(vault))[0].type).toBe('note');
    });

    it('survives malformed YAML', async () => {
        await write('Broken.md', '---\ntags: [unclosed\n---\n\nstill here\n');

        const [template] = await listTemplates(vault);

        expect(template.name).toBe('Broken');
        expect(template.tags).toEqual([]);
    });

    it('ignores everything that is not Markdown', async () => {
        await write('Note.md', 'body\n');
        await write('README.txt', 'not a template\n');
        await write('.DS_Store', '\n');

        expect((await listTemplates(vault)).map((template) => template.name)).toEqual(['Note']);
    });

    it('sorts by name, since the menu has no other order to offer', async () => {
        await write('Zebra.md', 'z\n');
        await write('Apple.md', 'a\n');

        expect((await listTemplates(vault)).map((template) => template.name)).toEqual([
            'Apple',
            'Zebra',
        ]);
    });
});
