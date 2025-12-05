/**
 * WizardContainer Component
 *
 * Reusable container for multi-step wizards/forms.
 * Handles navigation, validation, and progress tracking.
 */

import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stepper, Step } from './Stepper';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  validate?: () => Promise<boolean> | boolean;
  onEnter?: () => void;
  onExit?: () => void;
  allowStepSkip?: boolean; // Allow skipping this specific step
}

interface WizardContainerProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  allowSkip?: boolean;
  showProgress?: boolean;
  completeButtonText?: string;
  nextButtonText?: string;
  backButtonText?: string;
  cancelButtonText?: string;
  skipButtonText?: string;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
  onCancel,
  allowSkip = false,
  showProgress = true,
  completeButtonText = 'Complete',
  nextButtonText = 'Next',
  backButtonText = 'Back',
  cancelButtonText = 'Cancel',
  skipButtonText = 'Skip for now',
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const handleNext = async () => {
    setValidationError(null);

    // Run validation if provided
    if (currentStepData.validate) {
      setIsValidating(true);
      try {
        const isValid = await currentStepData.validate();
        if (!isValid) {
          setValidationError('Please complete all required fields');
          setIsValidating(false);
          return;
        }
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : 'Validation failed');
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    // Call onExit hook
    if (currentStepData.onExit) {
      currentStepData.onExit();
    }

    // Move to next step or complete
    if (isLastStep) {
      onComplete();
    } else {
      const nextStep = currentStep + 1;
      onStepChange(nextStep);

      // Call onEnter hook for next step
      if (steps[nextStep]?.onEnter) {
        steps[nextStep].onEnter!();
      }
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setValidationError(null);

      // Call onExit hook
      if (currentStepData.onExit) {
        currentStepData.onExit();
      }

      const prevStep = currentStep - 1;
      onStepChange(prevStep);

      // Call onEnter hook for previous step
      if (steps[prevStep]?.onEnter) {
        steps[prevStep].onEnter!();
      }
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === currentStep) return;

    setValidationError(null);

    // Call onExit hook
    if (currentStepData.onExit) {
      currentStepData.onExit();
    }

    onStepChange(stepIndex);

    // Call onEnter hook for target step
    if (steps[stepIndex]?.onEnter) {
      steps[stepIndex].onEnter!();
    }
  };

  const handleSkip = () => {
    setValidationError(null);

    // Call onExit hook
    if (currentStepData.onExit) {
      currentStepData.onExit();
    }

    // Skip to next step or call onSkip handler if last step
    if (isLastStep) {
      if (onSkip) {
        onSkip();
      } else {
        onComplete();
      }
    } else {
      const nextStep = currentStep + 1;
      onStepChange(nextStep);

      // Call onEnter hook for next step
      if (steps[nextStep]?.onEnter) {
        steps[nextStep].onEnter!();
      }
    }
  };

  const stepperSteps: Step[] = steps.map((step) => ({
    id: step.id,
    title: step.title,
    description: step.description,
  }));

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      {/* Progress Stepper */}
      {showProgress && (
        <Stepper
          steps={stepperSteps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          allowSkip={allowSkip}
        />
      )}

      {/* Step Content */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepData.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStepData.component}
          </motion.div>
        </AnimatePresence>

        {/* Validation Error */}
        {validationError && (
          <motion.div
            className="mt-4 p-4 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[#ef4444] text-sm">{validationError}</p>
          </motion.div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
        <div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              {cancelButtonText}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <button
              onClick={handleBack}
              disabled={isValidating}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backButtonText}
            </button>
          )}

          {/* Show skip button if current step allows it */}
          {currentStepData.allowStepSkip && (
            <button
              onClick={handleSkip}
              disabled={isValidating}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {skipButtonText}
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isValidating}
            className="
              px-8 py-2 rounded-lg
              bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8]
              hover:opacity-90 transition-opacity
              text-white font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isValidating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Validating...
              </>
            ) : (
              <>
                {isLastStep ? completeButtonText : nextButtonText}
                {!isLastStep && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-6 text-center text-sm text-gray-400">
        Step {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
};
