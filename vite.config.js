import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: 'src',
    publicDir: '../public',
    build: {
        outDir: '../app',
        emptyOutDir: true,
        sourcemap: true,
    },
    server: {
        port: 3000,
        open: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    css: {
        postcss: './postcss.config.js',
    },
});
