// The end-of-interval chime, synthesised rather than sampled: two short bell
// tones from an oscillator, so there is no audio asset to bundle and nothing
// for the webview to fetch.

/** The two notes of the bell, as [frequency in Hz, offset in seconds]. */
const NOTES: [number, number][] = [
    [880, 0],
    [1174.66, 0.16],
];
const NOTE_SECONDS = 0.3;
const PEAK_GAIN = 0.18;

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

let context: AudioContext | null = null;

/** Plays the bell. Silent, rather than throwing, when audio is unavailable. */
export function playChime(): void {
    const ctx = audioContext();
    if (!ctx) return;
    // Starting from the tray menu is not a webview gesture, so the context can
    // still be suspended here even though `primeChime` ran.
    void ctx
        .resume()
        .then(() => {
            for (const [frequency, offset] of NOTES) {
                ring(ctx, frequency, ctx.currentTime + offset);
            }
        })
        .catch(noop);
}

/**
 * Opens the audio context while the user is still interacting. Browsers start
 * one suspended and only a gesture may resume it, and the interval ends minutes
 * later with no gesture in sight — so this runs when the timer is started.
 */
export function primeChime(): void {
    void audioContext()?.resume().catch(noop);
}

function audioContext(): AudioContext | null {
    if (context) return context;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    return context;
}

function noop(): void {}

function ring(ctx: AudioContext, frequency: number, startAt: number): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    // Ramps rather than steps: an instant gain change clicks.
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + NOTE_SECONDS);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + NOTE_SECONDS);
}
