/**
 * VoiceUnlockPage Component
 *
 * Displayed when user account is frozen due to extended inactivity.
 * User must verify their identity using voice signature to unlock account.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceUnlockPageProps {
  freezeReason?: string;
  onUnlockSuccess: () => void;
  onLogout: () => void;
}

export const VoiceUnlockPage: React.FC<VoiceUnlockPageProps> = ({
  freezeReason,
  onUnlockSuccess,
  onLogout,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_RECORDING_TIME = 3; // seconds
  const MAX_RECORDING_TIME = 10; // seconds

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (err) {
      setError('Unable to access microphone. Please check permissions.');
      console.error('Microphone access error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleVerify = async () => {
    if (!audioBlob) {
      setError('No recording found. Please record your voice first.');
      return;
    }

    if (recordingTime < MIN_RECORDING_TIME) {
      setError(`Recording too short. Please record at least ${MIN_RECORDING_TIME} seconds.`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:3001/api/account/voice/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ voiceData: base64Audio }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Voice verification failed');
        }

        // Success!
        setShowSuccess(true);
        setTimeout(() => {
          onUnlockSuccess();
        }, 2000);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628] flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="inline-block p-6 rounded-full bg-[#10b981]/20 mb-6">
            <svg className="w-24 h-24 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Account Unlocked!</h2>
          <p className="text-gray-300">
            Voice verification successful. Redirecting to your dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628]">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z"
                stroke="#C0C8D4"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#C0C8D4] to-[#3DA288] bg-clip-text text-transparent">
              EternLink
            </span>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* Lock Icon */}
          <div className="inline-block p-6 rounded-full bg-[#f59e0b]/20 mb-6">
            <svg className="w-20 h-20 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Account Locked
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Your account has been frozen due to extended inactivity
          </p>
          {freezeReason && (
            <p className="text-gray-400 text-sm">
              Reason: {freezeReason}
            </p>
          )}
        </motion.div>

        {/* Voice Verification Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 p-6 rounded-lg bg-blue-500/10 border border-blue-500/30"
        >
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Verify Your Identity</h3>
              <p className="text-gray-300 mb-3">
                To unlock your account, please verify your identity using your voice signature.
                Speak the same phrase you recorded during onboarding.
              </p>
              <div className="space-y-2 text-sm text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">1</span>
                  Click "Start Recording" and speak naturally
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">2</span>
                  Record for {MIN_RECORDING_TIME}-{MAX_RECORDING_TIME} seconds
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">3</span>
                  Click "Verify Voice" to unlock your account
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recording Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10"
        >
          {/* Recording Status */}
          <div className="text-center mb-8">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-block"
                >
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-[#ef4444]/20 flex items-center justify-center mb-4 mx-auto">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-20 h-20 rounded-full bg-[#ef4444] flex items-center justify-center"
                      >
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                      </motion.div>
                    </div>
                    <p className="text-[#ef4444] font-semibold text-lg">Recording...</p>
                    <p className="text-gray-300 text-3xl font-mono mt-2">
                      {recordingTime}s / {MAX_RECORDING_TIME}s
                    </p>
                  </div>
                </motion.div>
              ) : audioBlob ? (
                <motion.div
                  key="recorded"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-block"
                >
                  <div className="w-32 h-32 rounded-full bg-[#10b981]/20 flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-16 h-16 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[#10b981] font-semibold text-lg">Recording Complete</p>
                  <p className="text-gray-300 mt-2">Duration: {recordingTime}s</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-block"
                >
                  <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-semibold text-lg">Ready to Record</p>
                  <p className="text-gray-500 text-sm mt-2">Click below to start</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
            >
              <p className="text-[#ef4444] text-sm">{error}</p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!audioBlob ? (
              <>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isVerifying}
                  className={`
                    w-full px-6 py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3
                    ${isRecording
                      ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white'
                      : 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90 text-white'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isRecording ? (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" />
                      </svg>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" />
                      </svg>
                      Start Recording
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Verify Voice & Unlock Account
                    </>
                  )}
                </button>

                <button
                  onClick={handleRetry}
                  disabled={isVerifying}
                  className="w-full px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Again
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 rounded-lg bg-white/5 border border-white/10"
        >
          <h3 className="text-lg font-semibold text-white mb-3">Having Trouble?</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <p className="flex items-start gap-2">
              <span className="text-[#C0C8D4]">•</span>
              Make sure you're in a quiet environment
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#C0C8D4]">•</span>
              Speak clearly and naturally, just like during onboarding
            </p>
            <p className="flex items-start gap-2">
              <span className="text-[#C0C8D4]">•</span>
              If verification fails multiple times, contact support for manual verification
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <a
              href="mailto:support@eternlink.com"
              className="text-[#C0C8D4] hover:text-[#8b9da8] transition-colors"
            >
              Contact Support →
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
