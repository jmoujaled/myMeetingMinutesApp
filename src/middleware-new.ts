import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    // Define route categories
    const protectedRoutes = ['/dashboard', '/studio', '/studio2', '/profile', '/upgrade', '/admin']
    const publicRoutes = ['/login', '/register', '/auth', '/forgot-password', '/reset-password']
    const bypassRoutes = ['/test-logout', '/emergency-login', '/auth/debug', '/repair-session', '/debug-env']
    
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    const isPublicRoute = publicRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    const isBypassRoute = bypassRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    // Handle authentication errors
    if (error) {
      console.error('Middleware auth error:', error)
      if (isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'session_expired')
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Handle unauthenticated users
    if (!user) {
      if (isProtectedRoute && !isBypassRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'access_denied')
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // User is authenticated - handle profile and permissions
    
    // Check admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tier')
          .eq('id', user.id)
          .single()

        if (!profile || profile.tier !== 'admin') {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          url.searchParams.set('error', 'insufficient_permissions')
          return NextResponse.redirect(url)
        }
      } catch (profileError) {
        console.error('Error checking admin permissions:', profileError)
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('error', 'profile_check_failed')
        return NextResponse.redirect(url)
      }
    }

    // Redirect authenticated users away from public auth pages
    if (isPublicRoute && request.nextUrl.pathname !== '/auth/callback') {
      const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
      const url = request.nextUrl.clone()
      url.pathname = redirectTo
      url.search = '' // Clear query params
      return NextResponse.redirect(url)
    }

  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to proceed but log it
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}