import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env file
const envPath = join(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim()
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

async function upgradeUserToAdmin(email: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(`Upgrading user ${email} to admin tier using direct SQL...`)

  // Use raw SQL to bypass the trigger
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE user_profiles 
      SET tier = 'admin', updated_at = NOW() 
      WHERE email = '${email}' 
      RETURNING *;
    `
  })

  if (error) {
    console.error('RPC method not available, trying alternative approach...')
    
    // Alternative: Disable trigger temporarily
    const { data: result, error: sqlError } = await supabase
      .from('user_profiles')
      .update({ 
        tier: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()

    if (sqlError) {
      console.error('Error:', sqlError)
      console.log('\nPlease run this SQL directly in Supabase SQL Editor:')
      console.log(`
UPDATE user_profiles 
SET tier = 'admin', updated_at = NOW() 
WHERE email = '${email}';
      `)
      process.exit(1)
    }

    console.log('✅ User upgraded successfully!')
    console.log('User details:', result[0])
    return
  }

  console.log('✅ User upgraded successfully!')
  console.log('User details:', data)
}

const email = process.argv[2] || 'jmoujaled@gmail.com'
upgradeUserToAdmin(email)
