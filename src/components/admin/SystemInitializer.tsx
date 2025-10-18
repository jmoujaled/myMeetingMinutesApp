'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function SystemInitializer() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    setInitResult(null);

    try {
      const response = await fetch('/api/admin/init-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize system');
      }

      setInitResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">System Initialization</h3>
      <p className="text-sm text-gray-600 mb-4">
        Initialize the system to ensure tier limits are created and user profiles are properly set up.
        This can help resolve issues with transcription API errors.
      </p>

      <Button 
        onClick={handleInitialize} 
        disabled={isInitializing}
        className="mb-4"
      >
        {isInitializing ? 'Initializing...' : 'Initialize System'}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {initResult && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          <strong>Success:</strong> {initResult.message}
          <div className="mt-2">
            <ul className="list-disc list-inside">
              <li>Tier limits created: {initResult.results.tierLimitsCreated ? '✅' : '❌'}</li>
              <li>User profiles created: {initResult.results.userProfilesCreated}</li>
              {initResult.results.userProfileErrors > 0 && (
                <li>Profile creation errors: {initResult.results.userProfileErrors}</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}