'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usageService, UsageStats } from '@/lib/usage-service'

interface UpgradePromptProps {
  show?: boolean
  onClose?: () => void
  requiredTier?: 'pro' | 'admin'
  reason?: string
}

export default function UpgradePrompt({ 
  show = true, 
  onClose, 
  requiredTier = 'pro',
  reason 
}: UpgradePromptProps) {
  const { user, userProfile } = useAuth()
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && show) {
      loadUsageStats()
    }
  }, [user, show])

  const loadUsageStats = async () => {
    if (!user) return
    
    try {
      const stats = await usageService.getCurrentUsage(user.id)
      setUsageStats(stats)
    } catch (error) {
      console.error('Error loading usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPromptMessage = () => {
    if (reason) return reason

    if (!usageStats) return 'Upgrade to access more features'

    const { transcriptionsUsed, transcriptionsLimit } = usageStats.currentMonth
    
    if (transcriptionsLimit === -1) return 'Upgrade to access more features'
    
    if (transcriptionsUsed >= transcriptionsLimit) {
      return 'You have exceeded your monthly transcription limit'
    }
    
    const percentage = (transcriptionsUsed / transcriptionsLimit) * 100
    
    if (percentage >= 90) {
      return `You have used ${transcriptionsUsed} of ${transcriptionsLimit} transcriptions this month`
    }
    
    return 'Upgrade to get more transcriptions and features'
  }

  const getTierFeatures = (tier: 'pro' | 'admin') => {
    const features = {
      pro: [
        '100 transcriptions per month',
        'Up to 100MB file size',
        'Speaker diarization',
        'AI summaries',
        'Translations'
      ],
      admin: [
        'Unlimited transcriptions',
        'Unlimited file size',
        'Admin dashboard',
        'User management',
        'Priority support'
      ]
    }
    return features[tier]
  }

  if (!show || !user || !userProfile) return null

  // Don't show if user already has the required tier or higher
  const tierOrder = { free: 0, pro: 1, admin: 2 }
  const currentTierLevel = tierOrder[userProfile.tier as keyof typeof tierOrder]
  const requiredTierLevel = tierOrder[requiredTier]
  
  if (currentTierLevel >= requiredTierLevel) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
                </h3>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Message */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {getPromptMessage()}
            </p>
          </div>

          {/* Usage Stats */}
          {usageStats && !loading && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-600">Current Usage:</div>
              <div className="text-lg font-semibold text-gray-900">
                {usageStats.currentMonth.transcriptionsUsed}
                {usageStats.currentMonth.transcriptionsLimit !== -1 && (
                  <span className="text-sm text-gray-500">
                    /{usageStats.currentMonth.transcriptionsLimit}
                  </span>
                )} transcriptions
              </div>
              {usageStats.currentMonth.transcriptionsLimit !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      usageStats.isLimitExceeded ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (usageStats.currentMonth.transcriptionsUsed / usageStats.currentMonth.transcriptionsLimit) * 100)}%`
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Features */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Features:
            </h4>
            <ul className="space-y-1">
              {getTierFeatures(requiredTier).map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Link
              href={`/upgrade?required=${requiredTier}&current=${userProfile.tier}`}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              Upgrade Now
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for showing upgrade prompts based on usage
export function useUpgradePrompt() {
  const { user, userProfile } = useAuth()
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false)
  const [promptReason, setPromptReason] = useState<string>('')

  const checkUsageAndPrompt = async () => {
    if (!user || !userProfile) return

    try {
      const stats = await usageService.getCurrentUsage(user.id)
      if (!stats) return

      const { transcriptionsUsed, transcriptionsLimit } = stats.currentMonth
      
      // Don't prompt for unlimited tiers
      if (transcriptionsLimit === -1) return

      // Show prompt if exceeded or close to limit
      if (transcriptionsUsed >= transcriptionsLimit) {
        setPromptReason('You have exceeded your monthly transcription limit')
        setShouldShowPrompt(true)
      } else if (transcriptionsUsed / transcriptionsLimit >= 0.9) {
        setPromptReason(`You have used ${transcriptionsUsed} of ${transcriptionsLimit} transcriptions this month`)
        setShouldShowPrompt(true)
      }
    } catch (error) {
      console.error('Error checking usage for prompt:', error)
    }
  }

  const hidePrompt = () => {
    setShouldShowPrompt(false)
  }

  return {
    shouldShowPrompt,
    promptReason,
    checkUsageAndPrompt,
    hidePrompt
  }
}