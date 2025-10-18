'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ClearSession() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const clearSession = async () => {
      try {
        // Sign out to clear any broken session
        await supabase.auth.signOut()
        
        // Clear any local storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Wait a moment then redirect to login
        setTimeout(() => {
          router.replace('/login')
        }, 1000)
      } catch (error) {
        console.error('Error clearing session:', error)
        // Force redirect even if there's an error
        router.replace('/login')
      }
    }

    clearSession()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Clearing session...</p>
      </div>
    </div>
  )
}