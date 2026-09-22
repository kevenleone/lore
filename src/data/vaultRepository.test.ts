// The renderer's half of the clearing contract. `JSON.stringify` drops keys
// whose value is `undefined`, so a patch meaning "empty this field" used to
// leave here as `{}` and the field silently kept its old value.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

const { forgetEndpoint } = await import('./sidecarClient');
const { VaultRepository } = await import('./vaultRepository');

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    invoke.mockReset();
    forgetEndpoint();
    // `sidecar_endpoint` answers with the engine; `default_vault_path` with a
    // path, which `ready()` opens before any call goes out.
    invoke.mockImplementation((command: string) =>
        Promise.resolve(
            command === 'default_vault_path'
                ? '/tmp/vault'
                : { token: 'tok', url: 'http://127.0.0.1:5000' },
        ),
    );
    // A fresh Response per call: a body can only be read once, and `ready()`
    // spends one before the call under test goes out.
    fetchMock = vi.fn().mockImplementation(() => new Response(JSON.stringify({ id: 'i1' })));
    vi.stubGlobal('fetch', fetchMock);
});

/** The body of the PATCH, past whatever `ready()` sent to open the vault. */
const patchBody = () => {
    const call = fetchMock.mock.calls.find(([, init]) => (init as RequestInit).method === 'PATCH');

    return JSON.parse((call![1] as RequestInit).body as string);
};

describe('updateItem', () => {
    it('sends a cleared field as null, so the engine can see it at all', async () => {
        await new VaultRepository(null).updateItem('i1', {
            dueAt: undefined,
            priority: undefined,
            url: undefined,
        });
        expect(patchBody()).toEqual({ dueAt: null, priority: null, url: null });
    });

    it('leaves falsy values that are not absent alone', async () => {
        await new VaultRepository(null).updateItem('i1', {
            flags: { done: false },
            title: '',
        });
        expect(patchBody()).toEqual({ flags: { done: false }, title: '' });
    });
});
