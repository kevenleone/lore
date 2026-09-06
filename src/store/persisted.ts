// Preferences and the onboarding result outlive a launch but do not belong in
// the item database, so they live in localStorage for now. When a real backend
// exists this module is the only thing that has to change — the store reads and
// writes through `loadPersisted` / `savePersisted` and nothing else.

import { DEFAULT_PREFS, DEFAULT_SWITCHES, type FocusSession, type Prefs } from './types';

const KEY = 'lore.prefs.v1';

export interface Persisted {
    /**
     * Finished focus intervals, so the calendar can draw where attention went
     * across launches. Trimmed to the most recent `MAX_SESSIONS`.
     */
    focusSessions: FocusSession[];
    /** When the legacy SQLite store was imported. Guards the one-shot migration. */
    migratedAt: null | string;
    /** True once the user has finished `Lore Onboarding` either way. */
    onboarded: boolean;
    prefs: Prefs;
    /** Most-recently-opened vaults, for the switcher. */
    recentWorkspaces: WorkspaceRef[];
    /**
     * Item id → ISO time it was dragged onto in the calendar. Scheduling lives
     * here rather than on the item because the Markdown vault has no field for
     * it yet; move it onto `Item` once the format gains one.
     */
    schedule: Record<string, string>;
    /** Vault folder in use; null means the default one beside the app's data. */
    workspacePath: null | string;
}

/** A vault the user has opened before. */
export interface WorkspaceRef {
    lastOpenedAt: string;
    name: string;
    path: string;
}

export const DEFAULT_PERSISTED: Persisted = {
    focusSessions: [],
    migratedAt: null,
    onboarded: false,
    prefs: DEFAULT_PREFS,
    recentWorkspaces: [],
    schedule: {},
    workspacePath: null,
};

/** Sessions older than this are dropped — the calendar only looks back weeks. */
const MAX_SESSIONS = 500;

export function loadPersisted(): Persisted {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULT_PERSISTED;
        const saved = JSON.parse(raw) as Partial<Persisted>;
        // Merge field-by-field so a preference added in a later version still gets
        // its default instead of coming back undefined.
        return {
            focusSessions: saved.focusSessions ?? [],
            migratedAt: saved.migratedAt ?? null,
            onboarded: saved.onboarded ?? false,
            prefs: {
                ...DEFAULT_PREFS,
                ...saved.prefs,
                durations: { ...DEFAULT_PREFS.durations, ...saved.prefs?.durations },
                switches: { ...DEFAULT_SWITCHES, ...saved.prefs?.switches },
            },
            recentWorkspaces: saved.recentWorkspaces ?? [],
            schedule: saved.schedule ?? {},
            workspacePath: saved.workspacePath ?? null,
        };
    } catch {
        // Corrupt or unavailable storage — start from defaults rather than crash.
        return DEFAULT_PERSISTED;
    }
}

export function savePersisted(state: Persisted): void {
    try {
        const trimmed: Persisted = {
            ...state,
            focusSessions: state.focusSessions.slice(-MAX_SESSIONS),
        };
        localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
        // Private browsing / quota — preferences just will not survive the launch.
    }
}
