// What a view shows when it has nothing to show: a small card-stack mark, a
// line saying which kind of empty this is, and — when there is one — the single
// action that would fill it.
//
// The mark is built from the same tokens the real cards use, not an asset, so
// it stays right in every theme and at every text size.

import type { IconName } from '../../store/types';

import { Icon } from './Icon';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
}

interface EmptyStateProps {
    action?: EmptyStateAction;
    hint?: React.ReactNode;
    /** The glyph on the face of the front card. */
    icon?: IconName;
    title: React.ReactNode;
}

const CARD = 'absolute h-[60px] w-[76px] rounded-11 border border-border bg-surface2';

export function EmptyState({ action, hint, icon = 'layers', title }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-[54px] text-center">
            <span className="relative flex h-[84px] w-[100px] items-center justify-center">
                <span
                    className={`${CARD} -translate-x-[13px] -translate-y-[11px] -rotate-[9deg] opacity-40`}
                />
                <span
                    className={`${CARD} -translate-x-[6px] -translate-y-[5px] -rotate-[4deg] opacity-70`}
                />
                <span className="relative flex h-[60px] w-[76px] items-center justify-center rounded-11 border border-dashed border-dash bg-surface2 text-faint">
                    <Icon name={icon} size={24} />
                </span>
            </span>
            <p className="mt-[18px] text-title-lg font-[620] text-text2">{title}</p>
            {hint && (
                <p className="mt-[6px] max-w-[340px] text-body-lg leading-[1.6] text-text3">
                    {hint}
                </p>
            )}
            {action && (
                <button
                    className="mt-[18px] rounded-9 border border-border bg-surface2 px-[13px] py-[7px] font-[inherit] text-body-lg font-[560] text-text2 hover:border-accent-border hover:text-text"
                    onClick={action.onClick}
                    type="button"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
