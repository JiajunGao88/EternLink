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
import { splitPassword } from "./utils/shamir";

interface Beneficiary {
  id: string;
  name: string;
  email: string;
  address: string;
  relationship: string;
}

interface ShareBundle {
  shareOne: string;
  shareTwo: string;
  shareThree: string;
  storageKey: string;
}

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
  const [shares, setShares] = useState<ShareBundle | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(60);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    {
      id: crypto.randomUUID ? crypto.randomUUID() : "beneficiary-1",
      name: "",
      email: "",
      address: "",
      relationship: "",
    },
  ]);

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

  const createEmptyBeneficiary = (): Beneficiary => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `beneficiary-${Date.now()}`,
    name: "",
    email: "",
    address: "",
    relationship: "",
  });

  const handleAddBeneficiary = () => {
    setBeneficiaries((prev) => [...prev, createEmptyBeneficiary()]);
  };

  const handleBeneficiaryChange = (
    id: string,
    field: keyof Omit<Beneficiary, "id">,
    value: string
  ) => {
    setBeneficiaries((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleRemoveBeneficiary = (id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  const downloadShare = (label: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    downloadFile(blob, `${label}.txt`);
    setStatus({
      type: "success",
      message: `${label} saved as text file for offline storage`,
    });
  };

  const copyShare = async (content: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable in this environment");
      }
      await navigator.clipboard.writeText(content);
      setStatus({ type: "success", message: "Secret share copied to clipboard" });
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Failed to copy share",
      });
    }
  };

  // Handle File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setShares(null);
    setFileHash("");
    setTxHash("");

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
    const beneficiaryAddresses = beneficiaries
      .map((b) => b.address.trim())
      .filter((addr) => addr.length > 0);

    if (beneficiaryAddresses.length === 0) {
      setStatus({ type: "error", message: "Please add at least one beneficiary address" });
      return;
    }
    if (!heartbeatInterval || heartbeatInterval <= 0) {
      setStatus({ type: "error", message: "Please choose a heartbeat interval" });
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

      // 2. Split password into secret shares
      const [shareOne, shareTwo, shareThree] = splitPassword(password);
      const storageKey = `eternlink:share1:${hashHex}`;
      try {
        localStorage.setItem(storageKey, shareOne);
      } catch (error) {
        console.warn("Failed to persist share one", error);
      }

      setShares({
        shareOne,
        shareTwo,
        shareThree,
        storageKey,
      });
      setStatus({
        type: "info",
        message: "Secret shares generated. Share 1 saved locally for the owner.",
      });

      // 3. Encrypt file
      const { encrypted, iv, salt } = await encryptFile(fileInfo.content, password);
      setStatus({ type: "info", message: "File encryption completed" });

      // 4. Pack and download encrypted file with Share 3 metadata
      const encryptedBlob = packEncryptedFile(encrypted, iv, salt, shareThree);
      const encryptedFileName = fileInfo.name + ".enc";
      downloadFile(encryptedBlob, encryptedFileName);
      setStatus({ type: "info", message: "Encrypted file downloaded" });

      // 5. Connect wallet and submit to blockchain
      const provider = await connectWallet();
      const isCorrectNetwork = await checkNetwork(provider, chainId);
      if (!isCorrectNetwork) {
        await switchNetwork(chainId);
      }

      const contract = getContract(contractAddress, provider);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer) as any;

      // 6. Register on contract
      setStatus({ type: "info", message: "Submitting transaction to blockchain..." });
      const tx = await registerFile(
        contractWithSigner,
        hashHex,
        DEFAULTS.CIPHER,
        ipfsCid || "",
        fileInfo.size,
        fileInfo.type,
        heartbeatInterval * 24 * 60 * 60,
        beneficiaryAddresses
      );

      setTxHash(tx.hash);
      setStatus({
        type: "info",
        message: `Transaction submitted: ${tx.hash}`,
      });

      // 7. Wait for confirmation
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
      {/* Hero with new logo and positioning */}
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.hero}
      >
        <div style={styles.heroGrid}>
          <div style={styles.heroLeft}>
            <div style={styles.brandRow}>
              <img src={logo} alt="EternLink" style={styles.heroLogo} />
              <div>
                <p style={styles.brandKicker}>Zero-knowledge estate protection</p>
                <h1 style={styles.heroTitle}>EternLink</h1>
              </div>
            </div>
            <p style={styles.heroSubtitle}>
              Protect seed phrases with client-side AES-256-GCM, Shamir's Secret Sharing (3,2), and a
              heartbeat-driven dead man's switch that only alerts beneficiaries after your chosen timeout.
            </p>
            <div style={styles.heroBadges}>
              <span style={styles.badge}>Client-side encryption</span>
              <span style={styles.badge}>2-of-3 recovery</span>
              <span style={styles.badge}>Heartbeat releases</span>
            </div>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.heroCallout}>
              <div style={styles.calloutHeader}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L3 6V10C3 14 6 17.5 10 19C14 17.5 17 14 17 10V6L10 2Z" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none" />
                  <path d="M6.5 10L9 12.5L13.5 7.5" stroke="var(--accent-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>New three-layer landing experience</span>
              </div>
              <ul style={styles.calloutList}>
                <li>Store only encrypted payloads and hashes on-chain.</li>
                <li>Distribute shares: owner (local), beneficiary (offline), platform (time-lock).</li>
                <li>Automated beneficiary notifications after missed heartbeats.</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.header>

      <div style={styles.featureGrid}>
        {featurePillars.map((feature) => (
          <div key={feature.title} style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L3 5V9C3 12 5.5 14.5 9 16C12.5 14.5 15 12 15 9V5L9 2Z" stroke="var(--accent-primary)" strokeWidth="1.2" fill="none" />
                <path d="M6.25 9.25L8 11L12 7" stroke="var(--accent-secondary)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureText}>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

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

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px' }}>
                <path d="M4 8C4 5.79086 5.79086 4 8 4H12C14.2091 4 16 5.79086 16 8V12C16 14.2091 14.2091 16 12 16H8C5.79086 16 4 14.2091 4 12V8Z" stroke="var(--accent-primary)" strokeWidth="1.5" fill="none"/>
                <path d="M8.5 9.5L10 11L13.5 7.5" stroke="var(--accent-secondary)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Recovery & Beneficiaries
            </h3>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Heartbeat Interval</label>
              <div style={styles.intervalGrid}>
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setHeartbeatInterval(days)}
                    style={{
                      ...styles.intervalButton,
                      ...(heartbeatInterval === days ? styles.intervalButtonActive : {}),
                    }}
                  >
                    {days} days
                  </button>
                ))}
              </div>
              <span style={styles.hint}>
                The heartbeat interval controls when Share 3 is released after inactivity.
              </span>
            </div>

            <div style={styles.beneficiaryHeader}>
              <div>
                <p style={styles.label}>Beneficiaries</p>
                <span style={styles.hint}>Add trusted wallets for recovery notifications</span>
              </div>
              <button type="button" onClick={handleAddBeneficiary} style={styles.tertiaryButton}>
                + Add Beneficiary
              </button>
            </div>

            <div style={styles.beneficiaryList}>
              {beneficiaries.map((beneficiary, index) => (
                <div key={beneficiary.id} style={styles.beneficiaryCard}>
                  <div style={styles.beneficiaryHeaderRow}>
                    <span style={styles.beneficiaryBadge}>Beneficiary {index + 1}</span>
                    {beneficiaries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                        style={styles.removeButton}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={styles.beneficiaryGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Wallet Address</label>
                      <input
                        type="text"
                        value={beneficiary.address}
                        onChange={(e) => handleBeneficiaryChange(beneficiary.id, "address", e.target.value)}
                        placeholder="0x..."
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Name</label>
                      <input
                        type="text"
                        value={beneficiary.name}
                        onChange={(e) => handleBeneficiaryChange(beneficiary.id, "name", e.target.value)}
                        placeholder="Alice"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Email</label>
                      <input
                        type="email"
                        value={beneficiary.email}
                        onChange={(e) => handleBeneficiaryChange(beneficiary.id, "email", e.target.value)}
                        placeholder="alice@example.com"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Relationship</label>
                      <input
                        type="text"
                        value={beneficiary.relationship}
                        onChange={(e) => handleBeneficiaryChange(beneficiary.id, "relationship", e.target.value)}
                        placeholder="Family / Partner / Trustee"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              ))}
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

            {shares && (
              <div style={styles.shareGrid}>
                <div style={styles.shareCard}>
                  <div style={styles.shareHeader}>
                    <span style={styles.shareTitle}>Share 1 · Owner copy</span>
                    <span style={styles.tag}>Local only</span>
                  </div>
                  <p style={styles.shareDescription}>
                    Stored in your browser at <code style={styles.code}>{shares.storageKey}</code>. Keep a second offline backup.
                  </p>
                  <div style={styles.shareActions}>
                    <button type="button" style={styles.tertiaryButton} onClick={() => copyShare(shares.shareOne)}>
                      Copy Share 1
                    </button>
                    <button type="button" style={styles.secondaryTertiaryButton} onClick={() => downloadShare("share-1-owner", shares.shareOne)}>
                      Download Share 1
                    </button>
                  </div>
                  <code style={styles.shareCode}>{shares.shareOne}</code>
                </div>

                <div style={styles.shareCard}>
                  <div style={styles.shareHeader}>
                    <span style={styles.shareTitle}>Share 2 · Beneficiary</span>
                    <span style={styles.tag}>Offline delivery</span>
                  </div>
                  <p style={styles.shareDescription}>
                    Print or pass this share securely to your beneficiary. Combine with Share 3 after the heartbeat timeout.
                  </p>
                  <div style={styles.shareActions}>
                    <button type="button" style={styles.tertiaryButton} onClick={() => copyShare(shares.shareTwo)}>
                      Copy Share 2
                    </button>
                    <button type="button" style={styles.secondaryTertiaryButton} onClick={() => downloadShare("share-2-beneficiary", shares.shareTwo)}>
                      Download Share 2
                    </button>
                  </div>
                  <code style={styles.shareCode}>{shares.shareTwo}</code>
                </div>

                <div style={styles.shareCard}>
                  <div style={styles.shareHeader}>
                    <span style={styles.shareTitle}>Share 3 · Platform release</span>
                    <span style={styles.tag}>Embedded</span>
                  </div>
                  <p style={styles.shareDescription}>
                    Included inside the .enc header to match the on-chain heartbeat schedule. Provide this plus Share 2 to recover.
                  </p>
                  <div style={styles.shareActions}>
                    <button type="button" style={styles.tertiaryButton} onClick={() => copyShare(shares.shareThree)}>
                      Copy Share 3
                    </button>
                    <button type="button" style={styles.secondaryTertiaryButton} onClick={() => downloadShare("share-3-platform", shares.shareThree)}>
                      Download Share 3
                    </button>
                  </div>
                  <code style={styles.shareCode}>{shares.shareThree}</code>
                </div>
              </div>
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

  hero: {
    background: 'linear-gradient(135deg, rgba(26, 41, 66, 0.9) 0%, rgba(15, 30, 46, 0.9) 100%)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px',
    boxShadow: 'var(--shadow-md)',
    marginBottom: '24px',
  },

  heroGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '28px',
    alignItems: 'center',
  },

  heroLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },

  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },

  heroLogo: {
    width: '96px',
    height: '96px',
    filter: 'drop-shadow(0 10px 30px rgba(139, 157, 195, 0.25))',
  },

  brandKicker: {
    margin: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 700,
  },

  heroTitle: {
    fontSize: '3.25rem',
    fontWeight: '800',
    margin: '4px 0 0',
    background: 'linear-gradient(135deg, var(--accent-light) 0%, var(--accent-primary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  heroSubtitle: {
    margin: 0,
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    lineHeight: 1.7,
  },

  heroBadges: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    marginTop: '6px',
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(139, 157, 195, 0.12)',
    color: 'var(--accent-light)',
    fontWeight: 700,
    fontSize: '0.9rem',
    border: '1px solid rgba(139, 157, 195, 0.25)',
  },

  heroRight: {
    display: 'flex',
    justifyContent: 'flex-end',
  },

  heroCallout: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(10, 22, 40, 0.75)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
  },

  calloutHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 700,
    color: 'var(--accent-light)',
    marginBottom: '10px',
  },

  calloutList: {
    margin: 0,
    paddingLeft: '18px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    display: 'grid',
    gap: '6px',
  },

  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },

  featureCard: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '14px 16px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--card-border)',
    background: 'linear-gradient(135deg, rgba(26, 41, 66, 0.7) 0%, rgba(15, 30, 46, 0.6) 100%)',
  },

  featureIcon: {
    width: '40px',
    height: '40px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(139, 157, 195, 0.12)',
    borderRadius: '12px',
    border: '1px solid rgba(139, 157, 195, 0.25)',
  },

  featureTitle: {
    margin: 0,
    color: 'var(--accent-light)',
    fontSize: '1rem',
    fontWeight: 700,
  },

  featureText: {
    margin: '6px 0 0',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
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

  tertiaryButton: {
    padding: '10px 14px',
    background: 'rgba(139, 157, 195, 0.12)',
    border: '1px solid rgba(139, 157, 195, 0.3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600,
  },

  secondaryTertiaryButton: {
    padding: '10px 14px',
    background: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    fontWeight: 600,
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

  intervalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '8px',
    marginTop: 'var(--spacing-sm)',
  },

  intervalButton: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600,
  },

  intervalButtonActive: {
    borderColor: 'var(--accent-primary)',
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--accent-primary)',
  },

  beneficiaryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-sm)',
  },

  beneficiaryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-md)',
  },

  beneficiaryCard: {
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-md)',
    background: 'var(--input-bg)',
  },

  beneficiaryHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-sm)',
  },

  beneficiaryBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    background: 'rgba(59, 130, 246, 0.08)',
    color: 'var(--accent-primary)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 700,
    fontSize: '0.85rem',
  },

  beneficiaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--spacing-md)',
  },

  removeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--error)',
    cursor: 'pointer',
    fontWeight: 600,
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

  shareGrid: {
    marginTop: 'var(--spacing-lg)',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'var(--spacing-md)',
  },

  shareCard: {
    padding: 'var(--spacing-md)',
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--input-bg)',
  },

  shareHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-xs)',
  },

  shareTitle: {
    fontWeight: 700,
    color: 'var(--text-primary)',
  },

  shareDescription: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: 0,
  },

  shareActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    margin: '8px 0',
  },

  shareCode: {
    display: 'block',
    marginTop: '8px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    wordBreak: 'break-all' as const,
    color: 'var(--accent-secondary)',
  },

  tag: {
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(16, 185, 129, 0.12)',
    color: 'var(--success)',
    fontWeight: 700,
    fontSize: '0.75rem',
  },

  code: {
    fontFamily: 'monospace',
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
