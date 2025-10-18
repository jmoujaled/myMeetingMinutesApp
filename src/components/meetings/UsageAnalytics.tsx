'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetingsUsageAnalytics } from '@/hooks/useMeetingsUsageAnalytics';
import UpgradePrompt from '@/components/UpgradePrompt';

interface UsageAnalyticsProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export default function UsageAnalytics({ 
  className = '', 
  showDetails = true,
  compact = false 
}: UsageAnalyticsProps) {
  const { userProfile } = useAuth();
  const { 
    usageStats, 
    monthlyStats, 
    warnings, 
    restrictions, 
    loading, 
    error 
  } = useMeetingsUsageAnalytics();
  
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-white rounded-lg border p-4">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p>Unable to load usage analytics</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!usageStats || !userProfile) {
    return null;
  }

  const isUnlimited = usageStats.currentMonth.transcriptionsLimit === -1;

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Usage Progress */}
        <div className="flex items-center space-x-2 flex-1">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                warnings.isOverLimit 
                  ? 'bg-red-500' 
                  : warnings.isNearLimit 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
              }`}
              style={{ 
                width: isUnlimited ? '0%' : `${Math.min(monthlyStats.usagePercentage, 100)}%` 
              }}
            />
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {isUnlimited 
              ? `${monthlyStats.thisMonthTranscriptions} used`
              : `${monthlyStats.thisMonthTranscriptions}/${usageStats.currentMonth.transcriptionsLimit}`
            }
          </span>
        </div>

        {/* Tier Badge */}
        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
          userProfile.tier === 'admin' 
            ? 'bg-purple-100 text-purple-800'
            : userProfile.tier === 'pro'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {userProfile.tier.toUpperCase()}
        </span>

        {/* Warning Indicator */}
        {warnings.shouldShowUpgrade && (
          <button
            onClick={() => setShowUpgradePrompt(true)}
            className="text-yellow-600 hover:text-yellow-700"
            title="Usage warning - click to upgrade"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Usage Overview Card */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Monthly Usage</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${
            userProfile.tier === 'admin' 
              ? 'bg-purple-100 text-purple-800'
              : userProfile.tier === 'pro'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {userProfile.tier.toUpperCase()}
          </span>
        </div>

        {/* Usage Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Transcriptions</span>
            <span>
              {isUnlimited 
                ? `${monthlyStats.thisMonthTranscriptions} used`
                : `${monthlyStats.thisMonthTranscriptions} / ${usageStats.currentMonth.transcriptionsLimit}`
              }
            </span>
          </div>
          {!isUnlimited && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  warnings.isOverLimit 
                    ? 'bg-red-500' 
                    : warnings.isNearLimit 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(monthlyStats.usagePercentage, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Additional Stats */}
        {showDetails && (
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Hours this month:</span>
              <span className="ml-2 font-medium">{monthlyStats.thisMonthHours}h</span>
            </div>
            <div>
              <span className="text-gray-500">Resets:</span>
              <span className="ml-2 font-medium">
                {new Date(usageStats.resetDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Usage Warning */}
      {warnings.isOverLimit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Usage limit exceeded
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{warnings.warningMessage}</p>
                {restrictions.restrictionReason && (
                  <p className="mt-1">{restrictions.restrictionReason}</p>
                )}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Warning - Near Limit */}
      {warnings.isNearLimit && !warnings.isOverLimit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Approaching limit
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{warnings.warningMessage}</p>
              </div>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Consider Upgrading
                </button>
                <Link
                  href="/studio2"
                  className="text-yellow-700 hover:text-yellow-600 text-sm font-medium"
                >
                  Continue Transcribing
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Restrictions Notice */}
      {!restrictions.canCreateTranscription && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0V9a2 2 0 00-2-2 2 2 0 00-2-2H8a2 2 0 00-2 2 2 2 0 00-2 2v2m8 0h2a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h2" />
            </svg>
            <div>
              <p className="text-sm text-gray-700">
                New transcriptions are temporarily unavailable due to usage limits.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You can still view, search, and export your existing content.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          show={true}
          onClose={() => setShowUpgradePrompt(false)}
          requiredTier="pro"
          reason={warnings.warningMessage}
        />
      )}
    </div>
  );
}

// Export a hook for checking usage restrictions in other components
export function useUsageRestrictions() {
  const { restrictions, checkUsageLimit } = useMeetingsUsageAnalytics();
  
  return {
    ...restrictions,
    checkUsageLimit,
  };
}