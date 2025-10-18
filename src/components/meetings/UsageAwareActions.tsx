'use client';

import React, { useState } from 'react';
import { useUsageRestrictions } from './UsageAnalytics';
import UpgradePrompt from '@/components/UpgradePrompt';

interface UsageAwareActionProps {
  action: 'transcribe' | 'export' | 'premium_feature';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
}

export function UsageAwareAction({
  action,
  children,
  className = '',
  disabled = false,
  onClick,
  showTooltip = true,
}: UsageAwareActionProps) {
  const { 
    canCreateTranscription, 
    canExportFiles, 
    canAccessPremiumFeatures, 
    restrictionReason,
    checkUsageLimit 
  } = useUsageRestrictions();
  
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const getRestrictionStatus = () => {
    switch (action) {
      case 'transcribe':
        return { canProceed: canCreateTranscription, reason: restrictionReason };
      case 'export':
        return { canProceed: canExportFiles, reason: undefined };
      case 'premium_feature':
        return { canProceed: canAccessPremiumFeatures, reason: restrictionReason };
      default:
        return { canProceed: true, reason: undefined };
    }
  };

  const handleClick = async () => {
    if (disabled) return;

    const { canProceed } = getRestrictionStatus();
    
    if (!canProceed) {
      // For transcription limits, show upgrade prompt
      if (action === 'transcribe') {
        setShowUpgradePrompt(true);
        return;
      }
      
      // For other restrictions, check usage limit dynamically
      setIsChecking(true);
      try {
        const result = await checkUsageLimit(action);
        if (!result.canProceed) {
          setShowUpgradePrompt(true);
          return;
        }
      } catch (error) {
        console.error('Error checking usage limit:', error);
      } finally {
        setIsChecking(false);
      }
    }

    // Proceed with the action
    if (onClick) {
      onClick();
    }
  };

  const { canProceed, reason } = getRestrictionStatus();
  const isDisabled = disabled || !canProceed || isChecking;

  return (
    <>
      <div className="relative group">
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`${className} ${
            isDisabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:opacity-90 cursor-pointer'
          } transition-opacity`}
        >
          {isChecking ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Checking...</span>
            </div>
          ) : (
            children
          )}
        </button>

        {/* Tooltip for restrictions */}
        {showTooltip && !canProceed && reason && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {reason}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          show={true}
          onClose={() => setShowUpgradePrompt(false)}
          requiredTier="pro"
          reason={reason || 'Upgrade to access this feature'}
        />
      )}
    </>
  );
}

interface UsageRestrictedFeatureProps {
  requiredTier?: 'pro' | 'admin';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function UsageRestrictedFeature({
  requiredTier = 'pro',
  children,
  fallback,
  className = '',
}: UsageRestrictedFeatureProps) {
  const { canAccessPremiumFeatures } = useUsageRestrictions();

  if (!canAccessPremiumFeatures) {
    return fallback ? (
      <div className={className}>{fallback}</div>
    ) : (
      <div className={`${className} opacity-50 pointer-events-none`}>
        {children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

// Usage warning banner component
export function UsageWarningBanner() {
  const { 
    canCreateTranscription, 
    restrictionReason 
  } = useUsageRestrictions();
  
  const [dismissed, setDismissed] = useState(false);

  if (canCreateTranscription || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            {restrictionReason || 'Some features may be limited due to usage restrictions.'}
          </p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={() => setDismissed(true)}
              className="inline-flex bg-yellow-50 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}