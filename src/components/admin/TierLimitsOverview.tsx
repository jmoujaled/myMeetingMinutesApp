'use client'

import { useState, useEffect } from 'react'

interface TierLimit {
  tier: 'free' | 'pro' | 'admin'
  monthly_transcription_limit: number
  max_file_size_mb: number
  max_duration_minutes: number
  features: Record<string, boolean>
}

export default function TierLimitsOverview() {
  const [tierLimits, setTierLimits] = useState<TierLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTierLimits()
  }, [])

  const loadTierLimits = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/tier-limits')
      
      if (!response.ok) {
        throw new Error(`Failed to load tier limits: ${response.statusText}`)
      }

      const { tierLimits } = await response.json()
      setTierLimits(tierLimits)
    } catch (err: any) {
      console.error('Error loading tier limits:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString()
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-800'
      case 'pro': return 'bg-blue-100 text-blue-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tier Limits</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tier Limits</h3>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Tier Limits Overview</h3>
      
      <div className="space-y-4">
        {tierLimits.map((tier) => (
          <div key={tier.tier} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full capitalize ${getTierColor(tier.tier)}`}>
                {tier.tier}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Monthly Transcriptions:</span>
                <div className="text-gray-900">{formatLimit(tier.monthly_transcription_limit)}</div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Max File Size:</span>
                <div className="text-gray-900">
                  {tier.max_file_size_mb === -1 ? 'Unlimited' : `${tier.max_file_size_mb}MB`}
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Max Duration:</span>
                <div className="text-gray-900">
                  {tier.max_duration_minutes === -1 ? 'Unlimited' : `${tier.max_duration_minutes} min`}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <span className="font-medium text-gray-700 text-sm">Features:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(tier.features).map(([feature, enabled]) => (
                  enabled && (
                    <span key={feature} className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {feature.replace(/_/g, ' ')}
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}