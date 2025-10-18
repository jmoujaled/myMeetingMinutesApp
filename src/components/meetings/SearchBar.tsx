'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search meetings and transcripts...",
  debounceMs = 300,
  className
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  // Debounced onChange handler
  const debouncedOnChange = useCallback(
    debounce(onChange, debounceMs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, debounceMs]
  )

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }

  // Clear search
  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className="h-5 w-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
      
      <Input
        type="text"
        value={localValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="pl-10 pr-10 touch-friendly mobile-text"
        aria-label="Search meetings and transcripts"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 focus:outline-none focus:text-gray-600 touch-friendly touch-button"
          aria-label="Clear search"
        >
          <svg 
            className="h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
    </div>
  )
}

// Debounce utility function for string input
function debounce(
  func: (value: string) => void,
  wait: number
): (value: string) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (value: string) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(value)
    }, wait)
  }
}