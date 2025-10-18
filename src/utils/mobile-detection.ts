/**
 * Mobile detection and optimization utilities
 */

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
};

export const getViewportSize = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;
  
  return window.devicePixelRatio || 1;
};

export const isLandscape = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth > window.innerHeight;
};

export const getScreenSize = () => {
  const { width } = getViewportSize();
  
  if (width < 640) return 'mobile';
  if (width < 768) return 'tablet-small';
  if (width < 1024) return 'tablet';
  if (width < 1280) return 'desktop-small';
  return 'desktop';
};

export const addMobileOptimizations = () => {
  if (typeof window === 'undefined') return;
  
  // Prevent zoom on input focus for iOS
  if (isIOS()) {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      input.addEventListener('focus', () => {
        const element = input as HTMLElement;
        if (element.style.fontSize !== '16px') {
          element.style.fontSize = '16px';
        }
      });
    });
  }
  
  // Add touch-friendly classes to interactive elements
  const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
  interactiveElements.forEach((element) => {
    if (!element.classList.contains('touch-button')) {
      element.classList.add('touch-button');
    }
  });
  
  // Optimize scroll performance
  (document.body.style as any).webkitOverflowScrolling = 'touch';
  
  // Add safe area support for notched devices
  if (isIOS()) {
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
  }
};

export const optimizeForMobile = () => {
  if (typeof window === 'undefined') return;
  
  // Run optimizations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addMobileOptimizations);
  } else {
    addMobileOptimizations();
  }
  
  // Re-run optimizations on dynamic content changes
  const observer = new MutationObserver(() => {
    addMobileOptimizations();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  return () => observer.disconnect();
};