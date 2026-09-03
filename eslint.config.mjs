import { baseConfig } from './eslint.base.mjs';

export default [
    ...baseConfig,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        ignores: [
            '**/*.config.js',
            '**/*.config.mjs',
            '**/build/**',
            '**/coverage/**',
            '**/dist/**',
            '**/node_modules/**',
            '**/src-tauri/binaries/**',
            '**/src-tauri/gen/**',
            '**/src-tauri/target/**',
        ],
    },
];
