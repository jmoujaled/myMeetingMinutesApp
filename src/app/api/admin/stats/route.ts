import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Create admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    // Get users by tier
    const { data: tierData } = await supabase
      .from('user_profiles')
      .select('tier')

    const usersByTier = tierData?.reduce((acc, user) => {
      const tier = user.tier as keyof typeof acc
      acc[tier] = (acc[tier] || 0) + 1
      return acc
    }, { free: 0, pro: 0, admin: 0 }) || { free: 0, pro: 0, admin: 0 }

    // Get total transcriptions
    const { count: totalTranscriptions } = await supabase
      .from('transcription_jobs')
      .select('*', { count: 'exact', head: true })

    // Get today's transcriptions
    const today = new Date().toISOString().split('T')[0]
    const { count: todayTranscriptions } = await supabase
      .from('transcription_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)

    // Get recent activity
    const { data: recentJobs } = await supabase
      .from('transcription_jobs')
      .select('id, filename, created_at, user_id, status')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentUsers } = await supabase
      .from('user_profiles')
      .select('id, email, created_at, tier')
      .order('created_at', { ascending: false })
      .limit(5)

    const recentActivity = [
      ...(recentJobs?.map(job => ({
        id: job.id,
        type: 'transcription_completed' as const,
        description: `Transcription completed: ${job.filename}`,
        timestamp: job.created_at
      })) || []),
      ...(recentUsers?.map(user => ({
        id: user.id,
        type: 'user_registered' as const,
        description: `New user registered: ${user.email}`,
        timestamp: user.created_at
      })) || [])
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    // Calculate active users
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: activeUserIds } = await supabase
      .from('transcription_jobs')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const uniqueActiveUsers = new Set(activeUserIds?.map(job => job.user_id) || [])

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: uniqueActiveUsers.size,
      totalTranscriptions: totalTranscriptions || 0,
      todayTranscriptions: todayTranscriptions || 0,
      usersByTier,
      recentActivity
    })
  } catch (error: unknown) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
