'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { TranscriptionHistoryRecord } from '@/lib/validation/meetings-schemas'
import { MeetingCard } from './MeetingCard'
import { TranscriptionCard } from './TranscriptionCard'
import Pagination from './Pagination'
import InfiniteScroll, { useInfiniteScroll } from './InfiniteScroll'
import VirtualizedList from './VirtualizedList'
import { 
  NoMeetingsEmptyState, 
  NoSearchResultsEmptyState, 
  NoFilterResultsEmptyState, 
  ErrorEmptyState 
} from './EmptyState'
import LoadingSpinner from './LoadingSpinner'
import { CardSkeleton } from './CardSkeleton'

interface MeetingsListProps {
  data: TranscriptionHistoryRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  isLoading: boolean
  error: string | null
  searchQuery?: string
  hasActiveFilters: boolean
  filterCount: number
  viewMode: 'pagination' | 'infinite' | 'virtualized'
  onPageChange: (page: number) => void
  onLoadMore?: () => void
  onRetry: () => void
  onClearSearch?: () => void
  onClearFilters?: () => void
  className?: string
}

const CARD_HEIGHT = 200 // Estimated height for virtualization
const CONTAINER_HEIGHT = 600 // Height for virtualized container

export default function MeetingsList({
  data,
  pagination,
  isLoading,
  error,
  searchQuery,
  hasActiveFilters,
  filterCount,
  viewMode,
  onPageChange,
  onLoadMore,
  onRetry,
  onClearSearch,
  onClearFilters,
  className = ''
}: MeetingsListProps) {
  // Handle card actions

  const handleDownload = useCallback((id: string, format: string) => {
    // This will be handled by the export functionality
    console.log('Download:', id, format)
  }, [])

  const handleDelete = useCallback((id: string) => {
    // This will be handled by the parent component
    console.log('Delete:', id)
  }, [])

  // Render individual meeting/transcription card
  const renderCard = useCallback((record: TranscriptionHistoryRecord, index: number) => {
    const key = `${record.record_type}-${record.id}`
    
    if (record.record_type === 'meeting') {
      return (
        <MeetingCard
          key={key}
          record={record}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      )
    } else {
      return (
        <TranscriptionCard
          key={key}
          record={record}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onSaveAsMeeting={(id: string) => console.log('Save as meeting:', id)}
        />
      )
    }
  }, [handleDownload, handleDelete])

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )

  // Error state
  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorEmptyState 
        onRetry={onRetry}
        className={className}
      />
    )
  }

  // Empty states
  if (!isLoading && data.length === 0) {
    if (searchQuery) {
      return (
        <NoSearchResultsEmptyState
          searchQuery={searchQuery}
          onClearSearch={onClearSearch}
          className={className}
        />
      )
    }
    
    if (hasActiveFilters) {
      return (
        <NoFilterResultsEmptyState
          filterCount={filterCount}
          onClearFilters={onClearFilters}
          className={className}
        />
      )
    }
    
    return <NoMeetingsEmptyState className={className} />
  }

  // Render based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'infinite':
        return (
          <InfiniteScroll
            hasMore={pagination.page < pagination.total_pages}
            isLoading={isLoading}
            onLoadMore={onLoadMore || (() => {})}
            className="mobile-card-spacing"
            endMessage={<span className="mobile-text text-center py-4 text-muted-foreground">You've reached the end of your meetings</span>}
          >
            <div className="mobile-card-spacing">
              {data.map((record, index) => renderCard(record, index))}
            </div>
          </InfiniteScroll>
        )

      case 'virtualized':
        return (
          <VirtualizedList
            items={data}
            itemHeight={CARD_HEIGHT}
            containerHeight={CONTAINER_HEIGHT}
            renderItem={renderCard}
            getItemKey={(record) => `${record.record_type}-${record.id}`}
            className="border border-gray-200 rounded-lg"
          />
        )

      case 'pagination':
      default:
        return (
          <>
            <div className="mobile-card-spacing">
              {data.map((record, index) => renderCard(record, index))}
            </div>
            
            {pagination.total_pages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.total_pages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={onPageChange}
              />
            )}
          </>
        )
    }
  }

  return (
    <div className={className}>
      {/* Loading overlay for pagination mode */}
      {isLoading && viewMode === 'pagination' && (
        <div className="mb-4">
          {renderLoadingSkeleton()}
        </div>
      )}
      
      {/* Main content */}
      {!isLoading || data.length > 0 ? renderContent() : renderLoadingSkeleton()}
    </div>
  )
}

// Hook for managing meetings list state
export function useMeetingsList({
  initialViewMode = 'pagination',
  pageSize = 20
}: {
  initialViewMode?: 'pagination' | 'infinite' | 'virtualized'
  pageSize?: number
} = {}) {
  const [viewMode, setViewMode] = useState<'pagination' | 'infinite' | 'virtualized'>(initialViewMode)
  const [currentPage, setCurrentPage] = useState(1)

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleViewModeChange = useCallback((mode: 'pagination' | 'infinite' | 'virtualized') => {
    setViewMode(mode)
    setCurrentPage(1) // Reset to first page when changing modes
  }, [])

  const reset = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    viewMode,
    currentPage,
    pageSize,
    handlePageChange,
    handleViewModeChange,
    reset
  }
}