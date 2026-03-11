import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
    server: {
        host: '127.0.0.1',
        port: 5277,
    },
    plugins: [
        react(),
        electron([
            {
                // Main process entry
                entry: 'electron/main.ts',
                onstart(options) {
                    options.startup()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        sourcemap: true,
                        rollupOptions: {
                            external: ['koffi'],
                        },
                    },
                },
            },
            {
                // Preload script
                entry: 'electron/preload.ts',
                onstart(options) {
                    options.reload()
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        sourcemap: true,
                    },
                },
            },
        ]),
        renderer(),
    ],
})
