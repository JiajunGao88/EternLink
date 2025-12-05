// API Configuration
// Production: Use Cloudflare Workers API
// Development: Use local Workers dev server (http://127.0.0.1:8787)
// Can be overridden with VITE_API_BASE_URL environment variable

const isDev = (import.meta as any).env?.MODE === 'development';

export const API_BASE_URL = 
  (import.meta as any).env?.VITE_API_BASE_URL || 
  (isDev 
    ? 'http://127.0.0.1:8787'  // Local Workers dev
    : 'https://eternlink-api-production.garygao922.workers.dev'  // Production Workers API
  );

// Contract addresses (for reference, not used in frontend anymore)
export const CONTRACT_ADDRESSES: { [chainId: number]: string } = {
  // Base Sepolia Testnet
  84532: "0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a",
  // Base Mainnet (if deployed)
  8453: "0xYourBaseMainnetContractAddressHere",
  // Ethereum Sepolia Testnet (optional)
  11155111: "0xYourEthereumSepoliaContractAddressHere",
};
