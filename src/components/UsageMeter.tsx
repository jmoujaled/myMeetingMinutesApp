'use client';

import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface UsageMeterProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export default function UsageMeter({ 
  showDetails = false, 
  compact = false, 
  className = '' 
}: UsageMeterProps) {
  const { user, userProfile } = useAuth();
  const { usageStats, loading, error, usagePercentage } = useUsageTracking({
    autoRefresh: true,
    refreshInterval: 60000 // Refresh every minute
  });

  if (!user || !userProfile || loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (error || !usageStats) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Usage unavailable
      </div>
    );
  }

  const { currentMonth } = usageStats;
  const isUnlimited = currentMonth.transcriptionsLimit === -1;
  const isNearLimit = usagePercentage >= 80;
  const isOverLimit = usagePercentage >= 100;

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isOverLimit 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}
            style={{ 
              width: isUnlimited ? '0%' : `${Math.min(usagePercentage, 100)}%` 
            }}
          />
        </div>
        <span className="text-sm text-gray-600 min-w-0">
          {isUnlimited 
            ? `${currentMonth.transcriptionsUsed} used`
            : `${currentMonth.transcriptionsUsed}/${currentMonth.transcriptionsLimit}`
          }
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">
          Monthly Usage
        </h3>
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

      <div className="space-y-3">
        {/* Usage Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Transcriptions</span>
            <span>
              {isUnlimited 
                ? `${currentMonth.transcriptionsUsed} used`
                : `${currentMonth.transcriptionsUsed} / ${currentMonth.transcriptionsLimit}`
              }
            </span>
          </div>
          {!isUnlimited && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isOverLimit 
                    ? 'bg-red-500' 
                    : isNearLimit 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Usage Warning */}
        {isOverLimit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Usage limit exceeded
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    You&apos;ve reached your monthly limit. 
                    <Link href="/upgrade" className="font-medium underline hover:text-red-600 ml-1">
                      Upgrade your plan
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isNearLimit && !isOverLimit && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Approaching limit
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You&apos;re using {Math.round(usagePercentage)}% of your monthly allowance.
                    <Link href="/upgrade" className="font-medium underline hover:text-yellow-600 ml-1">
                      Consider upgrading
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Details */}
        {showDetails && (
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Total Duration:</span>
              <span>{Math.round(currentMonth.totalDurationMinutes)} min</span>
            </div>
            <div className="flex justify-between">
              <span>Total File Size:</span>
              <span>{Math.round(currentMonth.totalFileSizeMB)} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Resets:</span>
              <span>{new Date(usageStats.resetDate).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}