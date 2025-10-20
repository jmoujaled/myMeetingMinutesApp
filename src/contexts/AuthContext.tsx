'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthError, AuthResponse, OAuthResponse } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import { broadcastLogout, setupLogoutListener, clearAuthState } from '@/lib/auth-sync'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
    user: User | null
    userProfile: UserProfile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<AuthResponse>
    signUp: (email: string, password: string) => Promise<AuthResponse>
    signInWithGoogle: () => Promise<OAuthResponse>
    signOut: () => Promise<{ error: AuthError | null }>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Simple profile loading - no creation logic here
    const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Profile not found:', error.code)
                return null
            }

            return data
        } catch (error) {
            console.error('Error loading profile:', error)
            return null
        }
    }

    // Initialize auth state - SIMPLIFIED
    useEffect(() => {
        let mounted = true

        const initializeAuth = async () => {
            try {
                // Simple session check - no timeouts or fallbacks
                const { data: { session } } = await supabase.auth.getSession()

                if (mounted) {
                    if (session?.user) {
                        console.log('Session found:', session.user.email)
                        setUser(session.user)
                        
                        // Load profile, but don't block on it
                        loadUserProfile(session.user.id).then(profile => {
                            if (mounted) {
                                setUserProfile(profile)
                            }
                        })
                    } else {
                        console.log('No session found')
                        setUser(null)
                        setUserProfile(null)
                    }
                    setLoading(false)
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        initializeAuth()

        // Listen for auth changes - SIMPLIFIED
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event)

                if (!mounted) return

                if (session?.user) {
                    setUser(session.user)
                    // Load profile asynchronously
                    loadUserProfile(session.user.id).then(profile => {
                        if (mounted) {
                            setUserProfile(profile)
                        }
                    })
                } else {
                    setUser(null)
                    setUserProfile(null)
                }

                setLoading(false)
            }
        )

        // Setup cross-window logout listener
        const cleanupLogoutListener = setupLogoutListener(() => {
            if (mounted) {
                console.log('Logout detected from another window')
                setUser(null)
                setUserProfile(null)
                window.location.replace('/login?message=signed_out_other_window')
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
            cleanupLogoutListener()
        }
    }, [])

    // Sign in with email and password
    const signIn = async (email: string, password: string): Promise<AuthResponse> => {
        const response = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return response
    }

    // Sign up with email and password
    const signUp = async (email: string, password: string): Promise<AuthResponse> => {
        const response = await supabase.auth.signUp({
            email,
            password,
        })
        return response
    }

    // Sign in with Google OAuth
    const signInWithGoogle = async (): Promise<OAuthResponse> => {
        const response = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/studio2')}`
            }
        })
        return response
    }

    // Sign out - SIMPLIFIED with cross-window sync
    const signOut = async () => {
        try {
            console.log('Starting signOut...')
            
            // Clear state immediately
            setUser(null)
            setUserProfile(null)
            
            // Clear auth storage
            clearAuthState()
            
            // Broadcast logout to other windows
            broadcastLogout()
            
            // Sign out from Supabase
            const response = await supabase.auth.signOut()
            
            // Redirect to external login with auto-redirect back to homepage
            const externalLoginUrl = process.env.NEXT_PUBLIC_EXTERNAL_LOGIN_URL
            if (externalLoginUrl) {
                window.location.replace(`${externalLoginUrl}/login?message=signed_out&redirect_to=${encodeURIComponent(window.location.origin)}`)
            } else {
                // For production without external login, force a full page reload to homepage
                window.location.href = '/'
            }
            
            return response
        } catch (error) {
            console.error('SignOut error:', error)
            
            // Clear state even on error
            setUser(null)
            setUserProfile(null)
            clearAuthState()
            broadcastLogout()
            
            // Force redirect even on error
            const externalLoginUrl = process.env.NEXT_PUBLIC_EXTERNAL_LOGIN_URL
            if (externalLoginUrl) {
                window.location.replace(`${externalLoginUrl}/login?error=signout_failed&redirect_to=${encodeURIComponent(window.location.origin)}`)
            } else {
                // For production without external login, force a full page reload to homepage
                window.location.href = '/'
            }
            
            return { error: error as any }
        }
    }

    // Refresh user profile data
    const refreshProfile = async () => {
        if (!user) return

        const profile = await loadUserProfile(user.id)
        setUserProfile(profile)
    }

    const value: AuthContextType = {
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}