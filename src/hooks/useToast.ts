'use client';

import { useState, useCallback, useRef } from 'react';
import { ToastProps } from '@/components/ui/toast';

interface ToastOptions {
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ActiveToast extends ToastProps {
  timeoutId?: NodeJS.Timeout;
}

export function useToast() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addToast = useCallback((options: ToastOptions) => {
    const id = `toast-${++toastIdRef.current}`;
    const duration = options.duration ?? 5000;

    const toast: ActiveToast = {
      id,
      ...options,
      onClose: () => removeToast(id),
    };

    // Auto-remove toast after duration (unless duration is 0)
    if (duration > 0) {
      toast.timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    setToasts((prev) => [...prev, toast]);
    return id;
  }, [removeToast]);

  const toast = {
    success: (options: Omit<ToastOptions, 'type'>) =>
      addToast({ ...options, type: 'success' }),
    
    error: (options: Omit<ToastOptions, 'type'>) =>
      addToast({ ...options, type: 'error' }),
    
    warning: (options: Omit<ToastOptions, 'type'>) =>
      addToast({ ...options, type: 'warning' }),
    
    info: (options: Omit<ToastOptions, 'type'>) =>
      addToast({ ...options, type: 'info' }),
    
    custom: addToast,
    
    dismiss: removeToast,
    
    dismissAll: () => {
      setToasts((prev) => {
        prev.forEach((toast) => {
          if (toast.timeoutId) {
            clearTimeout(toast.timeoutId);
          }
        });
        return [];
      });
    },
  };

  return {
    toasts,
    toast,
  };
}