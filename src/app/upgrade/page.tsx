'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usageService, UsageStats } from '@/lib/usage-service'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { createClient } from '@/lib/supabase/client'

export default function UpgradePage() {
  return (
    <ProtectedRoute>
      <UpgradeContent />
    </ProtectedRoute>
  )
}

function UpgradeContent() {
  const searchParams = useSearchParams()
  const { user, userProfile, refreshProfile } = useAuth()
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const requiredTier = searchParams.get('required') || 'pro'
  const currentTier = searchParams.get('current') || userProfile?.tier || 'free'

  useEffect(() => {
    if (user) {
      loadUsageStats()
    }
  }, [user])

  const loadUsageStats = async () => {
    if (!user) return
    
    try {
      const stats = await usageService.getCurrentUsage(user.id)
      setUsageStats(stats)
    } catch (error) {
      console.error('Error loading usage stats:', error)
    }
  }

  const tierFeatures = {
    free: {
      name: 'Free',
      price: '$0/month',
      monthlyLimit: 10,
      maxFileSize: '25MB',
      maxDuration: '30 minutes',
      features: [
        '10 transcriptions per month',
        'Up to 25MB file size',
        'Up to 30 minutes duration',
        'Basic transcription',
        'Email support'
      ],
      limitations: [
        'Limited monthly usage',
        'File size restrictions',
        'Duration limits'
      ]
    },
    pro: {
      name: 'Pro',
      price: '$10/month',
      monthlyLimit: 100,
      maxFileSize: '100MB',
      maxDuration: '120 minutes',
      features: [
        '100 transcriptions per month',
        'Up to 100MB file size',
        'Up to 120 minutes duration',
        'Basic transcription',
        'Speaker diarization',
        'AI summaries',
        'Translations',
        'Priority support'
      ],
      limitations: []
    },
    admin: {
      name: 'Enterprise',
      price: 'Custom pricing',
      monthlyLimit: -1,
      maxFileSize: 'Unlimited',
      maxDuration: 'Unlimited',
      features: [
        'Everything in Pro',
        'User management & admin dashboard',
        'Team collaboration features',
        'Custom integrations',
        'SSO (Single Sign-On)',
        'Advanced security controls',
        'Dedicated account manager',
        'SLA guarantees',
        'Custom deployment options'
      ],
      limitations: []
    }
  }

  const handleTierChange = async (newTier: 'free' | 'pro' | 'admin') => {
    if (!user || !userProfile) return

    // Only admin users can change tiers for now (simulating admin interface)
    if (userProfile.tier !== 'admin') {
      setMessage({
        type: 'error',
        text: 'Tier changes are currently managed by administrators. Please contact support.'
      })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({
          tier: newTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      await refreshProfile()
      setMessage({
        type: 'success',
        text: `Successfully updated tier to ${newTier}`
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update tier'
      })
    } finally {
      setLoading(false)
    }
  }

  const getUsageWarning = () => {
    if (!usageStats) return null

    const { transcriptionsUsed, transcriptionsLimit } = usageStats.currentMonth
    
    if (transcriptionsLimit === -1) return null
    
    const percentage = (transcriptionsUsed / transcriptionsLimit) * 100
    
    if (percentage >= 100) {
      return {
        type: 'error' as const,
        text: 'You have exceeded your monthly limit. Upgrade to continue using transcription services.'
      }
    } else if (percentage >= 80) {
      return {
        type: 'warning' as const,
        text: `You have used ${transcriptionsUsed} of ${transcriptionsLimit} transcriptions this month (${Math.round(percentage)}%).`
      }
    }
    
    return null
  }

  const usageWarning = getUsageWarning()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            {requiredTier !== 'pro' ? 'Choose Your Plan' : 'Upgrade Required'}
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            {requiredTier !== 'pro' 
              ? 'Select the plan that best fits your transcription needs'
              : `You need a ${tierFeatures[requiredTier as keyof typeof tierFeatures].name} plan to access this feature`
            }
          </p>
        </div>

        {/* Usage Warning */}
        {usageWarning && (
          <div className={`mb-8 p-4 rounded-md ${
            usageWarning.type === 'error' 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg 
                  className={`h-5 w-5 ${
                    usageWarning.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                  }`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className={`text-sm ${
                  usageWarning.type === 'error' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {usageWarning.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-8 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Current Usage Stats */}
        {usageStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Current Usage</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.currentMonth.transcriptionsUsed}
                  {usageStats.currentMonth.transcriptionsLimit !== -1 && (
                    <span className="text-sm text-gray-500">
                      /{usageStats.currentMonth.transcriptionsLimit}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">Transcriptions Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.currentMonth.totalDurationMinutes.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Minutes Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {usageStats.currentMonth.totalFileSizeMB.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">MB Processed</div>
              </div>
            </div>
          </div>
        )}

        {/* Tier Comparison */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {Object.entries(tierFeatures).map(([tier, details]) => (
            <div
              key={tier}
              className={`rounded-lg shadow-lg overflow-hidden ${
                tier === requiredTier
                  ? 'ring-2 ring-indigo-500 bg-white'
                  : tier === currentTier
                  ? 'bg-gray-100'
                  : 'bg-white'
              }`}
            >
              <div className="px-6 py-8">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {details.name}
                    {tier === currentTier && (
                      <span className="ml-2 text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                    {tier === requiredTier && (
                      <span className="ml-2 text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </h3>
                  <p className="mt-4 text-4xl font-extrabold text-gray-900">
                    {details.price}
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly Limit:</span>
                    <span className="font-medium">
                      {details.monthlyLimit === -1 ? 'Unlimited' : details.monthlyLimit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max File Size:</span>
                    <span className="font-medium">{details.maxFileSize}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Duration:</span>
                    <span className="font-medium">{details.maxDuration}</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {details.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="flex-shrink-0 h-4 w-4 text-green-500 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="ml-2 text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {details.limitations.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {details.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="flex-shrink-0 h-4 w-4 text-red-500 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="ml-2 text-sm text-gray-500">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-8">
                  {tier === currentTier ? (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-md cursor-not-allowed font-medium"
                    >
                      Current Plan
                    </button>
                  ) : tier === 'free' && currentTier !== 'free' ? (
                    <button
                      onClick={() => handleTierChange('free')}
                      disabled={loading}
                      className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Downgrade to Free'}
                    </button>
                  ) : tier === 'free' ? (
                    <Link
                      href="/dashboard"
                      className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors text-center block font-medium"
                    >
                      Continue with Free
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleTierChange(tier as 'pro' | 'admin')}
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : tier === requiredTier ? 'Upgrade Now' : 'Select Plan'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Interface */}
        {userProfile?.tier === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Controls</h2>
            <p className="text-sm text-gray-600 mb-4">
              As an admin user, you can change tier levels. In a production environment, this would be integrated with a payment system.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleTierChange('free')}
                disabled={loading || currentTier === 'free'}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                Set to Free
              </button>
              <button
                onClick={() => handleTierChange('pro')}
                disabled={loading || currentTier === 'pro'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Set to Pro
              </button>
              <button
                onClick={() => handleTierChange('admin')}
                disabled={loading || currentTier === 'admin'}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Set to Admin
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}