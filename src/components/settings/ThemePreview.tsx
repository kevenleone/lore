import type { ThemeDefinition } from '../../theme/themes';

import { applyTokens } from '../../theme/tokens';

const ROW = 'h-[3px] rounded-full bg-text3 opacity-60';

/**
 * The card paints the theme's tokens onto itself, so the miniature is drawn
 * with the same utilities as the real chrome rather than a picture of it.
 */
export function ThemePreview({ theme }: { theme: ThemeDefinition }) {
    return (
        <span
            className="bg-app block aspect-[4/3] overflow-hidden rounded-lg border border-swatch-border"
            ref={(el) => {
                if (el) applyTokens(el, theme.id, theme.mode);
            }}
        >
            <span className="flex h-full flex-col">
                <span className="flex h-[9px] flex-none items-center gap-[3px] border-b border-border bg-titlebar px-[5px]">
                    <span className="h-[3px] w-[3px] rounded-full bg-type-image-fg" />
                    <span className="h-[3px] w-[3px] rounded-full bg-type-note-fg" />
                    <span className="h-[3px] w-[3px] rounded-full bg-type-task-fg" />
                    <span className="ml-auto h-[3px] w-[14px] rounded-full bg-accent opacity-80" />
                </span>
                <span className="flex min-h-0 flex-1">
                    <span className="bg-surface-nav flex w-[34%] flex-none flex-col gap-[4px] border-r border-border p-[5px]">
                        <span className={`${ROW} w-[80%]`} />
                        <span className={`${ROW} w-[62%]`} />
                        <span className={`${ROW} w-[70%]`} />
                        <span className={`${ROW} w-[52%]`} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[4px] bg-surface p-[6px]">
                        <span className="h-[4px] w-[58%] rounded-full bg-text opacity-80" />
                        <span className={`${ROW} w-[90%]`} />
                        <span className={`${ROW} w-[74%]`} />
                        <span className="mt-[2px] h-[4px] w-[26%] rounded-full bg-accent" />
                    </span>
                </span>
            </span>
        </span>
    );
}
