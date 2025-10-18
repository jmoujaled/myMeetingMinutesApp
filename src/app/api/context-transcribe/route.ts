import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { usageService } from '@/lib/usage-service';

const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.warn('Transcription key is not set. Context endpoint will fail.');
}

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : undefined;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleContextTranscription(request: AuthenticatedRequest) {
  if (!openai) {
    return NextResponse.json(
      { error: 'Server is missing required credentials.' },
      { status: 500 },
    );
  }

  const user = request.user;

  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { error: 'Upload an audio clip under the "audio" field.' },
        { status: 400 },
      );
    }

    const fileObj = audio as File;
    // Enforce basic size limit to avoid function timeouts and provider limits
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (typeof fileObj.size === 'number' && fileObj.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Audio file too large. Max size is 20MB.' },
        { status: 413 },
      );
    }
    // Basic content-type allowlist. Some browsers may omit type; allow if empty.
    const allowedTypes = new Set([
      'audio/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
    ]);
    const normalizedType = fileObj.type
      ? fileObj.type.split(';', 1)[0]?.trim().toLowerCase()
      : '';
    if (normalizedType && !allowedTypes.has(normalizedType)) {
      return NextResponse.json(
        { error: `Unsupported audio type: ${fileObj.type}` },
        { status: 415 },
      );
    }

    console.info(
      'Context upload received',
      JSON.stringify(
        {
          name: fileObj.name,
          type: fileObj.type,
          size: typeof fileObj.size === 'number' ? fileObj.size : undefined,
          userId: user.id,
          userTier: user.tier,
        },
        null,
        2,
      ),
    );

    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audio,
        temperature: 0.2,
      });
    } catch (primaryError) {
      console.warn(
        'Primary context transcription model unavailable. Falling back to gpt-4o-mini-transcribe.',
        primaryError,
      );
      transcription = await openai.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: audio,
        temperature: 0.2,
      });
    }

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    console.error('Context transcription failed', error);
    const isProd = process.env.NODE_ENV === 'production';
    const detail =
      error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
    return NextResponse.json(
      isProd
        ? { error: 'Unable to transcribe meeting context.' }
        : { error: 'Unable to transcribe meeting context.', detail },
      { status: 500 },
    );
  }
}

// Export the authenticated POST handler
export const POST = withAuth(handleContextTranscription, {
  requireAuth: true,
  requiredTier: 'free' // Context transcription available to all tiers
});
