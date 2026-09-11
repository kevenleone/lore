// Keeps the OS in step with Settings → General → Startup.
//
// Both preferences reach outside the app, so they have to be applied on every
// boot as well as on every change: the menu-bar icon is set up by Rust before
// the renderer has read anything, and the login item outlives the app entirely.

import { useEffect, useRef } from 'react';

import { useStore } from '../store/useStore';
import { launchAtLoginEnabled, setLaunchAtLogin, setTrayVisible } from './startup';

export function useStartupPrefs(): void {
    const hydrated = useStore((s) => s.hydrated);
    const menubar = useStore((s) => s.prefs.switches.menuBarIcon);
    const launch = useStore((s) => s.prefs.switches.launchAtLogin);

    useEffect(() => {
        if (!hydrated) return;
        void setTrayVisible(menubar);
    }, [hydrated, menubar]);

    // The login item is shared with the OS, which may have turned it off behind
    // Lore's back. What it reports wins once, on the first pass; from then on
    // the switch drives it. `null` means there is no login item to ask — the
    // browser dev server — and the switch is then left alone.
    const startup = useRef<'available' | 'pending' | 'unavailable'>('pending');
    useEffect(() => {
        if (!hydrated) return;

        if (startup.current === 'unavailable') return;
        if (startup.current === 'available') {
            void setLaunchAtLogin(launch).then((ok) => {
                if (ok) return;
                useStore.getState().pushToast('Could not change the login item.');
            });
            return;
        }

        void launchAtLoginEnabled().then((enabled) => {
            startup.current = enabled === null ? 'unavailable' : 'available';
            if (enabled !== null && enabled !== launch)
                useStore.getState().toggleSwitch('launchAtLogin');
        });
    }, [hydrated, launch]);
}
