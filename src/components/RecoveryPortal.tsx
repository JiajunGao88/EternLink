/**
 * RecoveryPortal Component
 *
 * Recovery portal for beneficiaries to decrypt and access inherited assets.
 * This is Phase 6 of the roadmap - the final step in the recovery process.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stepper, Step } from './shared/Stepper';
import { sha256 } from '../utils/crypto';
import { reconstructKey, isValidShare } from '../utils/secretSharing';

type RecoveryStep = 'upload' | 'verify' | 'shares' | 'decrypt' | 'complete';

interface RecoveryPortalProps {
  onBack?: () => void;
}

export const RecoveryPortal: React.FC<RecoveryPortalProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<RecoveryStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [blockchainVerified, setBlockchainVerified] = useState(false);
  const [share2, setShare2] = useState('');
  const [share3, setShare3] = useState('');
  const [reconstructedKey, setReconstructedKey] = useState<string>('');
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps: Step[] = [
    { id: 'upload', title: 'Upload File', description: 'Upload encrypted file' },
    { id: 'verify', title: 'Verify', description: 'Blockchain verification' },
    { id: 'shares', title: 'Enter Shares', description: 'Provide key shares' },
    { id: 'decrypt', title: 'Decrypt', description: 'Decrypt file' },
    { id: 'complete', title: 'Complete', description: 'Access recovered data' },
  ];

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.enc')) {
      setError('Please upload a .enc encrypted file');
      return;
    }

    setFile(uploadedFile);
    setError(null);

    // Calculate file hash
    const fileBuffer = await uploadedFile.arrayBuffer();
    const hashBytes = await sha256(fileBuffer);
    const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setFileHash(hashHex);
  };

  const handleVerifyBlockchain = async () => {
    if (!fileHash) {
      setError('No file hash to verify');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call blockchain verification API
      const response = await fetch(`http://localhost:3001/api/files/verify/${fileHash}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Blockchain verification failed');
      }

      if (data.exists && data.timestamp) {
        setBlockchainVerified(true);
        setCurrentStep('shares');
      } else {
        throw new Error('File hash not found on blockchain');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReconstructKey = async () => {
    if (!share2 || !share3) {
      setError('Please enter both Share 2 and Share 3');
      return;
    }

    if (!isValidShare(share2) || !isValidShare(share3)) {
      setError('Invalid share format. Shares should start with "80" followed by a digit and hex characters.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Reconstruct the encryption key from shares
      const key = reconstructKey(share2, share3);
      setReconstructedKey(key);
      setCurrentStep('decrypt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconstruct key');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!file || !reconstructedKey) {
      setError('Missing file or encryption key');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Read encrypted file
      await file.arrayBuffer();

      // For demo purposes: assume file is base64-encoded encrypted content
      // In production, this would use proper AES-GCM decryption with the reconstructed key

      // Placeholder decryption logic
      // TODO: Implement actual AES-256-GCM decryption using reconstructedKey
      const mockDecryptedContent = `SEED PHRASE (Recovered):
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art

PRIVATE KEY:
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

WALLET ADDRESS:
0xabcdefabcdefabcdefabcdefabcdefabcdefabcd

This is a demo recovery. In production, this would show the actual decrypted content.`;

      setDecryptedContent(mockDecryptedContent);
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(decryptedContent);
    // You could add a toast notification here
  };

  const handleDownloadAsText = () => {
    const blob = new Blob([decryptedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovered-assets.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block p-4 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-6"
          >
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">Asset Recovery Portal</h1>
          <p className="text-gray-300">Decrypt and access your inherited digital assets</p>
        </div>

        {/* Progress Stepper */}
        <Stepper steps={steps} currentStep={stepIndex} />

        {/* Content */}
        <div className="mt-12">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload File */}
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-6">Upload Encrypted File</h2>

                  <div className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center hover:border-[#C0C8D4] transition-colors">
                    <input
                      type="file"
                      accept=".enc"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-lg text-white mb-2">
                        {file ? file.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-gray-400">Encrypted files (.enc) only</p>
                    </label>
                  </div>

                  {file && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 p-4 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="text-white font-semibold">{file.name}</p>
                          <p className="text-sm text-gray-400">
                            Size: {(file.size / 1024).toFixed(2)} KB
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            Hash: {fileHash.substring(0, 20)}...
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={() => setCurrentStep('verify')}
                    disabled={!file}
                    className="w-full mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Verification
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Verify on Blockchain */}
            {currentStep === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-6">Blockchain Verification</h2>

                  <div className="space-y-6">
                    <div className="p-6 rounded-lg bg-white/5">
                      <h3 className="text-lg font-semibold text-white mb-3">File Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Filename:</span>
                          <span className="text-white font-mono">{file?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">SHA-256 Hash:</span>
                          <span className="text-white font-mono text-xs">{fileHash.substring(0, 32)}...</span>
                        </div>
                      </div>
                    </div>

                    {blockchainVerified && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-[#10b981]">Verification Successful</h3>
                        </div>
                        <p className="text-sm text-gray-300">
                          File hash has been verified on the Base Sepolia blockchain. File integrity confirmed.
                        </p>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
                      >
                        <p className="text-[#ef4444] text-sm">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentStep('upload')}
                        className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                      >
                        Back
                      </button>
                      {!blockchainVerified ? (
                        <button
                          onClick={handleVerifyBlockchain}
                          disabled={isProcessing}
                          className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Verifying...
                            </>
                          ) : (
                            'Verify on Blockchain'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentStep('shares')}
                          className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 transition-opacity text-white font-semibold"
                        >
                          Continue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Enter Shares */}
            {currentStep === 'shares' && (
              <motion.div
                key="shares"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-6">Enter Encryption Key Shares</h2>

                  <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-sm text-gray-300">
                        You need <strong className="text-blue-400">Share 2</strong> (from your paper backup/email) and{' '}
                        <strong className="text-blue-400">Share 3</strong> (from blockchain/email) to reconstruct the encryption key.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Share 2 (Your Backup)
                      </label>
                      <textarea
                        value={share2}
                        onChange={(e) => {
                          setShare2(e.target.value.trim());
                          setError(null);
                        }}
                        placeholder="802abc..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Share 3 (From Email/Blockchain)
                      </label>
                      <textarea
                        value={share3}
                        onChange={(e) => {
                          setShare3(e.target.value.trim());
                          setError(null);
                        }}
                        placeholder="803def..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0C8D4] focus:border-transparent"
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
                      >
                        <p className="text-[#ef4444] text-sm">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentStep('verify')}
                        className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleReconstructKey}
                        disabled={isProcessing || !share2 || !share3}
                        className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Reconstructing Key...' : 'Reconstruct Key'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Decrypt */}
            {currentStep === 'decrypt' && (
              <motion.div
                key="decrypt"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-6">Decrypt File</h2>

                  <div className="space-y-6">
                    <div className="p-6 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <div>
                          <h3 className="font-semibold text-[#10b981]">Key Reconstructed Successfully</h3>
                          <p className="text-sm text-gray-300 mt-1">
                            Ready to decrypt file: <span className="font-mono">{file?.name}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
                      >
                        <p className="text-[#ef4444] text-sm">{error}</p>
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentStep('shares')}
                        className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleDecrypt}
                        disabled={isProcessing}
                        className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                            Decrypt File
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Complete - Show Decrypted Content */}
            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto"
              >
                <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-block p-4 rounded-full bg-[#10b981]/20 mb-4"
                    >
                      <svg className="w-16 h-16 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-2">Recovery Successful!</h2>
                    <p className="text-gray-300">Your digital assets have been decrypted</p>
                  </div>

                  <div className="p-6 rounded-lg bg-black/30 border border-[#10b981]/30 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Decrypted Content</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyToClipboard}
                          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-sm text-white flex items-center gap-2"
                          title="Copy to clipboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={handleDownloadAsText}
                          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-sm text-white flex items-center gap-2"
                          title="Download as text file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                      {decryptedContent}
                    </pre>
                  </div>

                  <div className="p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-sm text-gray-300">
                        <p className="font-semibold text-[#ef4444] mb-1">Security Warning</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Immediately transfer these assets to a secure wallet</li>
                          <li>Do not share this information with anyone</li>
                          <li>Clear your browser cache after completing this process</li>
                          <li>Consider this recovery method as single-use only</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {onBack && (
                    <button
                      onClick={onBack}
                      className="w-full mt-6 px-6 py-3 rounded-lg bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 transition-opacity text-white font-semibold"
                    >
                      Return to Dashboard
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
