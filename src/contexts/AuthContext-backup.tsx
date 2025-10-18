'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, AuthError, AuthResponse, OAuthResponse } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import { clearAuthStorage, emergencyLogout } from '@/lib/logout-utils'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
    user: User | null
    userProfile: UserProfile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<AuthResponse>
    signUp: (email: string, password: string) => Promise<AuthResponse>
    signInWithGoogle: () => Promise<OAuthResponse>
    signOut: () => Promise<{ error: AuthError | null }>
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>
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



    // Load user profile from database
    const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error loading user profile:', error)
                
                // If profile doesn't exist, try to create it by calling the auth middleware
                // This will trigger the automatic profile creation
                if (error.code === 'PGRST116') {
                    console.log('User profile not found, triggering automatic creation...')
                    
                    try {
                        // Call the profile endpoint to trigger profile creation
                        const response = await fetch('/api/user/profile');
                        if (response.ok) {
                            const responseData = await response.json();
                            console.log('Profile created successfully:', responseData.user.profile);
                            return responseData.user.profile;
                        } else {
                            console.error('Profile creation API failed:', response.status, await response.text());
                            
                            // If API fails, create a default profile to prevent loading loops
                            console.log('Creating fallback profile for user:', userId);
                            const currentUser = await supabase.auth.getUser();
                            return {
                                id: userId,
                                email: currentUser.data.user?.email || '',
                                tier: 'free',
                                provider: 'unknown',
                                monthly_transcriptions_used: 0,
                                total_transcriptions: 0,
                                usage_reset_date: new Date().toISOString(),
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                full_name: null,
                                avatar_url: null,
                                provider_id: null
                            } as UserProfile;
                        }
                    } catch (createError) {
                        console.error('Error creating user profile:', createError);
                        
                        // Create fallback profile to prevent loading loops
                        console.log('Creating fallback profile due to error for user:', userId);
                        const currentUser = await supabase.auth.getUser();
                        return {
                            id: userId,
                            email: currentUser.data.user?.email || '',
                            tier: 'free',
                            provider: 'unknown',
                            monthly_transcriptions_used: 0,
                            total_transcriptions: 0,
                            usage_reset_date: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            full_name: null,
                            avatar_url: null,
                            provider_id: null
                        } as UserProfile;
                    }
                }
                
                return null
            }

            return data
        } catch (error) {
            console.error('Error loading user profile:', error)
            return null
        }
    }

    // Initialize auth state
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        
        const initializeAuth = async () => {
            try {
                // Set a timeout to prevent infinite loading
                timeoutId = setTimeout(() => {
                    console.warn('Auth initialization timeout - stopping loading state');
                    setLoading(false);
                }, 15000); // 15 second timeout

                // Try to get session, but if it fails, check server-side auth
                console.log('Getting initial session...');
                
                try {
                    const sessionPromise = supabase.auth.getSession();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('getSession timeout')), 3000)
                    );
                    
                    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

                    if (session?.user) {
                        console.log('Session found for:', session.user.email);
                        setUser(session.user)
                        const profile = await loadUserProfile(session.user.id)
                        setUserProfile(profile)
                    } else {
                        console.log('No client session found');
                    }
                } catch (sessionError) {
                    console.warn('getSession timed out (expected), using server fallback:', (sessionError as Error).message);
                    
                    // Fallback: Check if server thinks we're authenticated
                    console.log('Checking server-side auth as fallback...');
                    try {
                        const response = await fetch('/api/debug/auth-state');
                        if (response.ok) {
                            const serverAuth = await response.json();
                            if (serverAuth.user && serverAuth.hasValidAuth) {
                                console.log('Server confirms authentication, creating client session');
                                // Create a mock user object from server data
                                const mockUser = {
                                    id: serverAuth.user.id,
                                    email: serverAuth.user.email,
                                    created_at: new Date().toISOString(),
                                    user_metadata: {},
                                    app_metadata: {}
                                } as any;
                                
                                setUser(mockUser);
                                setUserProfile(serverAuth.user.profile);
                            }
                        }
                    } catch (serverError) {
                        console.error('Server auth check failed:', serverError);
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error)
            } finally {
                clearTimeout(timeoutId);
                setLoading(false)
            }
        }

        initializeAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email)

                // Clear any existing timeout
                if (timeoutId) clearTimeout(timeoutId);

                try {
                    if (session?.user) {
                        setUser(session.user)
                        const profile = await loadUserProfile(session.user.id)
                        setUserProfile(profile)
                    } else {
                        setUser(null)
                        setUserProfile(null)
                    }
                } catch (error) {
                    console.error('Error in auth state change handler:', error);
                }

                setLoading(false)
            }
        )

        return () => {
            subscription.unsubscribe()
            if (timeoutId) clearTimeout(timeoutId);
        }
    }, [])

    // Sign in with email and password
    const signIn = async (email: string, password: string): Promise<AuthResponse> => {
        setLoading(true)
        try {
            const response = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            return response
        } finally {
            setLoading(false)
        }
    }

    // Sign up with email and password
    const signUp = async (email: string, password: string): Promise<AuthResponse> => {
        setLoading(true)
        try {
            const response = await supabase.auth.signUp({
                email,
                password,
            })
            return response
        } finally {
            setLoading(false)
        }
    }

    // Sign in with Google OAuth
    const signInWithGoogle = async (): Promise<OAuthResponse> => {
        setLoading(true)
        try {
            const response = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/studio2')}`
                }
            })
            return response
        } finally {
            setLoading(false)
        }
    }

    // Sign out
    const signOut = async () => {
        setLoading(true)
        
        // Set a timeout to force redirect if signOut hangs
        const forceRedirectTimeout = setTimeout(() => {
            console.warn('AuthContext: SignOut timeout - using emergency logout')
            emergencyLogout('signout_timeout')
        }, 3000) // 3 second timeout
        
        try {
            console.log('AuthContext: Starting sign out process...')
            
            // Clear state immediately to prevent UI inconsistencies
            setUser(null)
            setUserProfile(null)
            
            // Clear authentication storage
            clearAuthStorage()
            
            // Sign out from Supabase with timeout
            console.log('AuthContext: Calling supabase.auth.signOut()...')
            const signOutPromise = supabase.auth.signOut()
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SignOut timeout')), 2000)
            )
            
            const response = await Promise.race([signOutPromise, timeoutPromise]) as any
            console.log('AuthContext: Supabase signOut response:', response)
            
            // Clear the timeout since we succeeded
            clearTimeout(forceRedirectTimeout)
            
            // Force redirect to login page
            console.log('AuthContext: Redirecting to login...')
            window.location.replace('/login?message=signed_out')
            
            console.log('AuthContext: Sign out completed successfully')
            return response
        } catch (error) {
            console.error('AuthContext: Sign out error:', error)
            
            // Clear the timeout
            clearTimeout(forceRedirectTimeout)
            
            // Clear state even on error to prevent broken states
            setUser(null)
            setUserProfile(null)
            
            // Clear storage even on error
            clearAuthStorage()
            
            // Force redirect even on error
            console.log('AuthContext: Redirecting to login after error...')
            window.location.replace('/login?error=signout_failed')
            
            return { error: error as any }
        } finally {
            setLoading(false)
        }
    }

    // Update user profile
    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user) {
            return { error: new Error('No user logged in') }
        }

        try {
            const { error } = await (supabase as any)
                .from('user_profiles')
                .update(updates)
                .eq('id', user.id)

            if (error) {
                return { error: new Error(error.message) }
            }

            // Refresh profile data
            await refreshProfile()
            return { error: null }
        } catch (error) {
            return { error: error as Error }
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
        updateProfile,
        refreshProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}