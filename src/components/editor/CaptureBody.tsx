// The capture drawer's body field: the block editor when it is switched on, the
// plain textarea otherwise.
//
// Quick capture is the one flow that has to feel instant, so the editor is
// loaded lazily and the textarea stands in until it arrives. The window opens
// at the same speed either way; the field simply upgrades itself.

import { lazy, Suspense } from 'react';

import { useStore } from '../../store/useStore';

const BlockEditor = lazy(async () => ({
    default: (await import('./BlockEditor')).BlockEditor,
}));

interface CaptureBodyProps {
    autoFocus?: boolean;
    /** Applied to the textarea, and to the wrapper the editor sits in. */
    className: string;
    onChange: (markdown: string) => void;
    placeholder: string;
    textareaRef?: (element: HTMLTextAreaElement | null) => void;
    value: string;
}

export function CaptureBody({
    autoFocus,
    className,
    onChange,
    placeholder,
    textareaRef,
    value,
}: CaptureBodyProps): React.JSX.Element {
    const enabled = useStore((s) => s.prefs.switches.blockEditor);

    const textarea = (
        <textarea
            className={className}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            ref={textareaRef}
            value={value}
        />
    );

    if (!enabled) return textarea;

    return (
        <div className={`lore-capture-body ${className}`}>
            <Suspense fallback={null}>
                <BlockEditor
                    autoFocus={autoFocus}
                    onChange={onChange}
                    placeholder={placeholder}
                    value={value}
                />
            </Suspense>
        </div>
    );
}
