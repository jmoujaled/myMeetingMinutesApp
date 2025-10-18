'use client';

import { useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { 
  classifyError, 
  getUserFriendlyMessage, 
  reportError, 
  withRetry,
  AppError,
  RetryConfig 
} from '@/lib/error-handling';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  reportError?: boolean;
  retryConfig?: Partial<RetryConfig>;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { toast } = useToastContext();
  const { 
    showToast = true, 
    reportError: shouldReport = true,
    retryConfig 
  } = options;

  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    const appError = classifyError(error);
    const userMessage = getUserFriendlyMessage(appError);

    // Show toast notification
    if (showToast) {
      toast.error({
        title: 'Error',
        description: userMessage,
        duration: appError.type === 'network' ? 8000 : 5000,
      });
    }

    // Report error for monitoring
    if (shouldReport) {
      reportError(appError, context);
    }

    return appError;
  }, [toast, showToast, shouldReport]);

  const handleErrorWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    try {
      return await withRetry(operation, retryConfig);
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }, [handleError, retryConfig]);

  const handleErrorWithToast = useCallback((
    error: unknown,
    customMessage?: string,
    context?: Record<string, any>
  ) => {
    const appError = classifyError(error);
    const message = customMessage || getUserFriendlyMessage(appError);

    toast.error({
      title: 'Error',
      description: message,
      duration: 5000,
    });

    if (shouldReport) {
      reportError(appError, context);
    }

    return appError;
  }, [toast, shouldReport]);

  const showSuccessToast = useCallback((message: string, title?: string) => {
    toast.success({
      title: title || 'Success',
      description: message,
      duration: 3000,
    });
  }, [toast]);

  const showWarningToast = useCallback((message: string, title?: string) => {
    toast.warning({
      title: title || 'Warning',
      description: message,
      duration: 4000,
    });
  }, [toast]);

  const showInfoToast = useCallback((message: string, title?: string) => {
    toast.info({
      title: title || 'Info',
      description: message,
      duration: 4000,
    });
  }, [toast]);

  return {
    handleError,
    handleErrorWithRetry,
    handleErrorWithToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
    toast,
  };
}