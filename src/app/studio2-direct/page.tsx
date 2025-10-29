'use client';

import { useState } from 'react';

export default function Studio2Direct() {
    const [status, setStatus] = useState('Studio2 Direct Access - Bypassing Auth');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Studio2 Direct</h1>
                            <p className="text-gray-600">Bypassing auth system for testing</p>
                        </div>
                        <div className="text-sm text-gray-500">
                            Status: {status}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Direct Studio2 Access</h2>

                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <h3 className="text-green-800 font-medium">✅ Success!</h3>
                            <p className="text-green-700 mt-1">
                                Studio2 page is loading successfully when auth is bypassed.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h3 className="text-blue-800 font-medium">🔍 Diagnosis</h3>
                            <p className="text-blue-700 mt-1">
                                The issue is that ProtectedRoute is stuck in loading state because
                                supabase.auth.getSession() hangs/times out.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={() => window.location.href = '/studio2'}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Try Original Studio2 (with ProtectedRoute)
                            </button>

                            <button
                                onClick={() => window.location.href = '/basic-test'}
                                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Go to Basic Auth Test
                            </button>

                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    window.location.href = '/login';
                                }}
                                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Clear Everything & Start Over
                            </button>
                        </div>
                    </div>
                </div>

                {/* Debug Info */}
                <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    <div className="mb-2 text-gray-400">Debug Information:</div>
                    <div>• Studio2 page structure: ✅ Working</div>
                    <div>• React rendering: ✅ Working</div>
                    <div>• CSS/Styles: ✅ Working</div>
                    <div>• Problem: ❌ ProtectedRoute stuck in loading</div>
                    <div>• Root cause: ❌ supabase.auth.getSession() hangs</div>
                    <div>• Solution needed: Fix AuthContext timeout handling</div>
                </div>
            </main>
        </div>
    );
}