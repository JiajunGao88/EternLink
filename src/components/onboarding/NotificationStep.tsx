/**
 * NotificationStep Component
 *
 * Configure multi-level notification thresholds for heartbeat monitoring.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NotificationStepProps {
  onSave: (config: NotificationConfig) => void;
  initialConfig?: NotificationConfig;
}

export interface NotificationConfig {
  emailNotificationDays: number;
  phoneNotificationDays: number;
  accountFreezeDays: number;
}

const PRESETS = [
  {
    name: 'Conservative',
    description: 'Quick notifications for active users',
    config: { emailNotificationDays: 7, phoneNotificationDays: 14, accountFreezeDays: 30 },
  },
  {
    name: 'Balanced',
    description: 'Recommended for most users',
    config: { emailNotificationDays: 14, phoneNotificationDays: 30, accountFreezeDays: 60 },
  },
  {
    name: 'Relaxed',
    description: 'Longer intervals for infrequent users',
    config: { emailNotificationDays: 30, phoneNotificationDays: 60, accountFreezeDays: 90 },
  },
];

export const NotificationStep: React.FC<NotificationStepProps> = ({ onSave, initialConfig }) => {
  const [config, setConfig] = useState<NotificationConfig>(
    initialConfig || PRESETS[1].config
  );
  const [selectedPreset, setSelectedPreset] = useState<number>(1);
  const [showCustom, setShowCustom] = useState(false);

  // Save default configuration on mount
  useEffect(() => {
    if (!initialConfig) {
      onSave(PRESETS[1].config);
    }
  }, []);

  const handlePresetSelect = (index: number) => {
    setSelectedPreset(index);
    setConfig(PRESETS[index].config);
    setShowCustom(false);
    onSave(PRESETS[index].config);
  };

  const handleCustomChange = (field: keyof NotificationConfig, value: number) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onSave(newConfig);
  };

  const toggleCustom = () => {
    setShowCustom(!showCustom);
    if (!showCustom) {
      setSelectedPreset(-1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block p-3 rounded-full bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] mb-4">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Notification Preferences
        </h2>
        <p className="text-gray-300">
          Configure when you want to receive alerts if you miss check-ins
        </p>
      </div>

      {/* Presets */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Choose a Preset</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESETS.map((preset, index) => (
            <motion.button
              key={preset.name}
              onClick={() => handlePresetSelect(index)}
              className={`
                p-6 rounded-lg text-left transition-all
                ${
                  selectedPreset === index
                    ? 'bg-gradient-to-br from-[#C0C8D4]/20 to-[#8b9da8]/20 border-2 border-[#C0C8D4]'
                    : 'bg-white/5 border-2 border-white/10 hover:border-white/30'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-white">{preset.name}</h4>
                {selectedPreset === index && (
                  <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">{preset.description}</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Email:</span>
                  <span className="text-white font-medium">{preset.config.emailNotificationDays} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Phone:</span>
                  <span className="text-white font-medium">{preset.config.phoneNotificationDays} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Freeze:</span>
                  <span className="text-white font-medium">{preset.config.accountFreezeDays} days</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Configuration */}
      <div className="mb-8">
        <button
          onClick={toggleCustom}
          className="flex items-center gap-2 text-[#C0C8D4] hover:text-white transition-colors mb-4"
        >
          <svg
            className={`w-5 h-5 transition-transform ${showCustom ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold">Custom Configuration</span>
        </button>

        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 p-6 rounded-lg bg-white/5 border border-white/10"
          >
            {/* Email Notification */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                📧 Email Notification
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Send email alert after this many days of inactivity
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="3"
                  max="90"
                  step="1"
                  value={config.emailNotificationDays}
                  onChange={(e) => handleCustomChange('emailNotificationDays', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #C0C8D4 0%, #C0C8D4 ${(config.emailNotificationDays / 90) * 100}%, rgba(255,255,255,0.1) ${(config.emailNotificationDays / 90) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <span className="text-white font-semibold w-16 text-right">
                  {config.emailNotificationDays} days
                </span>
              </div>
            </div>

            {/* Phone Notification */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                📱 Phone Notification
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Send SMS alert after this many days of inactivity
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="7"
                  max="120"
                  step="1"
                  value={config.phoneNotificationDays}
                  onChange={(e) => handleCustomChange('phoneNotificationDays', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #C0C8D4 0%, #C0C8D4 ${(config.phoneNotificationDays / 120) * 100}%, rgba(255,255,255,0.1) ${(config.phoneNotificationDays / 120) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <span className="text-white font-semibold w-16 text-right">
                  {config.phoneNotificationDays} days
                </span>
              </div>
            </div>

            {/* Account Freeze */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                🔒 Account Freeze
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Freeze account and require voice verification after this many days
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="14"
                  max="180"
                  step="1"
                  value={config.accountFreezeDays}
                  onChange={(e) => handleCustomChange('accountFreezeDays', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #C0C8D4 0%, #C0C8D4 ${(config.accountFreezeDays / 180) * 100}%, rgba(255,255,255,0.1) ${(config.accountFreezeDays / 180) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <span className="text-white font-semibold w-16 text-right">
                  {config.accountFreezeDays} days
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Timeline Visualization */}
      <div className="p-6 rounded-lg bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Timeline Preview</h3>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">Last Login</div>
              <div className="w-3 h-3 rounded-full bg-[#10b981] mx-auto"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-[#10b981] to-[#f59e0b]"></div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">Email Alert</div>
              <div className="w-3 h-3 rounded-full bg-[#f59e0b] mx-auto"></div>
              <div className="text-xs font-semibold text-[#f59e0b] mt-1">
                Day {config.emailNotificationDays}
              </div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-[#f59e0b] to-[#ef4444]"></div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">Phone Alert</div>
              <div className="w-3 h-3 rounded-full bg-[#ef4444] mx-auto"></div>
              <div className="text-xs font-semibold text-[#ef4444] mt-1">
                Day {config.phoneNotificationDays}
              </div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-[#ef4444] to-[#991b1b]"></div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">Account Freeze</div>
              <div className="w-3 h-3 rounded-full bg-[#991b1b] mx-auto"></div>
              <div className="text-xs font-semibold text-[#991b1b] mt-1">
                Day {config.accountFreezeDays}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
