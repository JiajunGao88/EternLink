import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  sha256,
  hex32,
  generateRandomKey,
  encryptFileWithKey,
  decryptFileWithKey,
  packEncryptedFileSSS,
  unpackEncryptedFileSSS,
  detectEncryptionMode,
  downloadFile,
} from "./utils/crypto";
import { splitKey, reconstructKey, type KeyShares } from "./utils/secretSharing";
import ShamirDemoEnhanced from "./components/ShamirDemoEnhanced";
import LandingPage from "./components/LandingPage";
import { registerFileHashSSS, verifyFileHash } from "./utils/api";

// Default constants
const DEFAULTS = {
  CIPHER: "AES-256-GCM+SSS(2-of-3)",
};

// Default explorer URL (Base Sepolia)
const EXPLORER_URL = "https://sepolia.basescan.org";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer;
}

/**
 * Main application component with SSS (Shamir's Secret Sharing) integration.
 * 
 * Flow:
 * 1. User uploads file
 * 2. System generates random AES-256 key
 * 3. File is encrypted with the key
 * 4. Key is split into 3 shares (2-of-3 threshold)
 * 5. Share 1: User keeps (displayed for download/print)
 * 6. Share 2: Beneficiary keeps (QR code)
 * 7. Share 3: Stored on blockchain
 * 8. Encrypted file is downloaded to user
 */
function App() {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [appMode, setAppMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [status, setStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileHash, setFileHash] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  
  // SSS shares state
  const [keyShares, setKeyShares] = useState<KeyShares | null>(null);
  const [showShares, setShowShares] = useState(false);
  
  // Decrypt mode state
  const [encryptedFile, setEncryptedFile] = useState<ArrayBuffer | null>(null);
  const [shareA, setShareA] = useState("");
  const [shareB, setShareB] = useState("");
  
  // State for share save confirmation
  const [sharesSaved, setSharesSaved] = useState(false);

  // Show Landing Page
  if (showLandingPage) {
    return <LandingPage onTryDemo={() => setShowLandingPage(false)} />;
  }

  // Show Shamir's Secret Sharing demo
  if (showDemo) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setShowDemo(false)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ← Back to Main App
          </button>
        </div>
        <ShamirDemoEnhanced />
      </div>
    );
  }


  // Handle File Selection (Encrypt mode)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const content = await selectedFile.arrayBuffer();
    setFileInfo({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type || "application/octet-stream",
      content,
    });
    setStatus({
      type: "info",
      message: `File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`,
    });
    // Reset shares when new file selected
    setKeyShares(null);
    setShowShares(false);
  };

  // Handle Encrypted File Selection (Decrypt mode)
  const handleEncryptedFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.enc')) {
      setStatus({
        type: "error",
        message: "Please select an .enc file",
      });
      return;
    }

    const content = await selectedFile.arrayBuffer();
    setEncryptedFile(content);
    setFile(selectedFile);
    setStatus({
      type: "info",
      message: `Encrypted file loaded: ${selectedFile.name}`,
    });
  };

  // SSS Encrypt and Register
  const handleEncryptAndRegister = async () => {
    if (!fileInfo) {
      setStatus({ type: "error", message: "Please select a file" });
      return;
    }

    // SAFETY CHECK: If shares exist and not confirmed saved, warn user
    if (keyShares && !sharesSaved) {
      const confirmOverwrite = window.confirm(
        "⚠️ WARNING: You have unsaved key shares!\n\n" +
        "If you continue, the previous shares will be LOST FOREVER and that file will be UNRECOVERABLE.\n\n" +
        "Are you sure you want to encrypt a new file?"
      );
      if (!confirmOverwrite) {
        return;
      }
    }

    setLoading(true);
    setStatus(null);
    setKeyShares(null);
    setShowShares(false);
    setSharesSaved(false);

    try {
      // 1. Calculate file hash
      setStatus({ type: "info", message: "Calculating hash..." });
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);
      setFileHash(hashHex);

      // 2. Generate random AES-256 key
      setStatus({ type: "info", message: "Generating encryption key..." });
      const randomKey = generateRandomKey();

      // 3. Encrypt file with random key
      setStatus({ type: "info", message: "Encrypting file..." });
      const { encrypted, iv } = await encryptFileWithKey(fileInfo.content, randomKey);

      // 4. Split key into 3 shares (2-of-3 threshold)
      setStatus({ type: "info", message: "Splitting key into shares..." });
      const shares = splitKey(randomKey);
      setKeyShares(shares);

      // 5. AUTO-SAVE Share 1 to localStorage (backup)
      try {
        localStorage.setItem(`eternlink_share1_${hashHex}`, shares.shareOne);
        console.log('Share 1 auto-saved to localStorage');
      } catch (e) {
        console.warn('Failed to save Share 1 to localStorage:', e);
      }

      // 6. Pack and download encrypted file
      const encryptedBlob = packEncryptedFileSSS(encrypted, iv);
      const encryptedFileName = fileInfo.name + ".enc";
      downloadFile(encryptedBlob, encryptedFileName);

      // 7. Register file hash + keyShare3 on blockchain
      setStatus({ type: "info", message: "Registering on blockchain..." });
      const result = await registerFileHashSSS(
        hashHex,
        DEFAULTS.CIPHER,
        shares.shareThree, // Store Share 3 on blockchain
        fileInfo.size,
        fileInfo.type
      );

      if (!result.success) {
        if (result.error?.includes('already registered')) {
          setStatus({
            type: "success",
            message: "This file is already registered on blockchain",
          });
          return;
        }
        throw new Error(result.error || "Registration failed");
      }

      setTxHash(result.txHash || "");
      setShowShares(true);
      setStatus({
        type: "success",
        message: "File encrypted and registered! Save your key shares below.",
      });
    } catch (error: any) {
      console.error(error);
      const msg = error.message || "Operation failed";
      if (msg.includes('already registered')) {
        setStatus({
          type: "success",
          message: "This file is already registered on blockchain",
        });
      } else {
        setStatus({
          type: "error",
          message: msg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Decrypt file with 2 shares
  const handleDecrypt = async () => {
    if (!encryptedFile) {
      setStatus({ type: "error", message: "Please select an encrypted file" });
      return;
    }
    if (!shareA || !shareB) {
      setStatus({ type: "error", message: "Please enter both key shares" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Detect encryption mode
      const mode = detectEncryptionMode(encryptedFile);
      if (mode !== 'sss') {
        setStatus({ type: "error", message: "This file uses password encryption, not SSS" });
        return;
      }

      // 2. Reconstruct key from 2 shares
      setStatus({ type: "info", message: "Reconstructing key..." });
      const reconstructedKey = reconstructKey(shareA.trim(), shareB.trim());

      // 3. Unpack encrypted file
      const { iv, encrypted } = unpackEncryptedFileSSS(encryptedFile);

      // 4. Decrypt file
      setStatus({ type: "info", message: "Decrypting..." });
      const decrypted = await decryptFileWithKey(encrypted, iv, reconstructedKey);

      // 5. Download decrypted file
      const originalName = file?.name.replace('.enc', '') || 'decrypted_file';
      const blob = new Blob([decrypted], { type: 'application/octet-stream' });
      downloadFile(blob, originalName);

      setStatus({
        type: "success",
        message: "File decrypted successfully!",
      });
    } catch (error: any) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Decryption failed. Check your key shares.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify File Existence
  const handleVerifyFile = async () => {
    if (!fileInfo) {
      setStatus({ type: "error", message: "Please select a file" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Calculate file hash
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);

      setStatus({ type: "info", message: "Verifying..." });
      const result = await verifyFileHash(hashHex);

      if (!result.success) {
        throw new Error(result.error || "Verification failed");
      }

      if (result.exists) {
        setStatus({
          type: "success",
          message: "✓ File exists on blockchain",
        });
      } else {
        setStatus({
          type: "info",
          message: "File not found on blockchain",
        });
      }
    } catch (error: any) {
      setStatus({
        type: "error",
        message: "Verification failed. Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header with Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.header}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={styles.logoContainer}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              {/* Shield outline - single path */}
              <path
                d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Heartbeat/EKG line in the middle */}
              <path
                d="M12 24H18L21 18L24 30L27 20L30 24H36"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 style={styles.title}>EternLink</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowLandingPage(true)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              ← Back to Home
            </button>
            <button
              onClick={() => setShowDemo(true)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
               Try Shamir Demo
            </button>
          </div>
        </div>
        <p style={styles.subtitle}>Blockchain Proof of Existence · Eternal Protection for Your Digital Assets</p>
      </motion.div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid var(--card-border)'
        }}>
          <button
            onClick={() => { setAppMode('encrypt'); setFile(null); setFileInfo(null); setEncryptedFile(null); setStatus(null); setKeyShares(null); setShowShares(false); }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              background: appMode === 'encrypt' ? 'var(--accent-primary)' : 'transparent',
              color: appMode === 'encrypt' ? 'white' : 'var(--text-secondary)',
            }}
          >
            🔒 Encrypt & Register
          </button>
          <button
            onClick={() => { setAppMode('decrypt'); setFile(null); setFileInfo(null); setEncryptedFile(null); setStatus(null); setShareA(''); setShareB(''); }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              background: appMode === 'decrypt' ? 'var(--accent-primary)' : 'transparent',
              color: appMode === 'decrypt' ? 'white' : 'var(--text-secondary)',
            }}
          >
            🔓 Decrypt File
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={styles.primaryPanel}
        >
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                <path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                <path d="M11 2V7H16" stroke="var(--accent-primary)" strokeWidth="1.5"/>
              </svg>
              {appMode === 'encrypt' ? 'Encrypt & Register File' : 'Decrypt File'}
            </h3>

            {/* ENCRYPT MODE */}
            {appMode === 'encrypt' && (
              <>
                <div style={styles.uploadArea}>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    style={styles.fileInput}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" style={styles.uploadLabel}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path d="M24 8V32M24 8L16 16M24 8L32 16" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    <span style={styles.uploadText}>
                      {file ? file.name : 'Click to select file'}
                    </span>
                    {file && (
                      <span style={styles.uploadHint}>
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    )}
                    {!file && (
                      <span style={styles.uploadHint}>
                        Supports all file types
                      </span>
                    )}
                  </label>
                </div>

                {/* SSS Info Banner */}
                <div style={{
                  background: 'rgba(139, 157, 195, 0.1)',
                  border: '1px solid rgba(139, 157, 195, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--accent-primary)' }}>🔐 2-of-3 Key Splitting</strong><br/>
                    Your file will be encrypted with a random key, then the key is split into 3 shares.
                    Any 2 shares can decrypt the file. No password needed!
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={styles.buttonGroup}>
                  <button
                    onClick={handleEncryptAndRegister}
                    disabled={loading || !file}
                    style={{
                      ...styles.actionButton,
                      ...styles.primaryAction,
                      ...(loading || !file ? styles.disabledButton : {})
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                      <rect x="5" y="9" width="10" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
                      <path d="M7 9V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V9" stroke="white" strokeWidth="1.5"/>
                      <circle cx="10" cy="13" r="1" fill="white"/>
                    </svg>
                    {loading ? "Processing..." : "Encrypt & Register"}
                  </button>

                  <button
                    onClick={handleVerifyFile}
                    disabled={loading || !file}
                    style={{
                      ...styles.actionButton,
                      ...styles.secondaryAction,
                      ...(loading || !file ? styles.disabledButton : {})
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                      <circle cx="9" cy="9" r="6" stroke="white" strokeWidth="1.5" fill="none"/>
                      <path d="M14 14L18 18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M7 9L8.5 10.5L12 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Verify on Chain
                  </button>
                </div>

                {/* Key Shares Display */}
                {showShares && keyShares && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: '24px',
                      padding: '20px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                    }}
                  >
                    <h4 style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '16px' }}>
                      🔑 Save Your Key Shares
                    </h4>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Share 1 (Keep for yourself)
                      </div>
                      <div style={{
                        background: 'var(--input-bg)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        wordBreak: 'break-all',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--input-border)',
                      }}>
                        {keyShares.shareOne}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(keyShares.shareOne)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Copy Share 1
                      </button>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Share 2 (Give to beneficiary)
                      </div>
                      <div style={{
                        background: 'var(--input-bg)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        wordBreak: 'break-all',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--input-border)',
                      }}>
                        {keyShares.shareTwo}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(keyShares.shareTwo)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Copy Share 2
                      </button>
                    </div>

                    <div style={{
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--info)',
                    }}>
                      <strong>Share 3</strong> is stored on blockchain. You can retrieve it anytime using the file hash.
                    </div>

                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--error)',
                    }}>
                      ⚠️ <strong>Important:</strong> Save Share 1 and Share 2 securely. You need any 2 of 3 shares to decrypt your file.
                    </div>

                    {/* Confirmation Button */}
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      {!sharesSaved ? (
                        <button
                          onClick={() => {
                            const confirmed = window.confirm(
                              "Have you saved both Share 1 and Share 2?\n\n" +
                              "• Share 1: For yourself\n" +
                              "• Share 2: For your beneficiary\n\n" +
                              "Once confirmed, you can safely encrypt another file."
                            );
                            if (confirmed) {
                              setSharesSaved(true);
                            }
                          }}
                          style={{
                            padding: '14px 32px',
                            fontSize: '15px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          ✓ I Have Saved My Key Shares
                        </button>
                      ) : (
                        <div style={{
                          padding: '14px 32px',
                          fontSize: '15px',
                          fontWeight: '600',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: 'var(--success)',
                          borderRadius: '8px',
                          display: 'inline-block',
                        }}>
                          ✓ Shares Saved - You can now encrypt another file
                        </div>
                      )}
                    </div>

                    {/* Auto-saved notice */}
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: 'rgba(139, 157, 195, 0.1)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}>
                      💾 Share 1 has been auto-saved to your browser. File hash: <code style={{ fontSize: '10px' }}>{fileHash.slice(0, 16)}...</code>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* DECRYPT MODE */}
            {appMode === 'decrypt' && (
              <>
                <div style={styles.uploadArea}>
                  <input
                    type="file"
                    accept=".enc"
                    onChange={handleEncryptedFileSelect}
                    style={styles.fileInput}
                    id="encrypted-file-upload"
                  />
                  <label htmlFor="encrypted-file-upload" style={styles.uploadLabel}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path d="M24 32V8M24 32L16 24M24 32L32 24" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    <span style={styles.uploadText}>
                      {file ? file.name : 'Select encrypted file (.enc)'}
                    </span>
                    <span style={styles.uploadHint}>
                      Upload the .enc file to decrypt
                    </span>
                  </label>
                </div>

                {/* Share Inputs */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Key Share A</label>
                  <textarea
                    value={shareA}
                    onChange={(e) => setShareA(e.target.value)}
                    placeholder="Paste first key share (e.g., 801...)"
                    style={{ ...styles.input, minHeight: '80px', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Key Share B</label>
                  <textarea
                    value={shareB}
                    onChange={(e) => setShareB(e.target.value)}
                    placeholder="Paste second key share (e.g., 802...)"
                    style={{ ...styles.input, minHeight: '80px', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <span style={styles.hint}>
                    Enter any 2 of your 3 key shares to decrypt
                  </span>
                </div>

                {/* Decrypt Button */}
                <button
                  onClick={handleDecrypt}
                  disabled={loading || !encryptedFile || !shareA || !shareB}
                  style={{
                    ...styles.actionButton,
                    ...styles.primaryAction,
                    width: '100%',
                    ...(loading || !encryptedFile || !shareA || !shareB ? styles.disabledButton : {})
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                    <rect x="5" y="9" width="10" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
                    <path d="M7 9V6C7 4.34315 8.34315 3 10 3V3C11.6569 3 13 4.34315 13 6V9" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
                    <circle cx="10" cy="13" r="1" fill="white"/>
                  </svg>
                  {loading ? "Decrypting..." : "Decrypt File"}
                </button>
              </>
            )}

            {/* Status Display */}
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  ...styles.statusBox,
                  ...(status.type === "success" ? styles.statusSuccess :
                      status.type === "error" ? styles.statusError :
                      styles.statusInfo)
                }}
              >
                {status.type === "success" && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="var(--success)" strokeWidth="1.5" fill="none"/>
                    <path d="M6 10L9 13L14 7" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {status.type === "error" && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="var(--error)" strokeWidth="1.5" fill="none"/>
                    <path d="M7 7L13 13M13 7L7 13" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {status.type === "info" && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="var(--info)" strokeWidth="1.5" fill="none"/>
                    <path d="M10 10V14M10 6V7" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                <span>{status.message}</span>
              </motion.div>
            )}

            {/* Transaction Info */}
            {txHash && appMode === 'encrypt' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.txInfo}
              >
                <div style={styles.txRow}>
                  <span style={styles.txLabel}>Transaction Hash:</span>
                  <a
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.txLink}
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                      <path d="M10 3H13V6M13 3L8 8M6 3H4C3.44772 3 3 3.44772 3 4V12C3 12.5523 3.44772 13 4 13H12C12.5523 13 13 12.5523 13 12V10" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </a>
                </div>
                {fileHash && (
                  <div style={styles.txRow}>
                    <span style={styles.txLabel}>File Hash:</span>
                    <code style={styles.hashCode}>
                      {fileHash.slice(0, 16)}...{fileHash.slice(-16)}
                    </code>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={styles.primaryPanel}
        >
          <div style={{ ...styles.card, ...styles.infoCard }}>
            <h4 style={styles.infoCardTitle}>
              {appMode === 'encrypt' ? 'How 2-of-3 Encryption Works' : 'How to Decrypt'}
            </h4>
            <ol style={styles.infoList}>
              {appMode === 'encrypt' ? (
                <>
                  <li>Select any file you want to secure</li>
                  <li>Click "Encrypt & Register" - a random key encrypts your file</li>
                  <li>The key is split into 3 shares (2-of-3 threshold)</li>
                  <li><strong>Share 1:</strong> Keep for yourself</li>
                  <li><strong>Share 2:</strong> Give to your beneficiary</li>
                  <li><strong>Share 3:</strong> Stored on blockchain</li>
                  <li>Any 2 shares can decrypt the file</li>
                </>
              ) : (
                <>
                  <li>Upload your encrypted .enc file</li>
                  <li>Enter any 2 of your 3 key shares</li>
                  <li>Click "Decrypt File" to recover original file</li>
                  <li>The decrypted file will be downloaded automatically</li>
                </>
              )}
            </ol>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={styles.footer}
      >
        <p style={styles.footerText}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
            <path d="M8 2L3 5V8C3 11 5 13.5 8 15C11 13.5 13 11 13 8V5L8 2Z" stroke="var(--text-muted)" strokeWidth="1.2" fill="none"/>
          </svg>
          EternLink · Blockchain-Based Proof of Existence System
        </p>
        <p style={styles.footerCopy}>
          Secured with AES-256-GCM Encryption · Multi-Network Support
        </p>
      </motion.footer>
    </div>
  );
}

// ===== Styles =====
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '20px',
  },

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },

  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '12px',
  },

  title: {
    fontSize: '3rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    letterSpacing: '-0.02em',
  },

  subtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    margin: 0,
    fontWeight: '400',
  },

  content: {
    maxWidth: 'min(800px, 95vw)',
    margin: '0 auto',
    padding: '0 clamp(16px, 4vw, 40px)',
  },

  primaryPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },


  card: {
    background: 'var(--card-bg)',
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-xl)',
    boxShadow: 'var(--shadow-md)',
  },

  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: 'var(--spacing-lg)',
    display: 'flex',
    alignItems: 'center',
  },


  inputGroup: {
    marginBottom: 'var(--spacing-lg)',
  },

  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--spacing-sm)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },

  hint: {
    display: 'block',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: 'var(--spacing-xs)',
  },

  infoCard: {
    background: 'rgba(139, 157, 195, 0.05)',
    border: '1px solid rgba(139, 157, 195, 0.15)',
  },

  infoCardTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--accent-secondary)',
    marginBottom: 'var(--spacing-md)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  infoList: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.8',
    paddingLeft: '20px',
    margin: 0,
  },

  uploadArea: {
    marginBottom: 'var(--spacing-lg)',
  },

  fileInput: {
    display: 'none',
  },

  uploadLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-2xl)',
    background: 'var(--input-bg)',
    border: '2px dashed var(--input-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '200px',
  },

  uploadText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginTop: 'var(--spacing-md)',
  },

  uploadHint: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginTop: 'var(--spacing-xs)',
  },

  buttonGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-md)',
    marginTop: 'var(--spacing-xl)',
  },

  actionButton: {
    padding: '14px 24px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: 'var(--shadow-sm)',
  },

  primaryAction: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'white',
  },

  secondaryAction: {
    background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)',
    color: 'white',
  },

  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  statusBox: {
    marginTop: 'var(--spacing-lg)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },

  statusSuccess: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: 'var(--success)',
  },

  statusError: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--error)',
  },

  statusInfo: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: 'var(--info)',
  },

  txInfo: {
    marginTop: 'var(--spacing-lg)',
    padding: 'var(--spacing-lg)',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--radius-md)',
  },

  txRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-sm)',
    fontSize: '0.875rem',
  },

  txLabel: {
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },

  txLink: {
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    transition: 'color 0.2s ease',
  },

  hashCode: {
    color: 'var(--accent-secondary)',
    fontSize: '0.8rem',
  },

  footer: {
    marginTop: '60px',
    textAlign: 'center' as const,
    paddingTop: '30px',
    borderTop: '1px solid var(--card-border)',
  },

  footerText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },

  footerCopy: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
};

export default App;