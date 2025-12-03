/**
 * API utilities for EternLink backend service
 * Handles all blockchain interactions through backend API
 */

import { API_BASE_URL } from '../config';

/**
 * Register file hash on blockchain via backend API
 * Legacy mode: without keyShare3
 */
export async function registerFileHash(
  fileHash: string,
  cipher: string,
  cid: string,
  size: number,
  mime: string
): Promise<{ success: boolean; txHash?: string; blockNumber?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
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
    const response = await fetch(`${API_BASE_URL}/api/register`, {
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
    const response = await fetch(`${API_BASE_URL}/api/verify/${fileHash}`, {
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

