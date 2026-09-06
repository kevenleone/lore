/**
 * Room the popover window leaves around its card. The window is transparent, so
 * the drop shadow is drawn by CSS and has to fit inside this gap — anything that
 * spills past it is cut off square by the window edge. The wrapper's padding is
 * written from this value, and `FocusPanel` measures against it.
 */
export const PANEL_MARGIN = 20;
