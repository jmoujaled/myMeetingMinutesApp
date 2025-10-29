'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function DebugUserData() {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug User Data</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Raw User Object</h2>
          <pre className="text-sm overflow-auto bg-white p-3 rounded border">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">User Profile</h2>
          <pre className="text-sm overflow-auto bg-white p-3 rounded border">
            {JSON.stringify(userProfile, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Avatar URL Check</h2>
          <div className="space-y-2">
            <p><strong>user?.user_metadata?.avatar_url:</strong> {user?.user_metadata?.avatar_url || 'Not found'}</p>
            <p><strong>user?.user_metadata?.picture:</strong> {user?.user_metadata?.picture || 'Not found'}</p>
            <p><strong>userProfile?.avatar_url:</strong> {userProfile?.avatar_url || 'Not found'}</p>
          </div>
        </div>

        {user?.user_metadata?.picture && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Avatar Image Test</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`/api/proxy-avatar?url=${encodeURIComponent(user.user_metadata.picture)}&userId=${user.id}`}
              alt="Avatar test"
              className="w-16 h-16 rounded-full border"
              onLoad={() => {
                console.log('Debug avatar loaded successfully')
              }}
              onError={(e) => {
                console.error('Debug avatar failed to load:', user.user_metadata.picture)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}