import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Get transcription jobs for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: jobs, error: jobsError } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())

    // Get tier limits
    const { data: tierLimits, error: tierError } = await supabase
      .from('tier_limits')
      .select('*')
      .eq('tier', profile?.tier || 'free')
      .single()

    return NextResponse.json({
      userId,
      profile: profile || null,
      profileError: profileError?.message || null,
      jobs: jobs || [],
      jobsCount: jobs?.length || 0,
      jobsError: jobsError?.message || null,
      tierLimits: tierLimits || null,
      tierError: tierError?.message || null,
      startOfMonth: startOfMonth.toISOString()
    })
  } catch (error: unknown) {
    console.error('Debug usage error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}