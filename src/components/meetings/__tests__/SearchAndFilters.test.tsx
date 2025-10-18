/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SearchAndFilters from '../SearchAndFilters'
import { SearchFilters } from '../SearchAndFilters'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}))

const defaultFilters: SearchFilters = {
  search: '',
  dateRange: { from: null, to: null },
  status: 'all',
  type: 'all'
}

describe('SearchAndFilters', () => {
  const mockOnFiltersChange = jest.fn()

  beforeEach(() => {
    mockOnFiltersChange.mockClear()
  })

  it('renders search bar', () => {
    render(
      <SearchAndFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByPlaceholderText('Search meetings and transcripts...')).toBeInTheDocument()
  })

  it('calls onFiltersChange when search input changes', async () => {
    render(
      <SearchAndFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search meetings and transcripts...')
    fireEvent.change(searchInput, { target: { value: 'test search' } })

    // Wait for debounced call
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'test search'
      })
    }, { timeout: 500 })
  })

  it('displays total results when provided', () => {
    render(
      <SearchAndFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        totalResults={42}
      />
    )

    expect(screen.getByText('42 results found')).toBeInTheDocument()
  })

  it('shows clear filters button when filters are active', () => {
    const activeFilters: SearchFilters = {
      ...defaultFilters,
      search: 'test'
    }

    render(
      <SearchAndFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })
})