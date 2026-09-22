import { useState } from 'react';

import type { LinkVideo } from '../../lib/video';

import { videoEmbedUrl } from '../../lib/video';
import { useStore } from '../../store/useStore';
import { Play } from '../common/glyphs';

interface VideoPlayerProps {
    thumbnail?: string;
    title: string;
    video: LinkVideo;
}

/**
 * The thumbnail until asked to play: an embed is a heavyweight page of its own,
 * and loading one for every item the selection passes over would be wasteful.
 * Key it by item so moving to another video drops back to the thumbnail.
 */
export function VideoPlayer({ thumbnail, title, video }: VideoPlayerProps): React.ReactElement {
    const [playing, setPlaying] = useState(false);
    const textSize = useStore((state) => state.prefs.textSize);

    return (
        <div className="relative mt-5 mb-1 aspect-video overflow-hidden rounded-[13px] border border-border bg-surface3">
            {playing ? (
                <iframe
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-none"
                    referrerPolicy="strict-origin-when-cross-origin"
                    src={videoEmbedUrl(video)}
                    // Computed from Text size: WKWebView scales an iframe's content by
                    // the ancestor `zoom` without resizing its viewport, cropping the
                    // player above 1 and leaving blank bands below it. Cancelling the
                    // zoom here keeps the player flush with its box in every engine.
                    style={{ zoom: 1 / textSize }}
                    title={title}
                />
            ) : (
                <button
                    aria-label={`Play ${title}`}
                    className="group absolute inset-0 cursor-pointer border-none bg-transparent p-0"
                    onClick={() => setPlaying(true)}
                    type="button"
                >
                    {thumbnail && (
                        <img
                            alt=""
                            className="block h-full w-full object-cover"
                            draggable={false}
                            src={thumbnail}
                        />
                    )}
                    <span className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,20,28,.6)] text-white transition-transform group-hover:scale-110">
                        <Play className="ml-[3px]" size={24} />
                    </span>
                </button>
            )}
        </div>
    );
}
