// The auto-generated AI summary block shown in the detail pane.

import { Sparkle } from '../common/glyphs';

const AC = 'var(--ac, #5b5bd6)';

export function AiSummaryCard({
    points,
    showPoints,
    summary,
}: {
    points: string[];
    showPoints: boolean;
    summary: string;
}) {
    return (
        <div
            style={{
                background: 'var(--ac-tint, #eeeef2)',
                border: '1px solid var(--ac-border, #dedee5)',
                borderRadius: 13,
                marginTop: 20,
                padding: '17px 18px',
            }}
        >
            <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                <span style={{ color: AC, display: 'flex' }}>
                    <Sparkle size={15} />
                </span>
                <span style={{ color: 'var(--text, #1a1a1f)', fontSize: 13, fontWeight: 680 }}>
                    AI Summary
                </span>
                <span
                    style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--ac-border, #dedee5)',
                        borderRadius: 5,
                        color: 'var(--faint, #a8a8b0)',
                        fontSize: 10.5,
                        marginLeft: 2,
                        padding: '1px 6px',
                    }}
                >
                    auto-generated
                </span>
            </div>
            <p
                style={{
                    color: 'var(--text2, #6b6b76)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: '10px 0 0',
                }}
            >
                {summary}
            </p>
            {showPoints && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 13 }}>
                    {points.map((p, i) => (
                        <div
                            key={i}
                            style={{
                                alignItems: 'flex-start',
                                color: 'var(--text2, #6b6b76)',
                                display: 'flex',
                                fontSize: 13.5,
                                gap: 9,
                                lineHeight: 1.5,
                            }}
                        >
                            <span
                                style={{
                                    background: AC,
                                    borderRadius: '50%',
                                    flex: 'none',
                                    height: 5,
                                    marginTop: 7,
                                    width: 5,
                                }}
                            />
                            <span>{p}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
