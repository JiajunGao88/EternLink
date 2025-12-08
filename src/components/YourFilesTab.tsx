/**
 * YourFilesTab Component
 * 
 * Displays user's encrypted files stored on server.
 * Allows viewing, downloading, and deleting files.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listEncryptedFiles, deleteEncryptedFile, EncryptedFileInfo } from '../utils/api';

interface YourFilesTabProps {
  // Decrypt functionality removed from this tab
}

export default function YourFilesTab({}: YourFilesTabProps) {
  const [files, setFiles] = useState<EncryptedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    
    const result = await listEncryptedFiles();
    
    if (result.success && result.files) {
      setFiles(result.files);
    } else {
      setError(result.error || 'Failed to load files');
    }
    
    setLoading(false);
  };

  const handleDelete = async (fileHash: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    setDeletingId(fileHash);
    
    const result = await deleteEncryptedFile(fileHash);
    
    if (result.success) {
      setFiles(files.filter(f => f.fileHash !== fileHash));
    } else {
      alert(result.error || 'Failed to delete file');
    }
    
    setDeletingId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // File icon based on extension
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    
    const iconMap: Record<string, string> = {
      pdf: '📄',
      doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊',
      ppt: '📑', pptx: '📑',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
      mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
      mp3: '🎵', wav: '🎵', flac: '🎵',
      zip: '📦', rar: '📦', '7z': '📦',
      txt: '📃',
      json: '📋',
      html: '🌐', css: '🎨', js: '⚡',
    };
    
    return iconMap[ext || ''] || '📁';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#3DA288] mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-[#8b96a8]">Loading your files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-400 mb-4">❌ {error}</div>
        <button
          onClick={loadFiles}
          className="px-4 py-2 bg-[#3DA288] text-white rounded-lg hover:bg-[#2d8a6f] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 rounded-full bg-[#1a2942]/60 mb-6">
          <svg className="w-16 h-16 text-[#8b96a8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Files Yet</h3>
        <p className="text-[#8b96a8] mb-6 max-w-md mx-auto">
          Your encrypted files will appear here once you encrypt and upload them.
          Go to the Encryption tab to secure your first file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Your Encrypted Files</h3>
          <p className="text-sm text-[#8b96a8]">{files.length} file{files.length !== 1 ? 's' : ''} stored securely</p>
        </div>
        <button
          onClick={loadFiles}
          className="p-2 text-[#8b96a8] hover:text-white transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Files Grid */}
      <div className="grid gap-4">
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#1a2942]/60 border border-[#C0C8D4]/20 rounded-xl p-4 hover:border-[#3DA288]/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* File Icon */}
                <div className="text-3xl">{getFileIcon(file.originalName)}</div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate" title={file.originalName}>
                    {file.originalName}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-[#8b96a8] mt-1">
                    <span>{formatFileSize(file.encryptedSize)}</span>
                    <span>•</span>
                    <span>Uploaded: {formatDate(file.createdAt)}</span>
                    {file.lastDecryptedAt && (
                      <>
                        <span>•</span>
                        <span>Decrypted: {formatDate(file.lastDecryptedAt)}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-[#8b96a8]/60 mt-1 font-mono truncate" title={file.fileHash}>
                    Hash: {file.fileHash.substring(0, 16)}...
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(file.fileHash)}
                    disabled={deletingId === file.fileHash}
                    className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete file"
                  >
                    {deletingId === file.fileHash ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

                {/* Status badges */}
                <div className="mt-3 pt-3 border-t border-[#C0C8D4]/10 flex flex-wrap gap-3">
                  {/* Blockchain verification badge */}
                  {file.blockchainTxHash && (
                    <div className="flex items-center gap-2 text-xs text-[#3DA288]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Verified on blockchain</span>
                    </div>
                  )}
                  
                  {/* Last decrypted badge */}
                  {file.lastDecryptedAt ? (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <span>Last decrypted: {formatDate(file.lastDecryptedAt)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#8b96a8]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Not decrypted yet</span>
                    </div>
                  )}
                </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

