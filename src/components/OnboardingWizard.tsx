/**
 * OnboardingWizard Component
 *
 * Main onboarding wizard that guides new users through account setup.
 * Enforced after email verification, before accessing the dashboard.
 */

import React, { useState } from 'react';
import { WizardContainer, WizardStep } from './shared/WizardContainer';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { NotificationStep, NotificationConfig } from './onboarding/NotificationStep';
import { PhoneVerificationStep } from './onboarding/PhoneVerificationStep';
import { VoiceSignatureStep } from './onboarding/VoiceSignatureStep';
import { BeneficiaryStep } from './onboarding/BeneficiaryStep';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
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
  onComplete,
  onSkip,
  userName,
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
          const response = await fetch('http://localhost:3001/api/account/complete-onboarding', {
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
          const response = await fetch('http://localhost:3001/api/account/complete-onboarding', {
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
      validate: () => {
        if (!onboardingData.phoneNumber) {
          throw new Error('Please verify your phone number before continuing');
        }
        return true;
      },
    },
    {
      id: 'voice',
      title: 'Voice',
      description: 'Record signature',
      component: <VoiceSignatureStep onSaved={handleVoiceSaved} />,
      validate: () => {
        if (!onboardingData.voiceSignature) {
          throw new Error('Please record your voice signature before continuing');
        }
        return true;
      },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628] py-12">
      <WizardContainer
        steps={wizardSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={handleComplete}
        onSkip={handleSkip}
        allowSkip={false}
        showProgress={true}
        completeButtonText="Complete Setup & Go to Dashboard"
        nextButtonText="Continue"
        backButtonText="Back"
        skipButtonText="Skip for now"
      />
    </div>
  );
};
