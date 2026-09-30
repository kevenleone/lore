const REPOSITORY = 'kevenleone/lore';

interface Release {
    assets: ReleaseAsset[];
    tag_name: string;
}

interface ReleaseAsset {
    browser_download_url: string;
    name: string;
}

document.documentElement.classList.add('js');

/** Leaves the static `releases/latest` links in place when GitHub cannot be reached. */
async function linkLatestRelease(): Promise<void> {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
    });

    if (!response.ok) {
        return;
    }

    const release = (await response.json()) as Release;
    const findDmg = (arch: string): ReleaseAsset | undefined =>
        release.assets.find((asset) => asset.name.endsWith(`_${arch}.dmg`));

    const universal = findDmg('universal');
    const primary = universal ?? findDmg('aarch64');
    // Tauri names the Intel bundle `x64`, not the Rust triple's `x86_64`.
    const intel = universal ? undefined : findDmg('x64');

    if (primary) {
        for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-download]')) {
            link.href = primary.browser_download_url;
        }
    }

    const intelLink = document.querySelector<HTMLAnchorElement>('[data-download-intel]');

    if (intel && intelLink) {
        intelLink.href = intel.browser_download_url;
        intelLink.hidden = false;
    }

    const note = document.querySelector('[data-release-note]');

    if (note && primary) {
        const platforms = universal ? 'Apple silicon and Intel' : 'Apple silicon';

        note.textContent = `Version ${release.tag_name.replace(/^v/, '')} for ${platforms}.`;
    }
}

function revealOnScroll(): void {
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) {
                    continue;
                }

                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );

    for (const element of document.querySelectorAll('[data-reveal]')) {
        observer.observe(element);
    }
}

function setupTabs(): void {
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

    const select = (selected: HTMLButtonElement): void => {
        for (const tab of tabs) {
            const isSelected = tab === selected;
            const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');

            tab.setAttribute('aria-selected', String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
            panel?.toggleAttribute('hidden', !isSelected);
        }
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', (event) => {
            const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];

            if (!step) {
                return;
            }

            const next = tabs[(index + step + tabs.length) % tabs.length];

            select(next);
            next.focus();
        });
    });
}

revealOnScroll();
setupTabs();
linkLatestRelease().catch(() => undefined);
