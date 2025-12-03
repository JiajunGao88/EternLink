# EternLink Backend API

This backend service handles blockchain transactions using a company wallet, so users don't need to interact with MetaMask.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
# Copy the example file
cp .env.example .env
```

3. Configure your company wallet:
   - Generate a new wallet or use an existing one
   - Add the private key to `.env` as `COMPANY_WALLET_PRIVATE_KEY`
   - Make sure the wallet has enough ETH for gas fees on Base Sepolia

4. Update `.env` with your configuration:
```
COMPANY_WALLET_PRIVATE_KEY=your_private_key_here
RPC_URL=https://sepolia.base.org
CONTRACT_ADDRESS=0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a
PORT=3001
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### POST /api/register
Register a file hash on the blockchain.

**Request body:**
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

## Frontend Configuration

In `src/config.ts`, set the API base URL:
```typescript
export const API_BASE_URL = 'http://localhost:3001'; // or your production API URL
```

Or use environment variable:
```bash
VITE_API_BASE_URL=http://localhost:3001 npm run dev
```

## Security Notes

- **Never commit `.env` file to version control**
- Keep the private key secure
- Use environment variables in production
- Consider using a hardware wallet or key management service for production
- Add rate limiting and authentication for production use
