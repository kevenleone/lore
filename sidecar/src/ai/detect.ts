import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

const SHELL_TIMEOUT_MS = 3000;

export type Locate = (binary: string) => Promise<null | string>;

export function createLocator(env: Record<string, string | undefined> = Bun.env): Locate {
    const found = new Map<string, null | string>();

    return async (binary) => {
        if (!found.has(binary)) {
            found.set(
                binary,
                Bun.which(binary, { PATH: searchPath(env) }) ?? (await askShell(binary, env)),
            );
        }

        return found.get(binary) ?? null;
    };
}

// An app launched from Finder inherits launchd's PATH, not the shell's, so the
// places these tools install themselves have to be named.
export function searchPath(env: Record<string, string | undefined> = Bun.env): string {
    const home = homedir();

    return [
        ...(env.PATH ?? '').split(delimiter),
        join(home, '.local', 'bin'),
        join(home, '.claude', 'local'),
        join(home, '.opencode', 'bin'),
        join(home, '.bun', 'bin'),
        join(home, '.npm-global', 'bin'),
        '/opt/homebrew/bin',
        '/usr/local/bin',
    ]
        .filter(Boolean)
        .join(delimiter);
}

/** Covers a version manager or a custom prefix that only the user's shell knows. */
async function askShell(
    binary: string,
    env: Record<string, string | undefined>,
): Promise<null | string> {
    if (!env.SHELL || process.platform === 'win32') {
        return null;
    }

    try {
        const child = Bun.spawn([env.SHELL, '-lc', `command -v ${binary}`], {
            stderr: 'ignore',
            stdin: 'ignore',
            stdout: 'pipe',
            timeout: SHELL_TIMEOUT_MS,
        });
        const path = (await new Response(child.stdout).text()).trim().split('\n').pop() ?? '';

        return (await child.exited) === 0 && path.startsWith('/') ? path : null;
    } catch {
        return null;
    }
}
