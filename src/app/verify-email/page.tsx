'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function VerifyEmailForm() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  useEffect(() => {
    const verifyEmail = async () => {
      const supabase = createClient()
      
      try {
        // Check if user is already verified by trying to get session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // User is already verified and logged in
          setSuccess(true)
          setTimeout(() => {
            router.push('/studio2')
          }, 3000)
        } else {
          // User needs to verify email
          setLoading(false)
        }
      } catch (error) {
        console.error('Error checking verification status:', error)
        setError('Unable to check verification status')
        setLoading(false)
      }
    }

    verifyEmail()
  }, [router])

  const handleResendVerification = async () => {
    if (!email) {
      setError('Email address is required to resend verification')
      return
    }

    setResendLoading(true)
    setError('')
    
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        setError(error.message)
      } else {
        setResendSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setResendLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking verification status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Email verified!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your email has been successfully verified. You will be redirected to the studio shortly.
            </p>
            <p className="mt-4 text-center text-sm text-gray-600">
              <Link
                href="/studio2"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Continue to Studio
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {email ? (
              <>We&apos;ve sent a verification link to <strong>{email}</strong></>
            ) : (
              'Please check your email for a verification link'
            )}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {resendSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">
                Verification email sent successfully! Please check your inbox.
              </div>
            </div>
          )}

          <div className="text-center space-y-4">
            <div className="text-sm text-gray-600">
              <p>Click the verification link in your email to activate your account.</p>
              <p className="mt-2">
                Once verified, you can{' '}
                <Link
                  href="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  sign in to your account
                </Link>
              </p>
            </div>

            {email && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Didn&apos;t receive the email? Check your spam folder or resend it.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export
 default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}