import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',      // expose on all interfaces so phone can connect
    // Explicitly allow Vite to serve files from this directory (fixes EPERM on Windows)
    fs: {
      allow: ['..'],
      strict: false,
    },
    // Proxy API calls to FastAPI backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    // Disable esbuild dep-scan — required when running on a Windows network drive (UNC path)
    // where esbuild's native realpath call returns EPERM.
    noDiscovery: true,
    include: [],
  },
})
