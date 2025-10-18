'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Download, Trash2, Eye } from 'lucide-react';

interface SwipeAction {
  id: string;
  label: string;
  icon: ReactNode;
  color: 'blue' | 'red' | 'green' | 'yellow';
  onClick: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  actions: SwipeAction[];
  className?: string;
  disabled?: boolean;
}

const actionColors = {
  blue: 'bg-blue-500 hover:bg-blue-600',
  red: 'bg-red-500 hover:bg-red-600',
  green: 'bg-green-500 hover:bg-green-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600',
};

export function SwipeableCard({ 
  children, 
  actions, 
  className,
  disabled = false 
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const SWIPE_THRESHOLD = 60; // Minimum swipe distance to show actions
  const MAX_SWIPE = 120; // Maximum swipe distance
  const ACTION_WIDTH = 60; // Width of each action button

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;

    const currentX = e.touches[0].clientX;
    const deltaX = startXRef.current - currentX;
    const newTranslateX = Math.max(0, Math.min(MAX_SWIPE, currentXRef.current + deltaX));
    
    setTranslateX(newTranslateX);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    
    setIsDragging(false);
    
    if (translateX > SWIPE_THRESHOLD) {
      setTranslateX(ACTION_WIDTH * actions.length);
      setIsActionsVisible(true);
    } else {
      setTranslateX(0);
      setIsActionsVisible(false);
    }
  };

  // Handle mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    setIsDragging(true);
    startXRef.current = e.clientX;
    currentXRef.current = translateX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled) return;

    const currentX = e.clientX;
    const deltaX = startXRef.current - currentX;
    const newTranslateX = Math.max(0, Math.min(MAX_SWIPE, currentXRef.current + deltaX));
    
    setTranslateX(newTranslateX);
  };

  const handleMouseUp = () => {
    if (!isDragging || disabled) return;
    
    setIsDragging(false);
    
    if (translateX > SWIPE_THRESHOLD) {
      setTranslateX(ACTION_WIDTH * actions.length);
      setIsActionsVisible(true);
    } else {
      setTranslateX(0);
      setIsActionsVisible(false);
    }
  };

  // Handle action click
  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    // Reset swipe state after action
    setTranslateX(0);
    setIsActionsVisible(false);
  };

  // Reset swipe state when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setTranslateX(0);
        setIsActionsVisible(false);
      }
    };

    if (isActionsVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isActionsVisible]);

  // Prevent default touch behaviors that might interfere
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    if (isDragging) {
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('touchmove', preventScroll);
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, translateX]);

  return (
    <div 
      ref={cardRef}
      className={cn("swipe-container relative", className)}
    >
      {/* Action buttons */}
      <div className="swipe-actions" style={{ width: `${ACTION_WIDTH * actions.length}px` }}>
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={cn(
              "swipe-action-button touch-friendly transition-colors duration-200",
              actionColors[action.color]
            )}
            style={{ width: `${ACTION_WIDTH}px` }}
            aria-label={action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Main card content */}
      <div
        className={cn(
          "transition-transform duration-200 ease-out bg-white",
          isDragging && "transition-none"
        )}
        style={{ 
          transform: `translateX(-${translateX}px)`,
          touchAction: 'pan-y' // Allow vertical scrolling but handle horizontal
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>

      {/* Overlay to indicate swipe capability */}
      {!disabled && (
        <div className={cn(
          "absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gray-200 to-transparent pointer-events-none opacity-0 transition-opacity duration-200",
          "sm:hidden", // Only show on mobile
          !isActionsVisible && !isDragging && "opacity-30"
        )} />
      )}
    </div>
  );
}

// Predefined action sets for common use cases
export const createMeetingActions = (
  onView: () => void,
  onDownload: () => void,
  onDelete: () => void
): SwipeAction[] => [
  {
    id: 'view',
    label: 'View',
    icon: <Eye className="w-5 h-5" />,
    color: 'blue',
    onClick: onView,
  },
  {
    id: 'download',
    label: 'Download',
    icon: <Download className="w-5 h-5" />,
    color: 'green',
    onClick: onDownload,
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-5 h-5" />,
    color: 'red',
    onClick: onDelete,
  },
];

export const createTranscriptionActions = (
  onView: () => void,
  onDownload: () => void,
  onDelete: () => void,
  onSaveAsMeeting?: () => void
): SwipeAction[] => {
  const baseActions = createMeetingActions(onView, onDownload, onDelete);
  
  if (onSaveAsMeeting) {
    return [
      baseActions[0], // View
      {
        id: 'save',
        label: 'Save as Meeting',
        icon: <Download className="w-5 h-5" />,
        color: 'yellow',
        onClick: onSaveAsMeeting,
      },
      baseActions[1], // Download
      baseActions[2], // Delete
    ];
  }
  
  return baseActions;
};