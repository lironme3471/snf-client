# SNF Client

## Hosted mode without localhost

GitHub Pages cannot bypass browser CORS for credential login and presigned S3 uploads.
Use a small proxy for hosted mode.

This repo includes a Cloudflare Worker template in [cloudflare-proxy/worker.mjs](cloudflare-proxy/worker.mjs).

### 1. Deploy the proxy

```bash
cd cloudflare-proxy
npm i -g wrangler
wrangler login
wrangler deploy
```

After deploy, you get a worker URL like:

`https://snf-client-proxy.<your-subdomain>.workers.dev`

### 2. Point the app to the proxy

Create `.env.production` in project root with:

```bash
VITE_PROXY_BASE=https://snf-client-proxy.<your-subdomain>.workers.dev
```

Then rebuild and redeploy GitHub Pages.

### 3. What the proxy handles

- `POST /login` forwards credential login to NICE login endpoint
- `PUT /upload?...` forwards media uploads to S3 presigned URLs

When `VITE_PROXY_BASE` is set, hosted mode uses proxy endpoints automatically.
