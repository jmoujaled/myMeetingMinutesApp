'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { clientUsageService, UsageStats, TranscriptionJob } from '@/lib/usage-client';
import AuthTransition from '@/components/ui/AuthTransition';
import styles from './home.module.css';

// Lazy load the HomepageLayout component for better performance
const HomepageLayout = lazy(() => 
  import('@/components/homepage').then(module => ({ default: module.HomepageLayout }))
);

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="loading-skeleton w-64 h-8 mx-auto mb-4 rounded"></div>
        <div className="loading-skeleton w-48 h-4 mx-auto rounded"></div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, userProfile, loading } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<TranscriptionJob[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [authStateResolved, setAuthStateResolved] = useState(false);

  useEffect(() => {
    // Mark auth state as resolved when loading is complete
    if (!loading) {
      setAuthStateResolved(true);
    }
  }, [loading]);

  useEffect(() => {
    if (user && !loading && authStateResolved) {
      // Only load data if we have a user profile, otherwise show basic authenticated view
      if (userProfile) {
        setLoadingData(true);
        Promise.all([
          clientUsageService.getCurrentUsage(user.id),
          clientUsageService.getRecentTranscriptions(user.id, 3)
        ]).then(([usage, transcriptions]) => {
          setUsageStats(usage);
          setRecentTranscriptions(transcriptions);
        }).catch(error => {
          console.error('Error loading user data:', error);
          // Don't show error to user, just log it
        }).finally(() => {
          setLoadingData(false);
        });
      } else {
        // User exists but no profile yet - show basic view
        setLoadingData(false);
      }
    }
  }, [user, userProfile, loading, authStateResolved]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTierFeatures = (tier: string) => {
    switch (tier) {
      case 'pro':
        return ['Unlimited transcriptions', 'Speaker diarization', 'Meeting summaries', 'Multiple languages'];
      case 'admin':
        return ['All Pro features', 'User management', 'System analytics', 'Priority support'];
      default:
        return ['10 transcriptions/month', 'Basic features', 'Standard support'];
    }
  };

  // Show loading state while auth is resolving
  if (loading || !authStateResolved) {
    return <LoadingSkeleton />;
  }

  // Show authenticated user dashboard
  if (user) {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <HomepageLayout isAuthenticated={true}>
        <div className={styles.wrapper}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Welcome back, {userProfile?.full_name || user.email?.split('@')[0]}!</h1>
          <p className={styles.subtitle}>
            Ready to transcribe your next meeting? Access your transcription studio or check your recent activity below.
          </p>

          <div className={styles.ctas}>
            <Link href="/studio2" className={`${styles.primaryCta} touch-button`}>
              Start Transcribing
            </Link>
            <Link href="/dashboard" className={`${styles.primaryCta} ${styles.secondaryCta} touch-button`}>
              View Dashboard
            </Link>
          </div>
        </section>

        {!userProfile ? (
          <section className={styles.features}>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Setting up your account...</p>
              <p className="mt-2 text-sm text-gray-500">This may take a moment for new accounts</p>
            </div>
          </section>
        ) : loadingData ? (
          <section className={styles.features}>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your data...</p>
            </div>
          </section>
        ) : (
          <>
            {/* Usage Stats */}
            {usageStats && (
              <section className={styles.features}>
                <div className={styles.feature}>
                  <div className={styles.featureIcon} aria-hidden="true">📊</div>
                  <h3 className={styles.featureTitle}>Usage This Month</h3>
                  <p className={styles.featureText}>
                    {usageStats.currentMonth.transcriptionsUsed} of{' '}
                    {usageStats.currentMonth.transcriptionsLimit === -1 
                      ? '∞' 
                      : usageStats.currentMonth.transcriptionsLimit} transcriptions used
                  </p>
                  {usageStats.isLimitExceeded && (
                    <Link href="/upgrade" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                      Upgrade to continue →
                    </Link>
                  )}
                </div>

                <div className={styles.feature}>
                  <div className={styles.featureIcon} aria-hidden="true">⭐</div>
                  <h3 className={styles.featureTitle}>Your Plan</h3>
                  <p className={styles.featureText}>
                    {userProfile ? 
                      `${userProfile.tier.charAt(0).toUpperCase() + userProfile.tier.slice(1)} Plan` :
                      'Setting up your account...'
                    }
                  </p>
                  {userProfile?.tier === 'free' && (
                    <Link href="/upgrade" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                      Upgrade for more features →
                    </Link>
                  )}
                </div>

                <div className={styles.feature}>
                  <div className={styles.featureIcon} aria-hidden="true">🎯</div>
                  <h3 className={styles.featureTitle}>Quick Actions</h3>
                  <div className="space-y-2">
                    <Link href="/studio2" className="block text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                      New Transcription →
                    </Link>
                    <Link href="/profile" className="block text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                      Account Settings →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Recent Transcriptions */}
            {recentTranscriptions.length > 0 && (
              <section className="mobile-container mobile-section-padding">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Recent Transcriptions</h2>
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {recentTranscriptions.map((job) => (
                      <li key={job.id} className="mobile-padding py-3 sm:py-4 hover:bg-gray-50 touch-card">
                        <div className="mobile-flex items-start sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="mobile-text font-medium text-gray-900 truncate">
                              {job.filename}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                              {formatDate(job.created_at)} • {job.status}
                              {job.duration_seconds && (
                                <span> • {Math.round(job.duration_seconds / 60)}min</span>
                              )}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              job.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : job.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-gray-50 mobile-padding py-3">
                    <Link
                      href="/dashboard"
                      className="mobile-text font-medium text-indigo-600 hover:text-indigo-500 touch-button"
                    >
                      View all transcriptions →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Tier-specific features */}
            {userProfile && (
              <section className={styles.features}>
                <div className={styles.feature}>
                  <div className={styles.featureIcon} aria-hidden="true">✨</div>
                  <h3 className={styles.featureTitle}>Your Features</h3>
                  <ul className={styles.featureText}>
                    {getTierFeatures(userProfile.tier).map((feature, index) => (
                      <li key={index} className="text-sm">• {feature}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
        </div>
      </HomepageLayout>
      </Suspense>
    );
  }

  // Show public landing page for non-authenticated users
  return (
    <AuthTransition fallback={<LoadingSkeleton />}>
      <Suspense fallback={<LoadingSkeleton />}>
        <HomepageLayout isAuthenticated={false} />
      </Suspense>
    </AuthTransition>
  );
}
