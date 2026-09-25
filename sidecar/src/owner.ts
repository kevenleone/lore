// Which build owns this vault.
//
// Every mode already opens its own default vault — the path comes from the
// bundle identifier — so two Lores only ever meet in a folder someone pointed
// them at by hand. That has happened, and it is not a harmless overlap: the
// index is derived state with a schema version, so a dev build with a newer
// schema throws away and rebuilds an index the installed app is reading, and an
// interrupted rebuild leaves a vault that will not open.
//
// So the folder records who claimed it, and a dev or agent build refuses a
// vault that belongs to another Lore. Production never refuses: it is the build
// the vault exists for, and locking the user out of their own library to
// protect a developer would be the worse failure.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { LORE_DIR } from './vault';

export const OWNER_FILE = `${LORE_DIR}/owner.json`;

/** The identifier production builds carry, and the one that may always claim. */
export const PROD_IDENTIFIER = 'com.lore.app';

export interface VaultOwner {
    identifier: string;
    productName: string;
}

export class VaultOwnedElsewhere extends Error {
    readonly owner: VaultOwner;

    constructor(owner: VaultOwner) {
        super(
            `This vault belongs to ${owner.productName}. Opening it from another ` +
                `Lore would have the two rebuild the same index over each other. ` +
                `Open a different folder, or quit ${owner.productName} and delete ` +
                `${OWNER_FILE} if you meant to hand it over.`,
        );
        this.name = 'VaultOwnedElsewhere';
        this.owner = owner;
    }
}

/**
 * Records `owner` as this vault's, or throws if someone else already is.
 *
 * Called before the store opens, because opening is what rebuilds the index —
 * refusing afterwards would be refusing after the damage.
 */
export async function claimVault(root: string, owner: null | VaultOwner): Promise<void> {
    // An owner the host never told us about. Enforcing on a guess would refuse
    // real vaults over a missing environment variable.
    if (!owner) {
        return;
    }

    const held = await readOwner(root);

    if (held && held.identifier !== owner.identifier && owner.identifier !== PROD_IDENTIFIER) {
        throw new VaultOwnedElsewhere(held);
    }

    if (held?.identifier === owner.identifier) {
        return;
    }

    await mkdir(join(root, LORE_DIR), { recursive: true });
    await writeFile(join(root, OWNER_FILE), `${JSON.stringify(owner, null, 2)}\n`, 'utf8');
}

/** Who holds this vault, or null if nobody has claimed it or the file is junk. */
export async function readOwner(root: string): Promise<null | VaultOwner> {
    try {
        const parsed: unknown = JSON.parse(await readFile(join(root, OWNER_FILE), 'utf8'));

        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }

        const { identifier, productName } = parsed as Partial<VaultOwner>;

        return identifier ? { identifier, productName: productName || identifier } : null;
    } catch {
        // Missing, unreadable or malformed all mean the same thing: unclaimed.
        // A vault must never fail to open over the file that guards it.
        return null;
    }
}
