'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  RefreshCw, 
  Search, 
  FileX, 
  Shield,
  Home,
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/error-handling';

interface ErrorStateProps {
  error: AppError;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorState({ 
  error, 
  onRetry, 
  onGoBack, 
  onGoHome,
  className = '' 
}: ErrorStateProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Wifi className="h-12 w-12 text-orange-500" />;
      case 'not_found':
        return <FileX className="h-12 w-12 text-gray-500" />;
      case 'permission':
        return <Shield className="h-12 w-12 text-red-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Connection Problem';
      case 'not_found':
        return 'Not Found';
      case 'permission':
        return 'Access Denied';
      case 'validation':
        return 'Invalid Request';
      case 'server':
        return 'Server Error';
      default:
        return 'Something Went Wrong';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="mb-6">
        {getErrorIcon()}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {getErrorTitle()}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {error.message}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {error.retryable && onRetry && (
          <Button onClick={onRetry} className="min-w-[120px]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {onGoBack && (
          <Button variant="outline" onClick={onGoBack} className="min-w-[120px]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
        
        {onGoHome && (
          <Button variant="outline" onClick={onGoHome} className="min-w-[120px]">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}

// Specific error states for common scenarios
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      error={{
        type: 'network',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        retryable: true,
      }}
      onRetry={onRetry}
    />
  );
}

export function NotFoundErrorState({ onGoBack, onGoHome }: { 
  onGoBack?: () => void;
  onGoHome?: () => void;
}) {
  return (
    <ErrorState
      error={{
        type: 'not_found',
        message: 'The meeting or transcription you\'re looking for could not be found.',
        retryable: false,
      }}
      onGoBack={onGoBack}
      onGoHome={onGoHome}
    />
  );
}

export function PermissionErrorState({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorState
      error={{
        type: 'permission',
        message: 'You don\'t have permission to access this resource.',
        retryable: false,
      }}
      onGoHome={onGoHome}
    />
  );
}

export function SearchErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Search className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Search Failed
      </h3>
      <p className="text-gray-600 mb-4">
        We couldn't complete your search. Please try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Search
        </Button>
      )}
    </div>
  );
}

export function LoadingErrorState({ 
  onRetry, 
  message = "Failed to load data" 
}: { 
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-orange-500 mb-3" />
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}