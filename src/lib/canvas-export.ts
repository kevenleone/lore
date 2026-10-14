import type { CanvasScene } from './canvas-body';

export interface ExportFormat {
    extension: 'excalidraw' | 'svg';
    label: string;
    mime: string;
}

export const EXCALIDRAW_FILE: ExportFormat = {
    extension: 'excalidraw',
    label: 'Excalidraw',
    mime: 'application/json',
};

export const SVG_FILE: ExportFormat = { extension: 'svg', label: 'SVG', mime: 'image/svg+xml' };

/** What excalidraw.com accepts on paste: the wire format of its own clipboard. */
export function excalidrawClipboard(scene: CanvasScene): string {
    return JSON.stringify({ elements: live(scene), files: {}, type: 'excalidraw/clipboard' });
}

/** A `.excalidraw` file, as excalidraw.com's Open reads it. */
export function excalidrawFile(scene: CanvasScene): string {
    return JSON.stringify(
        {
            appState: scene.appState,
            elements: live(scene),
            files: {},
            source: 'lore',
            type: 'excalidraw',
            version: 2,
        },
        null,
        2,
    );
}

/** Saves through the native panel, or as a download where there is none. False when cancelled. */
export async function saveExport(
    stem: string,
    format: ExportFormat,
    contents: string,
): Promise<boolean> {
    const name = `${stem || 'sketch'}.${format.extension}`;

    if (!('__TAURI_INTERNALS__' in window)) {
        download(name, format, contents);

        return true;
    }

    const { invoke } = await import('@tauri-apps/api/core');
    const destination = await invoke<null | string>('pick_save_path', {
        kind: format.extension,
        name,
        title: `Save as ${format.label}`,
    });

    if (typeof destination !== 'string') {
        return false;
    }

    await invoke('write_export', { contents, destination });

    return true;
}

function download(name: string, format: ExportFormat, contents: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type: format.mime }));
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

function live(scene: CanvasScene): CanvasScene['elements'] {
    return scene.elements.filter((element) => !element.isDeleted);
}
