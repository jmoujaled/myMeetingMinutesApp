'use client'

import React from 'react'
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface EmptyStateProps {
  type: 'no-meetings' | 'no-search-results' | 'no-filter-results' | 'error' | 'loading-error'
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  searchQuery?: string
  filterCount?: number
  className?: string
}

export default function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  searchQuery,
  filterCount = 0,
  className = ''
}: EmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-meetings':
        return {
          icon: DocumentTextIcon,
          title: title || 'No meetings yet',
          description: description || 'Get started by creating your first transcription in the Studio. Your completed transcriptions will appear here.',
          actionLabel: actionLabel || 'Go to Studio',
          actionHref: actionHref || '/studio2',
          iconColor: 'text-gray-400',
          showAction: true
        }

      case 'no-search-results':
        return {
          icon: MagnifyingGlassIcon,
          title: title || `No results found${searchQuery ? ` for "${searchQuery}"` : ''}`,
          description: description || 'Try adjusting your search terms or filters to find what you\'re looking for.',
          actionLabel: actionLabel || 'Clear search',
          iconColor: 'text-gray-400',
          showAction: true
        }

      case 'no-filter-results':
        return {
          icon: MagnifyingGlassIcon,
          title: title || 'No meetings match your filters',
          description: description || `${filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? 's' : ''} applied. ` : ''}Try adjusting your filters to see more results.`,
          actionLabel: actionLabel || 'Clear filters',
          iconColor: 'text-gray-400',
          showAction: true
        }

      case 'error':
        return {
          icon: ExclamationTriangleIcon,
          title: title || 'Unable to load meetings',
          description: description || 'There was a problem loading your meetings. Please try again.',
          actionLabel: actionLabel || 'Try again',
          iconColor: 'text-red-400',
          showAction: true
        }

      case 'loading-error':
        return {
          icon: ClockIcon,
          title: title || 'Taking longer than expected',
          description: description || 'Your meetings are taking a while to load. Please check your connection and try again.',
          actionLabel: actionLabel || 'Retry',
          iconColor: 'text-yellow-400',
          showAction: true
        }

      default:
        return {
          icon: DocumentTextIcon,
          title: title || 'No content available',
          description: description || 'There\'s nothing to show here right now.',
          iconColor: 'text-gray-400',
          showAction: false
        }
    }
  }

  const content = getEmptyStateContent()
  const IconComponent = content.icon

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (content.actionHref) {
      window.location.href = content.actionHref
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-12 ${className}`}>
      <div className="text-center">
        <div className={`mx-auto h-12 w-12 ${content.iconColor} mb-4`}>
          <IconComponent className="h-12 w-12" />
        </div>
        
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {content.title}
        </h3>
        
        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
          {content.description}
        </p>
        
        {content.showAction && (content.actionLabel || actionLabel) && (
          <div className="mt-6">
            {actionHref ? (
              <a
                href={actionHref}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {type === 'no-meetings' && (
                  <PlusIcon className="mr-2 h-4 w-4" />
                )}
                {content.actionLabel || actionLabel}
              </a>
            ) : (
              <button
                onClick={handleAction}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {content.actionLabel || actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized empty state components for common use cases
export function NoMeetingsEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      type="no-meetings"
      className={className}
    />
  )
}

export function NoSearchResultsEmptyState({ 
  searchQuery, 
  onClearSearch,
  className 
}: { 
  searchQuery?: string
  onClearSearch?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="no-search-results"
      searchQuery={searchQuery}
      onAction={onClearSearch}
      className={className}
    />
  )
}

export function NoFilterResultsEmptyState({ 
  filterCount, 
  onClearFilters,
  className 
}: { 
  filterCount?: number
  onClearFilters?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="no-filter-results"
      filterCount={filterCount}
      onAction={onClearFilters}
      className={className}
    />
  )
}

export function ErrorEmptyState({ 
  onRetry,
  className 
}: { 
  onRetry?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="error"
      onAction={onRetry}
      className={className}
    />
  )
}