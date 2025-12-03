import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  sha256,
  hex32,
  encryptFile,
  packEncryptedFile,
  downloadFile,
} from "./utils/crypto";
import ShamirDemoEnhanced from "./components/ShamirDemoEnhanced";
import LandingPage from "./components/LandingPage";
import { registerFileHash, verifyFileHash } from "./utils/api";

// Default constants
const DEFAULTS = {
  CIPHER: "AES-256-GCM+PBKDF2(250k, SHA-256)",
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
 * Main application component.
 * This version uses a backend API service to handle all blockchain transactions.
 * Users don't need to connect wallets or interact with MetaMask.
 * All blockchain operations are handled by the company's backend service.
 */
function App() {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileHash, setFileHash] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

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


  // Handle File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Only allow .txt files
    if (!selectedFile.name.endsWith(".txt")) {
      setStatus({
        type: "error",
        message: "Currently only .txt files are supported",
      });
      return;
    }

    setFile(selectedFile);
    const content = await selectedFile.arrayBuffer();
    setFileInfo({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type || "text/plain",
      content,
    });
    setStatus({
      type: "info",
      message: `File selected: ${selectedFile.name} (${selectedFile.size} bytes)`,
    });
  };

  // Encrypt and Register
  const handleEncryptAndRegister = async () => {
    if (!fileInfo) {
      setStatus({ type: "error", message: "Please select a file" });
      return;
    }
    if (!password) {
      setStatus({ type: "error", message: "Please enter a password" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Calculate file hash
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);
      setFileHash(hashHex);
      setStatus({ type: "info", message: "Calculating hash..." });

      // 2. Encrypt file
      const { encrypted, iv, salt } = await encryptFile(fileInfo.content, password);
      setStatus({ type: "info", message: "Encrypting..." });

      // 3. Pack and download encrypted file
      const encryptedBlob = packEncryptedFile(encrypted, iv, salt);
      const encryptedFileName = fileInfo.name + ".enc";
      downloadFile(encryptedBlob, encryptedFileName);
      setStatus({ type: "info", message: "Encrypted file saved" });

      // 4. Register file hash on blockchain via backend API
      setStatus({ type: "info", message: "Registering on blockchain..." });
      const result = await registerFileHash(
        hashHex,
        DEFAULTS.CIPHER,
        "",
        fileInfo.size,
        fileInfo.type
      );

      if (!result.success) {
        // Check if file already registered
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
      setStatus({
        type: "success",
        message: `Registered successfully! TX: ${result.txHash?.slice(0, 10)}...${result.txHash?.slice(-8)}`,
      });
    } catch (error: any) {
      console.error(error);
      const msg = error.message || "Operation failed";
      // Make error messages user-friendly
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
              File Operations
            </h3>

            <div style={styles.uploadArea}>
              <input
                type="file"
                accept=".txt"
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
                  {file ? file.name : 'Click to select file or drag & drop here'}
                </span>
                {file && (
                  <span style={styles.uploadHint}>
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                )}
                {!file && (
                  <span style={styles.uploadHint}>
                    Supports .txt format
                  </span>
                )}
              </label>
            </div>

            {/* Password Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Encryption Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password and keep it safe"
                style={styles.input}
              />
              <span style={styles.hint}>
                Password is used for local encryption and cannot be recovered if lost
              </span>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonGroup}>
              <button
                onClick={handleEncryptAndRegister}
                disabled={loading || !file || !password}
                style={{
                  ...styles.actionButton,
                  ...styles.primaryAction,
                  ...(loading || !file || !password ? styles.disabledButton : {})
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
            {txHash && (
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
            <h4 style={styles.infoCardTitle}>How to Use</h4>
            <ol style={styles.infoList}>
              <li>Select a .txt file you want to secure</li>
              <li>Enter a strong encryption password (keep it safe!)</li>
              <li>Click "Encrypt & Register" - your file will be encrypted and downloaded</li>
              <li>The file hash will be automatically registered on the blockchain</li>
              <li>Use "Verify on Chain" anytime to confirm your file's existence</li>
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