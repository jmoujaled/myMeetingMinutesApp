import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Update user tier
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const body = await request.json()
    const { tier, resetUsage } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Update tier if provided
    if (tier) {
      updateData.tier = tier
    }

    // Reset usage if requested
    if (resetUsage) {
      updateData.monthly_transcriptions_used = 0
      updateData.usage_reset_date = new Date().toISOString()
    }

    let data, error

    if (tier) {
      // Use custom function to update tier (bypasses trigger)
      const result = await supabase.rpc('admin_update_user_tier', {
        target_user_id: userId,
        new_tier: tier
      })
      
      data = result.data?.[0]
      error = result.error
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        user: data,
        message: `User tier updated to ${tier} successfully`
      })
    } else if (resetUsage) {
      // Use custom function to reset usage
      const result = await supabase.rpc('admin_reset_user_usage', {
        target_user_id: userId
      })
      
      data = result.data?.[0]
      error = result.error
      
      if (error) throw error
      
      return NextResponse.json({ 
        success: true, 
        user: data,
        message: 'User usage reset successfully'
      })
    } else {
      return NextResponse.json({ error: 'No valid operation specified' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      user: data,
      message: `User ${tier ? 'tier' : ''}${tier && resetUsage ? ' and ' : ''}${resetUsage ? 'usage' : ''} updated successfully`
    })
  } catch (error: unknown) {
    console.error('Error updating user:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Get user details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Get user's transcription jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (jobsError) throw jobsError

    // Get usage stats
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: monthlyCount } = await supabase
      .from('transcription_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())

    const { count: totalCount } = await supabase
      .from('transcription_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return NextResponse.json({
      user,
      jobs,
      stats: {
        transcriptionsThisMonth: monthlyCount || 0,
        totalTranscriptions: totalCount || 0,
        lastActivity: jobs?.[0]?.created_at || null
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching user details:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}