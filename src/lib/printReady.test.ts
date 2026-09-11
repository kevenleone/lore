// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForPaint } from './printReady';

/**
 * jsdom never loads an image, so `complete` is whatever we say it is. Both
 * flags matter: a 404 in a real browser reports `complete` with a zero
 * `naturalWidth`, which is exactly the case the print rules have to hide.
 */
function addImage({ complete, width }: { complete: boolean; width: number }): HTMLImageElement {
    const image = document.createElement('img');
    Object.defineProperty(image, 'complete', { value: complete });
    Object.defineProperty(image, 'naturalWidth', { value: width });
    document.body.append(image);
    return image;
}

beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
});

afterEach(() => {
    vi.useRealTimers();
});

describe('waitForPaint', () => {
    it('resolves without waiting when every image is already loaded', async () => {
        addImage({ complete: true, width: 100 });

        await expect(waitForPaint()).resolves.toBeUndefined();
    });

    it('resolves as soon as a pending image loads', async () => {
        const image = addImage({ complete: false, width: 0 });
        const done = waitForPaint();

        image.dispatchEvent(new Event('load'));

        await expect(done).resolves.toBeUndefined();
    });

    it('does not wait for an image that errors', async () => {
        const image = addImage({ complete: false, width: 0 });
        const done = waitForPaint();

        image.dispatchEvent(new Event('error'));

        await expect(done).resolves.toBeUndefined();
    });

    it('gives up on an image that never settles, and marks it so print hides it', async () => {
        const image = addImage({ complete: false, width: 0 });
        const done = waitForPaint();

        await vi.advanceTimersByTimeAsync(5000);

        await expect(done).resolves.toBeUndefined();
        expect(image.hasAttribute('data-print-unloaded')).toBe(true);
    });

    it('leaves a loaded image unmarked', async () => {
        const image = addImage({ complete: true, width: 100 });

        await waitForPaint();

        expect(image.hasAttribute('data-print-unloaded')).toBe(false);
    });
});
