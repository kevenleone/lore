// `Lore Settings.dc.html` frame 1d — the shortcuts as a keyboard map: hold a
// modifier layer and every key Lore has claimed lights up, which answers
// "what's still free?" in a way the list in 1c cannot.
//
// Both takes read the same `SHORTCUT_GROUPS`, so a shortcut added to the list
// appears on the map without anyone having to remember to add it twice.

import { useState } from 'react';

import { Segmented } from './controls';
import { SHORTCUT_GROUPS } from './settingsData';
import { keyCapButton } from './SettingsModal.css';

/** Glyphs that only ever qualify another key. */
const MODIFIERS = ['fn', '⌃', '⌥', '⌘', '⇧', '⇪', '⇥'];

/**
 * The layout, as `[label, width]` pairs. Widths are relative units — a row
 * shares out the available space in these proportions, so the board keeps the
 * design's shape at whatever width the pane happens to be.
 */
const ROWS: [string, number][][] = [
    [
        ['`', 1],
        ['1', 1],
        ['2', 1],
        ['3', 1],
        ['4', 1],
        ['5', 1],
        ['6', 1],
        ['7', 1],
        ['8', 1],
        ['9', 1],
        ['0', 1],
        ['−', 1],
        ['=', 1],
        ['⌫', 1.42],
    ],
    [
        ['⇥', 1.42],
        ['Q', 1],
        ['W', 1],
        ['E', 1],
        ['R', 1],
        ['T', 1],
        ['Y', 1],
        ['U', 1],
        ['I', 1],
        ['O', 1],
        ['P', 1],
        ['[', 1],
        [']', 1],
        ['\\', 1],
    ],
    [
        ['⇪', 1.65],
        ['A', 1],
        ['S', 1],
        ['D', 1],
        ['F', 1],
        ['G', 1],
        ['H', 1],
        ['J', 1],
        ['K', 1],
        ['L', 1],
        [';', 1],
        ['’', 1],
        ['⏎', 1.88],
    ],
    [
        ['⇧', 2.15],
        ['Z', 1],
        ['X', 1],
        ['C', 1],
        ['V', 1],
        ['B', 1],
        ['N', 1],
        ['M', 1],
        [',', 1],
        ['.', 1],
        ['/', 1],
        ['⇧', 2.15],
    ],
    [
        ['fn', 1],
        ['⌃', 1],
        ['⌥', 1.12],
        ['⌘', 1.35],
        ['Space', 6.62],
        ['⌘', 1.35],
        ['⌥', 1.12],
        ['◀', 1],
        ['▶', 1],
    ],
];

interface Layer {
    /** Key label → what the combination does. */
    assigned: Record<string, string>;
    label: string;
    /** The modifier glyphs held down for this layer. */
    modifiers: string[];
}

/**
 * Groups every shortcut by the modifiers it holds. Rows whose trailing key is
 * not on the board (`#`, `esc`, the arrow pair) are skipped — the map is about
 * physical keys, and the list in 1c is where those live.
 */
function buildLayers(): Layer[] {
    const board = new Set(ROWS.flat().map(([label]) => label));
    const byLayer = new Map<string, Layer>();

    for (const group of SHORTCUT_GROUPS) {
        for (const row of group.rows) {
            const modifiers = row.keys.filter((k) => MODIFIERS.includes(k));
            const key = row.keys.find((k) => !MODIFIERS.includes(k));
            if (!key || !board.has(key)) continue;

            const label = modifiers.length ? modifiers.join(' ') : 'No modifier';
            const layer = byLayer.get(label) ?? { assigned: {}, label, modifiers };
            layer.assigned[key] = row.label;
            byLayer.set(label, layer);
        }
    }

    return [...byLayer.values()].sort(
        (a, b) => Object.keys(b.assigned).length - Object.keys(a.assigned).length,
    );
}

const LAYERS = buildLayers();

export function KeyboardMap() {
    const [label, setLabel] = useState(LAYERS[0]?.label ?? 'No modifier');
    const layer = LAYERS.find((l) => l.label === label) ?? LAYERS[0];
    const claimed = Object.keys(layer.assigned).length;

    return (
        <>
            <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginBottom: 16 }}>
                <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5 }}>
                    Pick a layer to see what it has claimed.
                </span>
                <div style={{ marginLeft: 'auto' }}>
                    <Segmented
                        onChange={setLabel}
                        options={LAYERS.map((l) => l.label)}
                        value={label}
                    />
                </div>
            </div>

            <div
                style={{
                    background: 'var(--surface2, #fafafa)',
                    border: '1px solid var(--border, #ececef)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: 16,
                }}
            >
                {ROWS.map((row, rowIndex) => (
                    <div key={rowIndex} style={{ display: 'flex', gap: 6 }}>
                        {row.map(([keyLabel, width], keyIndex) => (
                            <Key
                                assignment={layer.assigned[keyLabel]}
                                held={layer.modifiers.includes(keyLabel)}
                                key={`${rowIndex}-${keyIndex}`}
                                label={keyLabel}
                                width={width}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 18,
                    marginTop: 16,
                }}
            >
                <Swatch background="var(--ac)">Assigned in this layer</Swatch>
                <Swatch background="var(--ac-tint, #eeeef2)" border="var(--ac-border, #dedee5)">
                    Modifier
                </Swatch>
                <Swatch background="var(--kbd-bg, #fff)" border="var(--kbd-border, #e2e2e7)">
                    Free
                </Swatch>
                <span
                    style={{
                        color: 'var(--text3, #9a9aa5)',
                        fontSize: 12.5,
                        marginLeft: 'auto',
                    }}
                >
                    {claimed} {claimed === 1 ? 'key' : 'keys'} claimed
                </span>
            </div>
        </>
    );
}

function Key({
    assignment,
    held,
    label,
    width,
}: {
    assignment?: string;
    held: boolean;
    label: string;
    width: number;
}) {
    const isModifier = MODIFIERS.includes(label);

    const palette = assignment
        ? { background: 'var(--ac)', borderColor: 'var(--ac)', color: '#fff' }
        : held
          ? {
                background: 'var(--ac-tint, #eeeef2)',
                borderColor: 'var(--ac-border, #dedee5)',
                color: 'var(--ac)',
            }
          : {
                background: isModifier ? 'var(--surface3, #f1f1f3)' : 'var(--kbd-bg, #fff)',
                borderColor: 'var(--kbd-border, #e2e2e7)',
                color: 'var(--text2, #5a5a63)',
            };

    return (
        <span
            className={keyCapButton}
            style={{ ...palette, flexGrow: width, height: assignment ? 50 : 44 }}
            title={assignment}
        >
            <span
                style={{
                    fontFamily: 'ui-monospace,Menlo,monospace',
                    fontSize: label.length > 2 ? 11 : 12.5,
                    lineHeight: 1,
                }}
            >
                {label}
            </span>
            {assignment && (
                <span
                    style={{
                        fontSize: 9,
                        lineHeight: 1.1,
                        maxWidth: '100%',
                        opacity: 0.85,
                        overflow: 'hidden',
                        textAlign: 'center',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {assignment}
                </span>
            )}
        </span>
    );
}

function Swatch({
    background,
    border,
    children,
}: {
    background: string;
    border?: string;
    children: string;
}) {
    return (
        <span
            style={{
                alignItems: 'center',
                color: 'var(--text2, #6b6b76)',
                display: 'inline-flex',
                fontSize: 12,
                gap: 7,
            }}
        >
            <span
                style={{
                    background,
                    border: border ? `1px solid ${border}` : undefined,
                    borderRadius: 4,
                    height: 12,
                    width: 12,
                }}
            />
            {children}
        </span>
    );
}
