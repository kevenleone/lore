/**
 * Drawer slide duration, matched by the scrim fade and by the unmount timer in
 * `useMountTransition`. Must stay equal to the `--animate-drawer-*` and
 * `--animate-scrim-*` durations in theme/tailwind.css — the animation and the
 * timer that unmounts the element after it are two halves of the same number.
 */
export const DRAWER_MS = 240;

/**
 * How long a toast stays up. Must stay equal to the `--animate-toast-life`
 * duration in theme/tailwind.css: the animation fades the toast out as it ends,
 * and this timer is what actually takes it off the screen.
 */
export const TOAST_MS = 2600;

/**
 * A toast carrying an action has to outlast a glance: 2.6s is long enough to
 * read a confirmation but not to notice a button, decide, and reach it.
 */
export const TOAST_ACTION_MS = 8000;
