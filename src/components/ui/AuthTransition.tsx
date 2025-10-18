'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthTransitionProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
}

export default function AuthTransition({ 
  children, 
  fallback = null, 
  delay = 100 
}: AuthTransitionProps) {
  const { loading } = useAuth();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [loading, delay]);

  if (loading || !showContent) {
    return <>{fallback}</>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}