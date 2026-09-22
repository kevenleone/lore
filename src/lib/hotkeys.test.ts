// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatHotkey, hotkeyCommandFor, hotkeyKeys, HOTKEYS, matchesHotkey } from './hotkeys';

function keydown(code: string, modifiers: Partial<KeyboardEventInit> = {}): KeyboardEvent {
    return new KeyboardEvent('keydown', { code, ...modifiers });
}

describe('formatHotkey', () => {
    it('draws Mac glyphs on a Mac', () => {
        expect(formatHotkey('Mod+Shift+E', 'mac')).toBe('⌘⇧E');
        expect(formatHotkey('Alt+Shift+F', 'mac')).toBe('⌥⇧F');
        expect(formatHotkey('Mod+Comma', 'mac')).toBe('⌘,');
        expect(formatHotkey('Alt+Control+Space', 'mac')).toBe('⌥⌃Space');
    });

    it('spells the keys out everywhere else', () => {
        expect(formatHotkey('Mod+Shift+E', 'other')).toBe('Ctrl+Shift+E');
        expect(formatHotkey('Alt+Shift+F', 'other')).toBe('Alt+Shift+F');
        expect(formatHotkey('Mod+Comma', 'other')).toBe('Ctrl+,');
        expect(formatHotkey('Control+Alt+Space', 'other')).toBe('Ctrl+Alt+Space');
    });

    it('splits into one cap per key', () => {
        expect(hotkeyKeys('Mod+K', 'mac')).toEqual(['⌘', 'K']);
        expect(hotkeyKeys('Mod+K', 'other')).toEqual(['Ctrl', 'K']);
        expect(hotkeyKeys('Escape', 'other')).toEqual(['Esc']);
    });
});

describe('matchesHotkey', () => {
    it('reads Mod as ⌘ on a Mac and Ctrl elsewhere', () => {
        expect(matchesHotkey(keydown('KeyK', { metaKey: true }), 'Mod+K', 'mac')).toBe(true);
        expect(matchesHotkey(keydown('KeyK', { ctrlKey: true }), 'Mod+K', 'mac')).toBe(false);
        expect(matchesHotkey(keydown('KeyK', { ctrlKey: true }), 'Mod+K', 'other')).toBe(true);
        expect(matchesHotkey(keydown('KeyK', { metaKey: true }), 'Mod+K', 'other')).toBe(false);
    });

    it('requires the modifiers exactly', () => {
        const withShift = keydown('KeyE', { ctrlKey: true, shiftKey: true });

        expect(matchesHotkey(withShift, 'Mod+Shift+E', 'other')).toBe(true);
        expect(matchesHotkey(withShift, 'Mod+E', 'other')).toBe(false);
    });

    it('matches digits, punctuation and Escape by physical key', () => {
        expect(hotkeyCommandFor(keydown('Digit3', { ctrlKey: true }), 'other')).toBe('view-notes');
        expect(hotkeyCommandFor(keydown('Comma', { ctrlKey: true }), 'other')).toBe('settings');
        expect(hotkeyCommandFor(keydown('Escape'), 'other')).toBe('close');
        expect(hotkeyCommandFor(keydown('KeyF', { altKey: true, shiftKey: true }), 'mac')).toBe(
            'focus',
        );
    });
});

describe('the macOS menu bar', () => {
    const source = readFileSync(join(__dirname, '../../src-tauri/src/app_menu.rs'), 'utf8');
    const accelerators = [...source.matchAll(/accelerator: "([^"]+)",\s*id: "([^"]+)"/g)];

    it('carries the same chord as the registry for every accelerator', () => {
        expect(accelerators.length).toBeGreaterThan(0);

        for (const [, accelerator, id] of accelerators) {
            const command = HOTKEYS.find((entry) => entry.id === id);
            const hotkey = accelerator.replace('CmdOrCtrl', 'Mod').replace(',', 'Comma');

            expect(command?.hotkey, id).toBe(hotkey);
        }
    });
});
