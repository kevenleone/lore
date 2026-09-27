// @vitest-environment jsdom

// What the switcher says when a vault will not open. It used to report only
// that something went wrong, which leaves the user nowhere to go when the
// engine's message says exactly what did.

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
    it('gives the reason, in the engine’s own words', () => {
        expect(withError('That folder is not readable.')).toContain('That folder is not readable.');
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
