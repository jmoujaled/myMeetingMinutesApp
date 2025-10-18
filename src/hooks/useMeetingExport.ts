import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

// Types
export type ExportFormat = 'txt' | 'srt' | 'docx' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
}

export interface ExportProgress {
  meetingId: string;
  format: ExportFormat;
  status: 'preparing' | 'generating' | 'downloading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

// API functions
async function exportMeeting(meetingId: string, options: ExportOptions): Promise<Blob> {
  const params = new URLSearchParams({
    format: options.format,
    ...(options.includeTranscript !== undefined && { includeTranscript: String(options.includeTranscript) }),
    ...(options.includeSummary !== undefined && { includeSummary: String(options.includeSummary) }),
    ...(options.includeActionItems !== undefined && { includeActionItems: String(options.includeActionItems) }),
  });

  const response = await fetch(`/api/meetings/${meetingId}/export?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.blob();
}

// Custom hooks
export function useMeetingExport() {
  const [exportProgress, setExportProgress] = useState<Map<string, ExportProgress>>(new Map());
  
  const mutation = useMutation({
    mutationFn: ({ meetingId, options }: { meetingId: string; options: ExportOptions }) =>
      exportMeeting(meetingId, options),
    onMutate: ({ meetingId, options }) => {
      const progressKey = `${meetingId}-${options.format}`;
      setExportProgress(prev => new Map(prev).set(progressKey, {
        meetingId,
        format: options.format,
        status: 'preparing',
        progress: 0,
      }));
    },
    onSuccess: (blob, { meetingId, options }) => {
      const progressKey = `${meetingId}-${options.format}`;
      
      // Update progress to generating
      setExportProgress(prev => new Map(prev).set(progressKey, {
        meetingId,
        format: options.format,
        status: 'generating',
        progress: 50,
      }));
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = options.format === 'docx' ? 'docx' : options.format === 'pdf' ? 'pdf' : 'txt';
      link.download = `meeting-${meetingId}-${timestamp}.${extension}`;
      
      // Update progress to downloading
      setExportProgress(prev => new Map(prev).set(progressKey, {
        meetingId,
        format: options.format,
        status: 'downloading',
        progress: 90,
      }));
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Update progress to completed
      setTimeout(() => {
        setExportProgress(prev => new Map(prev).set(progressKey, {
          meetingId,
          format: options.format,
          status: 'completed',
          progress: 100,
        }));
        
        // Remove progress after 3 seconds
        setTimeout(() => {
          setExportProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(progressKey);
            return newMap;
          });
        }, 3000);
      }, 500);
    },
    onError: (error, { meetingId, options }) => {
      const progressKey = `${meetingId}-${options.format}`;
      setExportProgress(prev => new Map(prev).set(progressKey, {
        meetingId,
        format: options.format,
        status: 'error',
        progress: 0,
        error: error.message,
      }));
      
      // Remove error after 5 seconds
      setTimeout(() => {
        setExportProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(progressKey);
          return newMap;
        });
      }, 5000);
    },
  });
  
  const exportMeetingWithProgress = useCallback((meetingId: string, options: ExportOptions) => {
    mutation.mutate({ meetingId, options });
  }, [mutation]);
  
  const getExportProgress = useCallback((meetingId: string, format: ExportFormat): ExportProgress | undefined => {
    const progressKey = `${meetingId}-${format}`;
    return exportProgress.get(progressKey);
  }, [exportProgress]);
  
  const isExporting = useCallback((meetingId: string, format?: ExportFormat): boolean => {
    if (format) {
      const progress = getExportProgress(meetingId, format);
      return progress?.status === 'preparing' || progress?.status === 'generating' || progress?.status === 'downloading';
    }
    
    // Check if any format is exporting for this meeting
    for (const [key, progress] of exportProgress) {
      if (progress.meetingId === meetingId && 
          (progress.status === 'preparing' || progress.status === 'generating' || progress.status === 'downloading')) {
        return true;
      }
    }
    return false;
  }, [exportProgress, getExportProgress]);
  
  return {
    exportMeeting: exportMeetingWithProgress,
    getExportProgress,
    isExporting,
    exportProgress: Array.from(exportProgress.values()),
  };
}

// Hook for bulk export operations
export function useBulkExport() {
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    status: 'idle' | 'running' | 'completed' | 'error';
  }>({
    total: 0,
    completed: 0,
    failed: 0,
    status: 'idle',
  });
  
  const exportMultipleMeetings = useCallback(async (
    meetingIds: string[],
    options: ExportOptions,
    onProgress?: (progress: { completed: number; total: number; failed: number }) => void
  ) => {
    setBulkProgress({
      total: meetingIds.length,
      completed: 0,
      failed: 0,
      status: 'running',
    });
    
    let completed = 0;
    let failed = 0;
    
    for (const meetingId of meetingIds) {
      try {
        const blob = await exportMeeting(meetingId, options);
        
        // Create download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = options.format === 'docx' ? 'docx' : options.format === 'pdf' ? 'pdf' : 'txt';
        link.download = `meeting-${meetingId}-${timestamp}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        completed++;
      } catch (error) {
        console.error(`Failed to export meeting ${meetingId}:`, error);
        failed++;
      }
      
      const progress = { completed, failed, total: meetingIds.length };
      setBulkProgress(prev => ({ ...prev, completed, failed }));
      onProgress?.(progress);
      
      // Small delay between exports to prevent overwhelming the server
      if (meetingIds.indexOf(meetingId) < meetingIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setBulkProgress(prev => ({
      ...prev,
      status: failed > 0 ? 'error' : 'completed',
    }));
    
    // Reset after 5 seconds
    setTimeout(() => {
      setBulkProgress({
        total: 0,
        completed: 0,
        failed: 0,
        status: 'idle',
      });
    }, 5000);
  }, []);
  
  return {
    exportMultipleMeetings,
    bulkProgress,
    isBulkExporting: bulkProgress.status === 'running',
  };
}