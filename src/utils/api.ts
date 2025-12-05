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

// ==================== FILE STORAGE API ====================

export interface EncryptedFileInfo {
  id: string;
  fileHash: string;
  originalName: string;
  encryptedSize: number;
  mimeType?: string;
  blockchainTxHash?: string;
  createdAt: string;
}

/**
 * Upload encrypted file to server (R2 storage)
 */
export async function uploadEncryptedFile(
  encryptedBlob: Blob,
  fileHash: string,
  originalName: string
): Promise<{ success: boolean; file?: EncryptedFileInfo; error?: string }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const formData = new FormData();
    formData.append('file', encryptedBlob, `${originalName}.enc`);
    formData.append('fileHash', fileHash);
    formData.append('originalName', originalName);

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }

    return { success: true, file: data.file };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error. Please try again',
    };
  }
}

/**
 * List user's encrypted files
 */
export async function listEncryptedFiles(): Promise<{ 
  success: boolean; 
  files?: EncryptedFileInfo[]; 
  error?: string 
}> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/api/files`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to list files',
      };
    }

    return { success: true, files: data.files };
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

/**
 * Download encrypted file from server
 */
export async function downloadEncryptedFile(
  fileHash: string
): Promise<{ success: boolean; data?: ArrayBuffer; error?: string }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/api/files/download/${fileHash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.error || 'Download failed',
      };
    }

    const data = await response.arrayBuffer();
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

/**
 * Delete encrypted file from server
 */
export async function deleteEncryptedFile(
  fileHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileHash}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Delete failed',
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: 'Network error. Please try again',
    };
  }
}

