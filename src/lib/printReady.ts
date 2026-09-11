// Deciding when a page is finished enough to print.
//
// Printing is a one-shot snapshot: whatever is laid out when the print
// operation runs is what lands in the PDF. A document pulled from GitHub cites
// images on the network, and a dead URL never settles at all — so every wait
// here is bounded, and the fallback is always "print anyway". A PDF missing one
// badge beats no PDF.

/** How long one image gets before the page gives up on it. */
const IMAGE_MS = 3000;

/** The ceiling on the whole wait, however many images there are. */
const OVERALL_MS = 8000;

export async function waitForPaint(root: Document = document): Promise<void> {
    await Promise.race([Promise.all([waitForFonts(root), waitForImages(root)]), delay(OVERALL_MS)]);
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function loaded(image: HTMLImageElement): boolean {
    return image.complete && image.naturalWidth > 0;
}

/**
 * Resolves on load, on error, or on the timeout — never rejects. An image that
 * 404s and an image whose host hangs are the same outcome to a printer.
 */
function settled(image: HTMLImageElement): Promise<void> {
    return new Promise((resolve) => {
        const done = (): void => {
            image.removeEventListener('load', done);
            image.removeEventListener('error', done);
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(done, IMAGE_MS);
        image.addEventListener('load', done);
        image.addEventListener('error', done);
    });
}

async function waitForFonts(root: Document): Promise<void> {
    // `document.fonts` is absent in jsdom, and web fonts are a progressive
    // enhancement here anyway — the fallback stack is what prints if it never
    // resolves.
    if (!root.fonts) return;
    await Promise.race([root.fonts.ready, delay(IMAGE_MS)]);
}

async function waitForImages(root: Document): Promise<void> {
    const pending = [...root.images].filter((image) => !loaded(image));
    await Promise.all(pending.map((image) => settled(image)));

    // Whatever never arrived is marked rather than left alone: the print rules
    // hide it, so a dead URL prints as nothing instead of an empty bordered box.
    for (const image of root.images) {
        if (!loaded(image)) image.setAttribute('data-print-unloaded', '');
    }
}
