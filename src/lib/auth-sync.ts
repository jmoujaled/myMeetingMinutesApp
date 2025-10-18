/**
 * Cross-window authentication synchronization
 * Ensures logout works across all browser windows/tabs
 */

const LOGOUT_EVENT = 'auth-logout'
const STORAGE_KEY = 'auth-state'

/**
 * Broadcast logout to all windows
 */
export function broadcastLogout(): void {
  // Use localStorage to communicate between windows
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    action: 'logout',
    timestamp: Date.now()
  }))
  
  // Also use BroadcastChannel if available
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(LOGOUT_EVENT)
      channel.postMessage({ action: 'logout', timestamp: Date.now() })
      channel.close()
    } catch (error) {
      console.warn('BroadcastChannel not available:', error)
    }
  }
}

/**
 * Listen for logout events from other windows
 */
export function setupLogoutListener(onLogout: () => void): () => void {
  let lastLogoutTime = 0
  
  // Storage event listener (works across windows)
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue)
        if (data.action === 'logout' && data.timestamp > lastLogoutTime) {
          lastLogoutTime = data.timestamp
          console.log('Logout detected from another window')
          onLogout()
        }
      } catch (error) {
        console.error('Error parsing logout event:', error)
      }
    }
  }
  
  // BroadcastChannel listener (backup)
  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(LOGOUT_EVENT)
      channel.onmessage = (event) => {
        if (event.data.action === 'logout' && event.data.timestamp > lastLogoutTime) {
          lastLogoutTime = event.data.timestamp
          console.log('Logout detected via BroadcastChannel')
          onLogout()
        }
      }
    } catch (error) {
      console.warn('BroadcastChannel setup failed:', error)
    }
  }
  
  window.addEventListener('storage', handleStorageChange)
  
  // Cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange)
    if (channel) {
      channel.close()
    }
  }
}

/**
 * Clear auth state from storage
 */
export function clearAuthState(): void {
  try {
    // Clear Supabase auth tokens
    const keysToRemove = [
      'supabase.auth.token',
      'sb-dttqvwcwuywspiflqcjq-auth-token',
      STORAGE_KEY
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    sessionStorage.clear()
  } catch (error) {
    console.error('Error clearing auth state:', error)
  }
}