/**
 * Script to initialize tier limits in the database
 * This can be run manually if the migration doesn't work
 */

import { createServiceClient } from '@/lib/supabase/service';

async function initTierLimits() {
  console.log('Initializing tier limits...');

  try {
    const supabase = createServiceClient();

    const defaultTierLimits = [
      {
        tier: 'free' as const,
        monthly_transcription_limit: 5,
        max_file_size_mb: 150,
        max_duration_minutes: 60,
        features: {
          basic_transcription: true,
          speaker_diarization: false,
          summaries: false,
          translations: false,
          admin_dashboard: false,
          user_management: false
        }
      },
      {
        tier: 'pro' as const,
        monthly_transcription_limit: -1,
        max_file_size_mb: -1,
        max_duration_minutes: -1,
        features: {
          basic_transcription: true,
          speaker_diarization: true,
          summaries: true,
          translations: true,
          admin_dashboard: false,
          user_management: false
        }
      },
      {
        tier: 'admin' as const,
        monthly_transcription_limit: -1,
        max_file_size_mb: -1,
        max_duration_minutes: -1,
        features: {
          basic_transcription: true,
          speaker_diarization: true,
          summaries: true,
          translations: true,
          admin_dashboard: true,
          user_management: true,
          all_features: true
        }
      }
    ];

    for (const tierLimit of defaultTierLimits) {
      console.log(`Creating tier limit for ${tierLimit.tier}...`);
      
      const { error } = await supabase
        .from('tier_limits')
        .upsert(tierLimit as any, { onConflict: 'tier' });

      if (error) {
        console.error(`Error creating tier limit for ${tierLimit.tier}:`, error);
      } else {
        console.log(`✅ Created/updated tier limit for ${tierLimit.tier}`);
      }
    }

    // Verify the tier limits were created
    console.log('\nVerifying tier limits...');
    const { data: tierLimits, error: fetchError } = await supabase
      .from('tier_limits')
      .select('*')
      .order('tier');

    if (fetchError) {
      console.error('Error fetching tier limits:', fetchError);
    } else {
      console.log('Tier limits in database:');
      tierLimits?.forEach((limit: any) => {
        console.log(`- ${limit.tier}: ${limit.monthly_transcription_limit} transcriptions/month`);
      });
    }

    console.log('\n✅ Tier limits initialization completed!');
    
  } catch (error) {
    console.error('❌ Failed to initialize tier limits:', error);
  }
}

// Export for potential use
export { initTierLimits };

// Run if called directly
if (require.main === module) {
  initTierLimits();
}