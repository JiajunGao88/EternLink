/**
 * Timeline Component
 *
 * Vertical timeline for displaying chronological events.
 * Used in death claim verification flow and notification history.
 */

import React from 'react';
import { motion } from 'framer-motion';

export type TimelineEventStatus = 'completed' | 'current' | 'pending' | 'failed';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp?: Date | string;
  status: TimelineEventStatus;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface TimelineProps {
  events: TimelineEvent[];
  variant?: 'default' | 'compact';
}

export const Timeline: React.FC<TimelineProps> = ({ events, variant = 'default' }) => {
  const getStatusColor = (status: TimelineEventStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-[#10b981]';
      case 'current':
        return 'bg-[#C0C8D4]';
      case 'pending':
        return 'bg-gray-400/30';
      case 'failed':
        return 'bg-[#ef4444]';
      default:
        return 'bg-gray-400/30';
    }
  };

  const getStatusIcon = (event: TimelineEvent) => {
    if (event.icon) return event.icon;

    switch (event.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'current':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp?: Date | string) => {
    if (!timestamp) return null;
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="relative">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const statusColor = getStatusColor(event.status);

        return (
          <motion.div
            key={event.id}
            className="relative pb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Connecting Line */}
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-white/10" />
            )}

            <div className="flex items-start gap-4">
              {/* Icon Circle */}
              <motion.div
                className={`
                  relative flex items-center justify-center w-10 h-10 rounded-full
                  ${statusColor}
                  ${event.status === 'current' ? 'ring-4 ring-[#C0C8D4]/30' : ''}
                `}
                whileHover={{ scale: 1.1 }}
              >
                {getStatusIcon(event)}

                {/* Pulse effect for current events */}
                {event.status === 'current' && (
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

              {/* Event Content */}
              <div className="flex-1 pb-4">
                <div className={`
                  p-4 rounded-lg backdrop-blur-sm
                  ${event.status === 'current' ? 'bg-white/10 border border-[#C0C8D4]/30' : 'bg-white/5'}
                  ${variant === 'compact' ? 'py-2' : 'py-4'}
                `}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className={`
                        font-semibold
                        ${event.status === 'completed' ? 'text-[#10b981]' :
                          event.status === 'current' ? 'text-[#C0C8D4]' :
                          event.status === 'failed' ? 'text-[#ef4444]' : 'text-gray-400'}
                        ${variant === 'compact' ? 'text-sm' : 'text-base'}
                      `}>
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className={`
                          text-gray-400 mt-1
                          ${variant === 'compact' ? 'text-xs' : 'text-sm'}
                        `}>
                          {event.description}
                        </p>
                      )}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {event.timestamp && (
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
