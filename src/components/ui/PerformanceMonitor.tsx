'use client';

import { useEffect } from 'react';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

export default function PerformanceMonitor({ enabled = process.env.NODE_ENV === 'development' }: PerformanceMonitorProps) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime);
        }
        
        if (entry.entryType === 'first-input') {
          const fidEntry = entry as any;
          console.log('FID:', fidEntry.processingStart - entry.startTime);
        }
        
        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput) {
            console.log('CLS:', clsEntry.value);
          }
        }
      });
    });

    // Observe Core Web Vitals
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      // Fallback for browsers that don't support all entry types
      console.warn('Performance monitoring not fully supported');
    }

    // Monitor page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const nav = navigation as any;
        console.log('Performance Metrics:', {
          'DNS Lookup': nav.domainLookupEnd - nav.domainLookupStart,
          'TCP Connection': nav.connectEnd - nav.connectStart,
          'Request': nav.responseStart - nav.requestStart,
          'Response': nav.responseEnd - nav.responseStart,
          'DOM Processing': nav.domContentLoadedEventEnd - nav.responseEnd,
          'Total Load Time': nav.loadEventEnd - (nav.navigationStart || nav.fetchStart),
        });
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled]);

  return null;
}