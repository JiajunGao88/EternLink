/**
 * API utilities for EternLink backend service
 * Handles all blockchain interactions through backend API
 */

import { API_BASE_URL } from '../config';

/**
 * Register file hash on blockchain via backend API
 */
export async function registerFileHash(
  fileHash: string,
  cipher: string,
  cid: string,
  size: number,
  mime: string
): Promise<{ success: boolean; txHash?: string; blockNumber?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blockchain/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileHash,
        cipher,
        cid,
        size,
        mime,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Registration failed',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

/**
 * Register file hash with SSS keyShare3 on blockchain
 * New SSS mode: stores keyShare3 in the cid field
 */
export async function registerFileHashSSS(
  fileHash: string,
  cipher: string,
  keyShare3: string,
  size: number,
  mime: string
): Promise<{ success: boolean; txHash?: string; blockNumber?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blockchain/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileHash,
        cipher,
        cid: keyShare3, // Store keyShare3 in cid field for current contract
        size,
        mime,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Registration failed',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

/**
 * Check if file hash exists on blockchain via backend API
 */
export async function verifyFileHash(
  fileHash: string
): Promise<{ success: boolean; exists?: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blockchain/verify/${fileHash}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Verification failed',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

/**
 * Retrieve keyShare3 from blockchain via backend API
 * This is used for decryption - user provides 1 share, we get Share 3 from chain
 */
export async function getKeyShare3FromBlockchain(
  fileHash: string
): Promise<{ 
  success: boolean; 
  keyShare3?: string; 
  blockNumber?: number;
  timestamp?: number;
  error?: string 
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blockchain/keyshare/${fileHash}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to retrieve key share',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

