'use client'

import React from 'react'
import { MeetingStats } from '@/lib/validation/meetings-schemas'
import UsageAnalytics from './UsageAnalytics'

interface MeetingsHeaderProps {
  stats?: MeetingStats
  loading?: boolean
  showUsageAnalytics?: boolean
}

export default function MeetingsHeader({ 
  stats, 
  loading = false, 
  showUsageAnalytics = true 
}: MeetingsHeaderProps) {
  // Default stats for initial render
  const defaultStats: MeetingStats = {
    total_transcriptions: 0,
    total_meetings: 0,
    total_hours: 0,
    this_month_transcriptions: 0,
    this_month_meetings: 0,
    this_month_hours: 0,
    completed_transcriptions: 0,
    processing_transcriptions: 0,
    failed_transcriptions: 0
  }

  const displayStats = stats || defaultStats

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Header Title and Description */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Meetings</h1>
        <p className="mt-1 sm:mt-2 mobile-text text-gray-600">
          Manage your transcriptions and meeting records. Search, filter, and export your audio content.
        </p>
      </div>

      {/* Stats Grid - Responsive layout */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Transcriptions */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total</p>
              {loading ? (
                <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse w-8"></div>
              ) : (
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {displayStats.total_transcriptions + displayStats.total_meetings}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">This Month</p>
              {loading ? (
                <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse w-8"></div>
              ) : (
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {displayStats.this_month_transcriptions + displayStats.this_month_meetings}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Hours</p>
              {loading ? (
                <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse w-12"></div>
              ) : (
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  {displayStats.total_hours.toFixed(1)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Meetings</p>
              {loading ? (
                <div className="h-5 sm:h-6 bg-gray-200 rounded animate-pulse w-8"></div>
              ) : (
                <p className="text-base sm:text-lg font-semibold text-gray-900">{displayStats.total_meetings}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Analytics Integration */}
      {showUsageAnalytics && (
        <div className="mt-4 sm:mt-6">
          <UsageAnalytics compact={true} showDetails={false} />
        </div>
      )}
    </div>
  )
}