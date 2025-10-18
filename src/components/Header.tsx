'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function Header() {
  const { user, userProfile, signOut, loading } = useAuth()
  const pathname = usePathname()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      setIsDropdownOpen(false)
      await signOut()
    } catch (error) {
      console.error('Header logout error:', error)
      window.location.replace('/login?error=logout_failed')
    }
  }

  const getAvatarContent = () => {
    // Check for Google avatar - Google OAuth provides 'picture' field, not 'avatar_url'
    const avatarUrl = user?.user_metadata?.picture || user?.user_metadata?.avatar_url || userProfile?.avatar_url
    
    // Debug logging
    console.log('Avatar debug:', {
      picture: user?.user_metadata?.picture,
      avatar_url: user?.user_metadata?.avatar_url,
      profile_avatar: userProfile?.avatar_url,
      final_url: avatarUrl,
      user_metadata: user?.user_metadata
    })
    
    if (avatarUrl) {
      // Use proxy for Google images to avoid CORS issues
      const proxyUrl = avatarUrl.startsWith('https://lh3.googleusercontent.com/') 
        ? `/api/proxy-avatar?url=${encodeURIComponent(avatarUrl)}`
        : avatarUrl

      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxyUrl}
          alt="User avatar"
          className="w-8 h-8 rounded-full object-cover border border-gray-200"
          onLoad={() => {
            console.log('Avatar image loaded successfully:', proxyUrl)
          }}
          onError={(e) => {
            console.error('Avatar image failed to load:', proxyUrl, e)
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              const name = userProfile?.full_name || user?.email || 'User'
              const initials = name
                .split(' ')
                .map(part => part.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2)
              parent.innerHTML = `<div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">${initials}</div>`
            }
          }}
        />
      )
    }

    // Otherwise, use initials
    const name = userProfile?.full_name || user?.email || 'User'
    const initials = name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return (
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
        {initials}
      </div>
    )
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/favicon.ico"
                  alt="My Meeting Minutes Logo"
                  className="w-8 h-8"
                />
                <span className="text-lg font-semibold text-gray-900">My Meeting Minutes</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo, App Name, and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.ico"
                alt="My Meeting Minutes Logo"
                className="w-8 h-8"
              />
              <span className="text-lg font-semibold text-gray-900">My Meeting Minutes</span>
            </Link>
            
            {/* Main Navigation - Only show when user is logged in */}
            {user && (
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/studio2"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/studio2'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Studio
                </Link>
                <Link
                  href="/meetings"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/meetings')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  My Meetings
                </Link>
              </nav>
            )}
          </div>

          {/* Right side - Mobile menu button and User Avatar */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                {/* Notification Bell */}
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>

                {/* User Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    {getAvatarContent()}
                  </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {userProfile?.full_name || user.email}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {userProfile && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {userProfile.tier}
                        </span>
                      )}
                    </div>

                    {/* Navigation Links */}
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          pathname === '/dashboard' ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                        }`}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/studio2"
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          pathname === '/studio2' ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                        }`}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Studio
                      </Link>
                      <Link
                        href="/meetings"
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          pathname?.startsWith('/meetings') ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                        }`}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        My Meetings
                      </Link>
                      {userProfile?.tier === 'admin' && (
                        <Link
                          href="/admin"
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                            pathname?.startsWith('/admin') ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                          }`}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                    </div>

                    {/* Settings and Logout */}
                    <div className="border-t border-gray-100 py-1">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}