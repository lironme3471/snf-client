import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/snf-client/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '/login-api': {
        target: 'https://na1.test.nice-incontact.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/login-api/, ''),
      },
      '/nice-api': {
        target: 'https://api-na1.test.niceincontact.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nice-api/, ''),
      },
      '/s3-proxy': {
        target: 'https://test-rec-gen-11f0b55e-2634-9960-9ae2-0242ac110002.s3.us-west-2.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, ''),
      },
    },
  },
}))
