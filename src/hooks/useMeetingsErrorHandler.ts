'use client';

import { useCallback } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AppError, classifyError } from '@/lib/error-handling';

export function useMeetingsErrorHandler() {
  const { 
    handleError, 
    handleErrorWithRetry, 
    showSuccessToast, 
    showWarningToast,
    toast 
  } = useErrorHandler();

  const handleMeetingError = useCallback((error: unknown, context?: Record<string, any>) => {
    const appError = classifyError(error);
    
    // Customize error messages for meeting-specific scenarios
    let customMessage: string | undefined;
    
    if (appError.statusCode === 404) {
      customMessage = 'This meeting or transcription no longer exists.';
    } else if (appError.statusCode === 403) {
      customMessage = 'You don\'t have permission to access this meeting.';
    } else if (appError.type === 'network') {
      customMessage = 'Unable to connect to the server. Please check your connection.';
    }

    return handleError(error, { ...context, customMessage });
  }, [handleError]);

  const handleDeleteError = useCallback((error: unknown, meetingTitle?: string) => {
    const appError = classifyError(error);
    
    let message = 'Failed to delete the item.';
    if (meetingTitle) {
      message = `Failed to delete "${meetingTitle}".`;
    }
    
    if (appError.statusCode === 404) {
      message = 'The item has already been deleted.';
    } else if (appError.statusCode === 403) {
      message = 'You don\'t have permission to delete this item.';
    }

    toast.error({
      title: 'Delete Failed',
      description: message,
      duration: 5000,
    });

    return appError;
  }, [toast]);

  const handleExportError = useCallback((error: unknown, format?: string) => {
    const appError = classifyError(error);
    
    let message = 'Failed to export the file.';
    if (format) {
      message = `Failed to export as ${format.toUpperCase()}.`;
    }
    
    if (appError.statusCode === 404) {
      message = 'The meeting data is no longer available for export.';
    } else if (appError.type === 'server') {
      message = 'Export service is temporarily unavailable. Please try again later.';
    }

    toast.error({
      title: 'Export Failed',
      description: message,
      action: appError.retryable ? {
        label: 'Retry',
        onClick: () => {
          // This would be handled by the calling component
        }
      } : undefined,
      duration: 6000,
    });

    return appError;
  }, [toast]);

  const handleSearchError = useCallback((error: unknown, query?: string) => {
    const appError = classifyError(error);
    
    let message = 'Search failed. Please try again.';
    if (query) {
      message = `Search for "${query}" failed. Please try again.`;
    }
    
    if (appError.type === 'network') {
      message = 'Unable to perform search. Please check your connection.';
    }

    toast.error({
      title: 'Search Error',
      description: message,
      duration: 4000,
    });

    return appError;
  }, [toast]);

  const showDeleteSuccess = useCallback((itemName?: string) => {
    const message = itemName ? `"${itemName}" has been deleted.` : 'Item deleted successfully.';
    showSuccessToast(message, 'Deleted');
  }, [showSuccessToast]);

  const showExportSuccess = useCallback((format: string, filename?: string) => {
    const message = filename 
      ? `"${filename}" exported as ${format.toUpperCase()}.`
      : `File exported as ${format.toUpperCase()}.`;
    showSuccessToast(message, 'Export Complete');
  }, [showSuccessToast]);

  const showSaveSuccess = useCallback((itemName?: string) => {
    const message = itemName ? `"${itemName}" has been saved.` : 'Meeting saved successfully.';
    showSuccessToast(message, 'Saved');
  }, [showSuccessToast]);

  const showUsageWarning = useCallback((message: string) => {
    showWarningToast(message, 'Usage Limit');
  }, [showWarningToast]);

  return {
    handleMeetingError,
    handleDeleteError,
    handleExportError,
    handleSearchError,
    handleErrorWithRetry,
    showDeleteSuccess,
    showExportSuccess,
    showSaveSuccess,
    showUsageWarning,
    toast,
  };
}