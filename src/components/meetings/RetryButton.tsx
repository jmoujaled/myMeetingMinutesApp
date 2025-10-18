'use client';

import React, { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { cn } from '@/lib/utils';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  children?: React.ReactNode;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export function RetryButton({
  onRetry,
  disabled = false,
  size = 'default',
  variant = 'outline',
  className,
  children,
  showSuccessToast = false,
  successMessage = 'Operation completed successfully',
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const { handleError, showSuccessToast: showToast } = useErrorHandler();

  const handleRetry = async () => {
    if (isRetrying || disabled) return;

    setIsRetrying(true);
    try {
      await onRetry();
      if (showSuccessToast) {
        showToast(successMessage);
      }
    } catch (error) {
      handleError(error, { action: 'retry' });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      size={size}
      variant={variant}
      className={cn(className)}
    >
      {isRetrying ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {children || (isRetrying ? 'Retrying...' : 'Retry')}
    </Button>
  );
}

// Specialized retry button for failed operations
export function OperationRetryButton({
  operation,
  operationName,
  onSuccess,
  className,
}: {
  operation: () => Promise<void>;
  operationName: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const handleRetry = async () => {
    await operation();
    onSuccess?.();
  };

  return (
    <RetryButton
      onRetry={handleRetry}
      showSuccessToast
      successMessage={`${operationName} completed successfully`}
      className={className}
    >
      Retry {operationName}
    </RetryButton>
  );
}