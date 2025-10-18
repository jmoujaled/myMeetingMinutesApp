'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SkipCallback() {
  const router = useRouter()

  useEffect(() => {
    // Just go straight to the app, bypassing all callback logic
    console.log('Skipping callback, going to studio2')
    router.replace('/studio2')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Bypassing callback, going to app...</p>
      </div>
    </div>
  )
}