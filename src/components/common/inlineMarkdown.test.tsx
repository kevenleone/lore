// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InlineMarkdown } from './MarkdownView';

afterEach(cleanup);

describe('InlineMarkdown', () => {
    it('renders bold, emphasis and code without the syntax', () => {
        const { container } = render(
            <InlineMarkdown markdown="**Fix it.** Run `pnpm test` until *green*." />,
        );

        expect(container.querySelector('strong')?.textContent).toBe('Fix it.');
        expect(container.querySelector('code')?.textContent).toBe('pnpm test');
        expect(container.querySelector('em')?.textContent).toBe('green');
        expect(container.textContent).toBe('Fix it. Run pnpm test until green.');
    });

    it('draws a link as text, so it can sit inside a button', () => {
        const { container } = render(<InlineMarkdown markdown="See [the docs](https://x.dev)" />);

        expect(container.querySelector('a')).toBeNull();
        expect(container.textContent).toBe('See the docs');
    });

    it('keeps text that would parse as a block verbatim', () => {
        const { container } = render(<InlineMarkdown markdown="# not a heading" />);

        expect(container.textContent).toBe('# not a heading');
    });
});
