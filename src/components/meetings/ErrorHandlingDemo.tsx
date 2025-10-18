'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useMeetingsErrorHandler } from '@/hooks/useMeetingsErrorHandler';
import { RetryButton } from './RetryButton';
import { ErrorState, NetworkErrorState, NotFoundErrorState } from './ErrorStates';
import { AppErrorClass } from '@/lib/error-handling';

export function ErrorHandlingDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const { handleError, showSuccessToast, toast } = useErrorHandler();
  const { 
    handleDeleteError, 
    handleExportError, 
    showDeleteSuccess 
  } = useMeetingsErrorHandler();

  const simulateNetworkError = () => {
    const error = new AppErrorClass(
      'Network connection failed',
      'network',
      { retryable: true }
    );
    handleError(error);
  };

  const simulateDeleteError = () => {
    const error = new AppErrorClass(
      'Failed to delete meeting',
      'server',
      { statusCode: 500, retryable: true }
    );
    handleDeleteError(error, 'Team Standup Meeting');
  };

  const simulateExportError = () => {
    const error = new AppErrorClass(
      'Export service unavailable',
      'server',
      { statusCode: 503, retryable: true }
    );
    handleExportError(error, 'pdf');
  };

  const simulateSuccess = () => {
    showSuccessToast('Operation completed successfully!');
  };

  const simulateDeleteSuccess = () => {
    showDeleteSuccess('Team Standup Meeting');
  };

  const simulateAsyncOperation = async () => {
    // Simulate a failing async operation
    throw new Error('Async operation failed');
  };

  if (!showDemo) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Error Handling Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowDemo(true)}>
            Show Error Handling Demo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Error Handling Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button onClick={simulateNetworkError} variant="outline" size="sm">
            Network Error
          </Button>
          <Button onClick={simulateDeleteError} variant="outline" size="sm">
            Delete Error
          </Button>
          <Button onClick={simulateExportError} variant="outline" size="sm">
            Export Error
          </Button>
          <Button onClick={simulateSuccess} variant="outline" size="sm">
            Success Toast
          </Button>
          <Button onClick={simulateDeleteSuccess} variant="outline" size="sm">
            Delete Success
          </Button>
          <RetryButton
            onRetry={simulateAsyncOperation}
            size="sm"
            showSuccessToast
            successMessage="Retry succeeded!"
          >
            Test Retry
          </RetryButton>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Error State Components:</h4>
          
          <div className="grid gap-4">
            <NetworkErrorState onRetry={() => toast.info({ description: 'Retry clicked!' })} />
            <NotFoundErrorState 
              onGoBack={() => toast.info({ description: 'Go back clicked!' })}
              onGoHome={() => toast.info({ description: 'Go home clicked!' })}
            />
            <ErrorState
              error={{
                type: 'server',
                message: 'Server is temporarily unavailable. Please try again later.',
                retryable: true,
              }}
              onRetry={() => toast.info({ description: 'Server retry clicked!' })}
            />
          </div>
        </div>

        <Button onClick={() => setShowDemo(false)} variant="ghost">
          Hide Demo
        </Button>
      </CardContent>
    </Card>
  );
}