'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from './page.module.css';

import type { SpeakerSegment } from '@/types/transcription';
import { formatTimestamp } from '@/utils/time';

import type {
  JobInfo,
  RetrieveTranscriptResponse,
  SentimentAnalysisResult,
  SummarizationResult,
  TopicDetectionResult,
  TranslationSentence,
} from 'speechmatics';

type DiarizationMode =
  | 'none'
  | 'speaker'
  | 'speaker_change'
  | 'channel'
  | 'channel_and_speaker_change';

type TranscriptionResponse =
  | {
      segments: SpeakerSegment[];
      minutes: string;
      job?: JobInfo;
      summary?: SummarizationResult;
      sentiment?: SentimentAnalysisResult;
      topics?: TopicDetectionResult;
      translations?: Record<string, TranslationSentence[]>;
      transcriptText?: string;
      transcriptSrt?: string;
      transcriptJson?: RetrieveTranscriptResponse;
      warnings?: string[];
      error?: undefined;
    }
  | { error: string };

interface DisplaySegment extends SpeakerSegment {
  displayStart: string;
  displayLabel: string;
  color: string;
  index: number;
}

const SPEAKER_COLORS = [
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#f59e0b',
  '#0ea5e9',
  '#8b5cf6',
  '#ea580c',
  '#15803d',
  '#6366f1',
  '#d946ef',
];

export default function Studio() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');
  const [diarizationMode, setDiarizationMode] = useState<DiarizationMode>(
    'speaker',
  );
  const [speakerSensitivity, setSpeakerSensitivity] = useState(0.5);
  const [enableSummarization, setEnableSummarization] = useState(true);
  const [summaryType, setSummaryType] = useState<'paragraphs' | 'bullets'>(
    'paragraphs',
  );
  const [summaryLength, setSummaryLength] = useState<'brief' | 'detailed'>(
    'brief',
  );
  const [summaryContentType, setSummaryContentType] = useState<
    'auto' | 'informative' | 'conversational'
  >('auto');
  const [enableSentiment, setEnableSentiment] = useState(true);
  const [enableTopics, setEnableTopics] = useState(false);
  const [topicsInput, setTopicsInput] = useState('');
  const [translationInput, setTranslationInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [meetingContext, setMeetingContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const contextChunksRef = useRef<Blob[]>([]);
  const [isRecordingContext, setIsRecordingContext] = useState(false);
  const [isTranscribingContext, setIsTranscribingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const meetingRecorderRef = useRef<MediaRecorder | null>(null);
  const meetingChunksRef = useRef<Blob[]>([]);
  const meetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [meetingRecordingError, setMeetingRecordingError] =
    useState<string | null>(null);
  const [meetingRecordingDuration, setMeetingRecordingDuration] =
    useState(0);
  const [hasRecordedMeeting, setHasRecordedMeeting] = useState(false);
  const [meetingRecordingFilename, setMeetingRecordingFilename] =
    useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [minutes, setMinutes] = useState('');
  const [summary, setSummary] = useState<SummarizationResult | null>(null);
  const [sentiment, setSentiment] = useState<SentimentAnalysisResult | null>(
    null,
  );
  const [topics, setTopics] = useState<TopicDetectionResult | null>(null);
  const [translations, setTranslations] = useState<
    Record<string, TranslationSentence[]>
  >({});
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptSrt, setTranscriptSrt] = useState('');
  const [transcriptJson, setTranscriptJson] =
    useState<RetrieveTranscriptResponse | null>(null);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [speakerLabels, setSpeakerLabels] = useState<Record<string, string>>({});
  const [speakerColors, setSpeakerColors] = useState<Record<string, string>>({});
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(
    null,
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!file) {
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (segments.length === 0) {
      setSpeakerLabels({});
      setSpeakerColors({});
      setActiveSegmentIndex(null);
      return;
    }

    setSpeakerLabels((previous) => {
      const next = { ...previous };
      let changed = false;
      for (const segment of segments) {
        if (!next[segment.speakerId]) {
          next[segment.speakerId] = segment.speakerLabel;
          changed = true;
        }
      }
      return changed ? next : previous;
    });

    setSpeakerColors((previous) => {
      const next = { ...previous };
      let changed = false;
      const uniqueSpeakerOrder = Array.from(
        new Set(segments.map((segment) => segment.speakerId)),
      );
      let colorIndex = Object.keys(next).length;
      for (const speakerId of uniqueSpeakerOrder) {
        if (!next[speakerId]) {
          next[speakerId] =
            SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length];
          colorIndex += 1;
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [segments]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || segments.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = audioElement.currentTime;
      const index = segments.findIndex((segment) => {
        const end = Number.isFinite(segment.end) ? segment.end : segment.start;
        return currentTime >= segment.start && currentTime <= end + 0.3;
      });
      if (index !== -1) {
        setActiveSegmentIndex((previous) =>
          previous === index ? previous : index,
        );
      }
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [segments]);

  const displaySegments: DisplaySegment[] = useMemo(() => {
    return segments.map((segment, index) => ({
      ...segment,
      index,
      displayStart: formatTimestamp(segment.start),
      displayLabel: speakerLabels[segment.speakerId] ?? segment.speakerLabel,
      color:
        speakerColors[segment.speakerId] ??
        SPEAKER_COLORS[index % SPEAKER_COLORS.length],
    }));
  }, [segments, speakerLabels, speakerColors]);

  useEffect(() => {
    if (activeSegmentIndex === null) return;
    const element = segmentRefs.current[activeSegmentIndex];
    if (!element) return;
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSegmentIndex]);

  const translationEntries = useMemo(() => {
    return Object.entries(translations).filter(([, sentences]) =>
      Array.isArray(sentences),
    );
  }, [translations]);

  const plainSpeakerTranscript = useMemo(() => {
    if (displaySegments.length === 0) return '';
    const lines: string[] = [];
    let lastSpeaker: string | null = null;
    for (const segment of displaySegments) {
      const label = segment.displayLabel || segment.speakerLabel;
      if (label !== lastSpeaker) {
        if (lines.length > 0) {
          lines.push('');
        }
        lines.push(`${label}: ${segment.text}`);
        lastSpeaker = label;
      } else {
        const previous = lines.pop() ?? '';
        lines.push(`${previous} ${segment.text}`.trim());
      }
    }
    return lines.join('\n');
  }, [displaySegments]);

  const topicSummaryEntries = useMemo(() => {
    const overall = topics?.summary?.overall;
    if (!overall) return [] as Array<[string, number]>;
    return Object.entries(overall).sort(([, a], [, b]) => b - a);
  }, [topics]);

  const sentimentSummary = sentiment?.sentiment_analysis?.summary;
  const sentimentOverall = sentimentSummary?.overall;

  const hasResults =
    displaySegments.length > 0 ||
    Boolean(minutes) ||
    Boolean(summary?.content) ||
    Boolean(sentimentSummary) ||
    topicSummaryEntries.length > 0 ||
    translationEntries.length > 0;

  const handleDownload = useCallback(
    (content: string, filename: string, type = 'text/plain;charset=utf-8') => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [],
  );

  const handleSegmentClick = useCallback((segment: DisplaySegment) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    audioElement.currentTime = segment.start;
    void audioElement.play().catch(() => undefined);
    setActiveSegmentIndex(segment.index);
  }, []);

  const transcribeContextRecording = useCallback(
    async (blob: Blob) => {
      setIsTranscribingContext(true);
      setContextError(null);
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'context.webm');
        const response = await fetch('/api/context-transcribe', {
          method: 'POST',
          body: formData,
        });
        let payload: { text?: string; error?: string } = {};
        try {
          payload = (await response.json()) as { text?: string; error?: string };
        } catch {
          // ignore JSON parse errors
        }
        const newText = payload.text ?? '';
        if (!response.ok || newText.trim().length === 0) {
          throw new Error(
            payload.error ?? `Transcription failed (status ${response.status}).`,
          );
        }
        setMeetingContext((previous) =>
          previous ? `${previous}
${newText}` : newText,
        );
      } catch (error) {
        setContextError(
          error instanceof Error
            ? error.message
            : 'Unable to transcribe meeting context.',
        );
      } finally {
        setIsTranscribingContext(false);
      }
    },
    [],
  );

  const clearMeetingTimer = useCallback(() => {
    if (meetingTimerRef.current) {
      clearInterval(meetingTimerRef.current);
      meetingTimerRef.current = null;
    }
  }, []);

  const formattedMeetingDuration = useMemo(
    () => formatTimestamp(meetingRecordingDuration),
    [meetingRecordingDuration],
  );

  const handleMeetingRecordToggle = useCallback(async () => {
    if (isRecordingMeeting) {
      setIsProcessingRecording(true);
      const recorder = meetingRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setMeetingRecordingError('Recording is not supported in this browser.');
      return;
    }

    try {
      setMeetingRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      meetingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          meetingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setMeetingRecordingError('Recording error. Please try again.');
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        clearMeetingTimer();
        meetingRecorderRef.current = null;
        setIsRecordingMeeting(false);
        const chunks = meetingChunksRef.current;
        if (!chunks.length) {
          setMeetingRecordingError('No audio captured. Try recording again.');
          setIsProcessingRecording(false);
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size === 0) {
          setMeetingRecordingError('No audio captured. Try recording again.');
          setIsProcessingRecording(false);
          return;
        }
        const filename = `meeting-${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')}.webm`;
        const recordedFile = new File([blob], filename, { type: blob.type });
        setMeetingRecordingFilename(filename);
        setHasRecordedMeeting(true);
        setMeetingRecordingError(null);
        setFile(recordedFile);
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(recordedFile);
          fileInputRef.current.files = dataTransfer.files;
        }
        setIsProcessingRecording(false);
      };

      meetingRecorderRef.current = recorder;
      recorder.start();
      setIsProcessingRecording(false);
      setHasRecordedMeeting(false);
      setMeetingRecordingFilename(null);
      setMeetingRecordingDuration(0);
      meetingChunksRef.current = [];
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      clearMeetingTimer();
      meetingTimerRef.current = setInterval(() => {
        setMeetingRecordingDuration((previous) => previous + 1);
      }, 1000);
      setIsRecordingMeeting(true);
    } catch (error) {
      setMeetingRecordingError(
        error instanceof Error
          ? error.message
          : 'Microphone access was denied.',
      );
      clearMeetingTimer();
      setIsProcessingRecording(false);
    }
  }, [clearMeetingTimer, isRecordingMeeting]);

  const handleDiscardRecording = useCallback(() => {
    if (isRecordingMeeting) return;
    clearMeetingTimer();
    meetingChunksRef.current = [];
    meetingRecorderRef.current = null;
    setMeetingRecordingFilename(null);
    setMeetingRecordingDuration(0);
    if (hasRecordedMeeting) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setHasRecordedMeeting(false);
    }
    setMeetingRecordingError(null);
  }, [clearMeetingTimer, hasRecordedMeeting, isRecordingMeeting]);

  const meetingStatusLabel = useMemo(() => {
    if (isRecordingMeeting) return 'Recording…';
    if (isProcessingRecording) return 'Processing recording…';
    if (hasRecordedMeeting && meetingRecordingFilename) return 'Recording ready';
    if (file) return 'File selected';
    return 'Idle';
  }, [
    file,
    hasRecordedMeeting,
    isProcessingRecording,
    isRecordingMeeting,
    meetingRecordingFilename,
  ]);

  const handleContextRecordToggle = useCallback(async () => {
    if (isRecordingContext) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      setIsRecordingContext(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setContextError('Voice input is only available in supported browsers.');
      return;
    }

    try {
      setContextError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      contextChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          contextChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setContextError('Recording error. Please try again.');
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const chunks = contextChunksRef.current;
        if (!chunks.length) {
          setContextError('No audio captured. Try recording again.');
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size === 0) {
          setContextError('No audio captured. Try recording again.');
          return;
        }
        void transcribeContextRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingContext(true);
    } catch (error) {
      setContextError(
        error instanceof Error
          ? error.message
          : 'Microphone access was denied.',
      );
    }
  }, [isRecordingContext, transcribeContextRecording]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      const meetingRecorder = meetingRecorderRef.current;
      if (meetingRecorder && meetingRecorder.state !== 'inactive') {
        meetingRecorder.stop();
      }
      if (meetingTimerRef.current) {
        clearInterval(meetingTimerRef.current);
      }
    };
  }, []);

  const handleJump = useCallback(
    (direction: 'previous' | 'next') => {
      if (displaySegments.length === 0) return;
      const currentIndex = activeSegmentIndex ?? 0;
      const nextIndex =
        direction === 'previous'
          ? Math.max(currentIndex - 1, 0)
          : Math.min(currentIndex + 1, displaySegments.length - 1);
      const target = displaySegments[nextIndex];
      const audioElement = audioRef.current;
      if (!target || !audioElement) return;
      audioElement.currentTime = target.start;
      void audioElement.play().catch(() => undefined);
      setActiveSegmentIndex(target.index);
    },
    [activeSegmentIndex, displaySegments],
  );

  const minutesHtml = useMemo(() => {
    if (!minutes) return '';

    const escapeHtml = (text: string) =>
      text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');

    const applyInlineFormatting = (text: string) =>
      escapeHtml(text)
        .replace(/\u001b\[[0-9;]*m/g, '')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    const lines = minutes.split('\n');
    const html: string[] = [];
    let listOpen = false;

    const closeList = () => {
      if (listOpen) {
        html.push('</ul>');
        listOpen = false;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length === 0) {
        closeList();
        html.push('<p class="minutes-space"></p>');
        continue;
      }

      if (/^---+$/.test(line)) {
        closeList();
        html.push('<hr class="minutes-divider" />');
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        const content = applyInlineFormatting(headingMatch[2]);
        html.push(`<h3>${content}</h3>`);
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        if (!listOpen) {
          html.push('<ul>');
          listOpen = true;
        }
        const content = applyInlineFormatting(line.replace(/^[-*]\s+/, ''));
        html.push(`<li>${content}</li>`);
      } else {
        closeList();
        const content = applyInlineFormatting(line.replace(/^\d+\.\s+/, ''));
        html.push(`<p>${content}</p>`);
      }
    }

    closeList();
    return html.join('');
  }, [minutes]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Choose an MP3 (or compatible) file before submitting.');
      return;
    }

    setError(null);
    setMinutes('');
    setSegments([]);
    setSummary(null);
    setSentiment(null);
    setTopics(null);
    setTranslations({});
    setTranscriptText('');
    setTranscriptSrt('');
    setTranscriptJson(null);
    setJobInfo(null);
    setWarnings([]);
    setActiveSegmentIndex(null);

    setIsSubmitting(true);
    setStatusMessage('Uploading audio...');

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('language', language);
    formData.append('diarizationMode', diarizationMode);
    formData.append('speakerSensitivity', speakerSensitivity.toString());
    if (meetingContext.trim()) {
      formData.append('meetingContext', meetingContext.trim());
    }
    formData.append('enableSummarization', String(enableSummarization));
    formData.append('summaryType', summaryType);
    formData.append('summaryLength', summaryLength);
    formData.append('summaryContentType', summaryContentType);
    formData.append('enableSentiment', String(enableSentiment));
    formData.append('enableTopics', String(enableTopics));
    if (topicsInput.trim()) {
      formData.append('topics', topicsInput.trim());
    }
    if (translationInput.trim()) {
      formData.append('translationLanguages', translationInput.trim());
    }

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      setStatusMessage('Generating meeting minutes...');

      let payload: TranscriptionResponse;
      try {
        payload = (await response.json()) as TranscriptionResponse;
      } catch {
        payload = { error: response.statusText || 'Server error.' };
      }

      if (!response.ok || 'error' in payload) {
        throw new Error(
          payload.error ?? `Transcription failed (status ${response.status}).`,
        );
      }

      setSegments(payload.segments ?? []);
      setMinutes(payload.minutes ?? '');
      setSummary(payload.summary ?? null);
      setSentiment(payload.sentiment ?? null);
      setTopics(payload.topics ?? null);
      setTranslations(payload.translations ?? {});
      setTranscriptText(payload.transcriptText ?? '');
      setTranscriptSrt(payload.transcriptSrt ?? '');
      setTranscriptJson(payload.transcriptJson ?? null);
      setJobInfo(payload.job ?? null);
      setWarnings(payload.warnings ?? []);
      setMeetingContext('');
      setStatusMessage('Completed successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
      setStatusMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <section className={styles.panel}>
        <h1 className={styles.heading}>My Meeting Minute app</h1>
        <p className={styles.subtitle}>
          Upload an audio file, configure diarization and enrichment options, and
          generate insights and meeting minutes.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <section className={styles.captureCard}>
            <header className={styles.captureHeader}>
              <div>
                <h2>Capture & prepare your meeting</h2>
                <p>
                  Record directly in the browser or upload an existing file, then share context to guide the minutes.
                </p>
              </div>
              <span
                className={`${styles.recordStatus} ${
                  isRecordingMeeting ? styles.recordStatusActive : ''
                }`}
              >
                {meetingStatusLabel}
              </span>
            </header>

            <div className={styles.captureGrid}>
              <div className={styles.captureColumn}>
                <div className={styles.recordActions}>
                  <button
                    type="button"
                    onClick={handleMeetingRecordToggle}
                    className={`${styles.recordButton} ${
                      isRecordingMeeting ? styles.recordButtonActive : ''
                    }`}
                    disabled={isSubmitting || isProcessingRecording}
                  >
                    {isRecordingMeeting ? 'Stop recording' : 'Start recording'}
                  </button>
                  {hasRecordedMeeting && audioUrl && meetingRecordingFilename && (
                    <a
                      href={audioUrl}
                      download={meetingRecordingFilename}
                      className={styles.recordDownload}
                    >
                      Download recording
                    </a>
                  )}
                  {hasRecordedMeeting && (
                    <button
                      type="button"
                      onClick={handleDiscardRecording}
                      className={styles.recordSecondary}
                    >
                      Discard
                    </button>
                  )}
                </div>
                <div className={styles.recordFooter}>
                  <span className={styles.recordTimer}>
                    Duration: {formattedMeetingDuration}
                  </span>
                  {isProcessingRecording && (
                    <span className={styles.recordProcessing}>Processing…</span>
                  )}
                </div>
                {meetingRecordingError && (
                  <p className={styles.recordError}>{meetingRecordingError}</p>
                )}
              </div>

              <div className={styles.captureColumn}>
                <label className={styles.label}>
                  <span>Upload audio (MP3, WAV, M4A...)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="audio"
                    accept="audio/*"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setFile(selected);
                      setHasRecordedMeeting(false);
                      setMeetingRecordingFilename(selected ? selected.name : null);
                      setMeetingRecordingDuration(0);
                      setMeetingRecordingError(null);
                      if (!selected && fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={isSubmitting}
                    required
                  />
                </label>

                <label className={styles.label}>
                  <span>Meeting context (agenda, goals, attendees…)</span>
                  <textarea
                    value={meetingContext}
                    onChange={(event) => setMeetingContext(event.target.value)}
                    placeholder="Planning discussion, budget review, participants: Alex, Jamie"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </label>

                <div className={styles.contextActions}>
                  <button
                    type="button"
                    onClick={handleContextRecordToggle}
                    className={`${styles.contextButton} ${
                      isRecordingContext ? styles.contextButtonActive : ''
                    }`}
                    disabled={isSubmitting || isTranscribingContext}
                  >
                    {isRecordingContext
                      ? 'Stop context recording'
                      : 'Record context voice note'}
                  </button>
                  {isTranscribingContext && (
                    <span className={styles.contextStatus}>Transcribing…</span>
                  )}
                </div>
                {contextError && <p className={styles.contextError}>{contextError}</p>}
              </div>
            </div>
          </section>

          <div className={styles.topActions}>
            <button
              type="button"
              className={`${styles.advancedToggle} ${
                showAdvanced ? styles.advancedToggleActive : ''
              }`}
              onClick={() => setShowAdvanced((previous) => !previous)}
              disabled={isSubmitting}
            >
              {showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
            </button>
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? 'Processing…' : 'Transcribe & summarise'}
            </button>
          </div>

          {showAdvanced && (
            <div className={styles.advancedPanel}>
              <div className={styles.fieldRow}>
                <label className={styles.label}>
                  <span>Language</span>
                  <input
                    type="text"
                    name="language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    disabled={isSubmitting}
                  />
                </label>
                <label className={styles.label}>
                  <span>Diarization</span>
                  <select
                    name="diarizationMode"
                    value={diarizationMode}
                    onChange={(event) =>
                      setDiarizationMode(event.target.value as DiarizationMode)
                    }
                    disabled={isSubmitting}
                  >
                    <option value="speaker">Speaker attribution</option>
                    <option value="speaker_change">Speaker change markers</option>
                    <option value="channel">Separate channels</option>
                    <option value="channel_and_speaker_change">
                      Channel + speaker change
                    </option>
                    <option value="none">No diarization</option>
                  </select>
                </label>
              </div>

              <label className={styles.label}>
                <span>
                  Speaker sensitivity {diarizationMode !== 'speaker' && '(speaker mode)'}
                </span>
                <input
                  type="range"
                  name="speakerSensitivity"
                  min="0"
                  max="1"
                  step="0.1"
                  value={speakerSensitivity}
                  onChange={(event) =>
                    setSpeakerSensitivity(Number.parseFloat(event.target.value))
                  }
                  disabled={isSubmitting || diarizationMode !== 'speaker'}
                />
              </label>

              <div className={styles.toggleGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={enableSummarization}
                    onChange={(event) => setEnableSummarization(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Summarization</span>
                </label>
                {enableSummarization && (
                  <div className={styles.inlineFields}>
                    <label>
                      Style
                      <select
                        value={summaryType}
                        onChange={(event) =>
                          setSummaryType(event.target.value as 'paragraphs' | 'bullets')
                        }
                        disabled={isSubmitting}
                      >
                        <option value="paragraphs">Paragraphs</option>
                        <option value="bullets">Bullets</option>
                      </select>
                    </label>
                    <label>
                      Length
                      <select
                        value={summaryLength}
                        onChange={(event) =>
                          setSummaryLength(
                            event.target.value as 'brief' | 'detailed',
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <option value="brief">Brief</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </label>
                    <label>
                      Tone
                      <select
                        value={summaryContentType}
                        onChange={(event) =>
                          setSummaryContentType(
                            event.target.value as
                              | 'auto'
                              | 'informative'
                              | 'conversational',
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <option value="auto">Auto</option>
                        <option value="informative">Informative</option>
                        <option value="conversational">Conversational</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className={styles.toggleRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={enableSentiment}
                    onChange={(event) => setEnableSentiment(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Sentiment analysis</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={enableTopics}
                    onChange={(event) => setEnableTopics(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Topic detection</span>
                </label>
              </div>

              {enableTopics && (
                <label className={styles.label}>
                  <span>Focus on specific topics (comma separated)</span>
                  <input
                    type="text"
                    value={topicsInput}
                    onChange={(event) => setTopicsInput(event.target.value)}
                    placeholder="budgets, hiring, roadmap"
                    disabled={isSubmitting}
                  />
                </label>
              )}

              <label className={styles.label}>
                <span>Translation languages (comma separated ISO codes)</span>
                <input
                  type="text"
                  value={translationInput}
                  onChange={(event) => setTranslationInput(event.target.value)}
                  placeholder="es, fr, de"
                  disabled={isSubmitting}
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing…' : 'Transcribe & summarise'}
          </button>
        </form>

        {statusMessage && !error && (
          <p className={styles.status}>{statusMessage}</p>
        )}
        {warnings.length > 0 && (
          <ul className={styles.warningList}>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </section>

      {hasResults && (
        <section className={styles.results}>
          {audioUrl && (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <h2>Review the audio</h2>
              </header>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className={styles.audioPlayer}
              />
              <div className={styles.segmentControls}>
                <button
                  type="button"
                  onClick={() => handleJump('previous')}
                  disabled={displaySegments.length === 0 || activeSegmentIndex === 0}
                >
                  ← Previous segment
                </button>
                <button
                  type="button"
                  onClick={() => handleJump('next')}
                  disabled={
                    displaySegments.length === 0 ||
                    activeSegmentIndex === displaySegments.length - 1
                  }
                >
                  Next segment →
                </button>
              </div>
              {jobInfo && (
                <dl className={styles.metaList}>
                  <div>
                    <dt>Uploaded file</dt>
                    <dd>{jobInfo.data_name}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{formatTimestamp(jobInfo.duration)}</dd>
                  </div>
                  <div>
                    <dt>Created at</dt>
                    <dd>{new Date(jobInfo.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
              )}
              <div className={styles.downloads}>
                {plainSpeakerTranscript && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        plainSpeakerTranscript,
                        'transcript_speakers.txt',
                      )
                    }
                  >
                    Download speaker transcript
                  </button>
                )}
                {transcriptText && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(transcriptText, 'transcript.txt')
                    }
                  >
                    Download .txt
                  </button>
                )}
                {transcriptSrt && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(transcriptSrt, 'transcript.srt')
                    }
                  >
                    Download .srt
                  </button>
                )}
                {transcriptJson && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        JSON.stringify(transcriptJson, null, 2),
                        'transcript.json',
                        'application/json',
                      )
                    }
                  >
                    Download JSON
                  </button>
                )}
                {minutes && (
                  <button
                    type="button"
                    onClick={() => handleDownload(minutes, 'minutes.md')}
                  >
                    Download minutes
                  </button>
                )}
              </div>
            </article>
          )}

          {minutes && (
            <article className={`${styles.card} ${styles.minutesCard}`}>
              <h2>Meeting minutes</h2>
              <div
                className={styles.minutesContent}
                dangerouslySetInnerHTML={{ __html: minutesHtml }}
              />
            </article>
          )}

          {summary?.content && (
            <article className={styles.card}>
              <h2>Summary</h2>
              <p className={styles.summaryText}>{summary.content}</p>
            </article>
          )}

          {enableSentiment && sentimentOverall && (
            <article className={styles.card}>
              <h2>Sentiment overview</h2>
              <ul className={styles.insightList}>
                <li>
                  <span className={styles.sentimentDot} data-tone="positive" />
                  Positive: {sentimentOverall.positive_count ?? 0}
                </li>
                <li>
                  <span className={styles.sentimentDot} data-tone="neutral" />
                  Neutral: {sentimentOverall.neutral_count ?? 0}
                </li>
                <li>
                  <span className={styles.sentimentDot} data-tone="negative" />
                  Negative: {sentimentOverall.negative_count ?? 0}
                </li>
              </ul>
            </article>
          )}

          {topicSummaryEntries.length > 0 && (
            <article className={styles.card}>
              <h2>Topic highlights</h2>
              <ul className={styles.insightList}>
                {topicSummaryEntries.map(([topicName, count]) => (
                  <li key={topicName}>
                    <strong>{topicName}</strong> · {count} mentions
                  </li>
                ))}
              </ul>
            </article>
          )}

          {translationEntries.length > 0 && (
            <article className={styles.card}>
              <h2>Translations</h2>
              {translationEntries.map(([languageCode, sentences]) => (
                <div key={languageCode} className={styles.translationBlock}>
                  <header>
                    <span className={styles.badge}>{languageCode.toUpperCase()}</span>
                  </header>
                  <ul>
                    {sentences.map((sentence, index) => (
                      <li key={`${languageCode}-${index}`}>
                        <span className={styles.timestamp}>
                          {formatTimestamp(sentence.start_time ?? 0)}
                        </span>
                        <span>{sentence.content}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          )}

          {displaySegments.length > 0 && (
            <article className={`${styles.card} ${styles.speakerCard}`}>
              <h2>Speaker labels</h2>
              <p className={styles.helperText}>
                Update speaker names and click a segment to jump the audio.
              </p>
              <div className={styles.speakerGrid}>
                {Array.from(
                  new Set(displaySegments.map((segment) => segment.speakerId)),
                ).map((speakerId) => (
                  <label key={speakerId} className={styles.speakerLabelItem}>
                    <span
                      className={styles.colorSwatch}
                      style={{
                        backgroundColor:
                          speakerColors[speakerId] ?? '#888888',
                      }}
                    />
                    <input
                      type="text"
                      value={speakerLabels[speakerId] ?? speakerId}
                      onChange={(event) =>
                        setSpeakerLabels((previous) => ({
                          ...previous,
                          [speakerId]: event.target.value,
                        }))
                      }
                      disabled={isSubmitting}
                    />
                  </label>
                ))}
              </div>

              <ul className={styles.segmentList}>
                {displaySegments.map((segment) => {
                  const isActive = activeSegmentIndex === segment.index;
                  return (
                    <li
                      key={`${segment.speakerId}-${segment.start.toFixed(3)}`}
                      className={`${styles.segmentRow} ${
                        isActive ? styles.segmentRowActive : ''
                      }`}
                      ref={(element) => {
                        segmentRefs.current[segment.index] = element;
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSegmentClick(segment)}
                        className={styles.segmentButton}
                      >
                        <header>
                          <span
                            className={styles.segmentSpeaker}
                            style={{ backgroundColor: segment.color }}
                          >
                            {segment.displayLabel}
                          </span>
                          <span className={styles.timestamp}>
                            {segment.displayStart}
                          </span>
                        </header>
                        <p>{segment.text}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          )}
        </section>
      )}
    </main>
  );
}
