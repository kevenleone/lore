export type Platform = 'mac' | 'other';

export const PLATFORM: Platform = navigator.userAgent.includes('Macintosh') ? 'mac' : 'other';

export const IS_MAC = PLATFORM === 'mac';

/** The width the system's three buttons take, so a bar starts clear of them. */
export const WINDOW_CONTROLS_WIDTH = 52;
