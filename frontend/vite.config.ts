import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // App is served under /kyoga/ in both dev and prod.
  base: '/kyoga/',
  plugins: [react()],
  server: {
    fs: {
      // Allow Vite to serve files outside frontend/ via the public/ symlinks.
      allow: ['..'],
      strict: false,
    },
  },
})
