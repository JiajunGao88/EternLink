/**
 * Cloudflare Worker for EternLink API
 * Handles blockchain transactions using company wallet
 */

// Contract ABI
const POE_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "fileHash", "type": "bytes32" },
      { "internalType": "string", "name": "cipher", "type": "string" },
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "uint256", "name": "size", "type": "uint256" },
      { "internalType": "string", "name": "mime", "type": "string" }
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "fileHash", "type": "bytes32" }],
    "name": "exists",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Configuration - Company wallet address (public, safe to expose)
const COMPANY_WALLET_ADDRESS = "0x1A81508179191CF22Aa94B921394f644982728f4";
const RPC_URL = "https://sepolia.base.org";
const CONTRACT_ADDRESS = "0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a";

interface Env {
  COMPANY_WALLET_PRIVATE_KEY: string;
}

// Import ethers (static import for Cloudflare Workers)
import { ethers } from "ethers";

/**
 * Register file hash on blockchain
 */
async function registerFile(
  fileHash: string,
  cipher: string,
  cid: string,
  size: number,
  mime: string,
  env: Env
): Promise<{ success: boolean; txHash?: string; blockNumber?: number; error?: string }> {
  try {
    // Validate and clean private key
    if (!env.COMPANY_WALLET_PRIVATE_KEY) {
      throw new Error('COMPANY_WALLET_PRIVATE_KEY is not set');
    }
    
    // Clean private key: remove whitespace, ensure it starts with 0x
    let privateKey = env.COMPANY_WALLET_PRIVATE_KEY.trim();
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Validate private key format (should be 66 characters with 0x prefix)
    if (privateKey.length !== 66) {
      throw new Error(`Invalid private key length: ${privateKey.length} (expected 66 with 0x prefix)`);
    }
    
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, POE_ABI, wallet);
    
    // Submit transaction
    const tx = await contract.register(fileHash, cipher, cid, size, mime);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Parse error message for user-friendly response
    const errorMsg = error.message || '';
    
    if (errorMsg.includes('already registered')) {
      return {
        success: false,
        error: 'File already registered on blockchain'
      };
    }
    
    if (errorMsg.includes('insufficient funds')) {
      return {
        success: false,
        error: 'Insufficient funds for transaction'
      };
    }
    
    if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
      return {
        success: false,
        error: 'Network error. Please try again'
      };
    }
    
    return {
      success: false,
      error: 'Registration failed. Please try again'
    };
  }
}

/**
 * Check if file exists on blockchain
 */
async function checkFileExists(
  fileHash: string
): Promise<{ success: boolean; exists?: boolean; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, POE_ABI, provider);
    
    const exists = await contract.exists(fileHash);
    return {
      success: true,
      exists: exists
    };
  } catch (error: any) {
    console.error('Check exists error:', error);
    return {
      success: false,
      error: 'Verification failed. Please try again'
    };
  }
}

/**
 * CORS headers
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Root path - API information
    if (path === '/') {
      return new Response(
        JSON.stringify({ 
          service: 'EternLink API',
          version: '1.0.0',
          wallet: COMPANY_WALLET_ADDRESS,
          endpoints: {
            health: '/health',
            register: '/api/register (POST)',
            verify: '/api/verify/:fileHash (GET)'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Health check
    if (path === '/health' || path === '/api/health') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          service: 'EternLink API',
          wallet: COMPANY_WALLET_ADDRESS 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Register file hash
    if (path === '/api/register' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { fileHash, cipher, cid, size, mime } = body;
        
        if (!fileHash) {
          return new Response(
            JSON.stringify({ success: false, error: 'fileHash is required' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const result = await registerFile(
          fileHash,
          cipher || 'AES-256-GCM+PBKDF2(250k, SHA-256)',
          cid || '',
          size || 0,
          mime || 'text/plain',
          env
        );
        
        return new Response(
          JSON.stringify(result),
          { 
            status: result.success ? 200 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Verify file hash
    if (path.startsWith('/api/verify/') && request.method === 'GET') {
      try {
        const fileHash = path.replace('/api/verify/', '');
        
        if (!fileHash) {
          return new Response(
            JSON.stringify({ success: false, error: 'fileHash is required' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const result = await checkFileExists(fileHash);
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  },
};

