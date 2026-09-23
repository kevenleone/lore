// Wikilinks written in the prose, which are edges the same way a frontmatter
// `related` entry is. The interesting cases are all about what is *not* a link:
// code showing the syntax, and a note pointing at itself.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VaultStore } from '../src/index/store';
import { bodyWikilinks } from '../src/links';

describe('bodyWikilinks', () => {
    it('finds one written mid-sentence', () => {
        expect(bodyWikilinks('As [[Linear]] does it, roughly.')).toEqual(['[[Linear]]']);
    });

    it('finds several, in the order they were written', () => {
        expect(bodyWikilinks('[[Beta]] then [[Alpha]]')).toEqual(['[[Beta]]', '[[Alpha]]']);
    });

    it('counts a repeated link once', () => {
        expect(bodyWikilinks('[[Linear]] and again [[Linear]]')).toEqual(['[[Linear]]']);
    });

    it('keeps an alias and a heading, which resolution strips later', () => {
        expect(bodyWikilinks('[[Linear#Pricing|how they price]]')).toEqual([
            '[[Linear#Pricing|how they price]]',
        ]);
    });

    it('ignores one inside a fenced block, which is showing the syntax', () => {
        const body = ['Use it like this:', '', '```md', 'See [[Linear]]', '```', ''].join('\n');

        expect(bodyWikilinks(body)).toEqual([]);
    });

    it('ignores one in a tilde fence too', () => {
        expect(bodyWikilinks('~~~\n[[Linear]]\n~~~\n')).toEqual([]);
    });

    it('ignores one in a backtick span', () => {
        expect(bodyWikilinks('Write `[[Linear]]` to link.')).toEqual([]);
    });

    it('still finds the real one beside a fenced example', () => {
        const body = ['```md', '[[Example]]', '```', '', 'Really about [[Linear]].'].join('\n');

        expect(bodyWikilinks(body)).toEqual(['[[Linear]]']);
    });

    it('takes an unclosed fence as running to the end, the way a reader would', () => {
        expect(bodyWikilinks('```\n[[Linear]]\n')).toEqual([]);
    });

    it('is not fooled by a single bracket pair', () => {
        expect(bodyWikilinks('An [ordinary](link) and [text].')).toEqual([]);
    });

    it('answers empty for a body with no links at all', () => {
        expect(bodyWikilinks('Just prose.')).toEqual([]);
    });
});

describe('body links in the index', () => {
    let root: string;
    let store: VaultStore;

    const write = (name: string, text: string) => writeFile(join(root, name), text, 'utf8');

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'lore-links-'));
    });

    afterEach(async () => {
        await rm(root, { force: true, recursive: true });
    });

    const open = async (): Promise<void> => {
        store = await VaultStore.open(root);
        await store.reconcile();
    };

    it('makes a backlink out of a mention in the prose', async () => {
        await write('linear.md', '---\ntitle: Linear\n---\n\nA tool.\n');
        await write('notes.md', '---\ntitle: Notes\n---\n\nAs [[linear]] does it.\n');
        await open();

        const linear = store.listItems().find((item) => item.title === 'Linear')!;

        expect(store.itemMeta(linear.id)?.backlinks.map((item) => item.title)).toEqual(['Notes']);
    });

    it('does not make one out of a fenced example', async () => {
        await write('linear.md', '---\ntitle: Linear\n---\n\nA tool.\n');
        await write('notes.md', '---\ntitle: Notes\n---\n\n```\n[[linear]]\n```\n');
        await open();

        const linear = store.listItems().find((item) => item.title === 'Linear')!;

        expect(store.itemMeta(linear.id)?.backlinks).toEqual([]);
    });

    it('does not make a note its own backlink', async () => {
        await write('linear.md', '---\ntitle: Linear\n---\n\nSee [[linear]].\n');
        await open();

        const linear = store.listItems()[0];

        expect(store.itemMeta(linear.id)?.backlinks).toEqual([]);
    });

    it('counts a note linked both ways once', async () => {
        await write('linear.md', '---\ntitle: Linear\n---\n\nA tool.\n');
        await write(
            'notes.md',
            "---\ntitle: Notes\nrelated:\n  - '[[linear]]'\n---\n\nAs [[linear]] does it.\n",
        );
        await open();

        const linear = store.listItems().find((item) => item.title === 'Linear')!;

        expect(store.itemMeta(linear.id)?.backlinks.map((item) => item.title)).toEqual(['Notes']);
    });

    it('drops the edge when the mention is edited away', async () => {
        await write('linear.md', '---\ntitle: Linear\n---\n\nA tool.\n');
        await write('notes.md', '---\ntitle: Notes\n---\n\nAs [[linear]] does it.\n');
        await open();

        await write('notes.md', '---\ntitle: Notes\n---\n\nNo longer about it.\n');
        await store.reconcile();

        const linear = store.listItems().find((item) => item.title === 'Linear')!;

        expect(store.itemMeta(linear.id)?.backlinks).toEqual([]);
    });

    it('leaves the frontmatter list alone — a mention is not a `related` entry', async () => {
        await write('linear.md', '---\ntitle: Linear\n---\n\nA tool.\n');
        await write('notes.md', '---\ntitle: Notes\n---\n\nAs [[linear]] does it.\n');
        await open();

        const notes = store.listItems().find((item) => item.title === 'Notes')!;

        expect(notes.related).toEqual([]);
        expect(await Bun.file(join(root, 'notes.md')).text()).not.toContain('related:');
    });
});
