import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_PREFS } from './types';
import { useStore } from './useStore';

function switches(): ReturnType<typeof useStore.getState>['prefs']['switches'] {
    return useStore.getState().prefs.switches;
}

describe('the Dock and menu-bar switches', () => {
    beforeEach(() => {
        useStore.setState({ prefs: DEFAULT_PREFS, toasts: [] });
    });

    it('lets either one go while the other is on', () => {
        useStore.getState().toggleSwitch('dockIcon');
        expect(switches().dockIcon).toBe(false);
        expect(switches().menuBarIcon).toBe(true);
    });

    it('refuses to turn off the last way back into a hidden Lore', () => {
        useStore.getState().toggleSwitch('dockIcon');
        useStore.getState().toggleSwitch('menuBarIcon');

        expect(switches().menuBarIcon).toBe(true);
        expect(useStore.getState().toasts).toHaveLength(1);
    });

    it('guards whichever one is left, not a particular switch', () => {
        useStore.getState().toggleSwitch('menuBarIcon');
        useStore.getState().toggleSwitch('dockIcon');
        expect(switches().dockIcon).toBe(true);

        // With the menu-bar icon back, the Dock icon is free to go.
        useStore.getState().toggleSwitch('menuBarIcon');
        useStore.getState().toggleSwitch('dockIcon');
        expect(switches().dockIcon).toBe(false);
    });
});
