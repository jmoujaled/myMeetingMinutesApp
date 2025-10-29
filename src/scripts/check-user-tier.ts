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

async function checkUserTier(email: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`Checking user tier for ${email}...`)

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    process.exit(1)
  }

  console.log('User details:')
  console.log('Email:', data.email)
  console.log('Tier:', data.tier)
  console.log('Full Name:', data.full_name)
  console.log('Created:', data.created_at)
  console.log('Updated:', data.updated_at)
}

const email = process.argv[2] || 'jmoujaled@gmail.com'
checkUserTier(email)
