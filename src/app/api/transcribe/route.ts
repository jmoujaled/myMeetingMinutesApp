import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  BatchTranscription,
  type BatchTranscriptionConfig,
  type BatchTranscriptionConfigDiarizationEnum,
  type SummarizationConfig,
  SummarizationConfigContentTypeEnum,
  SummarizationConfigSummaryLengthEnum,
  SummarizationConfigSummaryTypeEnum,
  type TopicDetectionConfig,
  SpeechmaticsResponseError,
} from 'speechmatics';

process.env.UNDICI_HEADERS_TIMEOUT = '300000';
process.env.UNDICI_BODY_TIMEOUT = '0';

import { buildSpeakerSegments } from '@/lib/speechmatics';
import { formatTimestamp } from '@/utils/time';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Reduced timeout for faster response

const speechmaticsKey = process.env.SPEECHMATICS_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!speechmaticsKey) {
  console.warn('Transcription API key is not set. The endpoint will fail.');
}

if (!openaiKey) {
  console.warn('Generation API key is not set. The endpoint will fail.');
}

const openai = openaiKey
  ? new OpenAI({ apiKey: openaiKey })
  : undefined;

async function handleTranscription(request: AuthenticatedRequest) {
  if (!speechmaticsKey || !openai) {
    return NextResponse.json(
      { error: 'Server is missing required credentials.' },
      { status: 500 },
    );
  }

  const speechmatics = new BatchTranscription(speechmaticsKey);
  const user = request.user;
  let derivedName = `upload-${Date.now()}`; // Default filename

  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio');
    
    console.log('🔍 TRANSCRIBE: Received form data');
    console.log('🔍 TRANSCRIBE: Audio blob type:', typeof audioBlob);
    console.log('🔍 TRANSCRIBE: Audio blob instanceof Blob:', audioBlob instanceof Blob);
    console.log('🔍 TRANSCRIBE: Audio blob instanceof File:', typeof File !== 'undefined' && audioBlob instanceof File);
    console.log('🔍 TRANSCRIBE: Audio blob details:', {
      hasBlob: !!audioBlob,
      type: audioBlob?.constructor?.name,
      size: audioBlob instanceof Blob ? audioBlob.size : 'N/A',
      mimeType: audioBlob instanceof Blob ? audioBlob.type : 'N/A'
    });
    
    const isValidBlob = audioBlob instanceof Blob;
    
    if (!audioBlob || !isValidBlob) {
      console.error('❌ TRANSCRIBE: Invalid audio blob', {
        received: audioBlob,
        type: typeof audioBlob,
        isBlob: isValidBlob
      });
      return NextResponse.json(
        { 
          error: 'Upload an audio file under the "audio" field.',
          debug: {
            received: typeof audioBlob,
            isBlob: isValidBlob,
            formDataKeys: Array.from(formData.keys())
          }
        },
        { status: 400 },
      );
    }

    // Check file size and duration limits before processing
    const fileSizeMB = audioBlob.size / (1024 * 1024);
    
    // Pre-check usage limits with file size
    const usageLimitCheck = await usageService.checkLimits(user.id, user.tier, { 
      fileSizeMB 
    });

    if (!usageLimitCheck.canProceed) {
      return NextResponse.json(
        { 
          error: usageLimitCheck.reason || 'Usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED',
          details: {
            currentTier: user.tier,
            usageStats: usageLimitCheck.usageStats,
            upgradeUrl: '/upgrade'
          }
        },
        { status: 429 }
      );
    }

    const isFile = typeof File !== 'undefined' && audioBlob instanceof File;
    derivedName =
      (isFile && audioBlob.name) ||
      formData.get('fileName')?.toString() ||
      `upload-${Date.now()}`;
    const inferredType = audioBlob.type || 'application/octet-stream';
    const transcriptionInput: Parameters<BatchTranscription['transcribe']>[0] =
      isFile
        ? (audioBlob as File)
        : { data: audioBlob, fileName: derivedName };

    console.info(
      'Transcription upload received',
      JSON.stringify(
        {
          name: derivedName,
          type: inferredType,
          size:
            typeof audioBlob.size === 'number' ? audioBlob.size : undefined,
          usingNamedFile: isFile,
          userId: user.id,
          userTier: user.tier,
        },
        null,
        2,
      ),
    );

    // Ensure user profile exists before recording usage
    try {
      console.log('🔧 TRANSCRIBE: Attempting to record usage for user:', user.id);
      await usageService.recordUsage(user.id, {
        filename: derivedName,
        fileSize: audioBlob.size,
        usageCost: 1
      });
      console.log('✅ TRANSCRIBE: Successfully recorded usage');
    } catch (recordError) {
      console.error('❌ TRANSCRIBE: Failed to record usage:', recordError);
      console.error('❌ TRANSCRIBE: Error details:', {
        message: recordError instanceof Error ? recordError.message : 'Unknown error',
        stack: recordError instanceof Error ? recordError.stack : undefined,
        userId: user.id,
        filename: derivedName,
        fileSize: audioBlob.size
      });
      // Continue without recording usage to prevent blocking the transcription
      // This is a non-critical failure - the transcription should still proceed
    }

    const language = formData.get('language')?.toString() ?? 'en';
    const diarizationMode =
      (formData.get('diarizationMode')?.toString() as
        | BatchTranscriptionConfigDiarizationEnum
        | undefined) ?? 'speaker';
    const sensitivityInput = formData.get('speakerSensitivity');
    const sensitivityValue =
      sensitivityInput !== null && sensitivityInput !== undefined
        ? Number.parseFloat(sensitivityInput.toString())
        : undefined;
    const speakerSensitivity = Number.isFinite(sensitivityValue)
      ? Math.min(Math.max(sensitivityValue as number, 0), 1)
      : undefined;

    const meetingContext = formData.get('meetingContext')?.toString().trim() ?? '';

    const enableSummarization =
      formData.get('enableSummarization')?.toString() === 'true';
    const summaryType = formData.get('summaryType')?.toString();
    const summaryLength = formData.get('summaryLength')?.toString();
    const summaryContentType =
      formData.get('summaryContentType')?.toString();

    const enableSentiment =
      formData.get('enableSentiment')?.toString() === 'true';
    const enableTopics = formData.get('enableTopics')?.toString() === 'true';

    const topicsRaw = formData.get('topics')?.toString() ?? '';
    const topics = topicsRaw
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);

    const translationLanguagesRaw =
      formData.getAll('translationLanguages')?.join(',') ??
      formData.get('translationLanguages')?.toString() ??
      '';
    const translationLanguages = translationLanguagesRaw
      .split(',')
      .map((lang) => lang.trim())
      .filter(Boolean);

    const transcriptionConfig: BatchTranscriptionConfig = {
      language,
    };

    if (diarizationMode !== 'none') {
      transcriptionConfig.diarization = diarizationMode;
      if (diarizationMode === 'speaker' && speakerSensitivity !== undefined) {
        transcriptionConfig.speaker_diarization_config = {
          speaker_sensitivity: speakerSensitivity,
        };
      }
    }

    const summarizationConfig: SummarizationConfig | undefined =
      enableSummarization
        ? {
            summary_type: mapSummaryType(summaryType),
            summary_length: mapSummaryLength(summaryLength),
            content_type: mapSummaryContentType(summaryContentType),
          }
        : undefined;

    const topicDetectionConfig: TopicDetectionConfig | undefined =
      enableTopics
        ? {
            topics: topics.length > 0 ? topics : undefined,
          }
        : undefined;

    const jobConfig: Parameters<BatchTranscription['transcribe']>[1] = {
      transcription_config: transcriptionConfig,
      summarization_config: summarizationConfig,
      sentiment_analysis_config: enableSentiment ? {} : undefined,
      topic_detection_config: topicDetectionConfig,
      translation_config:
        translationLanguages.length > 0
          ? { target_languages: translationLanguages }
          : undefined,
    };

    const warnings: string[] = [];

    // For now, let's keep the original synchronous approach but with reduced timeout
    // This is a temporary fix until we can implement proper async processing
    let transcript: Awaited<ReturnType<typeof speechmatics.transcribe>>;

    try {
      transcript = await speechmatics.transcribe(
        transcriptionInput,
        jobConfig,
        'json-v2',
      );
    } catch (error) {
      if (error instanceof SpeechmaticsResponseError) {
        warnings.push(
          'Transcription request was rejected. Trying a simpler configuration.',
        );
        try {
          transcript = await speechmatics.transcribe(
            transcriptionInput,
            { transcription_config: transcriptionConfig },
            'json-v2',
          );
        } catch (innerError) {
          if (innerError instanceof SpeechmaticsResponseError) {
            warnings.push(
              'Transcription with diarization was rejected. Falling back to minimal transcription (no diarization or extras).',
            );
            const minimalConfig: BatchTranscriptionConfig = { language };
            transcript = await speechmatics.transcribe(
              transcriptionInput,
              { transcription_config: minimalConfig },
              'json-v2',
            );
          } else {
            throw innerError;
          }
        }
      } else if (error instanceof Error) {
        console.error('Transcription service failed', error);
        throw error;
      } else {
        throw error;
      }
    }

    if (typeof transcript === 'string') {
      return NextResponse.json(
        { error: 'Unexpected transcript format from provider.' },
        { status: 502 },
      );
    }

    const segments = buildSpeakerSegments(transcript);
    const transcriptForPrompt = buildPromptTranscript(segments);
    const contextForPrompt = meetingContext
      ? `Meeting context provided by the organizer:
${meetingContext}

`
      : '';

    let minutes = '';
    
    // Helper function to attempt OpenAI minutes generation
    const generateMinutes = async (attempt = 1, useBackupModel = false) => {
      // Primary model: gpt-4o-mini, Backup model: gpt-3.5-turbo
      const model = useBackupModel ? 'gpt-3.5-turbo' : 'gpt-4o-mini';
      console.log(`🤖 Starting OpenAI minutes generation (attempt ${attempt}, model: ${model})...`);
      console.log('📏 Prompt length:', `${contextForPrompt}${transcriptForPrompt}`.length, 'characters');
      console.log('📊 Segments count:', segments.length);
      
      const completion = await openai.chat.completions.create({
        model,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content: 'You are an executive assistant who writes concise, action-oriented meeting minutes. Include decisions, open questions, and next steps when present.',
          },
          {
            role: 'user',
            content: `Create detailed meeting minutes based on the following diarized transcript. Preserve speaker attribution when relevant.\n\n${contextForPrompt}${transcriptForPrompt}`,
          },
        ],
      });
      
      const generatedMinutes = completion.choices[0]?.message?.content ?? '';
      
      console.log('✅ OpenAI call completed successfully');
      console.log('📝 Generated minutes length:', generatedMinutes.length);
      console.log('🔢 Tokens used:', completion.usage?.total_tokens || 'unknown');
      console.log('🎯 Model used:', completion.model);
      console.log('📋 Response details:', {
        choices: completion.choices?.length || 0,
        finishReason: completion.choices?.[0]?.finish_reason,
        hasContent: !!completion.choices?.[0]?.message?.content
      });
      
      // Additional validation
      if (completion.choices?.length === 0) {
        console.warn('⚠️  OpenAI returned no choices in response');
      }
      
      if (completion.choices?.[0]?.finish_reason === 'length') {
        console.warn('⚠️  OpenAI response was truncated due to max_tokens limit');
      }
      
      return generatedMinutes;
    };
    
    // Try OpenAI minutes generation with retry logic
    try {
      minutes = await generateMinutes(1);
      
      // If we get empty content, try once more with same model
      if (minutes.length === 0) {
        console.warn('⚠️  OpenAI returned empty content, retrying with same model...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        minutes = await generateMinutes(2);
        
        // If still empty, try with backup model
        if (minutes.length === 0) {
          console.warn('⚠️  Still empty, trying with backup model (gpt-3.5-turbo)...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          minutes = await generateMinutes(3, true);
          
          if (minutes.length === 0) {
            console.warn('⚠️  OpenAI returned empty content with both models, generating fallback summary');
            
            // Generate a basic fallback summary
            const speakerCount = new Set(segments.map(s => s.speakerLabel)).size;
            const duration = Math.round((transcript.job?.duration || 0) / 60);
            const wordCount = segments.reduce((count, s) => count + (s.text?.split(' ').length || 0), 0);
            
            minutes = `**Meeting Summary**

**Duration:** ${duration} minutes
**Participants:** ${speakerCount} speakers
**Word Count:** ~${wordCount} words

**Note:** This is an automated fallback summary. The AI-generated meeting minutes could not be created due to a temporary service issue.

**Key Points:**
- Meeting recorded with ${segments.length} conversation segments
- Multiple speakers participated in the discussion
- Full transcript is available for detailed review

**Recommendation:** Please review the full transcript for complete meeting details.`;

            warnings.push('AI minutes generation failed; basic summary provided instead.');
          }
        }
      }
      
    } catch (openAiError: unknown) {
      console.error('❌ Minutes generation failed:', openAiError);
      const error = openAiError as { message?: string; response?: { status?: number; statusText?: string; data?: unknown } };
      console.error('Error details:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      });
      
      // Try one more time if it's a network/timeout error
      const errorObj = openAiError as { code?: string; response?: { status?: number } };
      if (errorObj?.code === 'ECONNRESET' || errorObj?.code === 'ETIMEDOUT' || 
          (errorObj?.response?.status && errorObj.response.status >= 500)) {
        try {
          console.log('🔄 Retrying OpenAI call due to network/server error...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          minutes = await generateMinutes(4);
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          warnings.push('Minutes generation failed after retry; minutes are unavailable.');
        }
      } else {
        warnings.push('Minutes generation failed; minutes are unavailable.');
      }
    }

    const jobId = transcript.job?.id;
    let transcriptText: string | undefined;
    let transcriptSrt: string | undefined;

    if (jobId) {
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
    }

    // Fallback: If transcriptText is not available, build it from segments
    if (!transcriptText && segments && segments.length > 0) {
      transcriptText = segments.map(segment => 
        `${segment.speakerLabel}: ${segment.text}`
      ).join('\n');
      console.log('📝 Built transcript from segments as fallback');
    }

    // Check if user has exceeded limits after transcription is complete
    const durationSeconds = transcript.job?.duration;
    console.log(`🕒 Transcription completed - Duration: ${durationSeconds ? Math.round(durationSeconds / 60) : 'unknown'} minutes`);
    
    let limitExceededWarning = null;
    if (durationSeconds) {
      const durationMinutes = durationSeconds / 60;
      
      // Get updated usage stats after this transcription
      const updatedUsageStats = await usageService.getCurrentUsage(user.id);
      const tierLimits = await usageService.getTierLimits(user.tier);
      
      if (updatedUsageStats && tierLimits) {
        const totalDurationAfterThisJob = updatedUsageStats.currentMonth.totalDurationMinutes + durationMinutes;
        const transcriptionsAfterThisJob = updatedUsageStats.currentMonth.transcriptionsUsed + 1;
        
        // Check if this transcription pushed them over any limits
        if (tierLimits.max_duration_minutes !== -1 && totalDurationAfterThisJob > tierLimits.max_duration_minutes) {
          limitExceededWarning = {
            type: 'duration_exceeded',
            message: `This transcription pushed you over your monthly ${tierLimits.max_duration_minutes} minute limit. Future transcriptions will be blocked until next month.`,
            upgradeUrl: '/upgrade'
          };
        } else if (tierLimits.monthly_transcription_limit !== -1 && transcriptionsAfterThisJob >= tierLimits.monthly_transcription_limit) {
          limitExceededWarning = {
            type: 'transcription_limit_reached',
            message: `You have reached your monthly limit of ${tierLimits.monthly_transcription_limit} transcriptions. Future transcriptions will be blocked until next month.`,
            upgradeUrl: '/upgrade'
          };
        }
      }
    }

    // Mark job as completed successfully and update with duration and transcript data
    console.log('🔍 Debug - Transcript data being saved:');
    console.log('- transcriptText length:', transcriptText?.length || 0);
    console.log('- minutes length:', minutes?.length || 0);
    console.log('- segments count:', segments?.length || 0);
    console.log('- jobId:', jobId);
    
    try {
      await usageService.updateJobStatus(
        user.id, 
        derivedName, 
        'completed', 
        jobId,
        undefined, // no error message
        durationSeconds, // add the duration
        {
          transcript_text: transcriptText,
          summary: minutes,
          segments: segments,
          job_data: transcript.job
        }
      );
      console.log('✅ Successfully saved transcript data to database');
    } catch (updateError) {
      console.error('❌ Failed to update job status (completed):', updateError);
    }

    return NextResponse.json({
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
      limitExceeded: limitExceededWarning, // Include limit warning if present
    });
  } catch (error) {
    // Mark job as failed
    try {
      await usageService.updateJobStatus(
        user.id, 
        derivedName, 
        'failed', 
        undefined, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    if (error instanceof SpeechmaticsResponseError) {
      console.error('Speechmatics error response', error.response);
    }
    console.error('Transcription request failed', error);
    return NextResponse.json(
      { error: 'Failed to process the transcription request.' },
      { status: 500 },
    );
  }
}

function buildPromptTranscript(
  segments: ReturnType<typeof buildSpeakerSegments>,
): string {
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
    const mapSummaryType = (
      value: string | undefined,
    ): SummarizationConfigSummaryTypeEnum | undefined => {
      switch (value) {
        case SummarizationConfigSummaryTypeEnum.Paragraphs:
        case SummarizationConfigSummaryTypeEnum.Bullets:
          return value;
        default:
          return undefined;
      }
    };

    const mapSummaryLength = (
      value: string | undefined,
    ): SummarizationConfigSummaryLengthEnum | undefined => {
      switch (value) {
        case SummarizationConfigSummaryLengthEnum.Brief:
        case SummarizationConfigSummaryLengthEnum.Detailed:
          return value;
        default:
          return undefined;
      }
    };

    const mapSummaryContentType = (
      value: string | undefined,
    ): SummarizationConfigContentTypeEnum | undefined => {
      switch (value) {
        case SummarizationConfigContentTypeEnum.Auto:
        case SummarizationConfigContentTypeEnum.Informative:
        case SummarizationConfigContentTypeEnum.Conversational:
          return value;
        default:
          return undefined;
      }
    };

// Export the authenticated POST handler
export const POST = withAuth(handleTranscription, {
  requireAuth: true,
  checkUsageLimits: false // Allow users to transcribe until they exceed limits
});
