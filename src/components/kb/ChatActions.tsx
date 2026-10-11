import { type ReactNode, useEffect, useRef, useState } from 'react';

import { copyText } from '../../lib/clipboard';
import { cn } from '../../lib/cn';
import { Check, Copy } from '../common/glyphs';

const COPIED_MS = 1400;

export function ChatAction({
    children,
    label,
    onClick,
}: {
    children: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-label={label}
            className="flex h-7 w-7 items-center justify-center rounded-7 border-none bg-transparent p-0 text-faint hover:bg-hover hover:text-text2"
            onClick={onClick}
            title={label}
            type="button"
        >
            {children}
        </button>
    );
}

/**
 * The row of actions under a message. It is there for the latest message and
 * appears for an earlier one when it is hovered or focused, so a long thread is
 * not striped with buttons.
 */
export function ChatActions({
    align,
    children,
    pinned,
}: {
    align: 'end' | 'start';
    children: ReactNode;
    pinned: boolean;
}) {
    return (
        <div
            className={cn(
                'mt-1 flex items-center gap-[2px] transition-opacity duration-100',
                align === 'end' ? 'justify-end' : '-ml-[6px]',
                !pinned && 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
            )}
        >
            {children}
        </div>
    );
}

export function CopyAction({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const copy = () => {
        void copyText(text).then((done) => {
            if (!done) {
                return;
            }

            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), COPIED_MS);
        });
    };

    return (
        <ChatAction label={copied ? 'Copied' : 'Copy'} onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={15} />}
        </ChatAction>
    );
}
