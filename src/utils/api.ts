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
        error: data.error || 'Failed to register file hash',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
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
        error: data.error || 'Failed to verify file hash',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

