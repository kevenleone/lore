import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRepository } from '../data';
import { DEFAULT_PREFS } from './types';
import { useStore } from './useStore';

vi.mock('../lib/workspace', async () => {
    const actual = await vi.importActual<typeof import('../lib/workspace')>('../lib/workspace');
    return { ...actual, pickExportFolder: vi.fn(), pickWorkspaceFolder: vi.fn() };
});

const { pickExportFolder } = await import('../lib/workspace');
const picked = vi.mocked(pickExportFolder);

beforeEach(() => {
    picked.mockReset();
    useStore.setState({ prefs: DEFAULT_PREFS, toasts: [] });
});

describe('exportVault', () => {
    it('does nothing when the folder picker is cancelled', async () => {
        const repo = getRepository();
        const exportTo = vi.fn();
        Object.assign(repo, { exportTo });
        picked.mockResolvedValue(null);

        await useStore.getState().exportVault();

        expect(exportTo).not.toHaveBeenCalled();
        expect(useStore.getState().toasts).toHaveLength(0);
    });

    it('reports where the copy landed', async () => {
        const repo = getRepository();
        Object.assign(repo, {
            exportTo: vi.fn().mockResolvedValue({ files: 9, path: '/tmp/out/Vault export' }),
        });
        picked.mockResolvedValue('/tmp/out');

        await useStore.getState().exportVault();

        expect(useStore.getState().toasts[0].message).toBe('Exported 9 files to Vault export.');
    });

    it('says so when the export fails, rather than looking like it worked', async () => {
        const repo = getRepository();
        Object.assign(repo, { exportTo: vi.fn().mockRejectedValue(new Error('disk is full')) });
        picked.mockResolvedValue('/tmp/out');

        await useStore.getState().exportVault();

        expect(useStore.getState().toasts[0].message).toBe('disk is full');
    });
});

describe('restoreDefaultPrefs', () => {
    it('puts every preference back', () => {
        useStore.getState().setPref('density', 'Roomy');
        useStore.getState().setPref('textSize', 1.2);
        useStore.getState().toggleSwitch('statusBar');

        useStore.getState().restoreDefaultPrefs();

        expect(useStore.getState().prefs).toEqual(DEFAULT_PREFS);
    });
});
