import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  sha256,
  hex32,
  encryptFile,
  packEncryptedFile,
  downloadFile,
} from "./utils/crypto";
import {
  connectWallet,
  checkNetwork,
  switchNetwork,
  getContract,
  registerFile,
  checkFileExists,
} from "./utils/contract";
// import ShamirDemo from "./components/ShamirDemo";
// import ShamirDemoSimple from "./components/ShamirDemoSimple";
import ShamirDemoEnhanced from "./components/ShamirDemoEnhanced";
import ProductLandingPage from "./components/ProductLandingPage";
import BeneficiaryRegistrationPage from "./components/BeneficiaryRegistrationPage";
import BeneficiaryDashboard from "./components/BeneficiaryDashboard";
import LoginPage from "./components/LoginPage";
import RegistrationPage from "./components/RegistrationPage";

// Default Configuration
const DEFAULTS = {
  CONTRACT_ADDRESS: "0xYourPoEContractAddressHere", // Replace with your deployed contract address
  CHAIN_ID: 84532, // Base Sepolia
  CIPHER: "AES-256-GCM+PBKDF2(250k, SHA-256)",
};

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer;
}

function App() {
  const [showProductLanding, setShowProductLanding] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showBeneficiaryRegistration, setShowBeneficiaryRegistration] = useState(false);
  const [showBeneficiaryDashboard, setShowBeneficiaryDashboard] = useState(false);
  const [, setUserAccountType] = useState<'user' | 'beneficiary' | null>(null);
  const [contractAddress, setContractAddress] = useState(DEFAULTS.CONTRACT_ADDRESS);
  const [chainId, setChainId] = useState(DEFAULTS.CHAIN_ID);
  const [ipfsCid, setIpfsCid] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<string>("");
  const [fileHash, setFileHash] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  // Show Product Landing Page (New Marketing Page)
  if (showProductLanding) {
    return (
      <ProductLandingPage
        onTryDemo={() => {
          setShowProductLanding(false);
        }}
        onRegisterBeneficiary={() => {
          setShowProductLanding(false);
          setShowBeneficiaryRegistration(true);
        }}
        onLogin={() => {
          setShowProductLanding(false);
          setShowLogin(true);
        }}
        onRegister={() => {
          setShowProductLanding(false);
          setShowRegistration(true);
        }}
      />
    );
  }

  // Show Login Page
  if (showLogin) {
    return (
      <LoginPage
        onLoginSuccess={(token, user) => {
          localStorage.setItem('authToken', token);
          localStorage.setItem('accountType', user.accountType);
          setUserAccountType(user.accountType);
          setShowLogin(false);

          // Redirect based on account type
          if (user.accountType === 'beneficiary') {
            setShowBeneficiaryDashboard(true);
          } else {
            // For user accounts, go to main app
            setShowDemo(true);
          }
        }}
        onBackToHome={() => {
          setShowLogin(false);
          setShowProductLanding(true);
        }}
        onRegisterClick={() => {
          setShowLogin(false);
          setShowRegistration(true);
        }}
      />
    );
  }

  // Show Registration Page
  if (showRegistration) {
    return (
      <RegistrationPage
        onRegistrationComplete={(token, accountType) => {
          localStorage.setItem('authToken', token);
          localStorage.setItem('accountType', accountType);
          setUserAccountType(accountType);
          setShowRegistration(false);

          // Redirect based on account type
          if (accountType === 'beneficiary') {
            setShowBeneficiaryDashboard(true);
          } else {
            // For user accounts, go to main app
            setShowDemo(true);
          }
        }}
        onBackToHome={() => {
          setShowRegistration(false);
          setShowProductLanding(true);
        }}
        onLoginClick={() => {
          setShowRegistration(false);
          setShowLogin(true);
        }}
      />
    );
  }


  // Show Beneficiary Registration Page
  if (showBeneficiaryRegistration) {
    return (
      <BeneficiaryRegistrationPage
        onRegistrationComplete={(token) => {
          // Store token and redirect to beneficiary dashboard
          localStorage.setItem('authToken', token);
          localStorage.setItem('accountType', 'beneficiary');
          setShowBeneficiaryRegistration(false);
          setShowBeneficiaryDashboard(true);
        }}
        onBackToHome={() => {
          setShowBeneficiaryRegistration(false);
          setShowProductLanding(true);
        }}
      />
    );
  }

  // Show Beneficiary Dashboard
  if (showBeneficiaryDashboard) {
    return (
      <BeneficiaryDashboard
        onLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('accountType');
          setUserAccountType(null);
          setShowBeneficiaryDashboard(false);
          setShowProductLanding(true);
        }}
      />
    );
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

  // Connect Wallet
  const handleConnectWallet = async () => {
    try {
      setStatus(null);
      const provider = await connectWallet();
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      // Check Network
      const isCorrectNetwork = await checkNetwork(provider, chainId);
      if (!isCorrectNetwork) {
        setStatus({
          type: "error",
          message: `Please switch to Chain ID ${chainId} (Base Sepolia)`,
        });
        await switchNetwork(chainId);
      } else {
        setStatus({
          type: "success",
          message: `Wallet Connected: ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      }
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Failed to connect wallet",
      });
    }
  };

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
      setStatus({ type: "error", message: "Please select a file first" });
      return;
    }
    if (!password) {
      setStatus({ type: "error", message: "Please enter a password" });
      return;
    }
    if (contractAddress === DEFAULTS.CONTRACT_ADDRESS) {
      setStatus({ type: "error", message: "Please configure the contract address" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Calculate file hash
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);
      setFileHash(hashHex);
      setStatus({ type: "info", message: "File hash calculated" });

      // 2. Encrypt file
      const { encrypted, iv, salt } = await encryptFile(fileInfo.content, password);
      setStatus({ type: "info", message: "File encryption completed" });

      // 3. Pack and download encrypted file
      const encryptedBlob = packEncryptedFile(encrypted, iv, salt);
      const encryptedFileName = fileInfo.name + ".enc";
      downloadFile(encryptedBlob, encryptedFileName);
      setStatus({ type: "info", message: "Encrypted file downloaded" });

      // 4. Connect wallet and submit to blockchain
      const provider = await connectWallet();
      const isCorrectNetwork = await checkNetwork(provider, chainId);
      if (!isCorrectNetwork) {
        await switchNetwork(chainId);
      }

      const contract = getContract(contractAddress, provider);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);

      // 5. Register on contract
      setStatus({ type: "info", message: "Submitting transaction to blockchain..." });
      const tx = await registerFile(
        contractWithSigner,
        hashHex,
        DEFAULTS.CIPHER,
        ipfsCid || "",
        fileInfo.size,
        fileInfo.type
      );

      setTxHash(tx.hash);
      setStatus({
        type: "info",
        message: `Transaction submitted: ${tx.hash}`,
      });

      // 6. Wait for confirmation
      await tx.wait();
      setStatus({
        type: "success",
        message: `File successfully registered on blockchain! TX: ${tx.hash}`,
      });
    } catch (error: any) {
      console.error(error);
      setStatus({
        type: "error",
        message: error.message || "Encryption or registration failed",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify File Existence
  const handleVerifyFile = async () => {
    if (!fileInfo) {
      setStatus({ type: "error", message: "Please select a file first" });
      return;
    }
    if (contractAddress === DEFAULTS.CONTRACT_ADDRESS) {
      setStatus({ type: "error", message: "Please configure the contract address" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Calculate file hash
      const hash = await sha256(fileInfo.content);
      const hashHex = hex32(hash);

      // Connect wallet
      const provider = await connectWallet();
      const contract = getContract(contractAddress, provider);

      // Check if exists
      const exists = await checkFileExists(contract, hashHex);

      if (exists) {
        setStatus({
          type: "success",
          message: "✅ File exists on blockchain!",
        });
      } else {
        setStatus({
          type: "error",
          message: "❌ File does not exist on blockchain",
        });
      }
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Verification failed",
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
              onClick={() => setShowProductLanding(true)}
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
              🔐 Try Shamir Demo
            </button>
          </div>
        </div>
        <p style={styles.subtitle}>Blockchain Proof of Existence · Eternal Protection for Your Digital Assets</p>
      </motion.div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Left Panel - Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={styles.leftPanel}
        >
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                <path d="M10 2L3 6V10C3 14 6 17.5 10 19C14 17.5 17 14 17 10V6L10 2Z" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
              </svg>
              Blockchain Configuration
            </h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Contract Address</label>
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Chain ID</label>
              <input
                type="number"
                value={chainId}
                onChange={(e) => setChainId(Number(e.target.value))}
                style={styles.input}
              />
              <span style={styles.hint}>Base Sepolia Testnet</span>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>IPFS CID (Optional)</label>
              <input
                type="text"
                value={ipfsCid}
                onChange={(e) => setIpfsCid(e.target.value)}
                placeholder="Qm..."
                style={styles.input}
              />
            </div>

            {/* Wallet Connection */}
            <div style={{ marginTop: '24px' }}>
              {!account ? (
                <button onClick={handleConnectWallet} style={styles.primaryButton}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                    <rect x="3" y="6" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                    <path d="M6 6V5C6 3.34315 7.34315 2 9 2H11C12.6569 2 14 3.34315 14 5V6" stroke="white" strokeWidth="1.5"/>
                    <circle cx="10" cy="11" r="1.5" fill="white"/>
                  </svg>
                  Connect MetaMask
                </button>
              ) : (
                <div style={styles.connectedWallet}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                    <circle cx="10" cy="10" r="8" stroke="var(--success)" strokeWidth="1.5" fill="none"/>
                    <path d="M6 10L9 13L14 7" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ flex: 1 }}>
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div style={{...styles.card, ...styles.infoCard}}>
            <h4 style={styles.infoCardTitle}>How to Use</h4>
            <ol style={styles.infoList}>
              <li>Deploy ProofOfExistence.sol contract</li>
              <li>Enter contract address and connect wallet</li>
              <li>Select file and set encryption password</li>
              <li>Encrypted file will be downloaded automatically</li>
              <li>File hash will be registered on blockchain</li>
              <li>Verify file existence anytime</li>
            </ol>
          </div>
        </motion.div>

        {/* Right Panel - File Operations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={styles.rightPanel}
        >
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                <path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                <path d="M11 2V7H16" stroke="var(--accent-primary)" strokeWidth="1.5"/>
              </svg>
              File Operations
            </h3>

            {/* File Upload */}
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
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
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
          Secured with AES-256-GCM Encryption · Base Sepolia L2 Network
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
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 400px) 1fr',
    gap: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  leftPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },

  rightPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
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

  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    boxShadow: 'var(--shadow-sm)',
  },

  connectedWallet: {
    padding: '14px 20px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--success)',
    fontSize: '0.95rem',
    fontWeight: '600',
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
