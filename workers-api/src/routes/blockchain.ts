/**
 * Blockchain Routes - File registration, verification
 * Migrated from old workers/src/index.ts
 */

import { Hono } from 'hono';
import { ethers } from 'ethers';
import type { Env } from '../types';

// Contract ABI
const POE_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'fileHash', type: 'bytes32' },
      { internalType: 'string', name: 'cipher', type: 'string' },
      { internalType: 'string', name: 'cid', type: 'string' },
      { internalType: 'uint256', name: 'size', type: 'uint256' },
      { internalType: 'string', name: 'mime', type: 'string' },
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'fileHash', type: 'bytes32' }],
    name: 'exists',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'bytes32', name: 'fileHash', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'cipher', type: 'string' },
      { indexed: false, internalType: 'string', name: 'cid', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'size', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'mime', type: 'string' },
    ],
    name: 'FileRegistered',
    type: 'event',
  },
];

const COMPANY_WALLET_ADDRESS = '0x1A81508179191CF22Aa94B921394f644982728f4';
const RPC_URL = 'https://sepolia.base.org';
const CONTRACT_ADDRESS = '0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a';

export const blockchainRoutes = new Hono<{ Bindings: Env }>();

// Register file hash on blockchain
blockchainRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const { fileHash, cipher, cid, size, mime } = body;

  if (!fileHash) {
    return c.json({ success: false, error: 'fileHash is required' }, 400);
  }

  try {
    if (!c.env.COMPANY_WALLET_PRIVATE_KEY) {
      return c.json({ success: false, error: 'Wallet not configured' }, 500);
    }

    let privateKey = c.env.COMPANY_WALLET_PRIVATE_KEY.trim();
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, POE_ABI, wallet);

    const tx = await contract.register(
      fileHash,
      cipher || 'AES-256-GCM+SSS(2-of-3)',
      cid || '',
      size || 0,
      mime || 'application/octet-stream'
    );

    const receipt = await tx.wait();

    return c.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error: any) {
    console.error('Blockchain register error:', error);
    
    if (error.message?.includes('already registered')) {
      return c.json({ success: false, error: 'File already registered on blockchain' });
    }
    if (error.message?.includes('insufficient funds')) {
      return c.json({ success: false, error: 'Insufficient funds for transaction' });
    }

    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// Verify file exists on blockchain
blockchainRoutes.get('/verify/:fileHash', async (c) => {
  const fileHash = c.req.param('fileHash');

  if (!fileHash) {
    return c.json({ success: false, error: 'fileHash is required' }, 400);
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, POE_ABI, provider);

    const exists = await contract.exists(fileHash);

    return c.json({
      success: true,
      exists,
    });
  } catch (error) {
    console.error('Blockchain verify error:', error);
    return c.json({ success: false, error: 'Verification failed' }, 500);
  }
});

// Get keyShare3 from blockchain events
blockchainRoutes.get('/keyshare/:fileHash', async (c) => {
  const fileHash = c.req.param('fileHash');

  if (!fileHash) {
    return c.json({ success: false, error: 'fileHash is required' }, 400);
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, POE_ABI, provider);

    // Check if file exists
    const exists = await contract.exists(fileHash);
    if (!exists) {
      return c.json({ success: false, error: 'File not found on blockchain' }, 404);
    }

    // Query events
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100000);

    const filter = contract.filters.FileRegistered(null, fileHash);
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    if (events.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Registration event not found' 
      }, 404);
    }

    const event = events[0];
    const block = await event.getBlock();
    const args = (event as any).args;
    const keyShare3 = args[3]; // cid field

    if (!keyShare3 || keyShare3 === '') {
      return c.json({ 
        success: false, 
        error: 'No key share found' 
      }, 404);
    }

    return c.json({
      success: true,
      keyShare3,
      blockNumber: event.blockNumber,
      timestamp: block?.timestamp,
    });
  } catch (error) {
    console.error('Get keyShare3 error:', error);
    return c.json({ success: false, error: 'Failed to retrieve key share' }, 500);
  }
});

// Health check with wallet info
blockchainRoutes.get('/info', async (c) => {
  return c.json({
    success: true,
    wallet: COMPANY_WALLET_ADDRESS,
    contract: CONTRACT_ADDRESS,
    network: 'Base Sepolia',
    rpc: RPC_URL,
  });
});

