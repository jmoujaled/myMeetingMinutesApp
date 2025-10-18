'use client';

import React, { useState } from 'react';
import { SwipeableCard, createMeetingActions } from './SwipeableCard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Test component to verify mobile responsiveness and touch interactions
 * This component demonstrates the key mobile features implemented:
 * 1. Touch-friendly button sizes (44px minimum)
 * 2. Swipe gestures on cards
 * 3. Responsive breakpoints
 * 4. Mobile-optimized layouts
 */
export function MobileResponsivenessTest() {
  const [swipeCount, setSwipeCount] = useState(0);
  const [lastAction, setLastAction] = useState<string>('');

  const handleAction = (action: string) => {
    setLastAction(action);
    setSwipeCount(prev => prev + 1);
  };

  const swipeActions = createMeetingActions(
    () => handleAction('View'),
    () => handleAction('Download'),
    () => handleAction('Delete')
  );

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Mobile Responsiveness Test</h2>
        
        {/* Test Results */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="mobile-text">
            Actions performed: <strong>{swipeCount}</strong>
          </p>
          {lastAction && (
            <p className="mobile-text text-blue-600">
              Last action: <strong>{lastAction}</strong>
            </p>
          )}
        </div>

        {/* Responsive Grid Test */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Responsive Grid (2 cols mobile, 3 cols desktop)</h3>
          <div className="mobile-grid">
            <div className="bg-blue-100 p-3 rounded text-center mobile-text">Item 1</div>
            <div className="bg-green-100 p-3 rounded text-center mobile-text">Item 2</div>
            <div className="bg-yellow-100 p-3 rounded text-center mobile-text">Item 3</div>
            <div className="bg-red-100 p-3 rounded text-center mobile-text">Item 4</div>
          </div>
        </div>

        {/* Touch-Friendly Buttons Test */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Touch-Friendly Buttons (44px minimum)</h3>
          <div className="flex flex-wrap gap-2">
            <button 
              className="touch-friendly touch-button bg-blue-500 text-white px-4 rounded"
              onClick={() => handleAction('Touch Button 1')}
            >
              Button 1
            </button>
            <button 
              className="touch-friendly touch-button bg-green-500 text-white px-4 rounded"
              onClick={() => handleAction('Touch Button 2')}
            >
              Button 2
            </button>
          </div>
        </div>

        {/* Mobile/Desktop Visibility Test */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Visibility Test</h3>
          <div className="mobile-only bg-orange-100 p-3 rounded mb-2">
            <p className="mobile-text">📱 This is only visible on mobile</p>
          </div>
          <div className="mobile-hidden bg-purple-100 p-3 rounded">
            <p>🖥️ This is only visible on desktop</p>
          </div>
        </div>
      </div>

      {/* Swipeable Card Test */}
      <div>
        <h3 className="font-medium mb-2">Swipeable Card Test</h3>
        <p className="mobile-text text-gray-600 mb-4">
          On mobile: Swipe left to reveal actions. On desktop: Use the dropdown menu.
        </p>
        
        <SwipeableCard actions={swipeActions}>
          <Card className="touch-card">
            <CardHeader>
              <h4 className="font-semibold">Test Meeting Card</h4>
            </CardHeader>
            <CardContent>
              <p className="mobile-text text-gray-600">
                This card supports swipe gestures on mobile devices. 
                Try swiping left to reveal action buttons.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  Swipe Test
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Touch Friendly
                </span>
              </div>
            </CardContent>
          </Card>
        </SwipeableCard>
      </div>

      {/* Responsive Layout Test */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-medium mb-2">Responsive Layout Test</h3>
        <div className="mobile-flex gap-4">
          <div className="flex-1 bg-gray-100 p-3 rounded">
            <p className="mobile-text">Stacked on mobile</p>
          </div>
          <div className="flex-1 bg-gray-100 p-3 rounded">
            <p className="mobile-text">Side by side on desktop</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">Testing Instructions</h3>
        <ul className="mobile-text text-yellow-700 space-y-1">
          <li>• Resize your browser window to test responsive breakpoints</li>
          <li>• On mobile devices, try swiping left on the test card</li>
          <li>• Tap the touch-friendly buttons to test interaction feedback</li>
          <li>• Check that text sizes and spacing adapt to screen size</li>
        </ul>
      </div>
    </div>
  );
}