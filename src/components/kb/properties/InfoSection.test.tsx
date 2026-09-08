// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Item } from '../../../store/types';

import { useStore } from '../../../store/useStore';
import { InfoSection } from './InfoSection';

afterEach(cleanup);

const item: Item = {
    createdAt: '2026-09-08T12:00:00.000Z',
    flags: {},
    id: 'i1',
    path: 'Reading List/homework.md',
    related: [],
    tags: [],
    title: 'Homework',
    type: 'note',
    updatedAt: '2026-09-08T12:00:00.000Z',
};

function mount(overrides: Partial<Item> = {}) {
    const rename = vi.fn();
    useStore.setState({ renameItemFile: rename });
    const view = render(<InfoSection item={{ ...item, ...overrides }} meta={null} />);
    const file = () => view.container.querySelector('[title]') as HTMLElement;
    return { ...view, file, rename };
}

describe('InfoSection file row', () => {
    it('shows the filename, not the whole path', () => {
        const { file } = mount();
        expect(file().textContent).toBe('homework.md');
    });

    it('keeps the full path available without spending width on it', () => {
        const { file } = mount();
        expect(file().getAttribute('title')).toContain('Reading List/homework.md');
    });

    it('renames on Enter', () => {
        const { container, file, rename } = mount();
        fireEvent.click(file());
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.value).toBe('homework');

        fireEvent.change(input, { target: { value: 'maths' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(rename).toHaveBeenCalledWith('i1', 'maths');
    });

    it('does not rename when the name is unchanged or empty', () => {
        // Renaming moves the file and rewrites inbound links.
        for (const value of ['homework', '  ', '']) {
            const { container, file, rename } = mount();
            fireEvent.click(file());
            const input = container.querySelector('input') as HTMLInputElement;
            fireEvent.change(input, { target: { value } });
            fireEvent.keyDown(input, { key: 'Enter' });
            expect(rename, value).not.toHaveBeenCalled();
            cleanup();
        }
    });

    it('abandons the edit on Escape', () => {
        const { container, file, rename } = mount();
        fireEvent.click(file());
        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'maths' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(rename).not.toHaveBeenCalled();
        expect(container.querySelector('input')).toBeNull();
    });

    it('is not editable when the item has no file', () => {
        const { container, rename } = mount({ path: undefined });
        const dash = container.textContent;
        expect(dash).toContain('—');
        const cell = container.querySelectorAll('span');
        cell.forEach((el) => fireEvent.click(el));
        expect(container.querySelector('input')).toBeNull();
        expect(rename).not.toHaveBeenCalled();
    });
});
