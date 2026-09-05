/**
 * Drawer slide duration, matched by the scrim fade and by the unmount timer in
 * `useMountTransition`. Must stay equal to the `--animate-drawer-*` and
 * `--animate-scrim-*` durations in theme/tailwind.css — the animation and the
 * timer that unmounts the element after it are two halves of the same number.
 */
export const DRAWER_MS = 240;
