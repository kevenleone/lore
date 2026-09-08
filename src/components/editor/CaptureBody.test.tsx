// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useStore } from '../../store/useStore';
import { CaptureBody } from './CaptureBody';

// The editor is a dynamic import, which can outrun waitFor's 1s default
// when the full suite saturates the workers.
const MOUNT_TIMEOUT = { timeout: 10_000 };

afterEach(cleanup);

Range.prototype.getBoundingClientRect = () => new DOMRect();
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

function setBlockEditor(on: boolean): void {
    const state = useStore.getState();
    useStore.setState({
        prefs: { ...state.prefs, switches: { ...state.prefs.switches, blockEditor: on } },
    });
}

const mount = (value: string, onChange = vi.fn()) =>
    render(
        <CaptureBody
            className="min-h-[150px]"
            onChange={onChange}
            placeholder="Write a note…"
            value={value}
        />,
    );

describe('CaptureBody', () => {
    it('is a plain textarea while the flag is off', () => {
        setBlockEditor(false);
        const { container } = mount('hello');
        const textarea = container.querySelector('textarea');
        expect(textarea).not.toBeNull();
        expect(textarea?.value).toBe('hello');
        expect(container.querySelector('.ProseMirror')).toBeNull();
    });

    it('reports typing through onChange when it is a textarea', () => {
        setBlockEditor(false);
        const onChange = vi.fn();
        const { container } = mount('', onChange);
        // React tracks the value through a native setter, so assigning
        // `.value` directly does not produce a change event it will see.
        fireEvent.change(container.querySelector('textarea')!, { target: { value: 'typed' } });
        expect(onChange).toHaveBeenCalledWith('typed');
    });

    it('upgrades to the block editor when the flag is on', async () => {
        setBlockEditor(true);
        const { container } = mount('# Heading\n\ntext\n');
        await waitFor(
            () => expect(container.querySelector('.ProseMirror')).not.toBeNull(),
            MOUNT_TIMEOUT,
        );
        expect(container.textContent).toContain('Heading');
        expect(container.querySelector('textarea')).toBeNull();
    });

    it('keeps the field box so the drawer does not grow', async () => {
        setBlockEditor(true);
        const { container } = mount('text\n');
        await waitFor(
            () => expect(container.querySelector('.ProseMirror')).not.toBeNull(),
            MOUNT_TIMEOUT,
        );
        // The stylesheet hangs the editor's height off this wrapper.
        expect(container.querySelector('.lore-capture-body')?.className).toContain('min-h-[150px]');
    });
});
