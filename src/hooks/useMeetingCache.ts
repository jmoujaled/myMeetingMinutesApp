import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { meetingsKeys, MeetingsFilters, MeetingsResponse } from './useMeetings';
import { MeetingDetail } from './useMeetingDetail';

// Types
interface CacheStrategy {
  prefetchOnHover: boolean;
  backgroundRefresh: boolean;
  intelligentPrefetch: boolean;
  preloadNextPage: boolean;
}

interface PrefetchContext {
  currentFilters: MeetingsFilters;
  userBehavior: {
    frequentSearches: string[];
    commonFilters: MeetingsFilters[];
    recentlyViewed: string[];
  };
}

// Default cache strategy
const DEFAULT_CACHE_STRATEGY: CacheStrategy = {
  prefetchOnHover: true,
  backgroundRefresh: true,
  intelligentPrefetch: true,
  preloadNextPage: true,
};

export function useMeetingCache(strategy: Partial<CacheStrategy> = {}) {
  const queryClient = useQueryClient();
  const cacheStrategy = { ...DEFAULT_CACHE_STRATEGY, ...strategy };
  const prefetchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Prefetch meeting detail on hover
  const prefetchMeetingOnHover = useCallback((meetingId: string, delay = 200) => {
    if (!cacheStrategy.prefetchOnHover) return;
    
    const timeoutId = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: meetingsKeys.detail(meetingId),
        queryFn: async () => {
          const response = await fetch(`/api/meetings/${meetingId}`);
          if (!response.ok) throw new Error('Failed to fetch meeting');
          const data = await response.json();
          return data.meeting;
        },
        staleTime: 15 * 60 * 1000, // 15 minutes
      });
    }, delay);
    
    prefetchTimeouts.current.set(meetingId, timeoutId);
  }, [queryClient, cacheStrategy.prefetchOnHover]);
  
  // Cancel prefetch on hover end
  const cancelPrefetch = useCallback((meetingId: string) => {
    const timeoutId = prefetchTimeouts.current.get(meetingId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      prefetchTimeouts.current.delete(meetingId);
    }
  }, []);
  
  // Prefetch next page based on current pagination
  const prefetchNextPage = useCallback((currentFilters: MeetingsFilters) => {
    if (!cacheStrategy.preloadNextPage) return;
    
    const nextPageFilters = {
      ...currentFilters,
      page: (currentFilters.page || 1) + 1,
    };
    
    queryClient.prefetchQuery({
      queryKey: meetingsKeys.list(nextPageFilters),
      queryFn: async () => {
        const params = new URLSearchParams();
        Object.entries(nextPageFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
        
        const response = await fetch(`/api/meetings?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch meetings');
        return response.json();
      },
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient, cacheStrategy.preloadNextPage]);
  
  // Intelligent prefetching based on user behavior
  const intelligentPrefetch = useCallback((context: PrefetchContext) => {
    if (!cacheStrategy.intelligentPrefetch) return;
    
    // Prefetch common filter combinations
    context.userBehavior.commonFilters.forEach(filters => {
      queryClient.prefetchQuery({
        queryKey: meetingsKeys.list(filters),
        queryFn: async () => {
          const params = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, String(value));
            }
          });
          
          const response = await fetch(`/api/meetings?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch meetings');
          return response.json();
        },
        staleTime: 15 * 60 * 1000,
      });
    });
    
    // Prefetch recently viewed meeting details
    context.userBehavior.recentlyViewed.slice(0, 5).forEach(meetingId => {
      queryClient.prefetchQuery({
        queryKey: meetingsKeys.detail(meetingId),
        queryFn: async () => {
          const response = await fetch(`/api/meetings/${meetingId}`);
          if (!response.ok) throw new Error('Failed to fetch meeting');
          const data = await response.json();
          return data.meeting;
        },
        staleTime: 15 * 60 * 1000, // Longer stale time for recently viewed
      });
    });
  }, [queryClient, cacheStrategy.intelligentPrefetch]);
  
  // Background refresh for active data
  const setupBackgroundRefresh = useCallback(() => {
    if (!cacheStrategy.backgroundRefresh) return;
    
    const interval = setInterval(() => {
      // Get all cached meeting lists
      const cachedQueries = queryClient.getQueriesData({ queryKey: meetingsKeys.lists() });
      
      cachedQueries.forEach(([queryKey, data]) => {
        if (data) {
          // Only refresh if data is getting stale (older than 2 minutes)
          const queryState = queryClient.getQueryState(queryKey);
          const isStale = queryState && (Date.now() - queryState.dataUpdatedAt) > 2 * 60 * 1000;
          
          if (isStale) {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      });
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(interval);
  }, [queryClient, cacheStrategy.backgroundRefresh]);
  
  // Cache warming for initial load
  const warmCache = useCallback(async (initialFilters: MeetingsFilters = {}) => {
    // Prefetch initial data
    await queryClient.prefetchQuery({
      queryKey: meetingsKeys.list(initialFilters),
      queryFn: async () => {
        const params = new URLSearchParams();
        Object.entries(initialFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
        
        const response = await fetch(`/api/meetings?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch meetings');
        return response.json();
      },
      staleTime: 15 * 60 * 1000,
    });
    
    // Prefetch stats
    queryClient.prefetchQuery({
      queryKey: meetingsKeys.stats(),
      queryFn: async () => {
        const response = await fetch('/api/meetings/analytics');
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
      },
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient]);
  
  // Cache optimization utilities
  const optimizeCache = useCallback(() => {
    // Remove old cached data
    queryClient.getQueryCache().getAll().forEach(query => {
      const isOld = Date.now() - query.state.dataUpdatedAt > 30 * 60 * 1000; // 30 minutes
      const isUnused = !query.getObserversCount();
      
      if (isOld && isUnused) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }, [queryClient]);
  
  // Set up background refresh on mount
  useEffect(() => {
    const cleanup = setupBackgroundRefresh();
    return cleanup;
  }, [setupBackgroundRefresh]);
  
  // Clean up prefetch timeouts on unmount
  useEffect(() => {
    return () => {
      prefetchTimeouts.current.forEach(timeout => clearTimeout(timeout));
      prefetchTimeouts.current.clear();
    };
  }, []);
  
  return {
    prefetchMeetingOnHover,
    cancelPrefetch,
    prefetchNextPage,
    intelligentPrefetch,
    warmCache,
    optimizeCache,
  };
}

// Hook for managing user behavior tracking for intelligent caching
export function useUserBehaviorTracking() {
  const getStoredBehavior = useCallback((): PrefetchContext['userBehavior'] => {
    try {
      const stored = localStorage.getItem('meeting-user-behavior');
      return stored ? JSON.parse(stored) : {
        frequentSearches: [],
        commonFilters: [],
        recentlyViewed: [],
      };
    } catch {
      return {
        frequentSearches: [],
        commonFilters: [],
        recentlyViewed: [],
      };
    }
  }, []);
  
  const updateBehavior = useCallback((updates: Partial<PrefetchContext['userBehavior']>) => {
    try {
      const current = getStoredBehavior();
      const updated = { ...current, ...updates };
      localStorage.setItem('meeting-user-behavior', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to update user behavior tracking:', error);
    }
  }, [getStoredBehavior]);
  
  const trackSearch = useCallback((query: string) => {
    const behavior = getStoredBehavior();
    const updatedSearches = [
      query,
      ...behavior.frequentSearches.filter(s => s !== query)
    ].slice(0, 10);
    
    updateBehavior({ frequentSearches: updatedSearches });
  }, [getStoredBehavior, updateBehavior]);
  
  const trackFilters = useCallback((filters: MeetingsFilters) => {
    const behavior = getStoredBehavior();
    const filterKey = JSON.stringify(filters);
    const existing = behavior.commonFilters.find(f => JSON.stringify(f) === filterKey);
    
    if (!existing) {
      const updatedFilters = [filters, ...behavior.commonFilters].slice(0, 5);
      updateBehavior({ commonFilters: updatedFilters });
    }
  }, [getStoredBehavior, updateBehavior]);
  
  const trackMeetingView = useCallback((meetingId: string) => {
    const behavior = getStoredBehavior();
    const updatedViewed = [
      meetingId,
      ...behavior.recentlyViewed.filter(id => id !== meetingId)
    ].slice(0, 20);
    
    updateBehavior({ recentlyViewed: updatedViewed });
  }, [getStoredBehavior, updateBehavior]);
  
  return {
    getBehavior: getStoredBehavior,
    trackSearch,
    trackFilters,
    trackMeetingView,
  };
}

// Hook for cache performance monitoring
export function useCachePerformance() {
  const queryClient = useQueryClient();
  
  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: queries.reduce((size, query) => {
        return size + (JSON.stringify(query.state.data)?.length || 0);
      }, 0),
      hitRate: 0, // Would need to implement hit tracking
    };
    
    return stats;
  }, [queryClient]);
  
  const logCachePerformance = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      const stats = getCacheStats();
      console.log('Cache Performance Stats:', stats);
    }
  }, [getCacheStats]);
  
  return {
    getCacheStats,
    logCachePerformance,
  };
}