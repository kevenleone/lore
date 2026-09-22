import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    // Relative, so the same build serves from `<user>.github.io/lore/` or a custom domain.
    base: './',
    build: {
        emptyOutDir: true,
        outDir: 'dist',
    },
    plugins: [tailwindcss()],
    publicDir: false,
});
