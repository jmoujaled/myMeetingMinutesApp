'use client';

import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface LiveUsageMeterProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
  showLiveIndicator?: boolean;
}

export default function LiveUsageMeter({ 
  showDetails = false, 
  compact = false, 
  className = '',
  showLiveIndicator = true
}: LiveUsageMeterProps) {
  const { user, userProfile } = useAuth();
  const { usageStats, loading, error, usagePercentage, recentJobs } = useUsageTracking({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableRealtime: true // Enable real-time updates
  });

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);

  // Update timestamp when usage stats change
  useEffect(() => {
    if (usageStats) {
      setLastUpdate(new Date());
      setIsLive(true);
      
      // Show live indicator briefly
      const timer = setTimeout(() => setIsLive(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [usageStats]);

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

  // Check for recent processing jobs
  const processingJobs = recentJobs.filter(job => job.status === 'processing');
  const hasProcessingJobs = processingJobs.length > 0;

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLiveIndicator && (
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isLive ? 'bg-green-500' : hasProcessingJobs ? 'bg-yellow-500' : 'bg-gray-300'
            }`} />
          </div>
        )}
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
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">
            Monthly Usage
          </h3>
          {showLiveIndicator && (
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                isLive ? 'bg-green-500' : hasProcessingJobs ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
              <span className="text-xs text-gray-500">
                {isLive ? 'Live' : hasProcessingJobs ? 'Processing' : 'Idle'}
              </span>
            </div>
          )}
        </div>
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
        {/* Processing Jobs Alert */}
        {hasProcessingJobs && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-sm text-blue-700">
                  {processingJobs.length} transcription{processingJobs.length > 1 ? 's' : ''} processing...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transcription Usage Progress Bar */}
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

        {/* Duration Usage Progress Bar (for free tier) */}
        {userProfile.tier === 'free' && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Duration</span>
              <span>
                {Math.round(currentMonth.totalDurationMinutes)} / 60 min
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentMonth.totalDurationMinutes >= 60
                    ? 'bg-red-500' 
                    : currentMonth.totalDurationMinutes >= 48 // 80% of 60
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((currentMonth.totalDurationMinutes / 60) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

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
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}