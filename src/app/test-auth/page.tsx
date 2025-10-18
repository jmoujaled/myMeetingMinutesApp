'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function TestAuthPage() {
  const { user, userProfile, loading } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Test Page</h1>
          
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Auth Status</h2>
              <div className="space-y-2">
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>User:</strong> {user ? user.email : 'None'}</p>
                <p><strong>User ID:</strong> {user?.id || 'None'}</p>
                <p><strong>Profile:</strong> {userProfile ? 'Loaded' : 'Not loaded'}</p>
                <p><strong>Tier:</strong> {userProfile?.tier || 'Unknown'}</p>
              </div>
            </div>

            {userProfile && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Details</h2>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(userProfile, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Actions</h2>
              <div className="space-x-4">
                <button
                  onClick={() => window.location.href = '/studio2'}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Go to Studio
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}