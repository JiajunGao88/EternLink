/**
 * Enhanced Shamir's Secret Sharing Demo Component
 * Design synchronized with ProductLandingPage
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  splitPassword,
  type PasswordShares
} from '../utils/secretSharing';

interface ShamirDemoEnhancedProps {
  onBack?: () => void;
}

export default function ShamirDemoEnhanced({ onBack }: ShamirDemoEnhancedProps) {
  const [password, setPassword] = useState('');
  const [shares, setShares] = useState<PasswordShares | null>(null);
  const [fileHash] = useState('0xabc123def456'); // Demo file hash
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const handleSplit = () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const newShares = splitPassword(password);
      setShares(newShares);
    } catch (err) {
      setError('Failed to split password: ' + (err as Error).message);
    }
  };

  // Generate QR code when shares change
  useEffect(() => {
    if (shares) {
      // Only include the share itself in QR code, not the full formatted string
      QRCode.toDataURL(shares.shareTwo, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',  // Black for better scanning
          light: '#FFFFFF'  // White background
        },
        errorCorrectionLevel: 'M'
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR code generation failed:', err));
    }
  }, [shares, fileHash]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copied to clipboard!`);
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

            {/* Nav Button */}
            <button
              onClick={onBack}
              className="px-6 py-2 text-[#C0C8D4] hover:text-[#3DA288] transition-colors font-medium"
            >
              ← Back to Main App
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Spacer for fixed nav */}
      <div className="h-20"></div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
              Shamir's Secret Sharing
            </span>
          </h1>
          <p className="text-lg text-[#8b96a8]">
            Split your password into 3 shares · Any 2 shares can reconstruct it
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-4 rounded-xl mb-8 max-w-xl mx-auto"
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Input Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] backdrop-blur-xl border border-[#3DA288]/20 rounded-2xl p-8 mb-10 max-w-xl mx-auto"
        >
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#8b96a8] mb-2 uppercase tracking-wider">
              Enter Password (minimum 8 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password..."
              className="w-full px-4 py-3.5 bg-[#0f1e2e]/80 border border-[#C0C8D4]/30 rounded-lg text-[#C0C8D4] placeholder-[#8b96a8]/50 focus:border-[#3DA288] focus:outline-none transition-colors"
            />
          </div>

          <button
            onClick={handleSplit}
            disabled={!password}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
              password
                ? 'bg-gradient-to-r from-[#3DA288] to-[#2d8a6f] text-white hover:shadow-lg hover:shadow-[#3DA288]/30 hover:scale-[1.02]'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            🔐 Split Password into 3 Shares
          </button>
        </motion.section>

        {/* Shares Display */}
        {shares && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-[#C0C8D4] mb-6 text-center">
              Generated Shares
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Share 1 - User Device */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] border border-[#C0C8D4]/20 rounded-2xl p-6 relative"
              >
                <div className="absolute top-4 right-4 w-8 h-8 bg-[#C0C8D4]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#C0C8D4]">
                  1
                </div>

                <h3 className="text-lg font-semibold text-[#C0C8D4] mb-2">
                  📱 Share 1
                </h3>
                <p className="text-sm text-[#8b96a8] mb-4">
                  Stored on User Device
                </p>

                <div className="bg-[#0f1e2e] border border-[#C0C8D4]/20 rounded-lg p-3 mb-3">
                  <code className="text-xs text-[#C0C8D4] break-all font-mono">
                    {shares.shareOne}
                  </code>
                </div>

                <button
                  onClick={() => copyToClipboard(shares.shareOne, 'Share 1')}
                  className="w-full py-2.5 bg-[#C0C8D4]/20 border border-[#C0C8D4]/30 rounded-lg text-[#C0C8D4] text-sm font-medium hover:bg-[#C0C8D4]/30 transition-colors"
                >
                  📋 Copy Share 1
                </button>
              </motion.div>

              {/* Share 2 - Beneficiary */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] border border-[#ffc107]/30 rounded-2xl p-6 relative"
              >
                <div className="absolute top-4 right-4 w-8 h-8 bg-[#ffc107]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#ffc107]">
                  2
                </div>

                <h3 className="text-lg font-semibold text-[#C0C8D4] mb-2 text-center">
                  📄 Share 2
                </h3>
                <p className="text-sm text-[#8b96a8] mb-4 text-center">
                  Given to Beneficiary (Offline)
                </p>

                {/* QR Code Display */}
                {qrCodeUrl && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code for Share 2"
                        className="w-48 h-48 block"
                      />
                    </div>
                    <p className="text-xs text-[#8b96a8] text-center">
                      Scan to view beneficiary share
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Share 3 - File Metadata */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-gradient-to-br from-[#1a2942] to-[#0a1628] border border-[#3DA288]/30 rounded-2xl p-6 relative"
              >
                <div className="absolute top-4 right-4 w-8 h-8 bg-[#3DA288]/20 rounded-full flex items-center justify-center text-sm font-bold text-[#3DA288]">
                  3
                </div>

                <h3 className="text-lg font-semibold text-[#C0C8D4] mb-2">
                  🗂️ Share 3
                </h3>
                <p className="text-sm text-[#8b96a8] mb-4">
                  Embedded in File Metadata
                </p>

                <div className="bg-[#0f1e2e] border border-[#C0C8D4]/20 rounded-lg p-3 mb-3">
                  <code className="text-xs text-[#C0C8D4] break-all font-mono">
                    {shares.shareThree}
                  </code>
                </div>

                <button
                  onClick={() => copyToClipboard(shares.shareThree, 'Share 3')}
                  className="w-full py-2.5 bg-[#C0C8D4]/20 border border-[#C0C8D4]/30 rounded-lg text-[#C0C8D4] text-sm font-medium hover:bg-[#C0C8D4]/30 transition-colors"
                >
                  📋 Copy Share 3
                </button>
              </motion.div>
            </div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-8 p-5 bg-[#3DA288]/10 border border-[#3DA288]/20 rounded-xl text-center"
            >
              <p className="text-[#C0C8D4] text-sm mb-2">
                ✅ Any 2 of these 3 shares can reconstruct your original password
              </p>
              <p className="text-[#8b96a8] text-sm opacity-70">
                A single share reveals zero information about the password
              </p>
            </motion.div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
