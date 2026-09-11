// A switch is only a setting if something acts on it. This reads the source the
// way `palette.test.ts` reads the token maps: a key that has lost its last
// reader outside the settings sheet fails the build instead of quietly becoming
// a toggle that does nothing.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_SWITCHES } from './types';

const SOURCE_ROOT = join(import.meta.dirname, '..');

/** Where the switches are written rather than read. */
const SETTINGS_DIR = join(SOURCE_ROOT, 'components', 'settings');

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        if (!/\.tsx?$/.test(path) || /\.test\.tsx?$/.test(path)) return [];
        return [path];
    });
}

const READERS = sourceFiles(SOURCE_ROOT)
    .filter((path) => !path.startsWith(SETTINGS_DIR) && !path.endsWith(join('store', 'types.ts')))
    .map((path) => readFileSync(path, 'utf8'));

describe('every switch is read somewhere', () => {
    it.each(Object.keys(DEFAULT_SWITCHES))('%s has a reader outside Settings', (key) => {
        const read = READERS.some(
            (source) => source.includes(`switches.${key}`) || source.includes(`switches[${key}`),
        );
        expect(read).toBe(true);
    });
});
