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
import { registerFileHashSSS, verifyFileHash, getKeyShare3FromBlockchain, uploadEncryptedFile, markFileDecrypted, EncryptedFileInfo } from "./utils/api";
import FilePickerModal from "./components/FilePickerModal";
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
  
  // File picker modal state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedServerFile, setSelectedServerFile] = useState<EncryptedFileInfo | null>(null);

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
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const accountType = localStorage.getItem('accountType');
    const storedName = localStorage.getItem('userName');
    const isLoggedIn = !!(token && accountType);
    
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
        isLoggedIn={isLoggedIn}
        userName={storedName || userEmail}
        onDashboard={() => {
          setShowProductLanding(false);
          if (accountType === 'beneficiary') {
            setShowBeneficiaryDashboard(true);
          } else {
            setShowUserDashboard(true);
          }
        }}
        onLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('accountType');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('onboardingCompleted');
          setUserEmail('');
          setUserName('');
          setUserAccountType(null);
          // Force re-render
          setShowProductLanding(false);
          setTimeout(() => setShowProductLanding(true), 0);
        }}
      />
    );
  }

  // Show Login Page
  if (showLogin) {
    return (
      <LoginPage
        onLoginSuccess={(token, user) => {
          console.log('Login success, user data:', user); // Debug log
          
          // Safety check for accountType
          const accountType = user?.accountType || 'user';
          // Handle both boolean and number (SQLite returns 1/0)
          const onboardingComplete = user?.onboardingCompleted === true || user?.onboardingCompleted === 1;
          
          localStorage.setItem('authToken', token);
          localStorage.setItem('accountType', accountType);
          localStorage.setItem('userEmail', user?.email || '');
          localStorage.setItem('userName', user?.name || '');
          
          // Store onboarding status from server
          if (onboardingComplete) {
            localStorage.setItem('onboardingCompleted', 'true');
          }
          
          setUserAccountType(accountType as 'user' | 'beneficiary');
          setUserEmail(user?.email || '');
          setUserName(user?.name || '');
          setShowLogin(false);

          // Redirect based on account type
          if (accountType === 'beneficiary') {
            setShowBeneficiaryDashboard(true);
          } else {
            // For user accounts, check onboarding status
            if (onboardingComplete) {
              // Onboarding completed = show dashboard
              setShowUserDashboard(true);
            } else {
              // Not onboarded = start onboarding
              setShowOnboarding(true);
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
            // For user accounts, start onboarding process
            setShowOnboarding(true);
          }
        }}
        onBackToLogin={() => {
          setShowRegistration(false);
          setShowLogin(true);
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
          // User chose to skip - go to dashboard
          setShowOnboarding(false);
          setShowUserDashboard(true);
        }}
        onLogout={() => {
          // Clear all auth data
          localStorage.removeItem('authToken');
          localStorage.removeItem('accountType');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('onboardingCompleted');
          setUserAccountType(null);
          setUserEmail('');
          setUserName('');
          setShowOnboarding(false);
          setShowProductLanding(true);
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
    // Reset copied states when new file is selected
    setCopiedShare1(false);
    setCopiedShare2(false);
    setSharesSaved(false);
    // Reset shares when new file selected
    setKeyShares(null);
    setShowShares(false);
  };

  // Handle file selection from server
  const handleServerFileSelect = (data: ArrayBuffer, fileInfo: EncryptedFileInfo) => {
    setEncryptedFile(data);
    setSelectedServerFile(fileInfo);
    // Use the fileHash directly from file info (most reliable)
    setDecryptFileHash(fileInfo.fileHash);
    setStatus({
      type: "info",
      message: `Cloud file loaded: ${fileInfo.originalName}.enc - File hash auto-filled`,
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

      // 6. Pack encrypted file (with embedded file hash)
      const encryptedBlob = packEncryptedFileSSS(encrypted, iv, hashHex);
      
      // 7. Check if user is logged in and upload to server
      const token = localStorage.getItem('authToken');
      let uploadedToServer = false;
      
      if (token) {
        setStatus({ type: "info", message: "Uploading encrypted file to server..." });
        // Pass original file's MIME type for accurate restoration when decrypting
        const uploadResult = await uploadEncryptedFile(encryptedBlob, hashHex, fileInfo.name, fileInfo.type);
        
        if (uploadResult.success) {
          uploadedToServer = true;
          console.log('File uploaded to server:', uploadResult.file);
        } else if (!uploadResult.error?.includes('already uploaded')) {
          console.warn('Server upload failed, falling back to local download:', uploadResult.error);
        }
      }
      
      // If not logged in or upload failed, download locally
      if (!uploadedToServer && !token) {
        const encryptedFileName = fileInfo.name + ".enc";
        downloadFile(encryptedBlob, encryptedFileName);
      }

      // 8. Register file hash + keyShare3 on blockchain
      setStatus({ type: "info", message: "Registering on blockchain..." });
      const result = await registerFileHashSSS(
        hashHex,
        DEFAULTS.CIPHER,
        shares.shareThree, // Store Share 3 on blockchain
        fileInfo.size,
        fileInfo.type
      );

      // Always show key shares, even if already registered
      setShowShares(true);

      if (!result.success) {
        if (result.error?.includes('already registered')) {
          setStatus({
            type: "success",
            message: uploadedToServer 
              ? "File encrypted and saved to your account! (Already registered on blockchain)"
              : "This file is already registered on blockchain. Key shares shown below.",
          });
          return;
        }
        throw new Error(result.error || "Registration failed");
      }

      setTxHash(result.txHash || "");
      setStatus({
        type: "success",
        message: uploadedToServer 
          ? "File encrypted and saved to your account! Save your key shares below."
          : "File encrypted and registered! Save your key shares below.",
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

      // Download decrypted file with original name and mime type
      const originalName = selectedServerFile?.originalName || file?.name.replace('.enc', '') || 'decrypted_file';
      const mimeType = selectedServerFile?.mimeType || 'application/octet-stream';
      const blob = new Blob([decrypted], { type: mimeType });
      downloadFile(blob, originalName);

      // Mark file as decrypted in database (if logged in and file hash available)
      const token = localStorage.getItem('authToken');
      if (token && decryptFileHash) {
        markFileDecrypted(decryptFileHash.trim()).catch(err => {
          console.warn('Failed to mark file as decrypted:', err);
        });
      }

      setStatus({
        type: "success",
        message: `File decrypted successfully! Downloaded as: ${originalName}`,
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

      // 5. Download decrypted file with original name and mime type
      const originalName = selectedServerFile?.originalName || file?.name.replace('.enc', '') || 'decrypted_file';
      const mimeType = selectedServerFile?.mimeType || 'application/octet-stream';
      const blob = new Blob([decrypted], { type: mimeType });
      downloadFile(blob, originalName);

      // Mark file as decrypted in database (if logged in and file hash available)
      const token = localStorage.getItem('authToken');
      const fileHashToMark = selectedServerFile?.fileHash || decryptFileHash?.trim();
      if (token && fileHashToMark) {
        markFileDecrypted(fileHashToMark).catch(err => {
          console.warn('Failed to mark file as decrypted:', err);
        });
      }

      setStatus({
        type: "success",
        message: `File decrypted successfully! Downloaded as: ${originalName}`,
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
        const scanUrl = `https://sepolia.basescan.org/search?f=0&q=${encodeURIComponent(hashHex)}`;
        window.open(scanUrl, '_blank', 'noopener,noreferrer');
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
            {/* Logo - Clickable */}
            <button
              onClick={() => {
                const token = localStorage.getItem('authToken');
                const accountType = localStorage.getItem('accountType');
                if (token && accountType) {
                  // Logged in - go to dashboard
                  if (accountType === 'beneficiary') {
                    setShowBeneficiaryDashboard(true);
                  } else {
                    setShowUserDashboard(true);
                  }
                } else {
                  // Not logged in - go to homepage
                  setShowProductLanding(true);
                }
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
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
            </button>

            {/* Nav Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  // If user is logged in, go back to dashboard
                  const token = localStorage.getItem('authToken');
                  const accountType = localStorage.getItem('accountType');
                  if (token && accountType) {
                    if (accountType === 'beneficiary') {
                      setShowBeneficiaryDashboard(true);
                    } else {
                      setShowUserDashboard(true);
                    }
                  } else {
                    setShowProductLanding(true);
                  }
                }}
                className="px-6 py-2 text-[#C0C8D4] hover:text-[#3DA288] transition-colors font-medium"
              >
                ← Back
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
            onClick={() => { 
              setAppMode('encrypt'); 
              setFile(null); 
              setFileInfo(null); 
              setEncryptedFile(null); 
              setStatus(null); 
              setKeyShares(null); 
              setShowShares(false); 
              setCopiedShare1(false); 
              setCopiedShare2(false);
              setSharesSaved(false);
              setTxHash('');
              setFileHash('');
            }}
            className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              appMode === 'encrypt'
                ? 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white shadow-lg shadow-[#3DA288]/30'
                : 'text-[#8b96a8] hover:text-[#C0C8D4]'
            }`}
          >
            🔒 Encrypt & Register
          </button>
          <button
            onClick={() => { 
              setAppMode('decrypt'); 
              setFile(null); 
              setFileInfo(null); 
              setEncryptedFile(null); 
              setStatus(null); 
              setShareA(''); 
              setShareB(''); 
              setUserShare('');
              setDecryptFileHash('');
              setSelectedServerFile(null);
              setBlockchainShare3(null);
              setDecryptStep(0);
              setShare3Info(null);
            }}
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
                        }}
                        className={`mt-2 px-3 py-1.5 text-xs font-medium text-white rounded transition-all min-w-[100px] ${
                          copiedShare1 ? 'bg-emerald-500 cursor-default' : 'bg-[#3DA288] hover:bg-[#2d8a6f]'
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
                        }}
                        className={`mt-2 px-3 py-1.5 text-xs font-medium text-white rounded transition-all min-w-[100px] ${
                          copiedShare2 ? 'bg-emerald-500 cursor-default' : 'bg-[#3DA288] hover:bg-[#2d8a6f]'
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
                  {/* File selection display */}
                  {(encryptedFile || selectedServerFile) ? (
                    <div className="p-4 bg-[#0f1e2e]/80 border border-[#3DA288]/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#3DA288]/20 rounded-lg">
                          <svg className="w-8 h-8 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#C0C8D4] font-medium truncate">
                            {selectedServerFile?.originalName}.enc
                          </p>
                          <p className="text-sm text-[#8b96a8]">
                            From your secure cloud storage
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEncryptedFile(null);
                            setSelectedServerFile(null);
                            setDecryptFileHash('');
                          }}
                          className="p-2 text-[#8b96a8] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFilePicker(true)}
                      className="w-full flex flex-col items-center justify-center p-12 bg-[#0f1e2e]/80 border-2 border-dashed border-[#3DA288]/30 rounded-xl cursor-pointer hover:border-[#3DA288]/70 hover:bg-[#3DA288]/5 transition-all"
                    >
                      <div className="p-4 bg-[#3DA288]/20 rounded-full mb-4">
                        <svg className="w-10 h-10 text-[#3DA288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                      </div>
                      <span className="text-base font-semibold text-[#3DA288]">Select Encrypted File</span>
                      <span className="text-sm text-[#8b96a8] mt-1">Select from cloud</span>
                    </button>
                  )}
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

      {/* File Picker Modal */}
      <FilePickerModal
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onFileSelected={handleServerFileSelect}
      />
    </div>
  );
}

export default App;