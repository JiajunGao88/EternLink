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

  const handleComplete = async () => {
    try {
      // Mark onboarding as complete in localStorage first
      localStorage.setItem('onboardingCompleted', 'true');

      // Try to save onboarding data to backend (optional)
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          await fetch('http://localhost:3001/api/account/complete-onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              onboardingCompleted: true,
              ...onboardingData,
            }),
          });
        } catch (apiError) {
          // Backend endpoint might not exist yet - that's okay
          console.warn('Could not save onboarding data to backend:', apiError);
        }
      }

      // Redirect to dashboard
      onComplete();
    } catch (error) {
      console.error('Onboarding completion error:', error);
      // Still proceed to dashboard
      localStorage.setItem('onboardingCompleted', 'true');
      onComplete();
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
      component: <BeneficiaryStep onComplete={handleBeneficiariesComplete} />,
      validate: () => {
        if (!onboardingData.beneficiaries || onboardingData.beneficiaries.length === 0) {
          throw new Error('Please add at least one beneficiary before completing setup');
        }
        return true;
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a2942] to-[#0a1628] py-12">
      <WizardContainer
        steps={wizardSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onComplete={handleComplete}
        allowSkip={false}
        showProgress={true}
        completeButtonText="Complete Setup & Go to Dashboard"
        nextButtonText="Continue"
        backButtonText="Back"
      />
    </div>
  );
};
