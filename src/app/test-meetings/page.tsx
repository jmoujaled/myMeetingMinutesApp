'use client';

import { useState, useEffect } from 'react';

export default function TestMeetingsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testAPI() {
      try {
        setLoading(true);
        setError(null);
        
        // Test the debug endpoint first
        const debugResponse = await fetch('/api/debug/meetings');
        const debugData = await debugResponse.json();
        
        console.log('Debug response:', debugData);
        
        if (!debugResponse.ok) {
          throw new Error(`Debug API failed: ${debugData.error || debugResponse.statusText}`);
        }
        
        // Test the meetings API
        const meetingsResponse = await fetch('/api/meetings');
        const meetingsData = await meetingsResponse.json();
        
        console.log('Meetings response:', meetingsData);
        
        if (!meetingsResponse.ok) {
          throw new Error(`Meetings API failed: ${meetingsData.error || meetingsResponse.statusText}`);
        }
        
        setData({
          debug: debugData,
          meetings: meetingsData
        });
      } catch (err) {
        console.error('API test error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    testAPI();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing API endpoints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Test Results</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {data && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Debug API Response</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(data.debug, null, 2)}
              </pre>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Meetings API Response</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(data.meetings, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry Test
          </button>
          <button
            onClick={() => window.location.href = '/meetings'}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Meetings Page
          </button>
        </div>
      </div>
    </div>
  );
}