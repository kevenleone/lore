import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import jsonc from 'eslint-plugin-jsonc';
import perfectionist from 'eslint-plugin-perfectionist';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import ts from 'typescript-eslint';

export const baseConfig = ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    perfectionist.configs['recommended-alphabetical'],
    prettierRecommended,
    {
        rules: {
            'prettier/prettier': 'warn',
        },
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}'],
        plugins: { '@stylistic': stylistic },
        rules: {
            '@stylistic/padding-line-between-statements': [
                'error',
                { blankLine: 'always', next: 'return', prev: '*' },
                { blankLine: 'always', next: '*', prev: ['const', 'let', 'var'] },
                { blankLine: 'always', next: ['const', 'let', 'var'], prev: '*' },
                {
                    blankLine: 'any',
                    next: ['const', 'let', 'var'],
                    prev: ['const', 'let', 'var'],
                },
                { blankLine: 'always', next: 'block-like', prev: '*' },
                { blankLine: 'always', next: '*', prev: 'block-like' },
            ],
            // Must come after prettierRecommended, which turns `curly` off.
            curly: ['error', 'all'],
            'no-restricted-syntax': [
                'error',
                {
                    message: 'Name function parameters in full words, not single letters.',
                    selector: ':function > Identifier.params[name=/^[A-Za-z]$/]',
                },
            ],
        },
    },
    ...jsonc.configs['flat/recommended-with-json'],
    {
        files: ['**/*.json'],
        rules: {
            'jsonc/no-comments': 'off',
            'jsonc/sort-keys': 'error',
        },
    },
);
