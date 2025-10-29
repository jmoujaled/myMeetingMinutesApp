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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

async function upgradeUserToAdmin(email: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`Upgrading user ${email} to admin tier...`)

  // First check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (fetchError || !existingUser) {
    console.error('User not found with email:', email)
    process.exit(1)
  }

  console.log('Current tier:', existingUser.tier)

  // Update the user
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ 
      tier: 'admin',
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
    .select()

  if (error) {
    console.error('Error upgrading user:', error)
    process.exit(1)
  }

  console.log('✅ User upgraded successfully!')
  console.log('New tier:', data[0].tier)
  console.log('User details:', data[0])
}

// Get email from command line or use default
const email = process.argv[2] || 'jmoujaled@gmail.com'
upgradeUserToAdmin(email)
