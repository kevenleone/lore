export type Platform = 'mac' | 'other';

export const PLATFORM: Platform = navigator.userAgent.includes('Macintosh') ? 'mac' : 'other';

export const IS_MAC = PLATFORM === 'mac';
