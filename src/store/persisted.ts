// Preferences and the onboarding result outlive a launch but do not belong in
// the item database, so they live in localStorage for now. When a real backend
// exists this module is the only thing that has to change — the store reads and
// writes through `loadPersisted` / `savePersisted` and nothing else.

import { DEFAULT_PREFS, DEFAULT_SWITCHES, type Auth, type Prefs } from "./types";

const KEY = "lore.prefs.v1";

export interface Persisted {
  prefs: Prefs;
  auth: Auth;
  /** True once the user has finished `Lore Onboarding` either way. */
  onboarded: boolean;
}

export const DEFAULT_PERSISTED: Persisted = {
  prefs: DEFAULT_PREFS,
  auth: { mode: null, email: null, name: null },
  onboarded: false,
};

export function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PERSISTED;
    const saved = JSON.parse(raw) as Partial<Persisted>;
    // Merge field-by-field so a preference added in a later version still gets
    // its default instead of coming back undefined.
    return {
      onboarded: saved.onboarded ?? false,
      auth: { ...DEFAULT_PERSISTED.auth, ...saved.auth },
      prefs: {
        ...DEFAULT_PREFS,
        ...saved.prefs,
        durations: { ...DEFAULT_PREFS.durations, ...saved.prefs?.durations },
        switches: { ...DEFAULT_SWITCHES, ...saved.prefs?.switches },
      },
    };
  } catch {
    // Corrupt or unavailable storage — start from defaults rather than crash.
    return DEFAULT_PERSISTED;
  }
}

export function savePersisted(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private browsing / quota — preferences just will not survive the launch.
  }
}
