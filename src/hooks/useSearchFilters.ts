'use client'

import { useState, useCallback } from 'react'
import { StatusFilterValue } from '@/components/meetings/StatusFilter'
import { TypeFilterValue } from '@/components/meetings/TypeFilter'

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

const defaultFilters: SearchFilters = {
  search: '',
  dateRange: { from: null, to: null },
  status: 'all',
  type: 'all'
}

export function useSearchFilters(initialFilters?: Partial<SearchFilters>) {
  const [filters, setFilters] = useState<SearchFilters>({
    ...defaultFilters,
    ...initialFilters
  })

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.status !== 'all' ||
    filters.type !== 'all'
  )

  const getActiveFilterCount = useCallback(() => {
    let count = 0
    if (filters.search) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    if (filters.status !== 'all') count++
    if (filters.type !== 'all') count++
    return count
  }, [filters])

  return {
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount
  }
}