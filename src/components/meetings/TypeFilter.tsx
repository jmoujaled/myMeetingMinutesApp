'use client'

import React from 'react'
import * as Select from '@radix-ui/react-select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type TypeFilterValue = 'all' | 'meetings' | 'transcriptions'

interface TypeFilterProps {
  value: TypeFilterValue
  onChange: (value: TypeFilterValue) => void
  className?: string
}

const typeOptions = [
  { value: 'all' as const, label: 'All Types', icon: '📁' },
  { value: 'meetings' as const, label: 'Meetings', icon: '👥' },
  { value: 'transcriptions' as const, label: 'Transcriptions', icon: '🎵' }
]

export default function TypeFilter({
  value,
  onChange,
  className
}: TypeFilterProps) {
  const selectedOption = typeOptions.find(option => option.value === value) || typeOptions[0]

  return (
    <div className={cn("relative", className)}>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
            aria-label="Filter by type"
          >
            <div className="flex items-center">
              <span className="mr-2">{selectedOption.icon}</span>
              <span>{selectedOption.label}</span>
            </div>
            <Select.Icon>
              <svg 
                className="h-4 w-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </Select.Icon>
          </Button>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="overflow-hidden bg-white rounded-md border shadow-lg z-50 min-w-[160px]"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-1">
              {typeOptions.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm rounded-sm cursor-pointer select-none",
                    "hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                    "data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-900"
                  )}
                >
                  <Select.ItemText>
                    <div className="flex items-center">
                      <span className="mr-2">{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  </Select.ItemText>
                  
                  <Select.ItemIndicator className="absolute right-2">
                    <svg 
                      className="h-4 w-4 text-blue-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}