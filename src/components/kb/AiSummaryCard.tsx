// The auto-generated AI summary block shown in the detail pane.

import { Sparkle } from '../common/glyphs';

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
        <div className="mt-5 rounded-[13px] border border-accent-border bg-accent-tint px-[18px] py-[17px]">
            <div className="flex items-center gap-2">
                <span className="flex text-accent">
                    <Sparkle size={15} />
                </span>
                <span className="text-body-lg font-[680] text-text">AI Summary</span>
                <span className="ml-[2px] rounded-5 border border-accent-border bg-surface px-[6px] py-px text-micro text-faint">
                    auto-generated
                </span>
            </div>
            <p className="mt-[10px] mb-0 text-title leading-[1.6] text-text2">{summary}</p>
            {showPoints && (
                <div className="mt-[13px] flex flex-col gap-[7px]">
                    {points.map((p, i) => (
                        <div
                            className="flex items-start gap-[9px] text-subhead leading-[1.5] text-text2"
                            key={i}
                        >
                            <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-accent" />
                            <span>{p}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
