// @vitest-environment jsdom

// A link's text is one Markdown field, the same editor a note gets. Older links
// keep the page's blurb in the `description` scalar, so that field has to read
// it, show it once, and fold it into the body on the first edit.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item } from '../../store/types';

import { getRepository } from '../../data';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { DetailPane } from './DetailPane';

/** A seeded link, so a write lands in the repository the store reloads from. */
const ID = 'i1';
const BLURB = 'What the page says about itself.';

/** List rows carry no body, so read the stored item rather than the store's. */
const saved = async (): Promise<Item> => (await getRepository().getItem(ID))!;

const open = async (patch: Partial<Item>): Promise<void> => {
    await useStore.getState().updateItem(ID, patch);
    useStore.setState({ detail: await saved(), selectedId: ID });
    render(<DetailPane />);
};

beforeEach(async () => {
    useStore.setState({ prefs: DEFAULT_PREFS });
    await useStore.getState().refresh();
});

afterEach(cleanup);

describe('a link’s text', () => {
    it('is one field — the blurb a capture saved shows as its content', async () => {
        await open({ body: undefined, description: BLURB });

        expect(screen.getByText(BLURB)).toBeTruthy();
    });

    it('folds that blurb into the body on the first edit', async () => {
        await open({ body: undefined, description: BLURB });

        fireEvent.click(screen.getByText(BLURB));
        const box = screen.getByPlaceholderText('Add a description…');
        expect((box as HTMLTextAreaElement).value).toBe(BLURB);
        fireEvent.change(box, { target: { value: `${BLURB}\n\n## And my own notes` } });
        fireEvent.blur(box);

        await waitFor(async () =>
            expect((await saved()).body).toBe(`${BLURB}\n\n## And my own notes`),
        );
        // Both holding text would show the same words twice, or two fields.
        expect((await saved()).description).toBeUndefined();
    });

    it('edits the body once there is one, leaving no blurb behind', async () => {
        await open({ body: 'My own notes.', description: undefined });

        fireEvent.click(screen.getByText('My own notes.'));
        const box = screen.getByPlaceholderText('Add a description…');
        fireEvent.change(box, { target: { value: 'Rewritten.' } });
        fireEvent.blur(box);

        await waitFor(async () => expect((await saved()).body).toBe('Rewritten.'));
        expect((await saved()).description).toBeUndefined();
    });

    it('asks for a description when the link has no text at all', async () => {
        await open({ body: undefined, description: undefined });

        expect(screen.getByText('Add a description…')).toBeTruthy();
    });
});
