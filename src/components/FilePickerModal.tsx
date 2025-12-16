/**
 * FilePickerModal Component
 *
 * Modal for selecting encrypted files from user's server storage or local upload.
 * Used in decrypt mode to pick files without downloading locally.
 * Supports demo mode for non-authenticated users to upload local .enc files.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listEncryptedFiles, downloadEncryptedFile, EncryptedFileInfo } from '../utils/api';
import { extractFileHashFromEncFile } from '../utils/crypto';

interface FilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (data: ArrayBuffer, fileInfo: EncryptedFileInfo) => void;
}

export default function FilePickerModal({ isOpen, onClose, onFileSelected }: FilePickerModalProps) {
  const [files, setFiles] = useState<EncryptedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('authToken');
      setIsLoggedIn(!!token);
      if (token) {
        loadFiles();
      } else {
        setLoading(false);
      }
    }
  }, [isOpen]);

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

  // Handle local file upload for demo mode
  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's a .enc file
    if (!file.name.endsWith('.enc')) {
      setError('Please select a valid .enc encrypted file');
      return;
    }

    setUploadingLocal(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Try to extract file hash from the .enc file
      const extractedHash = extractFileHashFromEncFile(arrayBuffer);

      // Create a mock EncryptedFileInfo for local file
      const localFileInfo: EncryptedFileInfo = {
        id: 'local-' + Date.now(),
        fileHash: extractedHash || '',
        originalName: file.name.replace('.enc', ''),
        encryptedSize: file.size,
        mimeType: 'application/octet-stream',
        createdAt: new Date().toISOString(),
      };

      onFileSelected(arrayBuffer, localFileInfo);
      onClose();
    } catch (err) {
      setError('Failed to read file. Please try again.');
    } finally {
      setUploadingLocal(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectFile = async (file: EncryptedFileInfo) => {
    setDownloading(file.fileHash);
    setError(null);
    
    const result = await downloadEncryptedFile(file.fileHash);
    
    if (result.success && result.data) {
      onFileSelected(result.data, file);
      onClose();
    } else {
      setError(result.error || 'Failed to download file');
    }
    
    setDownloading(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: '📄', doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊', ppt: '📑', pptx: '📑',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      mp4: '🎬', mov: '🎬', mp3: '🎵', wav: '🎵',
      zip: '📦', rar: '📦', txt: '📃', json: '📋',
    };
    return iconMap[ext || ''] || '📁';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(10, 22, 40, 0.9)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[80vh] bg-gradient-to-br from-[#1a2942] to-[#0a1628] rounded-2xl border border-[#C0C8D4]/20 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#C0C8D4]/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isLoggedIn ? 'Select Encrypted File' : 'Upload Encrypted File'}
                </h2>
                <p className="text-sm text-[#8b96a8] mt-1">
                  {isLoggedIn
                    ? 'Choose from cloud storage or upload a local file'
                    : 'Upload a .enc file encrypted by EternLink'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#8b96a8] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Local Upload Section - Only visible for non-logged-in users (Demo mode) */}
          {!isLoggedIn && (
            <div className="p-4 border-b border-[#C0C8D4]/10 bg-[#0a1628]/30">
              <input
                ref={fileInputRef}
                type="file"
                accept=".enc"
                onChange={handleLocalFileUpload}
                className="hidden"
                id="local-enc-upload"
              />
              <label
                htmlFor="local-enc-upload"
                className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  uploadingLocal
                    ? 'border-[#3DA288]/50 bg-[#3DA288]/10 cursor-wait'
                    : 'border-[#C0C8D4]/30 hover:border-[#3DA288]/50 hover:bg-[#3DA288]/5'
                }`}
              >
                {uploadingLocal ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-[#3DA288]" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-[#3DA288] font-medium">Loading file...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-[#C0C8D4] font-medium">Upload local .enc file</span>
                  </>
                )}
              </label>
              <p className="text-xs text-[#8b96a8] text-center mt-2">
                Select a .enc file that was encrypted using EternLink
              </p>
            </div>
          )}

          {/* Content - Cloud Files (only for logged in users) */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 280px)' }}>
            {!isLoggedIn ? (
              <div className="text-center py-8">
                <div className="inline-block p-4 rounded-full bg-[#1a2942]/60 mb-4">
                  <svg className="w-12 h-12 text-[#8b96a8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Demo Mode</h3>
                <p className="text-[#8b96a8] text-sm mb-4">
                  Upload a local .enc file above to decrypt it.<br />
                  <span className="text-[#3DA288]">Sign in</span> to access your cloud-stored files.
                </p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-10 w-10 text-[#3DA288] mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-[#8b96a8]">Loading your files...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-400 mb-4">❌ {error}</div>
                <button
                  onClick={loadFiles}
                  className="px-4 py-2 bg-[#3DA288] text-white rounded-lg hover:bg-[#2d8a6f] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-block p-4 rounded-full bg-[#1a2942]/60 mb-4">
                  <svg className="w-12 h-12 text-[#8b96a8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Cloud Files</h3>
                <p className="text-[#8b96a8] text-sm">
                  No encrypted files in your cloud storage.<br />
                  Upload a local .enc file above or encrypt a new file.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <span className="text-sm font-medium text-[#C0C8D4]">Your Cloud Files</span>
                </div>
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleSelectFile(file)}
                    disabled={downloading !== null}
                    className="w-full p-4 bg-[#0a1628]/50 border border-[#C0C8D4]/10 rounded-xl hover:border-[#3DA288]/50 hover:bg-[#0a1628]/80 transition-all text-left group disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{getFileIcon(file.originalName)}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate group-hover:text-[#3DA288] transition-colors">
                          {file.originalName}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-[#8b96a8] mt-1 flex-wrap">
                          <span>{formatFileSize(file.encryptedSize)}</span>
                          <span>•</span>
                          <span>{formatDate(file.createdAt)}</span>
                          {file.lastDecryptedAt && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-xs border border-amber-500/30">
                              Decrypted
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        {file.lastDecryptedAt && (
                          <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-1 whitespace-nowrap">
                            Decrypted · {formatDateTime(file.lastDecryptedAt)}
                          </span>
                        )}
                        {downloading === file.fileHash ? (
                          <svg className="animate-spin h-6 w-6 text-[#3DA288]" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-[#8b96a8] group-hover:text-[#3DA288] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#C0C8D4]/10 bg-[#0a1628]/50">
            <p className="text-xs text-[#8b96a8] text-center">
              ☁️ Files are stored securely in your cloud with end-to-end encryption
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

