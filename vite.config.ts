import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaPlugin } from './scripts/pwa.mjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pwaPlugin()],
  base: './', // Ensures relative path loading for GitHub Pages and local file hosting
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom/client'],
          'vendor-motion': ['motion/react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
