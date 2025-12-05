/**
 * VoiceSignatureStep Component
 *
 * Record voice signature for account recovery and verification.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config';

const API_URL = `${API_BASE_URL}/api`;

interface VoiceSignatureStepProps {
  onSaved: (voiceSignature: string) => void;
}

export const VoiceSignatureStep: React.FC<VoiceSignatureStepProps> = ({ onSaved }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const SCRIPT = "I am the owner of this EternLink account, and I authorize this voice signature for account recovery.";
  const MAX_DURATION = 30; // seconds

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecording(true);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setError('Could not access microphone. Please check your browser permissions.');
      console.error('Microphone access error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.play();
      setIsPlaying(true);
    }
  };

  const stopPlaying = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const reRecord = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setHasRecording(false);
    setRecordingTime(0);
    setError(null);
  };

  const saveRecording = async () => {
    if (!audioBlob) return;

    setIsSaving(true);
    setError(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;

          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_URL}/user/voice/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ voiceData: base64Audio }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to save voice signature');
          }

          // Successfully saved - reset saving state and call onSaved callback
          setIsSaving(false);
          onSaved(base64Audio);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save recording');
          setIsSaving(false);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording');
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block p-3 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-4">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Voice Signature
        </h2>
        <p className="text-gray-300">
          Record your voice to unlock your account if it gets frozen
        </p>
      </div>

      {/* Script to read */}
      <div className="mb-8 p-6 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
        <h3 className="text-sm font-semibold text-[#C0C8D4] mb-3">
          📜 Please read this script clearly:
        </h3>
        <p className="text-lg text-white leading-relaxed font-medium p-4 rounded-lg bg-white/5 italic">
          "{SCRIPT}"
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Maximum recording time: {MAX_DURATION} seconds
        </p>
      </div>

      {/* Recording Interface */}
      <div className="p-8 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
        <AnimatePresence mode="wait">
          {!hasRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {/* Recording Visualization */}
              <div className="mb-8">
                <div className="relative inline-block">
                  <motion.div
                    className={`w-32 h-32 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-[#ef4444]' : 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8]'
                    }`}
                    animate={isRecording ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{
                      duration: 1,
                      repeat: isRecording ? Infinity : 0,
                    }}
                  >
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </motion.div>

                  {isRecording && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-[#ef4444]"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.8, 0, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    />
                  )}
                </div>

                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6"
                  >
                    <div className="text-3xl font-bold text-white mb-2">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-sm text-gray-400">Recording...</div>
                    <div className="mt-4 w-64 mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#ef4444] to-[#dc2626]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(recordingTime / MAX_DURATION) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Control Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`
                  px-8 py-3 rounded-lg font-semibold text-white
                  ${isRecording
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:opacity-90'
                    : 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] hover:opacity-90'
                  }
                  transition-opacity
                `}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="playback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {/* Success Icon */}
              <div className="mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-block p-4 rounded-full bg-[#10b981]/20"
                >
                  <svg className="w-16 h-16 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">Recording Complete!</h3>
              <p className="text-gray-400 mb-6">Duration: {recordingTime} seconds</p>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={isPlaying ? stopPlaying : playRecording}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </>
                  )}
                </button>

                <button
                  onClick={reRecord}
                  className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-record
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={saveRecording}
                disabled={isSaving}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] hover:opacity-90 transition-opacity text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Voice Signature'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
          >
            <p className="text-[#ef4444] text-sm">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-blue-400 mb-1">Why voice verification?</p>
            <p>
              If your account gets frozen due to extended inactivity, you'll need to verify your identity
              using this voice signature to unlock it. This prevents unauthorized access while ensuring you
              can always regain control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
