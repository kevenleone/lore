import type { ExcalidrawImperativeAPI, ExcalidrawProps } from '@excalidraw/excalidraw/types';

import {
    CaptureUpdateAction,
    Excalidraw,
    exportToSvg,
    hashElementsVersion,
    restoreElements,
} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useEffect, useRef, useState } from 'react';

import type { CanvasElement, CanvasScene } from '../../lib/canvas-body';

import { parseCanvasBody, writeCanvasBody } from '../../lib/canvas-body';
import {
    EXCALIDRAW_FILE,
    excalidrawClipboard,
    excalidrawFile,
    type ExportFormat,
    saveExport,
    SVG_FILE,
} from '../../lib/canvas-export';
import { copyText } from '../../lib/clipboard';
import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { effectiveTheme } from '../../theme/tokens';

interface CanvasEditorProps {
    body: string | undefined;
    className?: string;
    /** Names an exported file, without its extension. */
    exportName: string;
    onCommit: (body: string) => void;
}
type SceneElements = Parameters<NonNullable<ExcalidrawProps['onChange']>>[0];

type SceneUpdate = Parameters<ExcalidrawImperativeAPI['updateScene']>[0];

const SAVE_DELAY_MS = 600;

// Transparent, so a new sketch sits on the theme's own surface in every theme.
const DEFAULT_APP_STATE = { viewBackgroundColor: 'transparent' };

const UI_OPTIONS: ExcalidrawProps['UIOptions'] = {
    canvasActions: {
        export: false,
        loadScene: false,
        saveAsImage: false,
        saveToActiveFile: false,
        toggleTheme: false,
    },
    // A pasted image would be written into the Markdown file as base64.
    tools: { image: false },
};

// Must be set before Excalidraw first renders, or it asks a CDN for its fonts.
window.EXCALIDRAW_ASSET_PATH = new URL('/excalidraw/', window.location.origin).href;

export function CanvasEditor({
    body,
    className,
    exportName,
    onCommit,
}: CanvasEditorProps): React.JSX.Element {
    const appearance = useStore((state) => state.prefs.appearance);
    const textSize = useStore((state) => state.prefs.textSize);
    const pushToast = useStore((state) => state.pushToast);
    const [shareOpen, setShareOpen] = useState(false);
    const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
    // Read once: after mount the scene is Excalidraw's, and a later `body` is
    // either our own save coming back or an edit made outside the app.
    const [initial] = useState(() => parseCanvasBody(body));

    const bodyRef = useRef(body);
    const onCommitRef = useRef(onCommit);
    const sceneRef = useRef<CanvasScene | null>(initial.scene);
    const savedKeyRef = useRef(initial.scene ? sceneKey(initial.scene) : '');
    const timerRef = useRef<null | number>(null);
    // Loading a scene makes Excalidraw report it back, sometimes renumbered.
    // That report is the baseline, not an edit to save.
    const loadingRef = useRef(true);

    bodyRef.current = body;
    onCommitRef.current = onCommit;

    const flush = () => {
        if (timerRef.current === null || !sceneRef.current) {
            return;
        }

        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        savedKeyRef.current = sceneKey(sceneRef.current);
        onCommitRef.current(writeCanvasBody(bodyRef.current, sceneRef.current));
    };

    useEffect(() => flush, []);

    useEffect(() => {
        if (!api || timerRef.current !== null) {
            return;
        }

        const incoming = parseCanvasBody(body).scene;

        if (!incoming || sceneKey(incoming) === savedKeyRef.current) {
            return;
        }

        sceneRef.current = incoming;
        savedKeyRef.current = sceneKey(incoming);
        loadingRef.current = true;
        api.updateScene({
            appState: incoming.appState as SceneUpdate['appState'],
            captureUpdate: CaptureUpdateAction.NEVER,
            elements: restoreElements(incoming.elements as unknown as SceneElements, null),
        });
    }, [api, body]);

    if (!initial.scene) {
        return (
            <div className={cn('rounded-11 border border-border bg-surface2 p-4', className)}>
                <p className="text-body-lg text-text2">
                    This sketch cannot be read, so Lore will not change it. Fix the Drawing section
                    in the file and it opens again.
                </p>
                <p className="mt-1 font-mono text-caption text-text3">{initial.error}</p>
                <pre className="mt-3 max-h-[320px] overflow-auto font-mono text-body whitespace-pre text-text2 select-text">
                    {body}
                </pre>
            </div>
        );
    }

    const onChange: ExcalidrawProps['onChange'] = (elements, appState) => {
        const scene: CanvasScene = {
            appState: {
                gridSize: appState.gridSize,
                viewBackgroundColor: appState.viewBackgroundColor,
            },
            elements: elements as unknown as CanvasElement[],
        };

        if (loadingRef.current) {
            loadingRef.current = false;
            savedKeyRef.current = sceneKey(scene);

            return;
        }

        // Fires on every pointer move and selection, not only when a stroke lands.
        if (sceneKey(scene) === savedKeyRef.current) {
            return;
        }

        sceneRef.current = scene;

        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(flush, SAVE_DELAY_MS);
    };

    const currentScene = (): CanvasScene => ({
        appState: { viewBackgroundColor: api?.getAppState().viewBackgroundColor },
        elements: (api?.getSceneElements() ?? []) as unknown as CanvasElement[],
    });

    const share = async (action: () => Promise<null | string>) => {
        setShareOpen(false);

        try {
            const done = await action();

            if (done) {
                pushToast(done);
            }
        } catch (error) {
            pushToast(error instanceof Error ? error.message : 'The sketch could not be shared.');
        }
    };

    const saveAs = async (format: ExportFormat, contents: string): Promise<null | string> =>
        (await saveExport(exportName, format, contents)) ? `Saved as ${format.label}.` : null;

    const copyScene = async (): Promise<string> =>
        (await copyText(excalidrawClipboard(currentScene())))
            ? 'Copied. Paste it into excalidraw.com.'
            : 'The sketch could not be copied.';

    const saveSvg = async (): Promise<null | string> => {
        const scene = currentScene();
        const background = scene.appState.viewBackgroundColor ?? 'transparent';
        const svg = await exportToSvg({
            appState: {
                exportBackground: background !== 'transparent',
                viewBackgroundColor: background,
            },
            elements: scene.elements as unknown as SceneElements,
            files: null,
        });

        return saveAs(SVG_FILE, svg.outerHTML);
    };

    const shareMenu = (): React.JSX.Element => (
        <div className="relative">
            <button
                aria-expanded={shareOpen}
                aria-haspopup="menu"
                className="h-9 rounded-lg border-none bg-surface3 px-3 font-[inherit] text-body-lg text-text2 hover:bg-hover"
                onClick={() => setShareOpen((open) => !open)}
                type="button"
            >
                Share
            </button>
            {shareOpen && (
                <div
                    className="absolute top-10 right-0 z-10 min-w-[210px] rounded-10 border border-border bg-surface p-[5px] shadow-float"
                    role="menu"
                >
                    <ShareItem onClick={() => void share(copyScene)}>Copy for Excalidraw</ShareItem>
                    <ShareItem
                        onClick={() =>
                            void share(() =>
                                saveAs(EXCALIDRAW_FILE, excalidrawFile(currentScene())),
                            )
                        }
                    >
                        Save as .excalidraw…
                    </ShareItem>
                    <ShareItem onClick={() => void share(saveSvg)}>Save as SVG…</ShareItem>
                </div>
            )}
        </div>
    );

    return (
        <div
            className={cn('overflow-hidden rounded-11 border border-border bg-surface', className)}
            // Escape ends a stroke or a label here; the page's own handler would close the item.
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                }
            }}
        >
            <div
                className="h-full w-full"
                // Computed: undoes the Text size zoom around the canvas. Excalidraw
                // maps the pointer to the scene in unzoomed pixels, so under a zoom
                // every stroke lands away from the cursor.
                style={{ zoom: 1 / textSize }}
            >
                <Excalidraw
                    excalidrawAPI={setApi}
                    initialData={{
                        appState: { ...DEFAULT_APP_STATE, ...initial.scene.appState },
                        elements: initial.scene.elements as unknown as SceneElements,
                    }}
                    onChange={onChange}
                    renderTopRightUI={shareMenu}
                    theme={effectiveTheme(appearance)}
                    UIOptions={UI_OPTIONS}
                />
            </div>
        </div>
    );
}

function sceneKey(scene: CanvasScene): string {
    const live = scene.elements.filter((element) => !element.isDeleted);
    const hash = hashElementsVersion(live as unknown as SceneElements);

    return `${hash}:${scene.appState.viewBackgroundColor ?? ''}:${scene.appState.gridSize ?? ''}`;
}

function ShareItem({
    children,
    onClick,
}: {
    children: React.ReactNode;
    onClick: () => void;
}): React.JSX.Element {
    return (
        <button
            className="block w-full rounded-7 border-none bg-transparent px-[10px] py-[7px] text-left font-[inherit] text-body-lg text-text2 hover:bg-hover"
            onClick={onClick}
            role="menuitem"
            type="button"
        >
            {children}
        </button>
    );
}
