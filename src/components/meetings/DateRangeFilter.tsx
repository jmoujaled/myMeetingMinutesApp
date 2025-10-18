'use client'

import React, { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import * as Popover from '@radix-ui/react-popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

interface DateRange {
  from: Date | null
  to: Date | null
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (dateRange: DateRange) => void
  className?: string
}

export default function DateRangeFilter({
  value,
  onChange,
  className
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      onChange({ from: null, to: null })
      return
    }

    onChange({
      from: range.from || null,
      to: range.to || null
    })
  }

  const handleClear = () => {
    onChange({ from: null, to: null })
    setIsOpen(false)
  }

  const formatDateRange = () => {
    if (!value.from && !value.to) {
      return 'Select date range'
    }

    if (value.from && !value.to) {
      return `From ${format(value.from, 'MMM dd, yyyy')}`
    }

    if (!value.from && value.to) {
      return `Until ${format(value.to, 'MMM dd, yyyy')}`
    }

    if (value.from && value.to) {
      if (value.from.getTime() === value.to.getTime()) {
        return format(value.from, 'MMM dd, yyyy')
      }
      return `${format(value.from, 'MMM dd')} - ${format(value.to, 'MMM dd, yyyy')}`
    }

    return 'Select date range'
  }

  const hasSelection = value.from || value.to

  return (
    <div className={cn("relative", className)}>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !hasSelection && "text-muted-foreground"
            )}
            aria-label="Select date range"
          >
            <svg 
              className="mr-2 h-4 w-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            {formatDateRange()}
          </Button>
        </Popover.Trigger>
        
        <Popover.Portal>
          <Popover.Content
            className="w-auto p-0 bg-white rounded-md border shadow-md z-50"
            align="start"
            sideOffset={4}
          >
            <div className="p-4">
              <DayPicker
                mode="range"
                selected={{
                  from: value.from || undefined,
                  to: value.to || undefined
                }}
                onSelect={handleSelect}
                numberOfMonths={2}
                className="rdp-months_horizontal"
                classNames={{
                  day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                  day_today: "bg-blue-100 text-blue-900",
                  day_range_middle: "bg-blue-100 text-blue-900",
                  day_range_start: "bg-blue-600 text-white",
                  day_range_end: "bg-blue-600 text-white"
                }}
              />
              
              {hasSelection && (
                <div className="flex justify-between items-center pt-3 mt-3 border-t">
                  <span className="text-sm text-gray-600">
                    {formatDateRange()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}