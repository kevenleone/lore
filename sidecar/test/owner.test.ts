// Two Lores in one folder.
//
// The failure this closes is not hypothetical: a dev build with a newer index
// schema threw away and rebuilt the index the installed app was reading, and an
// interrupted rebuild left the vault unopenable.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp } from '../src/app';
import { ownerFor } from '../src/config';
import { claimVault, OWNER_FILE, readOwner, VaultOwnedElsewhere } from '../src/owner';
import { Vault } from '../src/vault';
import { Workspace } from '../src/workspace';

let root: string;

const PROD = ownerFor('prod')!;
const DEV = ownerFor('dev')!;
const AGENT = ownerFor('agent')!;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-owner-'));
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

const claim = (owner: null | typeof PROD) => claimVault(root, owner);

describe('the modes it reads', () => {
    it('gives each build its own identifier', () => {
        expect(new Set([AGENT.identifier, DEV.identifier, PROD.identifier]).size).toBe(3);
    });

    it('knows nothing about a mode that is not one', () => {
        expect(ownerFor('nonsense')).toBeNull();
        expect(ownerFor(undefined)).toBeNull();
    });
});

describe('claiming an unowned vault', () => {
    it('records who took it', async () => {
        await claim(DEV);

        expect(await readOwner(root)).toEqual(DEV);
    });

    it('writes the marker where the vault keeps its own files', async () => {
        await claim(DEV);

        expect(JSON.parse(await readFile(join(root, OWNER_FILE), 'utf8'))).toEqual(DEV);
    });

    it('lets the same build open it again', async () => {
        await claim(DEV);

        await expect(claim(DEV)).resolves.toBeUndefined();
    });
});

describe('a vault another Lore holds', () => {
    beforeEach(() => claim(PROD));

    it('is refused to a dev build', async () => {
        await expect(claim(DEV)).rejects.toBeInstanceOf(VaultOwnedElsewhere);
    });

    it('is refused to an agent build', async () => {
        await expect(claim(AGENT)).rejects.toBeInstanceOf(VaultOwnedElsewhere);
    });

    it('names the Lore that holds it, so the message says what to quit', async () => {
        await expect(claim(DEV)).rejects.toThrow(PROD.productName);
    });

    it('leaves the marker as it was, rather than taking it on the way out', async () => {
        await claim(DEV).catch(() => {});

        expect(await readOwner(root)).toEqual(PROD);
    });
});

describe('production', () => {
    it('takes a vault a dev build had claimed', async () => {
        // The alternative locks someone out of their own library because a
        // developer opened it once, which is the worse failure of the two.
        await claim(DEV);
        await claim(PROD);

        expect(await readOwner(root)).toEqual(PROD);
    });

    it('and the dev build is refused from then on', async () => {
        await claim(DEV);
        await claim(PROD);

        await expect(claim(DEV)).rejects.toBeInstanceOf(VaultOwnedElsewhere);
    });
});

describe('when the host did not say which build this is', () => {
    it('opens without claiming, rather than guessing', async () => {
        await claim(null);

        expect(await readOwner(root)).toBeNull();
    });

    it('opens a vault someone else holds, the guard having nothing to go on', async () => {
        await claim(PROD);

        await expect(claim(null)).resolves.toBeUndefined();
    });
});

describe('a marker that is not readable', () => {
    it('counts as unclaimed rather than failing the open', async () => {
        await claim(PROD);
        await writeFile(join(root, OWNER_FILE), 'not json at all', 'utf8');

        expect(await readOwner(root)).toBeNull();
        await expect(claim(DEV)).resolves.toBeUndefined();
    });

    it('counts as unclaimed when it has no identifier in it', async () => {
        await claim(PROD);
        await writeFile(join(root, OWNER_FILE), '{"productName":"Lore"}', 'utf8');

        expect(await readOwner(root)).toBeNull();
    });
});

describe('the workspace', () => {
    const note = () => writeFile(join(root, 'one.md'), '---\ntitle: One\n---\n\nBody.\n', 'utf8');

    it('opens a fresh vault and claims it', async () => {
        await note();

        const workspace = new Workspace(DEV);

        await workspace.open(root);
        expect(await readOwner(root)).toEqual(DEV);

        await workspace.close();
    });

    it('refuses one another Lore holds', async () => {
        await note();
        await claim(PROD);

        const workspace = new Workspace(DEV);

        await expect(workspace.open(root)).rejects.toBeInstanceOf(VaultOwnedElsewhere);
    });

    it('refuses before it touches the index, the rebuild being the damage', async () => {
        await note();
        await claim(PROD);

        const workspace = new Workspace(DEV);

        await workspace.open(root).catch(() => {});

        expect(await Bun.file(join(root, '.lore/index.db')).exists()).toBe(false);
    });

    it('keeps the vault it already had open when a switch is refused', async () => {
        // A refusal that closed the current vault would punish the user for
        // picking the wrong folder in a dialog.
        await note();

        const workspace = new Workspace(DEV);

        await workspace.open(root);

        const other = await mkdtemp(join(tmpdir(), 'lore-owner-other-'));

        await claimVault(other, PROD);
        await workspace.open(other).catch(() => {});

        expect(workspace.path).toBe(root);

        await workspace.close();
        await rm(other, { force: true, recursive: true });
    });
});

describe('the vault’s gitignore', () => {
    const ignorePath = () => join(root, '.lore/.gitignore');

    it('lists the marker in a vault it creates', async () => {
        await new Vault(root).ensureScaffold();

        expect(await readFile(ignorePath(), 'utf8')).toContain('owner.json');
    });

    it('tops up a vault an older Lore scaffolded', async () => {
        // Written once and never revisited, every existing vault would start
        // committing a file that describes one machine.
        await new Vault(root).ensureScaffold();
        await writeFile(ignorePath(), 'index.db\n', 'utf8');
        await new Vault(root).ensureScaffold();

        expect(await readFile(ignorePath(), 'utf8')).toContain('owner.json');
    });

    it('leaves what the user added to it alone', async () => {
        await new Vault(root).ensureScaffold();
        await writeFile(ignorePath(), 'index.db\nscratch/\n', 'utf8');
        await new Vault(root).ensureScaffold();

        expect(await readFile(ignorePath(), 'utf8')).toContain('scratch/');
    });

    it('does not list the same pattern twice', async () => {
        await new Vault(root).ensureScaffold();
        await new Vault(root).ensureScaffold();

        const lines = (await readFile(ignorePath(), 'utf8')).split('\n');

        expect(lines.filter((line) => line.trim() === 'owner.json')).toHaveLength(1);
    });
});

describe('what the renderer is told', () => {
    // The refusal is only useful if it reaches the person who picked the
    // folder, with the name of the Lore holding it still in the text.
    const TOKEN = 't';

    const openOver = async (owner: typeof PROD, path: string) => {
        const app = createApp(
            { dev: false, owner, parentPid: null, port: 0, token: TOKEN, vault: null },
            new Workspace(owner),
        );

        return app.handle(
            new Request('http://127.0.0.1/workspace/open', {
                body: JSON.stringify({ path }),
                headers: {
                    authorization: `Bearer ${TOKEN}`,
                    'content-type': 'application/json',
                    origin: 'tauri://localhost',
                },
                method: 'POST',
            }),
        );
    };

    it('answers with a failure rather than a vault', async () => {
        await claim(PROD);

        expect((await openOver(DEV, root)).ok).toBe(false);
    });

    it('says which Lore holds the folder', async () => {
        await claim(PROD);

        expect(await (await openOver(DEV, root)).text()).toContain(PROD.productName);
    });

    it('opens normally when nobody else holds it', async () => {
        expect((await openOver(DEV, root)).ok).toBe(true);
    });
});
