/**
 * Stepper Component
 *
 * A visual progress indicator for multi-step processes.
 * Used in onboarding, registration, and recovery flows.
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowSkip?: boolean;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowSkip = false,
}) => {
  const handleStepClick = (index: number) => {
    if (allowSkip && onStepClick) {
      onStepClick(index);
    } else if (onStepClick && index < currentStep) {
      // Only allow clicking on previous steps
      onStepClick(index);
    }
  };

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowSkip || index < currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full
                    transition-all duration-300
                    ${
                      isCompleted
                        ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white'
                        : isCurrent
                        ? 'bg-gradient-to-r from-[#C0C8D4] to-[#8b9da8] text-white'
                        : 'bg-white/10 backdrop-blur-sm text-gray-400'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                  `}
                  onClick={() => handleStepClick(index)}
                  whileHover={isClickable ? { scale: 1.1 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                >
                  {isCompleted ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-lg font-semibold">{index + 1}</span>
                  )}

                  {/* Pulse effect for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-[#C0C8D4]/30"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.div>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <p
                    className={`
                      text-sm font-medium transition-colors duration-300
                      ${
                        isCurrent
                          ? 'text-[#C0C8D4]'
                          : isCompleted
                          ? 'text-[#10b981]'
                          : 'text-gray-400'
                      }
                    `}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1 max-w-[120px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 h-0.5 bg-white/10 relative -mt-14">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#10b981] to-[#059669]"
                    initial={{ width: '0%' }}
                    animate={{
                      width: index < currentStep ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
