import type { AiEvent } from '../backend';

export interface Harness {
    binary: string;
    createParser(): HarnessParser;
    id: HarnessId;
    invoke(options: HarnessOptions): HarnessInvocation;
    label: string;
}

export type HarnessId = 'claude-cli' | 'codex-cli' | 'opencode-cli';

export interface HarnessInvocation {
    args: string[];
    env?: Record<string, string>;
    /** The prompt, when the tool reads it there: argv is world-readable via `ps`. */
    stdin?: string;
}

export interface HarnessOptions {
    /** Absent when the answer needs nothing from the vault. */
    mcp?: McpLaunch;
    model?: string;
    prompt: string;
    system: string;
    /** An empty directory, so the tool finds no project files and no local config. */
    workdir: string;
}

export interface HarnessParser {
    /** Whatever was held back until the run was known to be over. */
    finish(): AiEvent[];
    /** Throws `AiError` when the line reports that the run failed. */
    push(line: Record<string, unknown>): AiEvent[];
}

export interface McpLaunch {
    args: string[];
    command: string;
    env: Record<string, string>;
}

export function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function text(value: unknown): string {
    return typeof value === 'string' ? value : '';
}
