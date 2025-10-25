import { NextResponse } from 'next/server';
import { BatchTranscription } from 'speechmatics';
import OpenAI from 'openai';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';
import { buildSpeakerSegments } from '@/lib/speechmatics';
import { formatTimestamp } from '@/utils/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const speechmaticsKey = process.env.SPEECHMATICS_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : undefined;

async function handleStatusCheck(request: AuthenticatedRequest) {
  if (!speechmaticsKey || !openai) {
    return NextResponse.json(
      { error: 'Server is missing required credentials.' },
      { status: 500 }
    );
  }

  const speechmatics = new BatchTranscription(speechmaticsKey);
  const user = request.user;

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const filename = searchParams.get('filename');

    if (!jobId || !filename) {
      return NextResponse.json(
        { error: 'Missing jobId or filename parameter' },
        { status: 400 }
      );
    }

    // Check job status from Speechmatics
    const jobStatus = await speechmatics.getJob(jobId);
    
    if (jobStatus.job_status === 'running' || jobStatus.job_status === 'accepted') {
      return NextResponse.json({
        status: 'processing',
        jobStatus: jobStatus.job_status,
        progress: jobStatus.job_status === 'running' ? 50 : 25
      });
    }

    if (jobStatus.job_status === 'rejected' || jobStatus.job_status === 'expired') {
      // Update job status in database
      await usageService.updateJobStatus(
        user.id,
        filename,
        'failed',
        jobId,
        `Job ${jobStatus.job_status}: ${jobStatus.errors?.join(', ') || 'Unknown error'}`
      );

      return NextResponse.json({
        status: 'failed',
        error: `Transcription ${jobStatus.job_status}`,
        details: jobStatus.errors
      });
    }

    if (jobStatus.job_status === 'done') {
      // Get the full transcript
      const transcript = await speechmatics.getJobResult(jobId, 'json-v2');
      
      if (typeof transcript === 'string') {
        return NextResponse.json(
          { error: 'Unexpected transcript format from provider.' },
          { status: 502 }
        );
      }

      const segments = buildSpeakerSegments(transcript);
      const transcriptForPrompt = buildPromptTranscript(segments);

      // Generate minutes with OpenAI
      let minutes = '';
      const warnings: string[] = [];

      try {
        console.log('🤖 Generating meeting minutes with OpenAI...');
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 900,
          messages: [
            {
              role: 'system',
              content: 'You are an executive assistant who writes concise, action-oriented meeting minutes. Include decisions, open questions, and next steps when present.',
            },
            {
              role: 'user',
              content: `Create detailed meeting minutes based on the following diarized transcript. Preserve speaker attribution when relevant.\n\n${transcriptForPrompt}`,
            },
          ],
        });

        minutes = completion.choices[0]?.message?.content ?? '';
        
        if (!minutes) {
          warnings.push('AI minutes generation returned empty content');
          minutes = generateFallbackSummary(segments, transcript);
        }
      } catch (openAiError) {
        console.error('Minutes generation failed:', openAiError);
        warnings.push('Minutes generation failed; basic summary provided instead.');
        minutes = generateFallbackSummary(segments, transcript);
      }

      // Get text and SRT formats
      let transcriptText: string | undefined;
      let transcriptSrt: string | undefined;

      try {
        const [textResult, srtResult] = await Promise.all([
          speechmatics.getJobResult(jobId, 'text'),
          speechmatics.getJobResult(jobId, 'srt'),
        ]);
        transcriptText = typeof textResult === 'string' ? textResult : undefined;
        transcriptSrt = typeof srtResult === 'string' ? srtResult : undefined;
      } catch (fetchError) {
        console.warn('Unable to fetch transcript exports', fetchError);
      }

      // Fallback for transcript text
      if (!transcriptText && segments && segments.length > 0) {
        transcriptText = segments.map(segment => 
          `${segment.speakerLabel}: ${segment.text}`
        ).join('\n');
      }

      // Update job status in database with results
      const durationSeconds = transcript.job?.duration;
      await usageService.updateJobStatus(
        user.id,
        filename,
        'completed',
        jobId,
        undefined,
        durationSeconds,
        {
          transcript_text: transcriptText,
          summary: minutes,
          segments: segments,
          job_data: transcript.job
        }
      );

      // Check for usage limit warnings
      let limitExceededWarning = null;
      if (durationSeconds) {
        const durationMinutes = durationSeconds / 60;
        const updatedUsageStats = await usageService.getCurrentUsage(user.id);
        const tierLimits = await usageService.getTierLimits(user.tier);
        
        if (updatedUsageStats && tierLimits) {
          const totalDurationAfterThisJob = updatedUsageStats.currentMonth.totalDurationMinutes + durationMinutes;
          const transcriptionsAfterThisJob = updatedUsageStats.currentMonth.transcriptionsUsed + 1;
          
          if (tierLimits.max_duration_minutes !== -1 && totalDurationAfterThisJob > tierLimits.max_duration_minutes) {
            limitExceededWarning = {
              type: 'duration_exceeded',
              message: `This transcription pushed you over your monthly ${tierLimits.max_duration_minutes} minute limit.`,
              upgradeUrl: '/upgrade'
            };
          } else if (tierLimits.monthly_transcription_limit !== -1 && transcriptionsAfterThisJob >= tierLimits.monthly_transcription_limit) {
            limitExceededWarning = {
              type: 'transcription_limit_reached',
              message: `You have reached your monthly limit of ${tierLimits.monthly_transcription_limit} transcriptions.`,
              upgradeUrl: '/upgrade'
            };
          }
        }
      }

      return NextResponse.json({
        status: 'completed',
        segments,
        minutes,
        job: transcript.job,
        summary: transcript.summary,
        sentiment: transcript.sentiment_analysis,
        topics: transcript.topics,
        translations: transcript.translations,
        transcriptText,
        transcriptSrt,
        transcriptJson: transcript,
        warnings,
        limitExceeded: limitExceededWarning
      });
    }

    // Unknown status
    return NextResponse.json({
      status: 'unknown',
      jobStatus: jobStatus.job_status
    });

  } catch (error) {
    console.error('Status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check transcription status' },
      { status: 500 }
    );
  }
}

function buildPromptTranscript(segments: ReturnType<typeof buildSpeakerSegments>): string {
  if (segments.length === 0) {
    return 'No transcript content was returned.';
  }
  return segments
    .map((segment) => {
      const timestamp = formatTimestamp(segment.start);
      return `[${timestamp}] ${segment.speakerLabel}: ${segment.text}`;
    })
    .join('\n');
}

function generateFallbackSummary(segments: any[], transcript: any): string {
  const speakerCount = new Set(segments.map(s => s.speakerLabel)).size;
  const duration = Math.round((transcript.job?.duration || 0) / 60);
  const wordCount = segments.reduce((count, s) => count + (s.text?.split(' ').length || 0), 0);
  
  return `**Meeting Summary**

**Duration:** ${duration} minutes
**Participants:** ${speakerCount} speakers
**Word Count:** ~${wordCount} words

**Note:** This is an automated fallback summary. The AI-generated meeting minutes could not be created due to a temporary service issue.

**Key Points:**
- Meeting recorded with ${segments.length} conversation segments
- Multiple speakers participated in the discussion
- Full transcript is available for detailed review

**Recommendation:** Please review the full transcript for complete meeting details.`;
}

export const GET = withAuth(handleStatusCheck, {
  requireAuth: true,
  checkUsageLimits: false
});