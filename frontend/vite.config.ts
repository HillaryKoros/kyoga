import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Override at build time: VITE_BASE=/some-path/ npm run build  (default '/kyoga/')
const base = process.env.VITE_BASE ?? '/kyoga/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    fs: {
      // Allow Vite to serve files outside web/ via the public/ symlinks.
      allow: ['..'],
      strict: false,
    },
  },
})
