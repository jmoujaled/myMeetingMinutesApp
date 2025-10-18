'use client'

import React from 'react'
import SearchAndFilters from './SearchAndFilters'
import { useSearchFilters } from '@/hooks/useSearchFilters'

/**
 * Example component demonstrating how to use SearchAndFilters
 * This shows the complete integration with state management and URL synchronization
 */
export default function SearchAndFiltersExample() {
  const { filters, updateFilters, hasActiveFilters } = useSearchFilters()

  // Mock data for demonstration
  const mockResults = [
    { id: '1', title: 'Team Standup', type: 'meeting', status: 'completed' },
    { id: '2', title: 'Client Call', type: 'meeting', status: 'processing' },
    { id: '3', title: 'interview_recording.mp3', type: 'transcription', status: 'completed' },
  ]

  // Filter results based on current filters (simplified example)
  const filteredResults = mockResults.filter(item => {
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.status !== 'all' && item.status !== filters.status) {
      return false
    }
    if (filters.type !== 'all' && item.type !== filters.type) {
      return false
    }
    return true
  })

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Search and Filters Demo
        </h2>
        <p className="text-gray-600">
          This demonstrates the search and filter components with state management and URL synchronization.
        </p>
      </div>

      {/* Search and Filters Component */}
      <SearchAndFilters
        filters={filters}
        onFiltersChange={updateFilters}
        totalResults={filteredResults.length}
      />

      {/* Debug Info */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Current Filter State:</h3>
        <pre className="text-sm text-gray-700 overflow-x-auto">
          {JSON.stringify(filters, null, 2)}
        </pre>
        <p className="mt-2 text-sm text-gray-600">
          Has active filters: {hasActiveFilters ? 'Yes' : 'No'}
        </p>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">
          Results ({filteredResults.length})
        </h3>
        
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No results found with current filters
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResults.map(item => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.type === 'meeting' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.type}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : item.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}