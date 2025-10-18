'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface InfiniteScrollProps {
  children: React.ReactNode
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number
  className?: string
  loadingComponent?: React.ReactNode
  endMessage?: React.ReactNode
}

export default function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200,
  className = '',
  loadingComponent,
  endMessage
}: InfiniteScrollProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore()
      }
    },
    [hasMore, isLoading, onLoadMore]
  )

  useEffect(() => {
    const element = loadingRef.current
    if (!element) return

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: `${threshold}px`
    })

    observerRef.current.observe(element)

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element)
      }
    }
  }, [handleObserver, threshold])

  return (
    <div className={className}>
      {children}
      
      {/* Loading trigger element */}
      <div ref={loadingRef} className="w-full">
        {isLoading && (
          <div className="flex justify-center py-4">
            {loadingComponent || <LoadingSpinner />}
          </div>
        )}
        
        {!hasMore && !isLoading && endMessage && (
          <div className="flex justify-center py-4 text-gray-500 text-sm">
            {endMessage}
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for managing infinite scroll state
export function useInfiniteScroll<T>({
  fetchData,
  initialPage = 1,
  pageSize = 20
}: {
  fetchData: (page: number, limit: number) => Promise<{
    data: T[]
    hasMore: boolean
    total: number
  }>
  initialPage?: number
  pageSize?: number
}) {
  const [data, setData] = React.useState<T[]>([])
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  const [hasMore, setHasMore] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [total, setTotal] = React.useState(0)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchData(currentPage, pageSize)
      
      setData(prev => [...prev, ...result.data])
      setHasMore(result.hasMore)
      setTotal(result.total)
      setCurrentPage(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, currentPage, pageSize, isLoading, hasMore])

  const reset = useCallback(() => {
    setData([])
    setCurrentPage(initialPage)
    setHasMore(true)
    setIsLoading(false)
    setError(null)
    setTotal(0)
  }, [initialPage])

  const refresh = useCallback(async () => {
    reset()
    // Load first page after reset
    setTimeout(() => {
      loadMore()
    }, 0)
  }, [reset, loadMore])

  return {
    data,
    hasMore,
    isLoading,
    error,
    total,
    loadMore,
    reset,
    refresh
  }
}