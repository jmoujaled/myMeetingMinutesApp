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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

export async function POST(request: NextRequest) {
  if (!speechmaticsKey || !openai) {
    return NextResponse.json(
      { error: 'Server is missing required credentials.' },
      { status: 500 },
    );
  }

  const speechmatics = new BatchTranscription(speechmaticsKey);

  try {
    const formData = await request.formData();
    const file = formData.get('audio');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Upload an audio file under the "audio" field.' },
        { status: 400 },
      );
    }

    console.info(
      'Transcription upload received',
      JSON.stringify(
        {
          name: file.name,
          type: file.type,
          size: typeof file.size === 'number' ? file.size : undefined,
        },
        null,
        2,
      ),
    );

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

    let transcript: Awaited<ReturnType<typeof speechmatics.transcribe>>;

    try {
      transcript = await speechmatics.transcribe(
        file,
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
            file,
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
              file,
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
    try {
      const completion = await openai.responses.create({
        model: 'gpt-5-mini-2025-08-07',
        max_output_tokens: 900,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'You are an executive assistant who writes concise, action-oriented meeting minutes. Include decisions, open questions, and next steps when present.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Create detailed meeting minutes based on the following diarized transcript. Preserve speaker attribution when relevant.\n\n${contextForPrompt}${transcriptForPrompt}`,
              },
            ],
          },
        ],
      });
      minutes = completion.output_text ?? '';
    } catch (openAiError) {
      console.error('Minutes generation failed', openAiError);
      warnings.push('Minutes generation failed; minutes are unavailable.');
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
    });
  } catch (error) {
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
