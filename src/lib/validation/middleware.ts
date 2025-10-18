import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiErrorSchema } from './meetings-schemas';

/**
 * Validation middleware for API request bodies
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<{ data: T | null; error: NextResponse | null }> => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return { data: validatedData, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          data: null,
          error: NextResponse.json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: {
                issues: error.errors.map(err => ({
                  path: err.path.join('.'),
                  message: err.message,
                  code: err.code,
                })),
              },
            },
            { status: 400 }
          ),
        };
      }
      
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Invalid request body',
            code: 'INVALID_JSON',
          },
          { status: 400 }
        ),
      };
    }
  };
}

/**
 * Validation middleware for URL search parameters
 */
export function validateSearchParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { data: T | null; error: NextResponse | null } {
  try {
    // Convert URLSearchParams to a plain object
    const params: Record<string, string | string[]> = {};
    
    searchParams.forEach((value, key) => {
      if (params[key]) {
        // Handle multiple values for the same key
        if (Array.isArray(params[key])) {
          (params[key] as string[]).push(value);
        } else {
          params[key] = [params[key] as string, value];
        }
      } else {
        params[key] = value;
      }
    });
    
    const validatedData = schema.parse(params);
    return { data: validatedData, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Invalid query parameters',
            code: 'VALIDATION_ERROR',
            details: {
              issues: error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
          },
          { status: 400 }
        ),
      };
    }
    
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'INVALID_PARAMS',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validation middleware for URL path parameters
 */
export function validatePathParams<T>(schema: z.ZodSchema<T>, params: Record<string, string | string[]>): { data: T | null; error: NextResponse | null } {
  try {
    const validatedData = schema.parse(params);
    return { data: validatedData, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Invalid path parameters',
            code: 'VALIDATION_ERROR',
            details: {
              issues: error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            },
          },
          { status: 400 }
        ),
      };
    }
    
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid path parameters',
          code: 'INVALID_PARAMS',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Sanitize string input to prevent XSS and other injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj } as any;
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 400,
  details?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
    },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}