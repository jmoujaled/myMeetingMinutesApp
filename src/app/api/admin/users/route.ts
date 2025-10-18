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

    // Get all users
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const { count: monthlyCount } = await supabase
          .from('transcription_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString())

        const { count: totalCount } = await supabase
          .from('transcription_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const { data: lastJob } = await supabase
          .from('transcription_jobs')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        return {
          ...user,
          stats: {
            transcriptionsThisMonth: monthlyCount || 0,
            totalTranscriptions: totalCount || 0,
            lastActivity: lastJob?.[0]?.created_at || null
          }
        }
      })
    )

    return NextResponse.json({ users: usersWithStats })
  } catch (error: unknown) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
