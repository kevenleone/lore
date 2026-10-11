import { createContext, useContext } from 'react';

import { freezePersisted } from '../../store/persisted';
import { useStore } from '../../store/useStore';

export const StandaloneContext = createContext(false);

/**
 * This window borrows the library's preferences and never writes them back.
 * Two it overrides for itself: the panel starts shut whatever the library last
 * left it as, and the body is always the rendered editor — showing a Markdown
 * file rendered is what the window is for.
 */
export function borrowPreferences(): void {
    freezePersisted();
    useStore.setState((state) => ({
        prefs: {
            ...state.prefs,
            propertiesOpen: false,
            switches: { ...state.prefs.switches, blockEditor: true },
        },
    }));
}

/** True inside a window over one file that belongs to no vault. */
export function useStandalone(): boolean {
    return useContext(StandaloneContext);
}
