import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  const userId = searchParams.get('userId') // Add user ID for cache differentiation

  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  // Validate that it's a Google image URL for security
  if (!imageUrl.startsWith('https://lh3.googleusercontent.com/')) {
    return new NextResponse('Invalid image URL', { status: 400 })
  }

  try {
    // Verify user authentication if userId is provided
    if (userId) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        // Only serve image if the requesting user matches the userId parameter
        if (!user || user.id !== userId) {
          return new NextResponse('Unauthorized', { status: 401 })
        }
      } catch (authError) {
        console.warn('Auth verification failed, proceeding without verification:', authError)
      }
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyMeetingMinutes/1.0)',
        'Referer': 'https://accounts.google.com/',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Create a unique cache key that includes user ID to prevent cross-user caching issues
    const cacheKey = userId ? `user-${userId}-${Buffer.from(imageUrl).toString('base64').slice(0, 16)}` : 'anonymous'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        // Reduce cache time and make it private to prevent cross-user caching
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour only, private cache
        'ETag': cacheKey, // Use user-specific ETag
        'Vary': 'Authorization, Cookie', // Vary cache by auth headers
      },
    })
  } catch (error) {
    console.error('Error proxying avatar:', error)
    return new NextResponse('Failed to load image', { status: 500 })
  }
}