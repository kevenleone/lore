import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// twMerge resolves conflicts by knowing which classes belong to which group, and
// it only ships Tailwind's stock scales. Ours replace them (see theme/
// tailwind.css), so without this every custom class would look unknown and two
// conflicting ones would both survive. `text-*` is the case that actually bites:
// it is both the colour and the size namespace, so a missing entry silently
// drops one of `cn('text-text2', 'text-body')`.
const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            color: [
                'surface',
                'surface2',
                'surface3',
                'surface-glass',
                'canvas',
                'titlebar',
                'text',
                'text2',
                'text3',
                'faint',
                'border',
                'border-soft',
                'dash',
                'swatch-border',
                'hover',
                'sel',
                'scrim',
                'knob',
                'track-off',
                'kbd-bg',
                'kbd-border',
                'accent',
                'accent-tint',
                'accent-border',
                'type-link-bg',
                'type-link-fg',
                'type-note-bg',
                'type-note-fg',
                'type-task-bg',
                'type-task-fg',
                'type-code-bg',
                'type-code-fg',
                'type-image-bg',
                'type-image-fg',
            ],
            radius: ['5', '7', '9', '10', '11'],
            shadow: ['float', 'sheet', 'seg'],
            text: [
                'micro',
                'caption',
                'label',
                'body-sm',
                'body',
                'body-lg',
                'subhead',
                'title',
                'title-lg',
            ],
        },
    },
});

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
