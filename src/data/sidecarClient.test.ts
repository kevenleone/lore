// The client's job is to hide engine restarts from every caller. A restart
// changes both the port and the token, so a stale endpoint fails as a network
// error — these tests pin the re-discover-and-retry behaviour that covers it.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

const { eventsUrl, forgetEndpoint, HttpError, request, SidecarUnavailable } =
    await import('./sidecarClient');

const ok = (body: unknown, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status });

beforeEach(() => {
    invoke.mockReset();
    forgetEndpoint();
    invoke.mockResolvedValue({ token: 'tok', url: 'http://127.0.0.1:5000' });
});

describe('request', () => {
    it('sends the bearer token from the discovered endpoint', async () => {
        const fetchMock = vi.fn().mockResolvedValue(ok({ hi: true }));

        vi.stubGlobal('fetch', fetchMock);

        await expect(request('/items')).resolves.toEqual({ hi: true });

        const [url, init] = fetchMock.mock.calls[0];

        expect(url).toBe('http://127.0.0.1:5000/items');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    });

    it('discovers the endpoint once across many calls', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => ok({})),
        );
        await request('/a');
        await request('/b');
        expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('re-discovers and retries after a connection failure', async () => {
        // The engine restarted: the old port is dead, and the new one has a new token.
        invoke
            .mockResolvedValueOnce({ token: 'old', url: 'http://127.0.0.1:5000' })
            .mockResolvedValueOnce({ token: 'new', url: 'http://127.0.0.1:6000' });

        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(ok({ recovered: true }));

        vi.stubGlobal('fetch', fetchMock);

        await expect(request('/items')).resolves.toEqual({ recovered: true });
        expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:6000/items');
        expect((fetchMock.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe(
            'Bearer new',
        );
    });

    it('gives up as SidecarUnavailable when the retry also fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        await expect(request('/items')).rejects.toBeInstanceOf(SidecarUnavailable);
    });

    it('does not retry an HTTP error — the engine answered, it just said no', async () => {
        const fetchMock = vi.fn().mockResolvedValue(ok({ error: 'not_found' }, 404));

        vi.stubGlobal('fetch', fetchMock);

        await expect(request('/items/nope')).rejects.toBeInstanceOf(HttpError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('surfaces the status on an HTTP error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({}, 409)));
        await expect(request('/items')).rejects.toMatchObject({ status: 409 });
    });

    it('returns undefined for 204 rather than failing to parse a body', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(null, 204)));
        await expect(request('/items/x')).resolves.toBeUndefined();
    });

    it('sets a JSON content type only when there is a body', async () => {
        const fetchMock = vi.fn().mockImplementation(() => ok({}));

        vi.stubGlobal('fetch', fetchMock);

        await request('/items', { body: JSON.stringify({ a: 1 }), method: 'POST' });
        expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)['Content-Type']).toBe(
            'application/json',
        );

        await request('/items');
        expect(
            (fetchMock.mock.calls[1][1].headers as Record<string, string>)['Content-Type'],
        ).toBeUndefined();
    });

    it('does not cache a failed discovery', async () => {
        // Both the attempt and its retry fail to discover, so the call gives up...
        invoke
            .mockRejectedValueOnce(new Error('engine not running'))
            .mockRejectedValueOnce(new Error('engine not running'));
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => ok({ ok: true })),
        );

        await expect(request('/items')).rejects.toBeInstanceOf(SidecarUnavailable);

        // ...but the rejection must not be cached: once the engine is back, the
        // next call has to succeed rather than replaying the old failure.
        invoke.mockResolvedValue({ token: 't2', url: 'http://127.0.0.1:7000' });
        await expect(request('/items')).resolves.toEqual({ ok: true });
    });
});

describe('SidecarUnavailable', () => {
    it('carries the host’s reason when discovery was refused', async () => {
        invoke.mockRejectedValue('the data engine did not start within 30 seconds');
        vi.stubGlobal('fetch', vi.fn());

        await expect(request('/items')).rejects.toThrow(
            'the data engine is not reachable: the data engine did not start within 30 seconds',
        );
    });

    it('keeps the plain message when the failure is a network error', () => {
        expect(new SidecarUnavailable(new TypeError('Failed to fetch')).message).toBe(
            'the data engine is not reachable',
        );
    });
});

describe('eventsUrl', () => {
    it('carries the token as a query param, since EventSource cannot set headers', async () => {
        await expect(eventsUrl()).resolves.toBe('http://127.0.0.1:5000/events?token=tok');
    });

    it('escapes the token', async () => {
        invoke.mockResolvedValue({ token: 'a b&c', url: 'http://127.0.0.1:5000' });
        await expect(eventsUrl()).resolves.toContain('token=a%20b%26c');
    });
});

describe('the message on a failure', () => {
    // The engine answers `{"error": "..."}`, and that string is the one written
    // for the person reading it. Passing the body through showed them JSON.
    const failWith = async (body: string, status = 500): Promise<Error> => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));

        try {
            await request('/workspace/open');
        } catch (error) {
            return error as Error;
        }

        throw new Error('the request was expected to fail, and did not');
    };

    it('is the engine’s sentence, not the envelope around it', async () => {
        const error = await failWith(JSON.stringify({ error: 'That folder is not readable.' }));

        expect(error.message).toBe('That folder is not readable.');
    });

    it('keeps the status on the error for callers that branch on it', async () => {
        const error = await failWith(JSON.stringify({ error: 'Nope.' }), 404);

        expect(error).toBeInstanceOf(HttpError);
        expect((error as InstanceType<typeof HttpError>).status).toBe(404);
    });

    it('passes plain text through, being already the message', async () => {
        expect((await failWith('something went wrong')).message).toBe('something went wrong');
    });

    it('falls back to the body when the error field is not a string', async () => {
        const body = JSON.stringify({ error: { code: 7 } });

        expect((await failWith(body)).message).toBe(body);
    });

    it('leaves a JSON body that is not an envelope alone', async () => {
        const body = JSON.stringify({ detail: 'nope' });

        expect((await failWith(body)).message).toBe(body);
    });

    it('does not fall over on a body that is not JSON at all', async () => {
        expect((await failWith('{ broken')).message).toBe('{ broken');
    });
});
