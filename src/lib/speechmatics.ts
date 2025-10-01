import type {
  BatchRecognitionResult,
  RetrieveTranscriptResponse,
} from 'speechmatics';

import type { SpeakerSegment } from '@/types/transcription';

export function buildSpeakerSegments(
  transcript: RetrieveTranscriptResponse,
): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const speakerLabels = new Map<string, string>();
  let nextLabel = 1;
  let currentSegment: SpeakerSegment | null = null;

  const assignLabel = (speakerId: string): string => {
    const existing = speakerLabels.get(speakerId);
    if (existing) return existing;
    const label = `Speaker ${nextLabel++}`;
    speakerLabels.set(speakerId, label);
    return label;
  };

  const pushWord = (
    result: BatchRecognitionResult,
    token: string,
    speakerId: string,
  ) => {
    const speakerLabel = assignLabel(speakerId);

    if (!currentSegment || currentSegment.speakerId !== speakerId) {
      currentSegment = {
        speakerId,
        speakerLabel,
        start: result.start_time,
        end: result.end_time,
        text: token,
      };
      segments.push(currentSegment);
      return;
    }

    currentSegment.text += currentSegment.text.length ? ` ${token}` : token;
    currentSegment.end = result.end_time;
  };

  const appendPunctuation = (
    result: BatchRecognitionResult,
    token: string,
  ) => {
    if (!currentSegment) return;
    currentSegment.text = `${currentSegment.text.trimEnd()}${token}`;
    currentSegment.end = Math.max(result.end_time, currentSegment.end);
  };

  for (const result of transcript.results ?? []) {
    if (result.type === 'speaker_change') {
      currentSegment = null;
      continue;
    }

    const [alternative] = result.alternatives ?? [];
    if (!alternative) continue;

    if (!currentSegment && !alternative.speaker) {
      alternative.speaker = 'unknown';
    }

    if (result.type === 'word' || result.type === 'entity') {
      const speakerId = alternative.speaker ?? currentSegment?.speakerId ?? 'unknown';
      pushWord(result, alternative.content, speakerId);
    } else if (result.type === 'punctuation') {
      appendPunctuation(result, alternative.content);
    }
  }

  return segments;
}
