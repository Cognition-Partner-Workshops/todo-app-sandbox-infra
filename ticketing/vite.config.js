import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/devin': {
        target: 'https://api.devin.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/devin/, ''),
        secure: true,
      },
    },
  },
})
