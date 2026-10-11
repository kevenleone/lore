import modes from '../../../lore.modes.json';

export interface SecretStore {
    delete(name: string): Promise<void>;
    get(name: string): Promise<null | string>;
    set(name: string, value: string): Promise<void>;
}

export function keychain(mode: string | undefined = Bun.env.LORE_MODE): SecretStore {
    const scope = service(mode);

    return {
        async delete(name) {
            await Bun.secrets.delete({ name, service: scope });
        },
        get(name) {
            return Bun.secrets.get({ name, service: scope });
        },
        async set(name, value) {
            await Bun.secrets.set({ name, service: scope, value });
        },
    };
}

export function memorySecrets(initial: Record<string, string> = {}): SecretStore {
    const values = new Map(Object.entries(initial));

    return {
        async delete(name) {
            values.delete(name);
        },
        async get(name) {
            return values.get(name) ?? null;
        },
        async set(name, value) {
            values.set(name, value);
        },
    };
}

// Per build mode, like the vault: a dev build must not read the key the
// installed app was given.
function service(mode: string | undefined): string {
    const known = mode && mode in modes ? (mode as keyof typeof modes) : 'prod';

    return `${modes[known].identifier}.ai`;
}
