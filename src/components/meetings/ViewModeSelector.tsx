'use client'

import React from 'react'
import { 
  Bars3Icon, 
  ArrowPathIcon, 
  QueueListIcon 
} from '@heroicons/react/24/outline'

interface ViewModeSelectorProps {
  currentMode: 'pagination' | 'infinite' | 'virtualized'
  onModeChange: (mode: 'pagination' | 'infinite' | 'virtualized') => void
  totalItems: number
  className?: string
}

export default function ViewModeSelector({
  currentMode,
  onModeChange,
  totalItems,
  className = ''
}: ViewModeSelectorProps) {
  const modes = [
    {
      key: 'pagination' as const,
      label: 'Pages',
      icon: Bars3Icon,
      description: 'Navigate through pages',
      recommended: totalItems <= 100
    },
    {
      key: 'infinite' as const,
      label: 'Scroll',
      icon: ArrowPathIcon,
      description: 'Load more as you scroll',
      recommended: totalItems > 100 && totalItems <= 1000
    },
    {
      key: 'virtualized' as const,
      label: 'Virtual',
      icon: QueueListIcon,
      description: 'Optimized for large lists',
      recommended: totalItems > 1000
    }
  ]

  // Don't show selector if there are very few items
  if (totalItems <= 20) {
    return null
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-1 ${className}`}>
      <div className="flex items-center justify-between sm:justify-start">
        <span className="mobile-text text-gray-500 mr-2">View:</span>
        <div className="text-xs text-gray-400 sm:hidden">
          {totalItems.toLocaleString()} items
        </div>
      </div>
      
      <div className="flex rounded-md shadow-sm">
        {modes.map((mode, index) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.key
          const isRecommended = mode.recommended
          
          return (
            <button
              key={mode.key}
              onClick={() => onModeChange(mode.key)}
              className={`
                relative inline-flex items-center px-2 sm:px-3 py-2 mobile-text font-medium border touch-friendly touch-button
                ${index === 0 ? 'rounded-l-md' : ''}
                ${index === modes.length - 1 ? 'rounded-r-md' : ''}
                ${index > 0 ? '-ml-px' : ''}
                ${isActive
                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }
                focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                transition-colors duration-200
              `}
              title={`${mode.description}${isRecommended ? ' (Recommended)' : ''}`}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">{mode.label}</span>
              <span className="sm:hidden">{mode.label.charAt(0)}</span>
              
              {isRecommended && (
                <span className="ml-1 inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="hidden sm:inline">✓</span>
                  <span className="sm:hidden">•</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      
      <div className="text-xs text-gray-400 ml-2 mobile-hidden">
        {totalItems.toLocaleString()} items
      </div>
    </div>
  )
}

// Performance indicator component
export function PerformanceIndicator({ 
  mode, 
  totalItems, 
  className = '' 
}: { 
  mode: 'pagination' | 'infinite' | 'virtualized'
  totalItems: number
  className?: string 
}) {
  const getPerformanceInfo = () => {
    switch (mode) {
      case 'pagination':
        return {
          level: totalItems > 100 ? 'medium' : 'high',
          text: 'Standard pagination',
          color: totalItems > 100 ? 'text-yellow-600' : 'text-green-600'
        }
      case 'infinite':
        return {
          level: totalItems > 1000 ? 'medium' : 'high',
          text: 'Smooth scrolling',
          color: totalItems > 1000 ? 'text-yellow-600' : 'text-green-600'
        }
      case 'virtualized':
        return {
          level: 'high',
          text: 'Optimized performance',
          color: 'text-green-600'
        }
    }
  }

  const info = getPerformanceInfo()

  return (
    <div className={`flex items-center text-xs ${info.color} ${className}`}>
      <div className="w-2 h-2 rounded-full bg-current mr-1.5" />
      {info.text}
    </div>
  )
}