import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Ensure service-worker.js is served correctly
    middlewareMode: false,
  },
  build: {
    // Optimize for production PWA builds
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code to improve caching
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['react-hot-toast', 'react-icons'],
        },
      },
    },
  },
  // Ensure public directory files are copied
  publicDir: 'public',
})


