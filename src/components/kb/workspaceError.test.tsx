// @vitest-environment jsdom

// What the switcher says when a vault will not open. The banner used to report
// only that something went wrong, which is no help when the reason is that
// another Lore holds the folder and the fix is to quit that one.

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useStore } from '../../store/useStore';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

afterEach(() => {
    cleanup();
    useStore.setState({ workspaceError: null, workspacePath: null });
});

const withError = (workspaceError: null | string) => {
    useStore.setState({ workspaceError, workspacePath: null });

    return render(<WorkspaceSwitcher />).container.textContent ?? '';
};

describe('the vault error banner', () => {
    it('says which Lore holds the folder, in the engine’s own words', () => {
        const text = withError('This vault belongs to Lore Dev. Open a different folder.');

        expect(text).toContain('This vault belongs to Lore Dev.');
    });

    it('still says which vault is being stayed on', () => {
        expect(withError('Nope.')).toContain('Local vault');
    });

    it('punctuates a message that arrived without any', () => {
        // It comes off a thrown error, so nothing guarantees the shape.
        expect(withError('the data engine is not reachable')).toContain(
            'The data engine is not reachable.',
        );
    });

    it('falls back to a sentence of its own when the message is empty', () => {
        expect(withError('   ')).toContain('That folder could not be opened.');
    });

    it('says nothing at all when there is no error', () => {
        expect(withError(null)).not.toContain('could not be opened');
    });
});
