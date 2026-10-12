// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AiBackendStatus } from '../../store/types';

import { provideAi } from '../../ai';
import { FakeAi } from '../../ai/fakeAi';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { CapturePane } from './panes';

const CLAUDE: AiBackendStatus = {
    available: true,
    hasKey: false,
    id: 'claude-cli',
    kind: 'harness',
    label: 'Claude Code',
};
const CODEX: AiBackendStatus = { ...CLAUDE, available: false, id: 'codex-cli', label: 'Codex' };
const ANTHROPIC: AiBackendStatus = {
    available: true,
    defaultModel: 'claude-sonnet-5-5',
    hasKey: false,
    id: 'anthropic',
    kind: 'api',
    label: 'Anthropic',
};

let ai: FakeAi;

beforeEach(() => {
    ai = new FakeAi();
    ai.backends = [CLAUDE, CODEX, ANTHROPIC];
    provideAi(ai);
    useStore.setState({ prefs: DEFAULT_PREFS });
});

afterEach(() => {
    cleanup();
    provideAi(null);
});

async function choose(label: string): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: 'Model' }));
    fireEvent.click(await screen.findByRole('option', { name: label }));
}

describe('the assistant settings', () => {
    it('is off by default and says nothing leaves the machine', () => {
        render(<CapturePane />);

        expect(screen.getByRole('button', { name: 'Model' }).textContent).toContain('Off');
        expect(screen.getByText(/nothing leaves this Mac/)).toBeTruthy();
        expect(useStore.getState().prefs.switches.aiSuggest).toBe(false);
    });

    it('offers the agents that are installed and leaves out the ones that are not', async () => {
        render(<CapturePane />);
        fireEvent.click(screen.getByRole('button', { name: 'Model' }));

        expect(await screen.findByRole('option', { name: 'Claude Code' })).toBeTruthy();
        expect(screen.getByRole('option', { name: 'Anthropic' })).toBeTruthy();
        expect(screen.queryByRole('option', { name: /Codex/ })).toBeNull();
    });

    it('needs no key for an installed agent', async () => {
        render(<CapturePane />);
        await choose('Claude Code');

        expect(useStore.getState().prefs.aiBackend).toBe('claude-cli');
        expect(screen.queryByLabelText(/API key/)).toBeNull();
        expect(screen.getByText(/It can only read the vault/)).toBeTruthy();
    });

    it('hands a pasted key to the engine and keeps no copy of it', async () => {
        render(<CapturePane />);
        await choose('Anthropic');

        const field = screen.getByLabelText('Anthropic API key') as HTMLInputElement;

        fireEvent.change(field, { target: { value: ' sk-secret ' } });
        fireEvent.keyDown(field, { key: 'Enter' });

        await waitFor(() => expect(ai.keys.get('anthropic')).toBe('sk-secret'));
        await screen.findByRole('button', { name: 'Remove key' });

        expect(field.value).toBe('');
        expect(JSON.stringify(useStore.getState().prefs)).not.toContain('sk-secret');

        fireEvent.click(screen.getByRole('button', { name: 'Remove key' }));

        await waitFor(() => expect(ai.keys.has('anthropic')).toBe(false));
    });

    it('saves an endpoint’s key together with the endpoint it is for', async () => {
        ai.backends = [
            { ...ANTHROPIC, defaultModel: undefined, id: 'openai-compatible', label: 'Gateway' },
        ];
        useStore.setState({
            prefs: {
                ...DEFAULT_PREFS,
                aiBackend: 'openai-compatible',
                aiBaseUrl: 'https://gateway.example/v1',
            },
        });
        render(<CapturePane />);

        const field = await screen.findByLabelText('Gateway API key');

        fireEvent.change(field, { target: { value: 'sk-secret' } });
        fireEvent.keyDown(field, { key: 'Enter' });

        await waitFor(() =>
            expect(ai.endpoints.get('openai-compatible')).toBe('https://gateway.example/v1'),
        );
    });

    it('still names a chosen agent that has since been uninstalled', async () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, aiBackend: 'codex-cli' } });
        render(<CapturePane />);

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Model' }).textContent).toContain(
                'Codex (not installed)',
            ),
        );
    });
});
