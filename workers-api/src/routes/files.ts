/**
 * File Routes - Upload/download encrypted files to R2
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDb, users, encryptedFiles } from '../db';
import { verifyToken } from '../utils/auth';
import type { Env } from '../types';

export const fileRoutes = new Hono<{ Bindings: Env }>();

// Auth middleware
fileRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }

  c.set('userId', payload.sub);
  await next();
});

// List user's encrypted files
fileRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    const files = await db.query.encryptedFiles.findMany({
      where: eq(encryptedFiles.userId, userId),
    });

    return c.json({
      success: true,
      files: files.map(f => ({
        id: f.id,
        fileHash: f.fileHash,
        originalName: f.originalName,
        encryptedSize: f.encryptedSize,
        mimeType: f.mimeType,
        blockchainTxHash: f.blockchainTxHash,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    console.error('List files error:', error);
    return c.json({ success: false, error: 'Failed to list files' }, 500);
  }
});

// Upload encrypted file (R2 must be enabled)
fileRoutes.post('/upload', async (c) => {
  const userId = c.get('userId');
  const db = createDb(c.env.DB);

  try {
    // Check if R2 is configured
    if (!c.env.FILES) {
      return c.json({ 
        success: false, 
        error: 'File storage not configured. Enable R2 in Cloudflare Dashboard.' 
      }, 503);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const fileHash = formData.get('fileHash') as string | null;
    const originalName = formData.get('originalName') as string | null;

    if (!file || !fileHash || !originalName) {
      return c.json({ 
        success: false, 
        error: 'file, fileHash, and originalName are required' 
      }, 400);
    }

    // Check if file already exists
    const existing = await db.query.encryptedFiles.findFirst({
      where: eq(encryptedFiles.fileHash, fileHash),
    });

    if (existing) {
      return c.json({ 
        success: false, 
        error: 'File already uploaded' 
      }, 409);
    }

    // Generate R2 key
    const r2Key = `${userId}/${fileHash}/${originalName}.enc`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.FILES.put(r2Key, arrayBuffer, {
      customMetadata: {
        userId,
        fileHash,
        originalName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Save metadata to database
    const [newFile] = await db.insert(encryptedFiles).values({
      userId,
      fileHash,
      r2Key,
      originalName,
      encryptedSize: arrayBuffer.byteLength,
      mimeType: file.type || 'application/octet-stream',
    }).returning();

    return c.json({
      success: true,
      file: {
        id: newFile.id,
        fileHash: newFile.fileHash,
        originalName: newFile.originalName,
        encryptedSize: newFile.encryptedSize,
      },
    }, 201);
  } catch (error) {
    console.error('Upload file error:', error);
    return c.json({ success: false, error: 'Failed to upload file' }, 500);
  }
});

// Download encrypted file
fileRoutes.get('/download/:fileHash', async (c) => {
  const userId = c.get('userId');
  const fileHash = c.req.param('fileHash');
  const db = createDb(c.env.DB);

  try {
    // Check if R2 is configured
    if (!c.env.FILES) {
      return c.json({ 
        success: false, 
        error: 'File storage not configured' 
      }, 503);
    }

    // Find file metadata
    const fileRecord = await db.query.encryptedFiles.findFirst({
      where: eq(encryptedFiles.fileHash, fileHash),
    });

    if (!fileRecord) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // Check ownership
    if (fileRecord.userId !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // Get from R2
    const object = await c.env.FILES.get(fileRecord.r2Key);
    if (!object) {
      return c.json({ success: false, error: 'File not found in storage' }, 404);
    }

    // Return file
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileRecord.originalName}.enc"`,
        'Content-Length': fileRecord.encryptedSize.toString(),
      },
    });
  } catch (error) {
    console.error('Download file error:', error);
    return c.json({ success: false, error: 'Failed to download file' }, 500);
  }
});

// Delete encrypted file
fileRoutes.delete('/:fileHash', async (c) => {
  const userId = c.get('userId');
  const fileHash = c.req.param('fileHash');
  const db = createDb(c.env.DB);

  try {
    // Find file metadata
    const fileRecord = await db.query.encryptedFiles.findFirst({
      where: eq(encryptedFiles.fileHash, fileHash),
    });

    if (!fileRecord) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // Check ownership
    if (fileRecord.userId !== userId) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // Delete from R2 if configured
    if (c.env.FILES) {
      await c.env.FILES.delete(fileRecord.r2Key);
    }

    // Delete from database
    await db.delete(encryptedFiles)
      .where(eq(encryptedFiles.id, fileRecord.id));

    return c.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({ success: false, error: 'Failed to delete file' }, 500);
  }
});

