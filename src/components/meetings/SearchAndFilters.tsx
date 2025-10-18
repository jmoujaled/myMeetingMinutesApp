'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import SearchBar from './SearchBar'
import DateRangeFilter from './DateRangeFilter'
import StatusFilter, { type StatusFilterValue } from './StatusFilter'
import TypeFilter, { type TypeFilterValue } from './TypeFilter'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMeetingsErrorHandler } from '@/hooks/useMeetingsErrorHandler'
import { LoadingErrorState } from './ErrorStates'

interface DateRange {
  from: Date | null
  to: Date | null
}

export interface SearchFilters {
  search: string
  dateRange: DateRange
  status: StatusFilterValue
  type: TypeFilterValue
}

interface SearchAndFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  totalResults?: number
  className?: string
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

export default function SearchAndFilters({
  filters,
  onFiltersChange,
  totalResults,
  className,
  isLoading = false,
  error = null,
  onRetry
}: SearchAndFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const { handleSearchError } = useMeetingsErrorHandler()

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters: SearchFilters = {
      search: searchParams.get('search') || '',
      dateRange: {
        from: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : null,
        to: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : null
      },
      status: (searchParams.get('status') as StatusFilterValue) || 'all',
      type: (searchParams.get('type') as TypeFilterValue) || 'all'
    }

    // Only update if different from current filters
    if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
      onFiltersChange(urlFilters)
    }
  }, [searchParams, filters, onFiltersChange])

  // Update URL when filters change
  const updateURL = useCallback((newFilters: SearchFilters) => {
    const params = new URLSearchParams()

    if (newFilters.search) {
      params.set('search', newFilters.search)
    }

    if (newFilters.dateRange.from) {
      params.set('dateFrom', format(newFilters.dateRange.from, 'yyyy-MM-dd'))
    }

    if (newFilters.dateRange.to) {
      params.set('dateTo', format(newFilters.dateRange.to, 'yyyy-MM-dd'))
    }

    if (newFilters.status !== 'all') {
      params.set('status', newFilters.status)
    }

    if (newFilters.type !== 'all') {
      params.set('type', newFilters.type)
    }

    // Reset to first page when filters change
    params.delete('page')

    const newURL = params.toString() ? `?${params.toString()}` : '/meetings'
    router.push(newURL, { scroll: false })
  }, [router])

  // Handle filter changes
  const handleSearchChange = (search: string) => {
    const newFilters = { ...filters, search }
    onFiltersChange(newFilters)
    updateURL(newFilters)
  }

  const handleDateRangeChange = (dateRange: DateRange) => {
    const newFilters = { ...filters, dateRange }
    onFiltersChange(newFilters)
    updateURL(newFilters)
  }

  const handleStatusChange = (status: StatusFilterValue) => {
    const newFilters = { ...filters, status }
    onFiltersChange(newFilters)
    updateURL(newFilters)
  }

  const handleTypeChange = (type: TypeFilterValue) => {
    const newFilters = { ...filters, type }
    onFiltersChange(newFilters)
    updateURL(newFilters)
  }

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters: SearchFilters = {
      search: '',
      dateRange: { from: null, to: null },
      status: 'all',
      type: 'all'
    }
    onFiltersChange(clearedFilters)
    router.push('/meetings', { scroll: false })
  }

  // Check if any filters are active
  const hasActiveFilters = 
    filters.search ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.status !== 'all' ||
    filters.type !== 'all'

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", className)}>
      <div className="p-4 sm:p-6">
        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        {/* Filter Toggle Button (Mobile) */}
        <div className="sm:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="w-full justify-between touch-friendly touch-button"
          >
            <span className="flex items-center">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              <span className="mobile-text">Filters</span>
              {hasActiveFilters && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {/* Show count on mobile for better UX */}
                  <span className="sm:hidden">
                    {[filters.search, filters.dateRange.from, filters.dateRange.to, filters.status !== 'all', filters.type !== 'all'].filter(Boolean).length}
                  </span>
                  <span className="hidden sm:inline">Active</span>
                </span>
              )}
            </span>
            <svg 
              className={cn("h-4 w-4 transition-transform duration-200", isFiltersExpanded && "rotate-180")} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>

        {/* Filters */}
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          "sm:block", // Always show on desktop
          isFiltersExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 sm:max-h-none sm:opacity-100"
        )}>
          <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4 pt-4 sm:pt-0">
            <div className="flex flex-col sm:flex-row gap-4 sm:flex-1">
              <DateRangeFilter
                value={filters.dateRange}
                onChange={handleDateRangeChange}
                className="flex-1 sm:min-w-[200px]"
              />
              
              <StatusFilter
                value={filters.status}
                onChange={handleStatusChange}
                className="flex-1 sm:min-w-[140px]"
              />
              
              <TypeFilter
                value={filters.type}
                onChange={handleTypeChange}
                className="flex-1 sm:min-w-[140px]"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="text-gray-500 hover:text-gray-700 whitespace-nowrap touch-friendly touch-button w-full sm:w-auto justify-center sm:justify-start"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="mobile-text">Clear Filters</span>
              </Button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && onRetry && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <LoadingErrorState 
              onRetry={onRetry}
              message="Failed to load search results"
            />
          </div>
        )}

        {/* Results Count */}
        {!error && totalResults !== undefined && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {isLoading ? (
                'Searching...'
              ) : totalResults === 0 ? (
                'No results found'
              ) : totalResults === 1 ? (
                '1 result found'
              ) : (
                `${totalResults.toLocaleString()} results found`
              )}
              {hasActiveFilters && !isLoading && (
                <span className="ml-1">with current filters</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}