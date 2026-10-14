// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AgentStatus, AiBackendStatus } from '../../store/types';

import { provideAi } from '../../ai';
import { FakeAi } from '../../ai/fakeAi';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { AiPane } from './panes';

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
        render(<AiPane />);

        expect(screen.getByRole('button', { name: 'Model' }).textContent).toContain('Off');
        expect(screen.getByText(/nothing leaves this Mac/)).toBeTruthy();
        expect(useStore.getState().prefs.switches.aiSuggest).toBe(false);
    });

    it('offers the agents that are installed and leaves out the ones that are not', async () => {
        render(<AiPane />);
        fireEvent.click(screen.getByRole('button', { name: 'Model' }));

        expect(await screen.findByRole('option', { name: 'Claude Code' })).toBeTruthy();
        expect(screen.getByRole('option', { name: 'Anthropic' })).toBeTruthy();
        expect(screen.queryByRole('option', { name: /Codex/ })).toBeNull();
    });

    it('needs no key for an installed agent', async () => {
        render(<AiPane />);
        await choose('Claude Code');

        expect(useStore.getState().prefs.aiBackend).toBe('claude-cli');
        expect(screen.queryByLabelText(/API key/)).toBeNull();
        expect(screen.getByText(/It can only read the vault/)).toBeTruthy();
    });

    it('hands a pasted key to the engine and keeps no copy of it', async () => {
        render(<AiPane />);
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
        render(<AiPane />);

        const field = await screen.findByLabelText('Gateway API key');

        fireEvent.change(field, { target: { value: 'sk-secret' } });
        fireEvent.keyDown(field, { key: 'Enter' });

        await waitFor(() =>
            expect(ai.endpoints.get('openai-compatible')).toBe('https://gateway.example/v1'),
        );
    });

    it('still names a chosen agent that has since been uninstalled', async () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, aiBackend: 'codex-cli' } });
        render(<AiPane />);

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Model' }).textContent).toContain(
                'Codex (not installed)',
            ),
        );
    });
});

describe('the agents settings', () => {
    const CLAUDE_AGENT: AgentStatus = {
        available: true,
        id: 'claude',
        label: 'Claude Code',
        mcp: 'off',
        server: 'lore',
        skill: 'stale',
    };

    beforeEach(() => {
        ai.agentList = [
            CLAUDE_AGENT,
            { ...CLAUDE_AGENT, available: false, id: 'codex', label: 'Codex' },
        ];
    });

    it('offers only the agents that are installed', async () => {
        render(<AiPane />);

        expect(
            await screen.findByRole('switch', { name: 'Use this vault in Claude Code' }),
        ).toBeTruthy();
        expect(screen.queryByRole('switch', { name: 'Use this vault in Codex' })).toBeNull();
    });

    it('connects the vault with one switch', async () => {
        render(<AiPane />);
        fireEvent.click(
            await screen.findByRole('switch', { name: 'Use this vault in Claude Code' }),
        );

        await waitFor(() =>
            expect(screen.getByText(/reaches this vault through its “lore” server/)).toBeTruthy(),
        );
    });

    it('offers to update a skill that is not this version’s', async () => {
        render(<AiPane />);
        fireEvent.click(await screen.findByRole('button', { name: 'Update' }));

        await waitFor(() =>
            expect(screen.getByText(/has the lore-docs skill from this version/)).toBeTruthy(),
        );
    });

    it('shows what the agent said when it refused', async () => {
        ai.agentRefusal = 'config is locked';
        render(<AiPane />);
        fireEvent.click(
            await screen.findByRole('switch', { name: 'Use this vault in Claude Code' }),
        );

        expect((await screen.findByRole('alert')).textContent).toBe('config is locked');
    });
});

describe('testing the connection', () => {
    beforeEach(() => {
        useStore.setState({
            prefs: { ...DEFAULT_PREFS, aiBackend: 'claude-cli', aiModel: 'opus' },
        });
    });

    it('asks the chosen model and shows what it answered', async () => {
        render(<AiPane />);
        fireEvent.click(await screen.findByRole('button', { name: 'Test' }));

        expect(await screen.findByText('Claude Code answered in 1.2 s: “OK”')).toBeTruthy();
        expect(ai.tested).toEqual([{ backend: 'claude-cli', baseUrl: undefined, model: 'opus' }]);
    });

    it('says why it failed', async () => {
        ai.connection = { detail: 'Not signed in.', ms: 800, ok: false };
        render(<AiPane />);
        fireEvent.click(await screen.findByRole('button', { name: 'Test' }));

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Failed after 0.8 s: Not signed in.',
        );
    });

    it('tests an agent’s server only once it is connected', async () => {
        ai.agentList = [
            {
                available: true,
                id: 'claude',
                label: 'Claude Code',
                mcp: 'on',
                server: 'lore',
                skill: 'on',
            },
            {
                available: true,
                id: 'codex',
                label: 'Codex',
                mcp: 'off',
                server: 'lore',
                skill: 'off',
            },
        ];
        render(<AiPane />);

        await screen.findByRole('switch', { name: 'Use this vault in Codex' });

        const buttons = screen.getAllByRole('button', { name: 'Test' });

        expect(buttons).toHaveLength(2);
        fireEvent.click(buttons[1]);

        expect(
            await screen.findByText('Claude Code’s “lore” server started in 1.2 s and offers OK.'),
        ).toBeTruthy();
        expect(ai.tested).toEqual(['claude']);
    });
});
