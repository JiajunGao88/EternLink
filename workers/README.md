# EternLink Cloudflare Workers API

This is the backend API service for EternLink, deployed on Cloudflare Workers

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Cloudflare Workers secrets:
```bash
# Set the company wallet private key (this is a secret, not stored in code)
wrangler secret put COMPANY_WALLET_PRIVATE_KEY
# When prompted, paste your private key
```

3. Deploy to Cloudflare:
```bash
# Deploy to production
npm run deploy:prod

# Or deploy to development
npm run deploy
```

## Configuration

- **Company Wallet Address**: `0x1A81508179191CF22Aa94B921394f644982728f4` (public, safe to expose)
- **Contract Address**: `0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a` (Base Sepolia)
- **RPC URL**: `https://sepolia.base.org`

## API Endpoints

### GET /health
Health check endpoint.

### POST /api/register
Register a file hash on the blockchain.

**Request:**
```json
{
  "fileHash": "0x...",
  "cipher": "AES-256-GCM+PBKDF2(250k, SHA-256)",
  "cid": "",
  "size": 1024,
  "mime": "text/plain"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 12345
}
```

### GET /api/verify/:fileHash
Check if a file hash exists on the blockchain.

**Response:**
```json
{
  "success": true,
  "exists": true
}
```

## Domain Configuration

The worker is configured to handle requests from:
- `api.eternlink.co/*`
- `eternlink.co/api/*`

Make sure to configure these routes in your Cloudflare dashboard.

