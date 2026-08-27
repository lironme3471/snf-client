import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

// Forwards a presigned S3 upload URL passed as ?url= to whatever bucket it
// actually points at, so it works for any environment's presigned URLs
// instead of one hardcoded bucket (the S3 signature is host-specific, so a
// fixed proxy target breaks as soon as a different bucket is signed for).
function s3DevProxyPlugin(): Plugin {
  return {
    name: 's3-dev-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/s3-proxy', async (req: IncomingMessage, res: ServerResponse) => {
        const target = new URLSearchParams(req.url?.split('?')[1] ?? '').get('url')
        if (!target) {
          res.statusCode = 400
          res.end('Missing url query param')
          return
        }

        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const body = chunks.length ? Buffer.concat(chunks) : undefined

        const headers: Record<string, string> = {}
        for (const [key, value] of Object.entries(req.headers)) {
          if (['host', 'connection', 'content-length', 'expect'].includes(key.toLowerCase())) continue
          if (typeof value === 'string') headers[key] = value
        }

        try {
          const upstream = await fetch(target, { method: req.method, headers, body })
          res.statusCode = upstream.status
          upstream.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'content-encoding') return
            res.setHeader(key, value)
          })
          res.end(Buffer.from(await upstream.arrayBuffer()))
        } catch (err) {
          res.statusCode = 502
          res.end(err instanceof Error ? err.message : 'Upstream request failed')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/snf-client/' : '/',
  plugins: [react(), s3DevProxyPlugin()],
  server: {
    proxy: {
      '/login-api/test': {
        target: 'https://na1.test.nice-incontact.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/login-api\/test/, ''),
      },
      '/login-api/prod': {
        target: 'https://na1.nice-incontact.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/login-api\/prod/, ''),
      },
      '/nice-api/test': {
        target: 'https://api-na1.test.niceincontact.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nice-api\/test/, ''),
      },
      '/nice-api/prod': {
        target: 'https://api-na1.niceincontact.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nice-api\/prod/, ''),
      },
    },
  },
}))
