'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LogoutRedirect() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const message = searchParams.get('message');
    const redirectTo = searchParams.get('redirect_to');

    if (message === 'signed_out' && redirectTo) {
      setIsVisible(true);
      
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            window.location.href = redirectTo;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [searchParams]);

  const handleClick = () => {
    const redirectTo = searchParams.get('redirect_to');
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleClick}
      className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 cursor-pointer transition-colors duration-200 max-w-sm text-center font-medium"
    >
      <div className="flex items-center justify-center mb-2">
        <span className="text-lg">✅</span>
        <span className="ml-2">Successfully signed out!</span>
      </div>
      <div className="text-sm opacity-90">
        Redirecting to homepage in {countdown} seconds...
      </div>
      <div className="text-xs opacity-75 mt-1">
        Click to redirect now
      </div>
    </div>
  );
}