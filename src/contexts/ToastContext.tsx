'use client';

import React, { createContext, useContext } from 'react';
import { useToast } from '@/hooks/useToast';
import { Toast, ToastContainer } from '@/components/ui/toast';

interface ToastContextType {
  toast: ReturnType<typeof useToast>['toast'];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, toast } = useToast();

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer>
        {toasts.map((toastProps) => (
          <Toast key={toastProps.id} {...toastProps} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}