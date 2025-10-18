'use client';

import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useAuth } from '@/contexts/AuthContext';
import LiveUsageMeter from './LiveUsageMeter';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface UsageDashboardProps {
  className?: string;
}

export default function UsageDashboard({ className = '' }: UsageDashboardProps) {
  const { user, userProfile } = useAuth();
  const { 
    usageStats, 
    recentJobs, 
    monthlyAnalytics, 
    loading, 
    error, 
    usagePercentage,
    getTranscriptionHistory 
  } = useUsageTracking({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableRealtime: true
  });



  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    if (!user?.id) return;
    
    setHistoryLoading(true);
    try {
      const history = await getTranscriptionHistory({ limit: 20 });
      setHistoryData(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Debug logging
  console.log('UsageDashboard render state:', {
    user: !!user,
    userProfile: !!userProfile,
    loading,
    error,
    usageStats: !!usageStats,
    recentJobs: recentJobs?.length || 0
  });

  // Force show content after 5 seconds to prevent infinite loading
  const [forceShow, setForceShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!user || !userProfile) {
    if (!forceShow) {
      return (
        <div className={`animate-pulse space-y-4 ${className}`}>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="text-center text-sm text-gray-500 mt-4">
            Loading user data...
          </div>
        </div>
      );
    }
  }

  if (loading && !forceShow) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
        <div className="text-center text-sm text-gray-500 mt-4">
          Loading usage data...
        </div>
      </div>
    );
  }

  if (error && !forceShow) {
    return (
      <div className={`text-red-500 text-center p-8 ${className}`}>
        <p>Unable to load usage dashboard</p>
        <p className="text-sm text-gray-500 mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  const safeRecentJobs = recentJobs || [];
  const processingJobs = safeRecentJobs.filter(job => job.status === 'processing');
  const completedJobs = safeRecentJobs.filter(job => job.status === 'completed');
  const failedJobs = safeRecentJobs.filter(job => job.status === 'failed');

  // Ensure we have default values
  const safeUsageStats = usageStats || {
    currentMonth: {
      transcriptionsUsed: 0,
      transcriptionsLimit: userProfile?.tier === 'free' ? 10 : -1, // Updated to 10 for free tier
      totalDurationMinutes: 0,
      totalFileSizeMB: 0
    },
    tier: userProfile?.tier || 'free',
    resetDate: new Date().toISOString(),
    isLimitExceeded: false
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Live Usage Meter */}
      <LiveUsageMeter 
        showDetails={true} 
        showLiveIndicator={true}
        className="w-full"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {safeUsageStats.currentMonth.transcriptionsUsed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {completedJobs.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className={`h-8 w-8 ${processingJobs.length > 0 ? 'text-yellow-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Processing</p>
              <p className="text-2xl font-semibold text-gray-900">
                {processingJobs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {historyLoading ? 'Loading...' : 'View All'}
            </button>
          </div>

          {safeRecentJobs.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transcriptions yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by uploading an audio file.</p>
              <div className="mt-6">
                <Link
                  href="/studio2"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Start Transcribing
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {safeRecentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      job.status === 'completed' ? 'bg-green-500' :
                      job.status === 'processing' ? 'bg-yellow-500' :
                      job.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {job.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      job.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                    {job.duration_seconds && (
                      <span className="text-xs text-gray-500">
                        {Math.round(job.duration_seconds / 60)}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Analytics */}
      {monthlyAnalytics && monthlyAnalytics.dailyUsage.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Overview</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {Object.values(monthlyAnalytics.statusBreakdown).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Jobs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(monthlyAnalytics.averageDuration / 60)}m
                </p>
                <p className="text-sm text-gray-500">Avg Duration</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(monthlyAnalytics.averageFileSize / (1024 * 1024))}MB
                </p>
                <p className="text-sm text-gray-500">Avg File Size</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {monthlyAnalytics.statusBreakdown.completed || 0}
                </p>
                <p className="text-sm text-gray-500">Success Rate</p>
              </div>
            </div>

            {/* Simple daily usage chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Daily Usage</h4>
              <div className="flex items-end space-x-1 h-20">
                {monthlyAnalytics.dailyUsage.slice(-14).map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ 
                        height: `${Math.max((day.count / Math.max(...monthlyAnalytics.dailyUsage.map(d => d.count))) * 100, 5)}%` 
                      }}
                    />
                    <span className="text-xs text-gray-500 mt-1">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && historyData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Transcription History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {historyData.jobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      job.status === 'completed' ? 'bg-green-500' :
                      job.status === 'processing' ? 'bg-yellow-500' :
                      job.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.filename}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    job.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {historyData.jobs.length} of {historyData.totalCount} total jobs
            </div>
          </div>
        </div>
      )}
    </div>
  );
}