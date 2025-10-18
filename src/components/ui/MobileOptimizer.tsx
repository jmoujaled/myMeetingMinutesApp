'use client';

import { useEffect } from 'react';
import { optimizeForMobile } from '@/utils/mobile-detection';

export default function MobileOptimizer() {
  useEffect(() => {
    const cleanup = optimizeForMobile();
    return cleanup;
  }, []);

  return null;
}