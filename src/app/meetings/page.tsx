'use client'

import React, { Suspense, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MeetingsHeader from '@/components/meetings/MeetingsHeader'
import Breadcrumb from '@/components/meetings/Breadcrumb'
import LoadingSpinner from '@/components/meetings/LoadingSpinner'
import { ErrorBoundary } from '@/components/meetings/ErrorBoundary'
import SearchAndFilters from '@/components/meetings/SearchAndFilters'
import MeetingsList, { useMeetingsList } from '@/components/meetings/MeetingsList'
import { UsageWarningBanner } from '@/components/meetings/UsageAwareActions'
import { useSearchFilters } from '@/hooks/useSearchFilters'
import { useMeetingsData, useErrorHandling } from '@/hooks/useMeetingsData'


interface MeetingsPageProps {
  searchParams?: {
    search?: string
    dateFrom?: string
    dateTo?: string
    status?: string
    type?: 'all' | 'meetings' | 'transcriptions'
    page?: string
    view?: 'pagination' | 'infinite' | 'virtualized'
  }
}

function MeetingsPageContent({ searchParams }: MeetingsPageProps) {
  const { loading } = useAuth()
  const { filters, updateFilters, hasActiveFilters, getActiveFilterCount } = useSearchFilters()
  const { handleRetry, isRetryableError, getErrorMessage } = useErrorHandling()
  
  // Initialize view mode from URL params
  const initialViewMode = (searchParams?.view as 'pagination' | 'infinite' | 'virtualized') || 'pagination'
  const { 
    viewMode, 
    currentPage, 
    pageSize, 
    handlePageChange
  } = useMeetingsList({ initialViewMode, pageSize: 20 })

  // Convert filters to the format expected by React Query hooks
  const queryFilters = {
    search: filters.search || undefined,
    date_from: filters.dateRange.from?.toISOString(),
    date_to: filters.dateRange.to?.toISOString(),
    status: filters.status !== 'all' ? filters.status as 'completed' | 'processing' | 'failed' : undefined,
    record_type: filters.type !== 'all' ? 'meetings' as const : 'all' as const,
    page: currentPage,
    limit: pageSize,
  }

  // Use React Query hooks for data fetching
  const {
    meetings,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useMeetingsData(queryFilters)

  // Handle page changes
  const onPageChange = useCallback((page: number) => {
    handlePageChange(page)
  }, [handlePageChange])



  // Handle retry with error handling
  const handleRetryWithErrorHandling = useCallback(() => {
    if (error && isRetryableError(error)) {
      handleRetry(() => refetch())
    } else {
      refetch()
    }
  }, [error, isRetryableError, handleRetry, refetch])

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    updateFilters({ ...filters, search: '' })
  }, [filters, updateFilters])

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    updateFilters({
      search: '',
      dateRange: { from: null, to: null },
      status: 'all',
      type: 'all'
    })
  }, [updateFilters])

  // Handle load more for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (meetings?.pagination && meetings.pagination.page < meetings.pagination.total_pages && !isLoading) {
      handlePageChange(meetings.pagination.page + 1)
    }
  }, [meetings?.pagination, isLoading, handlePageChange])

  if (loading) {
    return <LoadingSpinner />
  }

  const breadcrumbItems = [
    { label: 'My Meetings', current: true }
  ]

  // Get error message for display
  const errorMessage = error ? getErrorMessage(error) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto mobile-padding py-4 sm:py-6">
        {/* Breadcrumb Navigation - Hidden on mobile */}
        <div className="mb-4 mobile-hidden">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Page Header */}
        <MeetingsHeader stats={meetings?.stats} />

        {/* Main Content Layout */}
        <div className="mt-6 sm:mt-8">
          {/* Main Content Area */}
          <div className="space-y-4 sm:space-y-6">
            {/* Usage Warning Banner */}
            <UsageWarningBanner />

            {/* Search and Filters Section */}
            <SearchAndFilters
              filters={filters}
              onFiltersChange={updateFilters}
              totalResults={meetings?.pagination?.total || 0}
              isLoading={isLoading || isRefetching}
              error={isError ? error : null}
              onRetry={handleRetryWithErrorHandling}
            />

            {/* Meetings List */}
            <MeetingsList
              data={meetings?.data || []}
              pagination={meetings?.pagination || { page: 1, limit: pageSize, total: 0, total_pages: 0 }}
              isLoading={isLoading || isRefetching}
              error={errorMessage}
              searchQuery={filters.search}
              hasActiveFilters={hasActiveFilters}
              filterCount={getActiveFilterCount()}
              viewMode={viewMode}
              onPageChange={onPageChange}
              onLoadMore={handleLoadMore}
              onRetry={handleRetryWithErrorHandling}
              onClearSearch={handleClearSearch}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyMeetingsPage({ searchParams }: MeetingsPageProps) {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <MeetingsPageContent searchParams={searchParams} />
        </Suspense>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}