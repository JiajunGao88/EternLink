/**
 * OnboardingWizard Component
 *
 * Main onboarding wizard that guides new users through account setup.
 * Enforced after email verification, before accessing the dashboard.
 */

import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api`;
import { WizardContainer, WizardStep } from './shared/WizardContainer';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { NotificationStep, NotificationConfig } from './onboarding/NotificationStep';
import { PhoneVerificationStep } from './onboarding/PhoneVerificationStep';
import { VoiceSignatureStep } from './onboarding/VoiceSignatureStep';
import { BeneficiaryStep } from './onboarding/BeneficiaryStep';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  onLogout?: () => void;
  userEmail?: string;
  userName?: string;
}

interface OnboardingData {
  notificationConfig?: NotificationConfig;
  phoneNumber?: string;
  voiceSignature?: string;
  beneficiaries?: any[];
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userName,
  onLogout,
  // onComplete and onSkip are intentionally not destructured as we use window.location.reload() instead
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});

  const handleNotificationSave = (config: NotificationConfig) => {
    setOnboardingData((prev) => ({ ...prev, notificationConfig: config }));
  };

  const handlePhoneVerified = (phoneNumber: string) => {
    setOnboardingData((prev) => ({ ...prev, phoneNumber }));
  };

  const handleVoiceSaved = (voiceSignature: string) => {
    setOnboardingData((prev) => ({ ...prev, voiceSignature }));
  };

  const handleBeneficiariesComplete = (beneficiaries: any[]) => {
    setOnboardingData((prev) => ({ ...prev, beneficiaries }));
  };

  const handleBeneficiariesChange = (beneficiaries: any[]) => {
    setOnboardingData((prev) => ({ ...prev, beneficiaries }));
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Save onboarding data to backend
          const response = await fetch(`${API_URL}/user/complete-onboarding`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              notificationConfig: onboardingData.notificationConfig,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to complete onboarding:', error);
            throw new Error(error.error || 'Failed to complete onboarding');
          }

          // Mark onboarding as complete in localStorage after successful backend save
          localStorage.setItem('onboardingCompleted', 'true');

          console.log('Onboarding completed successfully');

          // Force a page reload to refresh all user data and remove cached state
          window.location.reload();
          return;
        } catch (apiError) {
          console.error('Error completing onboarding:', apiError);
          // Don't proceed if backend save failed - user needs subscription activated
          alert('Failed to complete onboarding. Please try again.');
          return;
        }
      } else {
        console.error('No auth token found');
        alert('Authentication error. Please log in again.');
        return;
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const handleSkip = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Save onboarding data to backend (same as complete)
          const response = await fetch(`${API_URL}/user/complete-onboarding`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              notificationConfig: onboardingData.notificationConfig,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to complete onboarding:', error);
            throw new Error(error.error || 'Failed to complete onboarding');
          }

          // Mark onboarding as complete in localStorage after successful backend save
          localStorage.setItem('onboardingCompleted', 'true');

          console.log('Onboarding skipped and completed successfully');

          // Force a page reload to refresh all user data and remove cached state
          window.location.reload();
          return;
        } catch (apiError) {
          console.error('Error completing onboarding:', apiError);
          alert('Failed to complete onboarding. Please try again.');
          return;
        }
      } else {
        console.error('No auth token found');
        alert('Authentication error. Please log in again.');
        return;
      }
    } catch (error) {
      console.error('Onboarding skip error:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  const wizardSteps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Introduction',
      component: <WelcomeStep userName={userName} />,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Set alerts',
      component: (
        <NotificationStep
          onSave={handleNotificationSave}
          initialConfig={onboardingData.notificationConfig}
        />
      ),
      validate: () => {
        return !!onboardingData.notificationConfig;
      },
    },
    {
      id: 'phone',
      title: 'Phone',
      description: 'Verify number',
      component: <PhoneVerificationStep onVerified={handlePhoneVerified} />,
      allowStepSkip: true, // Optional - can skip phone verification
    },
    {
      id: 'voice',
      title: 'Voice',
      description: 'Record signature',
      component: <VoiceSignatureStep onSaved={handleVoiceSaved} />,
      allowStepSkip: true, // Optional - can skip voice signature
    },
    {
      id: 'beneficiaries',
      title: 'Beneficiaries',
      description: 'Add contacts',
      component: (
        <BeneficiaryStep
          onComplete={handleBeneficiariesComplete}
          onChange={handleBeneficiariesChange}
        />
      ),
      allowStepSkip: true, // Allow skipping this step
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('accountType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('onboardingCompleted');
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628] py-12">
      {/* Top bar with logout */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/90 backdrop-blur-md border-b border-[#C0C8D4]/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L8 12V22C8 31 14 39 24 44C34 39 40 31 40 22V12L24 4Z" stroke="#C0C8D4" strokeWidth="2" fill="none"/>
              <path d="M12 24H18L21 18L24 30L27 20L30 24H36" stroke="#3DA288" strokeWidth="2" fill="none"/>
            </svg>
            <span className="text-xl font-bold text-[#C0C8D4]">EternLink</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-[#8b96a8] hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Exit & Logout
          </button>
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-16"></div>
      
      <WizardContainer
        steps={wizardSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={handleComplete}
        onSkip={handleSkip}
        allowSkip={true}
        showProgress={true}
        completeButtonText="Complete Setup & Go to Dashboard"
        nextButtonText="Continue"
        backButtonText="Back"
        skipButtonText="Skip & Complete Later"
      />
    </div>
  );
};
