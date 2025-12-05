/**
 * OnboardingWizard Component
 *
 * Main onboarding wizard that guides new users through account setup.
 * Enforced after email verification, before accessing the dashboard.
 */

import React, { useState, useEffect } from 'react';
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

// Step completion status
interface StepStatus {
  welcome: 'completed' | 'skipped' | 'pending';
  notifications: 'completed' | 'skipped' | 'pending';
  phone: 'completed' | 'skipped' | 'pending';
  voice: 'completed' | 'skipped' | 'pending';
  beneficiaries: 'completed' | 'skipped' | 'pending';
}

const ONBOARDING_PROGRESS_KEY = 'eternlink_onboarding_progress';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userName,
  onLogout,
  // onComplete and onSkip are intentionally not destructured as we use window.location.reload() instead
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    welcome: 'pending',
    notifications: 'pending',
    phone: 'pending',
    voice: 'pending',
    beneficiaries: 'pending',
  });

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (savedProgress) {
      try {
        const { stepStatus: savedStatus, currentStep: savedStep } = JSON.parse(savedProgress);
        if (savedStatus) setStepStatus(savedStatus);
        if (savedStep !== undefined) setCurrentStep(savedStep);
      } catch (e) {
        console.error('Failed to load onboarding progress:', e);
      }
    }
  }, []);

  // Save progress whenever step status changes
  const saveProgress = (newStatus: StepStatus, newStep: number) => {
    localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify({
      stepStatus: newStatus,
      currentStep: newStep,
    }));
  };

  // Mark current step as completed and advance
  const markStepCompleted = (stepId: keyof StepStatus) => {
    const newStatus = { ...stepStatus, [stepId]: 'completed' as const };
    setStepStatus(newStatus);
    saveProgress(newStatus, currentStep);
  };

  // Mark current step as skipped and advance
  const markStepSkipped = (stepId: keyof StepStatus) => {
    const newStatus = { ...stepStatus, [stepId]: 'skipped' as const };
    setStepStatus(newStatus);
    saveProgress(newStatus, currentStep);
  };

  const handleNotificationSave = (config: NotificationConfig) => {
    setOnboardingData((prev) => ({ ...prev, notificationConfig: config }));
    markStepCompleted('notifications');
  };

  const handlePhoneVerified = (phoneNumber: string) => {
    setOnboardingData((prev) => ({ ...prev, phoneNumber }));
    markStepCompleted('phone');
  };

  const handleVoiceSaved = (voiceSignature: string) => {
    setOnboardingData((prev) => ({ ...prev, voiceSignature }));
    markStepCompleted('voice');
  };

  const handleBeneficiariesComplete = (beneficiaries: any[]) => {
    setOnboardingData((prev) => ({ ...prev, beneficiaries }));
    markStepCompleted('beneficiaries');
  };

  const handleBeneficiariesChange = (beneficiaries: any[]) => {
    setOnboardingData((prev) => ({ ...prev, beneficiaries }));
  };

  // Handle step change - mark Welcome as completed when moving past it
  const handleStepChange = (newStep: number) => {
    // Mark welcome step completed when moving past step 0
    if (currentStep === 0 && newStep > 0) {
      markStepCompleted('welcome');
    }
    setCurrentStep(newStep);
    saveProgress(stepStatus, newStep);
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Calculate which steps were completed vs skipped
          const completedSteps = Object.entries(stepStatus)
            .filter(([_, status]) => status === 'completed')
            .map(([step]) => step);
          const skippedSteps = Object.entries(stepStatus)
            .filter(([_, status]) => status === 'skipped' || status === 'pending')
            .map(([step]) => step);

          // Save onboarding data to backend
          const response = await fetch(`${API_URL}/user/complete-onboarding`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              notificationConfig: onboardingData.notificationConfig,
              completedSteps,
              skippedSteps,
              phoneVerified: stepStatus.phone === 'completed',
              voiceRecorded: stepStatus.voice === 'completed',
              beneficiariesAdded: stepStatus.beneficiaries === 'completed',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to complete onboarding:', error);
            throw new Error(error.error || 'Failed to complete onboarding');
          }

          // Mark onboarding as complete in localStorage
          localStorage.setItem('onboardingCompleted', 'true');
          // Save step status for dashboard to show incomplete items
          localStorage.setItem('onboardingStepStatus', JSON.stringify(stepStatus));
          // Clear progress tracker
          localStorage.removeItem(ONBOARDING_PROGRESS_KEY);

          console.log('Onboarding completed successfully', { completedSteps, skippedSteps });

          // Force a page reload to refresh all user data
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
      console.error('Onboarding completion error:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  // Skip current step and move to next
  const handleSkipStep = () => {
    const stepIds: (keyof StepStatus)[] = ['welcome', 'notifications', 'phone', 'voice', 'beneficiaries'];
    const currentStepId = stepIds[currentStep];
    
    if (currentStepId) {
      markStepSkipped(currentStepId);
    }
    
    // Move to next step
    if (currentStep < wizardSteps.length - 1) {
      handleStepChange(currentStep + 1);
    }
  };

  const handleSkip = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Mark remaining steps as skipped
          const stepIds: (keyof StepStatus)[] = ['welcome', 'notifications', 'phone', 'voice', 'beneficiaries'];
          const finalStatus = { ...stepStatus };
          stepIds.forEach((stepId, idx) => {
            if (idx >= currentStep && finalStatus[stepId] === 'pending') {
              finalStatus[stepId] = 'skipped';
            }
          });

          const completedSteps = Object.entries(finalStatus)
            .filter(([_, status]) => status === 'completed')
            .map(([step]) => step);
          const skippedSteps = Object.entries(finalStatus)
            .filter(([_, status]) => status === 'skipped')
            .map(([step]) => step);

          // Save onboarding data to backend
          const response = await fetch(`${API_URL}/user/complete-onboarding`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              notificationConfig: onboardingData.notificationConfig,
              completedSteps,
              skippedSteps,
              phoneVerified: finalStatus.phone === 'completed',
              voiceRecorded: finalStatus.voice === 'completed',
              beneficiariesAdded: finalStatus.beneficiaries === 'completed',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to complete onboarding:', error);
            throw new Error(error.error || 'Failed to complete onboarding');
          }

          // Mark onboarding as complete in localStorage
          localStorage.setItem('onboardingCompleted', 'true');
          localStorage.setItem('onboardingStepStatus', JSON.stringify(finalStatus));
          localStorage.removeItem(ONBOARDING_PROGRESS_KEY);

          console.log('Onboarding skipped', { completedSteps, skippedSteps });

          // Force a page reload
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
      description: stepStatus.welcome === 'completed' ? '✓ Done' : 'Introduction',
      component: <WelcomeStep userName={userName} />,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: stepStatus.notifications === 'completed' ? '✓ Configured' : 'Set alerts',
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
      description: stepStatus.phone === 'completed' ? '✓ Verified' : stepStatus.phone === 'skipped' ? '— Skipped' : 'Verify number',
      component: <PhoneVerificationStep onVerified={handlePhoneVerified} />,
      allowStepSkip: true,
    },
    {
      id: 'voice',
      title: 'Voice',
      description: stepStatus.voice === 'completed' ? '✓ Recorded' : stepStatus.voice === 'skipped' ? '— Skipped' : 'Record signature',
      component: <VoiceSignatureStep onSaved={handleVoiceSaved} />,
      allowStepSkip: true,
    },
    {
      id: 'beneficiaries',
      title: 'Beneficiaries',
      description: stepStatus.beneficiaries === 'completed' ? '✓ Added' : stepStatus.beneficiaries === 'skipped' ? '— Skipped' : 'Add contacts',
      component: (
        <BeneficiaryStep
          onComplete={handleBeneficiariesComplete}
          onChange={handleBeneficiariesChange}
        />
      ),
      allowStepSkip: true,
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
      
      {/* Progress Summary */}
      <div className="max-w-4xl mx-auto px-6 mb-4">
        <div className="flex items-center justify-center gap-2 text-sm text-[#8b96a8]">
          <span className="text-green-400">✓ {Object.values(stepStatus).filter(s => s === 'completed').length} completed</span>
          <span>·</span>
          <span className="text-yellow-400">— {Object.values(stepStatus).filter(s => s === 'skipped').length} skipped</span>
          <span>·</span>
          <span>{Object.values(stepStatus).filter(s => s === 'pending').length} remaining</span>
        </div>
      </div>

      <WizardContainer
        steps={wizardSteps}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onSkipStep={handleSkipStep}
        allowSkip={true}
        showProgress={true}
        completeButtonText="Complete Setup & Go to Dashboard"
        nextButtonText={stepStatus[(['welcome', 'notifications', 'phone', 'voice', 'beneficiaries'] as const)[currentStep]] === 'completed' ? 'Continue' : 'Mark Complete & Continue'}
        backButtonText="Back"
        skipButtonText="Skip & Finish Setup"
        skipStepButtonText="Skip This Step"
      />
    </div>
  );
};
