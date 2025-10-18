/**
 * Utility functions for handling logout consistently across the application
 */

/**
 * Clear all authentication-related storage
 */
export function clearAuthStorage(): void {
  try {
    // Clear localStorage items
    const keysToRemove = [
      'supabase.auth.token',
      'sb-dttqvwcwuywspiflqcjq-auth-token',
      // Add any other auth-related keys you might have
    ]
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`Could not remove localStorage key ${key}:`, error)
      }
    })
    
    // Clear sessionStorage completely
    sessionStorage.clear()
    
    console.log('Auth storage cleared successfully')
  } catch (error) {
    console.error('Error clearing auth storage:', error)
  }
}

/**
 * Force logout and redirect - use as fallback when normal logout fails
 */
export function forceLogoutAndRedirect(reason = 'logout_failed'): void {
  console.log('Force logout initiated:', reason)
  
  // Clear all storage immediately
  clearAuthStorage()
  
  // Force redirect to login immediately - don't wait for anything
  setTimeout(() => {
    window.location.replace(`/login?error=${reason}`)
  }, 0)
}

/**
 * Emergency logout - bypasses all normal logout processes
 */
export function emergencyLogout(reason = 'emergency_logout'): void {
  console.log('Emergency logout initiated:', reason)
  
  try {
    // Clear everything immediately
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  } catch (error) {
    console.error('Error during emergency cleanup:', error)
  }
  
  // Force immediate redirect
  window.location.replace(`/login?error=${reason}`)
}

/**
 * Safe logout wrapper that handles errors gracefully
 */
export async function safeLogout(
  signOutFunction: () => Promise<any>,
  context = 'unknown'
): Promise<void> {
  // Set a backup timeout to force logout if everything hangs
  const backupTimeout = setTimeout(() => {
    console.warn(`${context}: Backup logout timeout - using emergency logout`)
    emergencyLogout(`${context}_backup_timeout`)
  }, 5000) // 5 second backup timeout
  
  try {
    console.log(`${context}: Starting safe logout...`)
    
    // Create a timeout promise for the signOut function
    const signOutPromise = signOutFunction()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Safe logout timeout')), 4000)
    )
    
    await Promise.race([signOutPromise, timeoutPromise])
    console.log(`${context}: Logout completed successfully`)
    
    // Clear the backup timeout since we succeeded
    clearTimeout(backupTimeout)
  } catch (error) {
    console.error(`${context}: Logout failed:`, error)
    
    // Clear the backup timeout
    clearTimeout(backupTimeout)
    
    // Use emergency logout for immediate effect
    emergencyLogout(`${context}_logout_failed`)
  }
}