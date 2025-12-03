# Cloudflare Deployment Guide for EternLink

This guide explains how to deploy EternLink to Cloudflare (Pages for frontend, Workers for API).

## Prerequisites

1. Cloudflare account with `eternlink.co` domain configured
2. Node.js and npm installed
3. Cloudflare Workers CLI (wrangler) installed globally: `npm install -g wrangler`

## Deployment Architecture

- **Frontend**: Cloudflare Pages (eternlink.co)
- **Backend API**: Cloudflare Workers (api.eternlink.co or eternlink.co/api/*)

## Step 1: Deploy Backend API (Cloudflare Workers)

1. Navigate to workers directory:
```bash
cd workers
```

2. Install dependencies:
```bash
npm install
```

3. Login to Cloudflare:
```bash
wrangler login
```

4. Set the company wallet private key as a secret:
```bash
wrangler secret put COMPANY_WALLET_PRIVATE_KEY
# When prompted, paste your private key (keep this secure!)
```

5. Deploy the worker:
```bash
npm run deploy:prod
```

6. Configure custom domain (optional):
   - Go to Cloudflare Dashboard > Workers & Pages
   - Select your worker
   - Go to Settings > Triggers
   - Add custom domain: `api.eternlink.co`

## Step 2: Deploy Frontend (Cloudflare Pages)

### Option A: Via Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect your Git repository (GitHub/GitLab)
4. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (root of repo)
5. Environment variables (if needed):
   - `VITE_API_BASE_URL`: `https://api.eternlink.co`
6. Click "Save and Deploy"

### Option B: Via Wrangler CLI

1. Build the frontend:
```bash
npm run build
```

2. Deploy to Cloudflare Pages:
```bash
wrangler pages deploy dist --project-name=eternlink
```

3. Configure custom domain:
   - Go to Cloudflare Dashboard > Pages > eternlink project
   - Go to Custom domains
   - Add `eternlink.co` and `www.eternlink.co`

## Step 3: Configure DNS

In Cloudflare DNS settings for `eternlink.co`:

1. **Root domain** (`eternlink.co`):
   - Type: `CNAME`
   - Name: `@`
   - Target: Your Pages deployment URL (e.g., `eternlink.pages.dev`)
   - Proxy: Enabled (orange cloud)

2. **API subdomain** (`api.eternlink.co`):
   - Type: `CNAME`
   - Name: `api`
   - Target: Your Workers deployment URL (e.g., `eternlink-api.your-subdomain.workers.dev`)
   - Proxy: Enabled (orange cloud)

## Step 4: Update Frontend API URL

The frontend is already configured to use:
- Production: `https://api.eternlink.co`
- Development: `http://localhost:8787`

If you need to override, set environment variable in Cloudflare Pages:
- `VITE_API_BASE_URL`: `https://api.eternlink.co`

## Verification

1. **Test API health check**:
   ```bash
   curl https://api.eternlink.co/health
   ```

2. **Test frontend**:
   Visit `https://eternlink.co` and test file upload/registration

## Company Wallet Information

- **Wallet Address**: `0x1A81508179191CF22Aa94B921394f644982728f4`
- **Contract Address**: `0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a` (Base Sepolia)
- **Network**: Base Sepolia Testnet

## Security Notes

- ✅ Private key is stored as Cloudflare Workers secret (encrypted)
- ✅ Private key never exposed in code or environment variables
- ✅ CORS is configured to allow requests from eternlink.co
- ✅ All blockchain operations happen server-side

## Troubleshooting

### API not working
- Check if worker is deployed: `wrangler deployments list`
- Check worker logs: `wrangler tail`
- Verify secret is set: `wrangler secret list`

### Frontend can't connect to API
- Check CORS headers in worker
- Verify API URL in `src/config.ts`
- Check browser console for errors

### Domain not working
- Verify DNS records in Cloudflare
- Check SSL/TLS settings (should be Full/Strict)
- Wait for DNS propagation (can take up to 24 hours)

## Continuous Deployment

### Automatic Deployment via Git

1. Connect repository to Cloudflare Pages
2. Enable automatic deployments on push
3. For workers, use GitHub Actions or similar CI/CD

### Manual Deployment

**Frontend:**
```bash
npm run build
wrangler pages deploy dist --project-name=eternlink
```

**Backend:**
```bash
cd workers
npm run deploy:prod
```

