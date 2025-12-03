/**
 * Backend API for EternLink - Handles blockchain registration
 * This service uses a company wallet to sign and submit transactions
 * Users don't need to interact with MetaMask
 */

const { ethers } = require('ethers');

// Company wallet configuration (should be in environment variables in production)
const COMPANY_WALLET_PRIVATE_KEY = process.env.COMPANY_WALLET_PRIVATE_KEY || '';
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x34C2Bd37DcEb505F5528E878A7a5c4C5f8EE736a';

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

/**
 * Register file hash on blockchain
 */
async function registerFile(fileHash, cipher, cid, size, mime) {
  try {
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(COMPANY_WALLET_PRIVATE_KEY, provider);
    
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
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if file exists on blockchain
 */
async function checkFileExists(fileHash) {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, POE_ABI, provider);
    
    const exists = await contract.exists(fileHash);
    return {
      success: true,
      exists: exists
    };
  } catch (error) {
    console.error('Check exists error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in API server
module.exports = { registerFile, checkFileExists };

