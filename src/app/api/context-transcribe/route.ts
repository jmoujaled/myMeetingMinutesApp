import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.warn('OPENAI_API_KEY is not set. Context transcription endpoint will fail.');
}

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : undefined;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!openai) {
    return NextResponse.json(
      { error: 'Server is missing OpenAI credentials.' },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { error: 'Upload an audio clip under the "audio" field.' },
        { status: 400 },
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-5.0-mini-transcribe',
      file: audio,
      temperature: 0.2,
    });

    return NextResponse.json({ text: transcription.text ?? '' });
  } catch (error) {
    console.error('Context transcription failed', error);
    return NextResponse.json(
      { error: 'Unable to transcribe meeting context.' },
      { status: 500 },
    );
  }
}
