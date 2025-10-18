export interface AppError {
  type: 'network' | 'validation' | 'permission' | 'not_found' | 'server' | 'unknown';
  message: string;
  code?: string;
  details?: Record<string, any>;
  retryable: boolean;
  statusCode?: number;
}

export class AppErrorClass extends Error implements AppError {
  type: AppError['type'];
  code?: string;
  details?: Record<string, any>;
  retryable: boolean;
  statusCode?: number;

  constructor(
    message: string,
    type: AppError['type'] = 'unknown',
    options: {
      code?: string;
      details?: Record<string, any>;
      retryable?: boolean;
      statusCode?: number;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = options.code;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
  }
}

// Error type detection and classification
export function classifyError(error: unknown): AppError {
  // Handle AppError instances
  if (error instanceof AppErrorClass) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection.',
      retryable: true,
    };
  }

  // Handle Response errors (from fetch)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;
    
    if (status === 401) {
      return {
        type: 'permission',
        message: 'You are not authorized to perform this action.',
        retryable: false,
        statusCode: 401,
      };
    }
    
    if (status === 403) {
      return {
        type: 'permission',
        message: 'You do not have permission to access this resource.',
        retryable: false,
        statusCode: 403,
      };
    }
    
    if (status === 404) {
      return {
        type: 'not_found',
        message: 'The requested resource was not found.',
        retryable: false,
        statusCode: 404,
      };
    }
    
    if (status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again later.',
        retryable: true,
        statusCode: status,
      };
    }
    
    if (status >= 400) {
      return {
        type: 'validation',
        message: 'Invalid request. Please check your input.',
        retryable: false,
        statusCode: status,
      };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      retryable: false,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: 'unknown',
      message: error,
      retryable: false,
    };
  }

  // Fallback for unknown error types
  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    retryable: false,
  };
}

// User-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
  const messages: Record<AppError['type'], string> = {
    network: 'Connection problem. Please check your internet and try again.',
    validation: 'Please check your input and try again.',
    permission: 'You don\'t have permission to do this.',
    not_found: 'The item you\'re looking for wasn\'t found.',
    server: 'Something went wrong on our end. Please try again.',
    unknown: 'Something unexpected happened. Please try again.',
  };

  return error.message || messages[error.type];
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// Exponential backoff retry utility
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, backoffFactor } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const appError = classifyError(error);

      // Don't retry if error is not retryable
      if (!appError.retryable || attempt === maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

// Error reporting utility (for logging/monitoring)
export function reportError(error: AppError, context?: Record<string, any>) {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('App Error:', {
      ...error,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // In production, you would send to your error monitoring service
  // Example: Sentry, LogRocket, etc.
  // Sentry.captureException(error, { extra: context });
}