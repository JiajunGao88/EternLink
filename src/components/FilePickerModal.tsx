/**
 * FilePickerModal Component
 * 
 * Modal for selecting encrypted files from user's server storage.
 * Used in decrypt mode to pick files without downloading locally.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listEncryptedFiles, downloadEncryptedFile, EncryptedFileInfo } from '../utils/api';

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

  useEffect(() => {
    if (isOpen) {
      loadFiles();
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
                <h2 className="text-xl font-bold text-white">Select from Cloud</h2>
                <p className="text-sm text-[#8b96a8] mt-1">Choose a file from your secure cloud storage</p>
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

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
            {loading ? (
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
              <div className="text-center py-12">
                <div className="inline-block p-4 rounded-full bg-[#1a2942]/60 mb-4">
                  <svg className="w-12 h-12 text-[#8b96a8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Files Found</h3>
                <p className="text-[#8b96a8] text-sm">
                  You don't have any encrypted files yet.<br />
                  Encrypt a file first to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
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
                        <div className="flex items-center gap-3 text-sm text-[#8b96a8] mt-1">
                          <span>{formatFileSize(file.encryptedSize)}</span>
                          <span>•</span>
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
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

