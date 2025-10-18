'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
  getItemKey?: (item: T, index: number) => string | number
}

export default function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey = (_, index) => index
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { start, end }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }))
  }, [items, visibleRange])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={getItemKey(item, index)}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook for managing virtualized list with dynamic heights
export function useVirtualizedList<T>({
  items,
  estimatedItemHeight = 100,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  estimatedItemHeight?: number
  containerHeight: number
  overscan?: number
}) {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map())
  const [scrollTop, setScrollTop] = useState(0)

  const getItemHeight = useCallback((index: number) => {
    return itemHeights.get(index) ?? estimatedItemHeight
  }, [itemHeights, estimatedItemHeight])

  const setItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newMap = new Map(prev)
      newMap.set(index, height)
      return newMap
    })
  }, [])

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    let height = 0
    const positions: number[] = []
    
    for (let i = 0; i < items.length; i++) {
      positions[i] = height
      height += getItemHeight(i)
    }
    
    return { totalHeight: height, itemPositions: positions }
  }, [items.length, getItemHeight])

  // Calculate visible range with dynamic heights
  const visibleRange = useMemo(() => {
    let start = 0
    let end = items.length - 1

    // Find start index
    for (let i = 0; i < itemPositions.length; i++) {
      if (itemPositions[i] + getItemHeight(i) > scrollTop) {
        start = Math.max(0, i - overscan)
        break
      }
    }

    // Find end index
    for (let i = start; i < itemPositions.length; i++) {
      if (itemPositions[i] > scrollTop + containerHeight) {
        end = Math.min(items.length - 1, i + overscan)
        break
      }
    }

    return { start, end }
  }, [scrollTop, containerHeight, overscan, itemPositions, getItemHeight, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      top: itemPositions[visibleRange.start + index]
    }))
  }, [items, visibleRange, itemPositions])

  return {
    totalHeight,
    visibleItems,
    setScrollTop,
    setItemHeight,
    getItemHeight
  }
}

// Virtualized item wrapper component for measuring heights
interface VirtualizedItemProps {
  children: React.ReactNode
  index: number
  onHeightChange: (index: number, height: number) => void
}

export function VirtualizedItem({ children, index, onHeightChange }: VirtualizedItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      const height = ref.current.offsetHeight
      onHeightChange(index, height)
    }
  }, [index, onHeightChange])

  return (
    <div ref={ref}>
      {children}
    </div>
  )
}