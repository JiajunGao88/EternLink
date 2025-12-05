import React, { useState, useEffect } from "react";
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
  extractFileHashFromEncFile,
  downloadFile,
} from "./utils/crypto";
import { splitKey, reconstructKey, type KeyShares } from "./utils/secretSharing";
import ShamirDemoEnhanced from "./components/ShamirDemoEnhanced";
import { registerFileHashSSS, verifyFileHash, getKeyShare3FromBlockchain } from "./utils/api";
import ProductLandingPage from "./components/ProductLandingPage";
import BeneficiaryRegistrationPage from "./components/BeneficiaryRegistrationPage";
import BeneficiaryDashboard from "./components/BeneficiaryDashboard";
import UserDashboard from "./components/UserDashboard";
import LoginPage from "./components/LoginPage";
import RegistrationPage from "./components/RegistrationPage";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { PlanSelection } from "./components/PlanSelection";

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
  const [showProductLanding, setShowProductLanding] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [appMode, setAppMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showLogin, setShowLogin] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showBeneficiaryRegistration, setShowBeneficiaryRegistration] = useState(false);
  const [showBeneficiaryDashboard, setShowBeneficiaryDashboard] = useState(false);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [, setUserAccountType] = useState<'user' | 'beneficiary' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [_selectedPlan, setSelectedPlan] = useState<'individual' | 'family' | null>(null);
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
  const [userShare, setUserShare] = useState(""); // User's share (Share 1 or 2)
  const [decryptFileHash, setDecryptFileHash] = useState(""); // File hash for blockchain lookup
  const [blockchainShare3, setBlockchainShare3] = useState<string | null>(null); // Share 3 from blockchain
  const [decryptStep, setDecryptStep] = useState<number>(0); // 0: idle, 1: loading file, 2: fetching share 3, 3: decrypting, 4: done
  const [share3Info, setShare3Info] = useState<{ blockNumber?: number; timestamp?: number } | null>(null);
  
  // Legacy: manual 2-share input (for advanced users)
  const [manualMode, setManualMode] = useState(false);
  const [shareA, setShareA] = useState("");
  const [shareB, setShareB] = useState("");
  
  // State for share save confirmation
  const [sharesSaved, setSharesSaved] = useState(false);
  
  // Copy button states
  const [copiedShare1, setCopiedShare1] = useState(false);
  const [copiedShare2, setCopiedShare2] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const accountType = localStorage.getItem('accountType');
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    const onboardingCompleted = localStorage.getItem('onboardingCompleted');

    if (token && accountType) {
      // User is authenticated
      setUserEmail(email || '');
      setUserName(name || '');
      setUserAccountType(accountType as 'user' | 'beneficiary');
      setShowProductLanding(false);

      if (accountType === 'beneficiary') {
        // Beneficiary goes to beneficiary dashboard
        setShowBeneficiaryDashboard(true);
      } else {
        // User account - check onboarding status
        if (onboardingCompleted === 'true') {
          // Onboarding complete - go to dashboard
          setShowUserDashboard(true);
        } else {
          // Onboarding not complete - show onboarding
          setShowOnboarding(true);
        }
      }
    }
  }, []);

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
          localStorage.setItem('userEmail', user.email);
          localStorage.setItem('userName', user.name || '');
          setUserAccountType(user.accountType);
          setUserEmail(user.email);
          setUserName(user.name || '');
          setShowLogin(false);

          // Redirect based on account type
          if (user.accountType === 'beneficiary') {
            setShowBeneficiaryDashboard(true);
          } else {
            // For user accounts, check subscription status
            const hasPlan = localStorage.getItem('subscriptionPlan');
            const onboardingCompleted = localStorage.getItem('onboardingCompleted');

            if (hasPlan && !onboardingCompleted) {
              // Has plan but not onboarded = force onboarding
              setShowOnboarding(true);
            } else {
              // Either has plan and onboarded, or no plan = show dashboard
              // Dashboard will show frozen state if no subscription
              setShowUserDashboard(true);
            }
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
        onRegistrationComplete={(token, accountType, user) => {
          localStorage.setItem('authToken', token);
          localStorage.setItem('accountType', accountType);
          setUserAccountType(accountType);
          if (user) {
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', user.name || '');
            setUserEmail(user.email);
            setUserName(user.name || '');
          }
          setShowRegistration(false);

          // Redirect based on account type
          if (accountType === 'beneficiary') {
            setShowBeneficiaryDashboard(true);
          } else {
            // For user accounts, show user dashboard (will show frozen state if no subscription)
            setShowUserDashboard(true);
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


  // Show Plan Selection
  if (showPlanSelection) {
    return (
      <PlanSelection
        onPlanSelected={(plan) => {
          setSelectedPlan(plan);
          localStorage.setItem('subscriptionPlan', plan);
          setShowPlanSelection(false);
          setShowOnboarding(true); // Force onboarding after plan purchase
        }}
        onSkip={() => {
          setShowPlanSelection(false);
          setShowUserDashboard(true); // Go to dashboard (will show frozen state)
        }}
      />
    );
  }

  // Show Onboarding Wizard
  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
          setShowUserDashboard(true);
        }}
        onSkip={() => {
          // User chose to skip plan - go to frozen dashboard
          setShowOnboarding(false);
          setShowUserDashboard(true);
        }}
        userEmail={userEmail}
        userName={userName}
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

  // Show User Dashboard
  if (showUserDashboard) {
    return (
      <UserDashboard
        onLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('accountType');
          setUserAccountType(null);
          setShowUserDashboard(false);
          setShowProductLanding(true);
        }}
        onTryDemo={() => {
          setShowUserDashboard(false);
        }}
        onBuyPlan={() => {
          setShowUserDashboard(false);
          setShowPlanSelection(true);
        }}
      />
    );
  }

  // Show Shamir's Secret Sharing demo
  if (showDemo) {
    return <ShamirDemoEnhanced onBack={() => setShowDemo(false)} />;
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
    
    // Auto-extract embedded file hash (if present in v3 format)
    const embeddedHash = extractFileHashFromEncFile(content);
    if (embeddedHash) {
      setDecryptFileHash(embeddedHash);
      setStatus({
        type: "success",
        message: `File loaded! Hash auto-detected: ${embeddedHash.slice(0, 10)}...`,
      });
    } else {
      setStatus({
        type: "info",
        message: `Encrypted file loaded: ${selectedFile.name} (legacy format - enter hash manually)`,
      });
    }
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

      // 6. Pack and download encrypted file (with embedded file hash)
      const encryptedBlob = packEncryptedFileSSS(encrypted, iv, hashHex);
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

  // NEW: Decrypt with 1 share + auto-fetch Share 3 from blockchain
  const handleDecryptAuto = async () => {
    if (!encryptedFile) {
      setStatus({ type: "error", message: "Please select an encrypted file" });
      return;
    }
    if (!userShare.trim()) {
      setStatus({ type: "error", message: "Please enter your key share" });
      return;
    }
    if (!decryptFileHash.trim()) {
      setStatus({ type: "error", message: "Please enter the file hash" });
      return;
    }

    setLoading(true);
    setStatus(null);
    setDecryptStep(1);
    setBlockchainShare3(null);
    setShare3Info(null);

    try {
      // Step 1: Load and validate encrypted file
      setDecryptStep(1);
      setStatus({ type: "info", message: "Step 1/4: Loading encrypted file..." });
      await new Promise(r => setTimeout(r, 500)); // Visual delay
      
      const mode = detectEncryptionMode(encryptedFile);
      if (mode !== 'sss' && mode !== 'sss-v3') {
        setStatus({ type: "error", message: "This file uses password encryption, not SSS" });
        setDecryptStep(0);
        return;
      }

      // Step 2: Fetch Share 3 from blockchain
      setDecryptStep(2);
      setStatus({ type: "info", message: "Step 2/4: Retrieving Share 3 from blockchain..." });
      
      const blockchainResult = await getKeyShare3FromBlockchain(decryptFileHash.trim());
      
      if (!blockchainResult.success || !blockchainResult.keyShare3) {
        setStatus({ type: "error", message: blockchainResult.error || "Share 3 not found on blockchain" });
        setDecryptStep(0);
        return;
      }
      
      setBlockchainShare3(blockchainResult.keyShare3);
      setShare3Info({
        blockNumber: blockchainResult.blockNumber,
        timestamp: blockchainResult.timestamp
      });

      // Step 3: Reconstruct key
      setDecryptStep(3);
      setStatus({ type: "info", message: "Step 3/4: Reconstructing encryption key..." });
      await new Promise(r => setTimeout(r, 300)); // Visual delay
      
      const reconstructedKey = reconstructKey(userShare.trim(), blockchainResult.keyShare3);

      // Step 4: Decrypt file
      setDecryptStep(4);
      setStatus({ type: "info", message: "Step 4/4: Decrypting file..." });
      
      const { iv, encrypted } = unpackEncryptedFileSSS(encryptedFile);
      const decrypted = await decryptFileWithKey(encrypted, iv, reconstructedKey);

      // Download decrypted file
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
        message: "Decryption failed. Check your key share and file hash.",
      });
      setDecryptStep(0);
    } finally {
      setLoading(false);
    }
  };

  // Legacy: Decrypt file with 2 manual shares (for advanced users)
  const handleDecryptManual = async () => {
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#1a2942] to-[#0a1628] text-white">
      {/* Fixed Navigation Bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/80 backdrop-blur-md border-b border-[#C0C8D4]/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                  stroke="#C0C8D4"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 24H18L21 18L24 30L27 20L30 24H36"
                  stroke="#3DA288"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
                EternLink
              </span>
            </div>

            {/* Nav Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowProductLanding(true)}
                className="px-6 py-2 text-[#C0C8D4] hover:text-[#3DA288] transition-colors font-medium"
              >
                ← Back to Home
              </button>
              <button
                onClick={() => setShowDemo(true)}
                className="px-6 py-2 bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#3DA288]/30 transition-all"
              >
                Try Shamir Demo
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Spacer for fixed nav */}
      <div className="h-20"></div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center py-8"
      >
        <p className="text-lg text-[#8b96a8]">Blockchain Proof of Existence · Eternal Protection for Your Digital Assets</p>
      </motion.div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-[#1a2942]/60 backdrop-blur-md rounded-xl p-1 border border-[#C0C8D4]/20">
          <button
            onClick={() => { setAppMode('encrypt'); setFile(null); setFileInfo(null); setEncryptedFile(null); setStatus(null); setKeyShares(null); setShowShares(false); }}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              appMode === 'encrypt'
                ? 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white shadow-lg shadow-[#3DA288]/30'
                : 'text-[#8b96a8] hover:text-[#C0C8D4]'
            }`}
          >
            🔒 Encrypt & Register
          </button>
          <button
            onClick={() => { setAppMode('decrypt'); setFile(null); setFileInfo(null); setEncryptedFile(null); setStatus(null); setShareA(''); setShareB(''); }}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              appMode === 'decrypt'
                ? 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white shadow-lg shadow-[#3DA288]/30'
                : 'text-[#8b96a8] hover:text-[#C0C8D4]'
            }`}
          >
            🔓 Decrypt File
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] backdrop-blur-xl border border-[#3DA288]/20 rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-[#C0C8D4] mb-6 flex items-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
                <path d="M4 4C4 2.89543 4.89543 2 6 2H11L16 7V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#3DA288" strokeWidth="1.5" fill="none"/>
                <path d="M11 2V7H16" stroke="#3DA288" strokeWidth="1.5"/>
              </svg>
              {appMode === 'encrypt' ? 'Encrypt & Register File' : 'Decrypt File'}
            </h3>

            {/* ENCRYPT MODE */}
            {appMode === 'encrypt' && (
              <>
                <div className="mb-6">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center p-12 bg-[#0f1e2e]/80 border-2 border-dashed border-[#C0C8D4]/30 rounded-xl cursor-pointer hover:border-[#3DA288]/50 transition-all min-h-[200px]"
                  >
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path d="M24 8V32M24 8L16 16M24 8L32 16" stroke="#C0C8D4" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32" stroke="#3DA288" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    <span className="text-base font-semibold text-[#C0C8D4] mt-4">
                      {file ? file.name : 'Click to select file'}
                    </span>
                    {file && (
                      <span className="text-sm text-[#8b96a8] mt-1">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    )}
                    {!file && (
                      <span className="text-sm text-[#8b96a8] mt-1">
                        Supports all file types
                      </span>
                    )}
                  </label>
                </div>

                {/* SSS Info Banner */}
                <div className="bg-[#3DA288]/10 border border-[#3DA288]/30 rounded-lg p-4 mb-6">
                  <div className="text-sm text-[#8b96a8] leading-relaxed">
                    <strong className="text-[#3DA288]">🔐 2-of-3 Key Splitting</strong><br/>
                    Your file will be encrypted with a random key, then the key is split into 3 shares.
                    Any 2 shares can decrypt the file. No password needed!
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleEncryptAndRegister}
                    disabled={loading || !file}
                    className={`flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-white transition-all ${
                      loading || !file
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] hover:shadow-lg hover:shadow-[#3DA288]/30 hover:scale-[1.02]'
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
                      <rect x="5" y="9" width="10" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
                      <path d="M7 9V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V9" stroke="white" strokeWidth="1.5"/>
                      <circle cx="10" cy="13" r="1" fill="white"/>
                    </svg>
                    {loading ? "Processing..." : "Encrypt & Register"}
                  </button>

                  <button
                    onClick={handleVerifyFile}
                    disabled={loading || !file}
                    className={`flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-white transition-all ${
                      loading || !file
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02]'
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
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
                    className="mt-6 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
                  >
                    <h4 className="text-emerald-400 mb-4 text-base font-semibold">
                      🔑 Save Your Key Shares
                    </h4>

                    <div className="mb-4">
                      <div className="text-xs text-[#8b96a8] mb-1 uppercase tracking-wider">
                        Share 1 (Keep for yourself)
                      </div>
                      <div className="bg-[#0f1e2e] p-3 rounded-lg font-mono text-xs break-all text-[#C0C8D4] border border-[#C0C8D4]/20">
                        {keyShares.shareOne}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(keyShares.shareOne);
                          setCopiedShare1(true);
                          setTimeout(() => setCopiedShare1(false), 2000);
                        }}
                        className={`mt-2 px-3 py-1.5 text-xs font-medium text-white rounded transition-all min-w-[100px] ${
                          copiedShare1 ? 'bg-emerald-500' : 'bg-[#3DA288] hover:bg-[#2d8a6f]'
                        }`}
                      >
                        {copiedShare1 ? '✓ Copied!' : 'Copy Share 1'}
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="text-xs text-[#8b96a8] mb-1 uppercase tracking-wider">
                        Share 2 (Give to beneficiary)
                      </div>
                      <div className="bg-[#0f1e2e] p-3 rounded-lg font-mono text-xs break-all text-[#C0C8D4] border border-[#C0C8D4]/20">
                        {keyShares.shareTwo}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(keyShares.shareTwo);
                          setCopiedShare2(true);
                          setTimeout(() => setCopiedShare2(false), 2000);
                        }}
                        className={`mt-2 px-3 py-1.5 text-xs font-medium text-white rounded transition-all min-w-[100px] ${
                          copiedShare2 ? 'bg-emerald-500' : 'bg-[#3DA288] hover:bg-[#2d8a6f]'
                        }`}
                      >
                        {copiedShare2 ? '✓ Copied!' : 'Copy Share 2'}
                      </button>
                    </div>

                    <div className="p-3 bg-blue-500/10 rounded-lg text-sm text-blue-400">
                      <strong>Share 3</strong> is stored on blockchain and embedded in your .enc file. No need to save separately!
                    </div>

                    <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-sm text-red-400">
                      ⚠️ <strong>Important:</strong> Save Share 1 and Share 2 securely. You need any 2 of 3 shares to decrypt your file.
                    </div>

                    {/* Confirmation Button */}
                    <div className="mt-5 text-center">
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
                          className="px-8 py-3.5 text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-all"
                        >
                          ✓ I Have Saved My Key Shares
                        </button>
                      ) : (
                        <div className="inline-block px-8 py-3.5 text-base font-semibold bg-emerald-500/20 text-emerald-400 rounded-lg">
                          ✓ Shares Saved - You can now encrypt another file
                        </div>
                      )}
                    </div>

                    {/* Auto-saved notice */}
                    <div className="mt-3 p-2.5 bg-[#C0C8D4]/10 rounded-md text-xs text-[#8b96a8] text-center">
                      💾 Share 1 has been auto-saved to your browser. File hash: <code className="text-[10px]">{fileHash.slice(0, 16)}...</code>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* DECRYPT MODE */}
            {appMode === 'decrypt' && (
              <>
                {/* Mode Toggle: Auto vs Manual */}
                <div className="flex gap-2 mb-5 bg-[#0f1e2e] p-1 rounded-lg">
                  <button
                    onClick={() => setManualMode(false)}
                    className={`flex-1 py-2.5 rounded-md font-semibold text-sm transition-all ${
                      !manualMode
                        ? 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white'
                        : 'text-[#8b96a8] hover:text-[#C0C8D4]'
                    }`}
                  >
                    ⛓️ Auto (1 Share + Blockchain)
                  </button>
                  <button
                    onClick={() => setManualMode(true)}
                    className={`flex-1 py-2.5 rounded-md font-semibold text-sm transition-all ${
                      manualMode
                        ? 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white'
                        : 'text-[#8b96a8] hover:text-[#C0C8D4]'
                    }`}
                  >
                    🔧 Manual (2 Shares)
                  </button>
                </div>

                <div className="mb-6">
                  <input
                    type="file"
                    accept=".enc"
                    onChange={handleEncryptedFileSelect}
                    className="hidden"
                    id="encrypted-file-upload"
                  />
                  <label
                    htmlFor="encrypted-file-upload"
                    className="flex flex-col items-center justify-center p-12 bg-[#0f1e2e]/80 border-2 border-dashed border-[#C0C8D4]/30 rounded-xl cursor-pointer hover:border-[#3DA288]/50 transition-all min-h-[200px]"
                  >
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path d="M24 32V8M24 32L16 24M24 32L32 24" stroke="#C0C8D4" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32" stroke="#3DA288" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    <span className="text-base font-semibold text-[#C0C8D4] mt-4">
                      {file ? file.name : 'Select encrypted file (.enc)'}
                    </span>
                    <span className="text-sm text-[#8b96a8] mt-1">
                      Upload the .enc file to decrypt
                    </span>
                  </label>
                </div>

                {/* AUTO MODE: 1 Share + Blockchain */}
                {!manualMode && (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-[#8b96a8] mb-2 uppercase tracking-wider">
                        Your Key Share (Share 1 or 2)
                      </label>
                      <textarea
                        value={userShare}
                        onChange={(e) => setUserShare(e.target.value)}
                        placeholder="Paste your key share (e.g., 801... or 802...)"
                        className="w-full px-4 py-3 bg-[#0f1e2e]/80 border border-[#C0C8D4]/30 rounded-lg text-[#C0C8D4] placeholder-[#8b96a8]/50 focus:border-[#3DA288] focus:outline-none transition-colors font-mono text-xs min-h-[70px]"
                      />
                    </div>

                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-[#8b96a8] mb-2 uppercase tracking-wider">
                        File Hash (for blockchain lookup)
                        {decryptFileHash && encryptedFile && extractFileHashFromEncFile(encryptedFile) && (
                          <span className="ml-2 text-emerald-400 font-normal">
                            ✓ Auto-detected
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={decryptFileHash}
                        onChange={(e) => setDecryptFileHash(e.target.value)}
                        placeholder="0x... (auto-detected from file)"
                        className={`w-full px-4 py-3 border rounded-lg text-[#C0C8D4] placeholder-[#8b96a8]/50 focus:border-[#3DA288] focus:outline-none transition-colors font-mono text-xs ${
                          decryptFileHash && encryptedFile && extractFileHashFromEncFile(encryptedFile)
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-[#0f1e2e]/80 border-[#C0C8D4]/30'
                        }`}
                        readOnly={!!(decryptFileHash && encryptedFile && extractFileHashFromEncFile(encryptedFile))}
                      />
                      <span className="block text-xs text-[#8b96a8]/70 mt-1">
                        {encryptedFile && extractFileHashFromEncFile(encryptedFile)
                          ? '✨ File hash was embedded in the .enc file and auto-detected!'
                          : 'For older files without embedded hash, enter manually.'}
                      </span>
                    </div>

                    {/* Progress Steps Visualization */}
                    {decryptStep > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5 p-4 bg-[#0f1e2e] rounded-xl border border-[#C0C8D4]/20"
                      >
                        <div className="text-sm font-semibold text-[#C0C8D4] mb-3">
                          Decryption Progress
                        </div>
                        {[
                          { step: 1, label: 'Loading encrypted file', icon: '📄' },
                          { step: 2, label: 'Retrieving Share 3 from blockchain', icon: '⛓️' },
                          { step: 3, label: 'Reconstructing encryption key', icon: '🔑' },
                          { step: 4, label: 'Decrypting file', icon: '🔓' },
                        ].map(({ step, label, icon }) => (
                          <div
                            key={step}
                            className={`flex items-center gap-3 py-2 ${decryptStep >= step ? 'opacity-100' : 'opacity-40'}`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                              decryptStep > step ? 'bg-emerald-500 text-white' :
                              decryptStep === step ? 'bg-[#3DA288] text-white' :
                              'bg-[#C0C8D4]/20 text-[#8b96a8]'
                            }`}>
                              {decryptStep > step ? '✓' : icon}
                            </div>
                            <span className={`text-sm ${
                              decryptStep >= step ? 'text-[#C0C8D4]' : 'text-[#8b96a8]'
                            } ${decryptStep === step ? 'font-semibold' : ''}`}>
                              {label}
                              {decryptStep === step && loading && '...'}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Share 3 Retrieved Display */}
                    {blockchainShare3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">⛓️</span>
                          <span className="text-sm font-semibold text-emerald-400">
                            Share 3 Retrieved from Blockchain!
                          </span>
                        </div>
                        <div className="bg-[#0f1e2e] p-2.5 rounded-md font-mono text-[10px] break-all text-[#C0C8D4] mb-2">
                          {blockchainShare3.slice(0, 40)}...{blockchainShare3.slice(-20)}
                        </div>
                        {share3Info && (
                          <div className="text-xs text-[#8b96a8]">
                            📦 Block #{share3Info.blockNumber}
                            {share3Info.timestamp && (
                              <> · 🕐 {new Date(share3Info.timestamp * 1000).toLocaleString()}</>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Decrypt Button - Auto Mode */}
                    <button
                      onClick={handleDecryptAuto}
                      disabled={loading || !encryptedFile || !userShare || !decryptFileHash}
                      className={`w-full flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-white transition-all ${
                        loading || !encryptedFile || !userShare || !decryptFileHash
                          ? 'bg-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] hover:shadow-lg hover:shadow-[#3DA288]/30 hover:scale-[1.02]'
                      }`}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
                        <rect x="5" y="9" width="10" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
                        <path d="M7 9V6C7 4.34315 8.34315 3 10 3V3C11.6569 3 13 4.34315 13 6V9" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
                        <circle cx="10" cy="13" r="1" fill="white"/>
                      </svg>
                      {loading ? "Decrypting..." : "Decrypt with Blockchain"}
                    </button>
                  </>
                )}

                {/* MANUAL MODE: 2 Shares */}
                {manualMode && (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-[#8b96a8] mb-2 uppercase tracking-wider">
                        Key Share A
                      </label>
                      <textarea
                        value={shareA}
                        onChange={(e) => setShareA(e.target.value)}
                        placeholder="Paste first key share (e.g., 801...)"
                        className="w-full px-4 py-3 bg-[#0f1e2e]/80 border border-[#C0C8D4]/30 rounded-lg text-[#C0C8D4] placeholder-[#8b96a8]/50 focus:border-[#3DA288] focus:outline-none transition-colors font-mono text-xs min-h-[70px]"
                      />
                    </div>

                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-[#8b96a8] mb-2 uppercase tracking-wider">
                        Key Share B
                      </label>
                      <textarea
                        value={shareB}
                        onChange={(e) => setShareB(e.target.value)}
                        placeholder="Paste second key share (e.g., 802...)"
                        className="w-full px-4 py-3 bg-[#0f1e2e]/80 border border-[#C0C8D4]/30 rounded-lg text-[#C0C8D4] placeholder-[#8b96a8]/50 focus:border-[#3DA288] focus:outline-none transition-colors font-mono text-xs min-h-[70px]"
                      />
                      <span className="block text-xs text-[#8b96a8]/70 mt-1">
                        Enter any 2 of your 3 key shares to decrypt (no blockchain needed)
                      </span>
                    </div>

                    {/* Decrypt Button - Manual Mode */}
                    <button
                      onClick={handleDecryptManual}
                      disabled={loading || !encryptedFile || !shareA || !shareB}
                      className={`w-full flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-white transition-all ${
                        loading || !encryptedFile || !shareA || !shareB
                          ? 'bg-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] hover:shadow-lg hover:shadow-[#3DA288]/30 hover:scale-[1.02]'
                      }`}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
                        <rect x="5" y="9" width="10" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
                        <path d="M7 9V6C7 4.34315 8.34315 3 10 3V3C11.6569 3 13 4.34315 13 6V9" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
                        <circle cx="10" cy="13" r="1" fill="white"/>
                      </svg>
                      {loading ? "Decrypting..." : "Decrypt File"}
                    </button>
                  </>
                )}
              </>
            )}

            {/* Status Display */}
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                  status.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                  status.type === "error" ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                  "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                }`}
              >
                {status.type === "success" && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {status.type === "error" && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {status.type === "info" && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M10 10V14M10 6V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                <span className="text-sm">{status.message}</span>
              </motion.div>
            )}

            {/* Transaction Info */}
            {txHash && appMode === 'encrypt' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-[#0f1e2e] border border-[#C0C8D4]/20 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#8b96a8] uppercase tracking-wider">Transaction Hash:</span>
                  <a
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#3DA288] hover:text-[#2d8a6f] flex items-center font-mono"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1">
                      <path d="M10 3H13V6M13 3L8 8M6 3H4C3.44772 3 3 3.44772 3 4V12C3 12.5523 3.44772 13 4 13H12C12.5523 13 13 12.5523 13 12V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </a>
                </div>
                {fileHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8b96a8] uppercase tracking-wider">File Hash:</span>
                    <code className="text-xs text-[#C0C8D4] font-mono">
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
          className="mt-6"
        >
          <div className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] border border-[#C0C8D4]/10 rounded-2xl p-6">
            <h4 className="text-sm font-semibold text-[#3DA288] mb-4 uppercase tracking-wider">
              {appMode === 'encrypt' ? 'How 2-of-3 Encryption Works' : 'How to Decrypt'}
            </h4>
            <ol className="text-sm text-[#8b96a8] leading-relaxed pl-5 space-y-2 list-decimal">
              {appMode === 'encrypt' ? (
                <>
                  <li>Select any file you want to secure</li>
                  <li>Click "Encrypt & Register" - a random key encrypts your file</li>
                  <li>The key is split into 3 shares (2-of-3 threshold)</li>
                  <li><strong className="text-[#C0C8D4]">Share 1:</strong> Keep for yourself</li>
                  <li><strong className="text-[#C0C8D4]">Share 2:</strong> Give to your beneficiary</li>
                  <li><strong className="text-[#C0C8D4]">Share 3:</strong> Stored on blockchain</li>
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
      <footer className="border-t border-[#C0C8D4]/10 py-8 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[#8b96a8] text-sm flex items-center justify-center mb-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2">
              <path d="M8 2L3 5V8C3 11 5 13.5 8 15C11 13.5 13 11 13 8V5L8 2Z" stroke="#3DA288" strokeWidth="1.2" fill="none"/>
            </svg>
            EternLink · Blockchain-Based Proof of Existence System
          </p>
          <p className="text-[#8b96a8]/60 text-xs">
            Secured with AES-256-GCM Encryption · Multi-Network Support
          </p>
        </div>
      </footer>
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