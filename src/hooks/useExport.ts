import { useState, useCallback } from 'react';
import { ExportClient, type ExportClientOptions } from '@/lib/export-client';
import type { ExportFormat } from '@/lib/supabase/meetings-types';

interface ExportState {
  isExporting: boolean;
  error: string | null;
  progress: number;
}

interface UseExportReturn {
  exportState: ExportState;
  downloadExport: (recordId: string, options: ExportClientOptions) => Promise<void>;
  downloadBatchExports: (recordIds: string[], options: ExportClientOptions) => Promise<void>;
  getExportPreview: (recordId: string, format: ExportFormat) => Promise<{ size: number; filename: string }>;
  clearError: () => void;
  resetState: () => void;
}

export function useExport(): UseExportReturn {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    error: null,
    progress: 0,
  });

  const downloadExport = useCallback(async (
    recordId: string,
    options: ExportClientOptions
  ) => {
    try {
      setExportState({
        isExporting: true,
        error: null,
        progress: 0,
      });

      // Validate options
      ExportClient.validateExportOptions(options);

      // Start export
      setExportState(prev => ({ ...prev, progress: 50 }));
      
      await ExportClient.downloadExport(recordId, options);
      
      setExportState({
        isExporting: false,
        error: null,
        progress: 100,
      });

      // Reset progress after a short delay
      setTimeout(() => {
        setExportState(prev => ({ ...prev, progress: 0 }));
      }, 1000);

    } catch (error) {
      setExportState({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Export failed',
        progress: 0,
      });
    }
  }, []);

  const downloadBatchExports = useCallback(async (
    recordIds: string[],
    options: ExportClientOptions
  ) => {
    try {
      setExportState({
        isExporting: true,
        error: null,
        progress: 0,
      });

      // Validate options
      ExportClient.validateExportOptions(options);

      const totalRecords = recordIds.length;
      let completedRecords = 0;

      // Download exports with progress tracking
      const downloadPromises = recordIds.map(async (recordId) => {
        try {
          await ExportClient.downloadExport(recordId, options);
          completedRecords++;
          setExportState(prev => ({
            ...prev,
            progress: Math.round((completedRecords / totalRecords) * 100),
          }));
        } catch (error) {
          console.error(`Failed to export record ${recordId}:`, error);
          // Continue with other exports
        }
      });

      await Promise.all(downloadPromises);

      setExportState({
        isExporting: false,
        error: null,
        progress: 100,
      });

      // Reset progress after a short delay
      setTimeout(() => {
        setExportState(prev => ({ ...prev, progress: 0 }));
      }, 1000);

    } catch (error) {
      setExportState({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Batch export failed',
        progress: 0,
      });
    }
  }, []);

  const getExportPreview = useCallback(async (
    recordId: string,
    format: ExportFormat
  ) => {
    try {
      return await ExportClient.getExportPreview(recordId, format);
    } catch (error) {
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Preview failed',
      }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setExportState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setExportState({
      isExporting: false,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    exportState,
    downloadExport,
    downloadBatchExports,
    getExportPreview,
    clearError,
    resetState,
  };
}

// Additional hook for export format utilities
export function useExportFormats() {
  const getAvailableFormats = useCallback((recordType: 'meeting' | 'transcription') => {
    return ExportClient.getAvailableFormats(recordType);
  }, []);

  const isFormatSupported = useCallback((
    recordType: 'meeting' | 'transcription',
    format: ExportFormat
  ) => {
    return ExportClient.isFormatSupported(recordType, format);
  }, []);

  const getFormatDisplayName = useCallback((format: ExportFormat) => {
    return ExportClient.getFormatDisplayName(format);
  }, []);

  const getFormatDescription = useCallback((format: ExportFormat) => {
    return ExportClient.getFormatDescription(format);
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    return ExportClient.formatFileSize(bytes);
  }, []);

  const createExportOptions = useCallback((
    format: ExportFormat,
    overrides: Partial<ExportClientOptions> = {}
  ) => {
    return ExportClient.createExportOptions(format, overrides);
  }, []);

  return {
    getAvailableFormats,
    isFormatSupported,
    getFormatDisplayName,
    getFormatDescription,
    formatFileSize,
    createExportOptions,
  };
}