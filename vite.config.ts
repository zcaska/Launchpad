import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative path loading for GitHub Pages and local file hosting
  server: {
    proxy: {
      '/api/ticktick': {
        target: 'https://api.ticktick.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ticktick/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['motion/react'],
          'vendor-icons': ['@phosphor-icons/react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
