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
import { convertBlobToWav } from '@/utils/audio';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useUsageRestrictions } from '@/components/meetings/UsageAnalytics';

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
      limitExceeded?: {
        type: 'duration_exceeded' | 'transcription_limit_reached';
        message: string;
        upgradeUrl: string;
      };
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
  const { canCreateTranscription, checkUsageLimit } = useUsageRestrictions();
  
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
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  const [meetingContext, setMeetingContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const contextChunksRef = useRef<Blob[]>([]);
  const [isRecordingContext, setIsRecordingContext] = useState(false);
  const [isTranscribingContext, setIsTranscribingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [supportsContextRecording, setSupportsContextRecording] =
    useState(true);
  const contextMimeSupportRef = useRef<{ mimeType: string; extension: string } | null>(null);

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
  const [supportsMeetingRecording, setSupportsMeetingRecording] =
    useState(true);
  const meetingMimeSupportRef = useRef<{ mimeType: string; extension: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const uploadProgressControlRef = useRef<{
    lastUpdate: number;
    timeout: number | null;
    pending: number | null;
  }>({
    lastUpdate: 0,
    timeout: null,
    pending: null,
  });

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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [limitExceeded, setLimitExceeded] = useState<{
    type: 'duration_exceeded' | 'transcription_limit_reached';
    message: string;
    upgradeUrl: string;
  } | null>(null);

  const [speakerLabels, setSpeakerLabels] = useState<Record<string, string>>({});
  const [speakerColors, setSpeakerColors] = useState<Record<string, string>>({});
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(
    null,
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<Array<HTMLLIElement | null>>([]);

  const clearPendingProgressTimeout = useCallback(() => {
    const control = uploadProgressControlRef.current;
    if (control.timeout) {
      clearTimeout(control.timeout);
      control.timeout = null;
    }
  }, []);

  const updateUploadProgress = useCallback(
    (value: number, immediate = false) => {
      const normalized = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);
      const control = uploadProgressControlRef.current;
      if (immediate) {
        clearPendingProgressTimeout();
        control.pending = null;
        control.lastUpdate = Date.now();
        setUploadProgress(normalized);
        return;
      }

      const now = Date.now();
      const elapsed = now - control.lastUpdate;
      const THROTTLE_MS = 180;

      if (elapsed >= THROTTLE_MS) {
        clearPendingProgressTimeout();
        control.pending = null;
        control.lastUpdate = now;
        setUploadProgress(normalized);
        return;
      }

      control.pending = normalized;
      if (!control.timeout) {
        control.timeout = window.setTimeout(() => {
          const next = uploadProgressControlRef.current.pending;
          uploadProgressControlRef.current.pending = null;
          uploadProgressControlRef.current.timeout = null;
          uploadProgressControlRef.current.lastUpdate = Date.now();
          if (typeof next === 'number') {
            setUploadProgress(next);
          }
        }, THROTTLE_MS - elapsed);
      }
    },
    [clearPendingProgressTimeout],
  );

  const resetUploadProgress = useCallback(() => {
    clearPendingProgressTimeout();
    uploadProgressControlRef.current.pending = null;
    uploadProgressControlRef.current.lastUpdate = 0;
    setUploadProgress(null);
  }, [clearPendingProgressTimeout]);

  useEffect(
    () => () => {
      resetUploadProgress();
    },
    [resetUploadProgress],
  );

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

  const summaryLines = useMemo(() => {
    const content = summary?.content;
    if (!content) return [] as string[];
    return Array.isArray(content) ? content : [content];
  }, [summary]);

  const sentimentSummary = sentiment?.sentiment_analysis?.summary;
  const sentimentOverall = sentimentSummary?.overall;

  const hasResults =
    displaySegments.length > 0 ||
    Boolean(minutes) ||
    Boolean(summary?.content) ||
    Boolean(sentimentSummary) ||
    topicSummaryEntries.length > 0 ||
    translationEntries.length > 0;

  const headerStatus = useMemo(() => {
    if (error) return 'Error';
    if (isSubmitting) return 'Processing…';
    if (statusMessage) return statusMessage;
    if (hasResults) return 'Complete';
    if (isRecordingMeeting) return 'Recording…';
    return 'Idle';
  }, [error, hasResults, isSubmitting, isRecordingMeeting, statusMessage]);

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

  const sendTranscriptionRequest = useCallback(
    (formData: FormData, expectedSize?: number) =>
      new Promise<TranscriptionResponse>((resolve, reject) => {
        if (typeof XMLHttpRequest === 'undefined') {
          fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })
            .then(async (response) => {
              updateUploadProgress(100, true);
              setStatusMessage('Processing transcription...');
              setUploadPhase('processing');
              let payload: TranscriptionResponse;
              try {
                payload = (await response.json()) as TranscriptionResponse;
              } catch {
                throw new Error('Invalid server response.');
              }
              if (!response.ok) {
                const message =
                  payload && typeof payload === 'object' && 'error' in payload && payload.error
                    ? payload.error ?? `Transcription failed (status ${response.status}).`
                    : `Transcription failed (status ${response.status}).`;
                throw new Error(message);
              }
              resolve(payload);
            })
            .catch((fetchError) => {
              const message =
                fetchError instanceof Error ? fetchError.message : 'Network error during upload.';
              reject(new Error(message));
            });
          return;
        }

        const request = new XMLHttpRequest();
        let uploadComplete = false;
        request.open('POST', '/api/transcribe');
        request.responseType = 'text';

        request.upload.onprogress = (event) => {
          const totalBytes =
            event.lengthComputable && event.total > 0
              ? event.total
              : expectedSize && expectedSize > 0
                ? expectedSize
                : undefined;

          if (totalBytes) {
            const percent = Math.round((event.loaded / totalBytes) * 100);
            updateUploadProgress(percent);
          } else {
            updateUploadProgress(0);
          }
        };

        request.upload.onload = () => {
          uploadComplete = true;
          updateUploadProgress(100, true);
          setStatusMessage('Processing transcription...');
          setUploadPhase('processing');
        };

        request.onerror = () => {
          reject(new Error('Network error during upload.'));
        };

        request.onabort = () => {
          reject(new Error('Upload aborted.'));
        };

        request.onload = () => {
          if (!uploadComplete) {
            updateUploadProgress(100, true);
            setStatusMessage('Processing transcription...');
            setUploadPhase('processing');
          }
          const responseText = request.responseText ?? '';
          let payload: TranscriptionResponse;
          try {
            payload = responseText ? (JSON.parse(responseText) as TranscriptionResponse) : ({}) as TranscriptionResponse;
          } catch {
            reject(new Error('Invalid server response.'));
            return;
          }

          if (request.status >= 200 && request.status < 300) {
            resolve(payload);
          } else {
            const message =
              payload &&
              typeof payload === 'object' &&
              'error' in payload &&
              payload.error
                ? payload.error ?? `Transcription failed (status ${request.status}).`
                : `Transcription failed (status ${request.status}).`;
            reject(new Error(message));
          }
        };

        request.send(formData);
      }),
    [setStatusMessage, updateUploadProgress],
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
        const support = contextMimeSupportRef.current;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = `context-${timestamp}`;
        const normalizedType =
          blob instanceof File && blob.type
            ? blob.type.split(';', 1)[0]?.trim()?.toLowerCase() ?? ''
            : '';
        const fallbackMime = normalizedType || support?.mimeType?.split(';', 1)[0] || 'audio/webm';
        const fallbackName = `${baseName}.${support?.extension ?? 'webm'}`;

        let workingFile: File;
        try {
          workingFile = await convertBlobToWav(blob, `${baseName}.wav`);
        } catch (wavError) {
          console.warn('Context recording WAV conversion failed', wavError);
          try {
            const preferredName =
              blob instanceof File && blob.name ? blob.name : fallbackName;
            const preferredType =
              blob instanceof File && blob.type ? blob.type : fallbackMime;
            workingFile =
              blob instanceof File
                ? new File([blob], preferredName, { type: preferredType })
                : new File([blob], fallbackName, { type: fallbackMime });
          } catch (wrapError) {
            console.warn('Context recording fallback file creation failed', wrapError);
            workingFile = new File([blob], fallbackName, { type: fallbackMime });
          }
        }

        const formData = new FormData();
        formData.append('audio', workingFile, workingFile.name);
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

  const displayFileName = useMemo(() => {
    if (meetingRecordingFilename) return meetingRecordingFilename;
    if (file) return file.name;
    return 'No file chosen';
  }, [file, meetingRecordingFilename]);

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
      const support = meetingMimeSupportRef.current;
      if (!support) {
        setMeetingRecordingError('Recording is not supported in this browser.');
        setIsProcessingRecording(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: support.mimeType });
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
        const blob = new Blob(chunks, { type: support.mimeType });
        if (blob.size === 0) {
          setMeetingRecordingError('No audio captured. Try recording again.');
          setIsProcessingRecording(false);
          return;
        }
        const baseName = `meeting-${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')}`;

        void (async () => {
          try {
            const fallbackMime = support.mimeType.split(';', 1)[0] ?? 'audio/webm';
            const fallbackName = `${baseName}.${support.extension}`;

            let finalFile: File;
            try {
              finalFile = new File([blob], `${baseName}.${support.extension}`, {
                type: fallbackMime,
              });
            } catch (wrapError) {
              console.warn('Meeting recording file wrap failed', wrapError);
              try {
                finalFile = await convertBlobToWav(blob, `${baseName}.wav`);
              } catch (wavError) {
                console.warn('Meeting recording WAV conversion failed, using original blob', wavError);
                finalFile = new File([blob], fallbackName, { type: fallbackMime });
              }
            }
            setMeetingRecordingFilename(finalFile.name);
            setHasRecordedMeeting(true);
            setMeetingRecordingError(null);
            setFile(finalFile);
            if (fileInputRef.current && typeof DataTransfer !== 'undefined') {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(finalFile);
              fileInputRef.current.files = dataTransfer.files;
            }
          } catch (processingError) {
            console.warn('Meeting recording processing failed', processingError);
            setMeetingRecordingError('Unable to process recording. Please upload audio manually.');
            setHasRecordedMeeting(false);
          } finally {
            setIsProcessingRecording(false);
          }
        })();
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
    if (!supportsMeetingRecording) return 'Recording unavailable';
    if (file) return 'File selected';
    return 'Idle';
  }, [
    file,
    hasRecordedMeeting,
    isProcessingRecording,
    isRecordingMeeting,
    meetingRecordingFilename,
    supportsMeetingRecording,
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      meetingMimeSupportRef.current = null;
      contextMimeSupportRef.current = null;
      setSupportsMeetingRecording(false);
      setSupportsContextRecording(false);
      return;
    }

    const isSafari =
      typeof navigator !== 'undefined' &&
      /safari/i.test(navigator.userAgent) &&
      !/chrome|chromium|crios/i.test(navigator.userAgent);

    const candidates: Array<{ mimeType: string; extension: string }> = isSafari
      ? [
          { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
          { mimeType: 'audio/mp4', extension: 'm4a' },
          { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
          { mimeType: 'audio/webm', extension: 'webm' },
        ]
      : [
          { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
          { mimeType: 'audio/webm', extension: 'webm' },
          { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
          { mimeType: 'audio/mp4', extension: 'm4a' },
        ];

    const pickSupport = () => {
      for (const option of candidates) {
        if (MediaRecorder.isTypeSupported(option.mimeType)) {
          return option;
        }
      }
      return null;
    };

    const meetingSupport = pickSupport();
    meetingMimeSupportRef.current = meetingSupport;
    setSupportsMeetingRecording(Boolean(meetingSupport));

    const contextSupport = pickSupport();
    contextMimeSupportRef.current = contextSupport;
    setSupportsContextRecording(Boolean(contextSupport));
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

    // Check usage limits before proceeding
    if (!canCreateTranscription) {
      try {
        const usageCheck = await checkUsageLimit('transcribe');
        if (!usageCheck.canProceed) {
          setError(usageCheck.reason || 'Usage limit exceeded. Please upgrade your plan to continue.');
          return;
        }
      } catch (error) {
        console.error('Error checking usage limits:', error);
        setError('Unable to verify usage limits. Please try again.');
        return;
      }
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
    setLimitExceeded(null);
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

    setUploadPhase('uploading');
    updateUploadProgress(0, true);

    try {
      const payload = await sendTranscriptionRequest(formData, file.size);

      if (!payload || typeof payload !== 'object' || 'error' in payload) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload && payload.error
            ? payload.error ?? 'Transcription failed.'
            : 'Transcription failed.',
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
      setWarnings(payload.warnings ?? []);
      setLimitExceeded(payload.limitExceeded ?? null);
      setMeetingContext('');
      setStatusMessage(payload.limitExceeded ? 'Completed - Usage limit exceeded' : 'Completed successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
      setStatusMessage('');
    } finally {
      setIsSubmitting(false);
      setUploadPhase('idle');
      resetUploadProgress();
    }
  };

  return (
    <ProtectedRoute>
      <main className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.kicker}>Minutes workspace preview</p>
          <h1 className={styles.title}>Meeting minutes workspace</h1>
          <p className={styles.lead}>
            Capture meetings, add context, and review transcripts and minutes without leaving the page.
          </p>
        </div>
        <dl className={styles.headerStats}>
          <div className={styles.stat}>
            <dt>Input</dt>
            <dd>{displayFileName}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Recording</dt>
            <dd>
              {isRecordingMeeting
                ? 'Recording…'
                : hasRecordedMeeting
                  ? formattedMeetingDuration
                  : 'Idle'}
            </dd>
          </div>
        </dl>
        <span
          className={`${styles.headerStatus} ${
            isRecordingMeeting ? styles.headerStatusActive : ''
          }`}
          title={headerStatus}
        >
          {meetingStatusLabel}
        </span>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.layout}>
          <div className={styles.captureColumn}>
            <section className={styles.panel}>
              <button
                type="button"
                className={`${styles.stepHeader} ${captureOpen ? styles.stepHeaderOpen : ''} ${
                  isRecordingMeeting ? styles.stepHeaderActive : ''
                }`}
                onClick={() => setCaptureOpen((previous) => !previous)}
                aria-expanded={captureOpen}
              >
                <div className={styles.stepLabel}>
                  <span className={styles.stepNumber}>Step 1</span>
                  <span className={styles.stepHint}>Upload audio</span>
                  <div>
                    <h2 className={styles.panelTitle}>Capture / upload meeting audio</h2>
                    <p className={styles.panelSubtitle}>
                      Use the microphone or upload an audio file to begin.
                    </p>
                  </div>
                </div>
                <span className={styles.chevron} aria-hidden="true">
                  {captureOpen ? '▾' : '▸'}
                </span>
              </button>

              {captureOpen && (
                <div className={styles.panelBody}>
                    <div className={styles.uploadLabel}>Upload recorded meeting audio</div>
                  <div className={styles.recordControls}>
                    <button
                      type="button"
                      onClick={handleMeetingRecordToggle}
                      className={`${styles.recordButton} ${
                        isRecordingMeeting ? styles.recordButtonActive : ''
                      }`}
                      disabled={isSubmitting || isProcessingRecording}
                    >
                      <span aria-hidden="true">🎤</span>
                      {isRecordingMeeting ? 'Stop recording' : 'Record meeting'}
                    </button>
                    {hasRecordedMeeting && audioUrl && meetingRecordingFilename && (
                      <a
                        href={audioUrl}
                        download={meetingRecordingFilename}
                        className={styles.secondaryButton}
                      >
                        Download capture
                      </a>
                    )}
                    {hasRecordedMeeting && (
                      <button
                        type="button"
                        onClick={handleDiscardRecording}
                        className={styles.tertiaryButton}
                        disabled={isRecordingMeeting}
                      >
                        Discard
                      </button>
                    )}
                  </div>

                  <div className={styles.recordMeta}>
                    <span className={styles.recordTimer}>
                      Elapsed: {formattedMeetingDuration}
                    </span>
                    {isProcessingRecording && (
                      <span className={styles.recordProcessing}>Processing…</span>
                    )}
                  </div>

                  {meetingRecordingError && (
                    <p className={styles.inlineError}>{meetingRecordingError}</p>
                  )}
                  {!supportsMeetingRecording && !meetingRecordingError && (
                    <p className={styles.inlineError}>
                      This browser does not support in-browser recording. Upload audio instead.
                    </p>
                  )}

                  <div className={styles.fileRow}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={styles.secondaryButton}
                      disabled={isSubmitting}
                    >
                      Choose audio
                    </button>
                    <span className={styles.fileName} aria-live="polite">
                      {displayFileName}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="audio"
                      accept="audio/*"
                      className={styles.fileInputHidden}
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
                      tabIndex={-1}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <button
                type="button"
                className={`${styles.stepHeader} ${contextOpen ? styles.stepHeaderOpen : ''}`}
                onClick={() => setContextOpen((previous) => !previous)}
                aria-expanded={contextOpen}
              >
                <div className={styles.stepLabel}>
                  <span className={styles.stepNumber}>Step 2</span>
                  <span className={styles.stepHint}>Meeting context</span>
                  <div>
                    <h2 className={styles.panelTitle}>Add meeting context</h2>
                    <p className={styles.panelSubtitle}>
                      Add agenda, goals, or attendees to steer the minutes.
                    </p>
                  </div>
                </div>
                <span className={styles.chevron} aria-hidden="true">
                  {contextOpen ? '▾' : '▸'}
                </span>
              </button>

              {contextOpen && (
                <div className={styles.panelBody}>
                  <textarea
                    value={meetingContext}
                    onChange={(event) => setMeetingContext(event.target.value)}
                    placeholder="Project roadmap sync, goals, owners, blockers..."
                    data-transcribing={isTranscribingContext}
                    rows={5}
                    className={styles.textarea}
                    disabled={isSubmitting}
                  />
                  <div className={styles.contextActions}>
                    <button
                      type="button"
                      onClick={handleContextRecordToggle}
                      className={`${styles.secondaryButton} ${
                        isRecordingContext ? styles.recording : ''
                      }`}
                      disabled={isSubmitting || isTranscribingContext}
                    >
                      {isRecordingContext ? 'Stop voice note' : 'Record voice note'}
                    </button>
                    <button
                      type="button"
                      className={styles.tertiaryButton}
                      onClick={() => setMeetingContext('')}
                      disabled={isSubmitting || isRecordingContext}
                    >
                      Clear
                    </button>
                  </div>
                  {contextError && (
                    <p className={styles.inlineError}>{contextError}</p>
                  )}
                  {!supportsContextRecording && !contextError && (
                    <p className={styles.inlineError}>
                      Voice notes are not available here. Type context instead.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <button
                type="button"
                className={`${styles.stepHeader} ${submitOpen ? styles.stepHeaderOpen : ''}`}
                onClick={() => setSubmitOpen((previous) => !previous)}
                aria-expanded={submitOpen}
              >
                <div className={styles.stepLabel}>
                  <span className={styles.stepNumber}>Step 3</span>
                  <span className={styles.stepHint}>Submit</span>
                  <div>
                    <h2 className={styles.panelTitle}>Submit for transcription</h2>
                    <p className={styles.panelSubtitle}>
                      Send the audio for transcription, insights, and OpenAI minutes.
                    </p>
                  </div>
                </div>
                <span className={styles.chevron} aria-hidden="true">
                  {submitOpen ? '▾' : '▸'}
                </span>
              </button>

              {submitOpen && (
                <div className={styles.panelBody}>
                  <p className={styles.statusCopy}>
                    {error ? error : statusMessage || 'Waiting for audio upload to begin.'}
                  </p>
                  {warnings.length > 0 && (
                    <ul className={styles.warningList}>
                      {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  {limitExceeded && (
                    <div className={styles.limitExceededWarning} style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '12px',
                      marginTop: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ color: '#f59e0b', fontSize: '18px' }}>⚠️</div>
                        <div>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#92400e' }}>
                            Usage Limit Exceeded
                          </p>
                          <p style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: '14px' }}>
                            {limitExceeded.message}
                          </p>
                          <a 
                            href={limitExceeded.upgradeUrl}
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          >
                            Upgrade Plan
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {uploadPhase === 'uploading' && (
                    <div className={styles.progressWrapper}>
                      <div className={styles.progressTrack} role="presentation">
                        <div
                          className={`${styles.progressFill} ${
                            uploadProgress === null ? styles.progressIndeterminate : ''
                          }`}
                          style={
                            uploadProgress === null
                              ? undefined
                              : { width: `${Math.min(Math.max(uploadProgress, 0), 100)}%` }
                          }
                        />
                      </div>
                      <span className={styles.progressLabel}>
                        {uploadProgress !== null
                          ? uploadProgress >= 100
                            ? 'Upload complete. Processing…'
                            : `Uploading… ${Math.min(Math.max(uploadProgress, 0), 99).toFixed(0)}%`
                          : 'Uploading…'}
                      </span>
                    </div>
                  )}
                  {uploadPhase === 'processing' && (
                    <div className={styles.progressWrapper}>
                      <div className={`${styles.progressTrack} ${styles.progressTrackProcessing}`}>
                        <div className={`${styles.progressFill} ${styles.progressFillProcessing}`} />
                      </div>
                      <span className={styles.progressLabel}>Processing transcription…</span>
                    </div>
                  )}
                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={`${styles.primaryButton} ${!canCreateTranscription ? styles.disabledButton : ''}`}
                      disabled={isSubmitting || !canCreateTranscription}
                      title={!canCreateTranscription ? 'Usage limit exceeded - upgrade to continue' : ''}
                    >
                      {isSubmitting ? 'Processing…' : !canCreateTranscription ? 'Usage limit exceeded' : 'Generate minutes'}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        setFile(null);
                        setMeetingRecordingFilename(null);
                        setHasRecordedMeeting(false);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      Clear audio
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.advancedLink}
                    onClick={() => setIsConfigOpen((previous) => !previous)}
                    disabled={isSubmitting}
                  >
                    {isConfigOpen ? 'Hide advanced settings' : 'Advanced settings'}
                  </button>
                  {isConfigOpen && (
                    <div className={styles.advancedSection}>
                      <label className={styles.field}>
                        <span>Language</span>
                        <input
                          type="text"
                          value={language}
                          onChange={(event) => setLanguage(event.target.value)}
                          placeholder="en"
                          disabled={isSubmitting}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Diarization mode</span>
                        <select
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
                      <label className={styles.field}>
                        <span>
                          Speaker sensitivity {diarizationMode !== 'speaker' && '(speaker mode only)'}
                        </span>
                        <input
                          type="range"
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
                      <div className={styles.configControls}>
                        <button
                          type="button"
                          className={`${styles.tertiaryButton} ${
                            showAdvanced ? styles.tertiaryActive : ''
                          }`}
                          onClick={() => setShowAdvanced((previous) => !previous)}
                          disabled={isSubmitting}
                        >
                          {showAdvanced ? 'Hide additional options' : 'Show additional options'}
                        </button>
                      </div>
                      {showAdvanced && (
                        <div className={styles.advancedGrid}>
                          <label className={styles.switchRow}>
                            <input
                              type="checkbox"
                              checked={enableSummarization}
                              onChange={(event) =>
                                setEnableSummarization(event.target.checked)
                              }
                              disabled={isSubmitting}
                            />
                            <span>Generate AI summary</span>
                          </label>
                          {enableSummarization && (
                            <div className={styles.inlineFields}>
                              <label>
                                Style
                                <select
                                  value={summaryType}
                                  onChange={(event) =>
                                    setSummaryType(
                                      event.target.value as 'paragraphs' | 'bullets',
                                    )
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
                          <label className={styles.switchRow}>
                            <input
                              type="checkbox"
                              checked={enableSentiment}
                              onChange={(event) =>
                                setEnableSentiment(event.target.checked)
                              }
                              disabled={isSubmitting}
                            />
                            <span>Sentiment analysis</span>
                          </label>
                          <label className={styles.switchRow}>
                            <input
                              type="checkbox"
                              checked={enableTopics}
                              onChange={(event) =>
                                setEnableTopics(event.target.checked)
                              }
                              disabled={isSubmitting}
                            />
                            <span>Topic detection</span>
                          </label>
                          {enableTopics && (
                            <label className={styles.field}>
                              <span>Focus topics (comma separated)</span>
                              <input
                                type="text"
                                value={topicsInput}
                                onChange={(event) =>
                                  setTopicsInput(event.target.value)
                                }
                                placeholder="budgets, hiring, roadmap"
                                disabled={isSubmitting}
                              />
                            </label>
                          )}
                          <label className={styles.field}>
                            <span>Translation languages (ISO codes)</span>
                            <input
                              type="text"
                              value={translationInput}
                              onChange={(event) =>
                                setTranslationInput(event.target.value)
                              }
                              placeholder="es, fr, de"
                              disabled={isSubmitting}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
          <div className={styles.timelineColumn}>
            <section className={styles.panel}>
              <header className={styles.panelHeading}>
                <div>
                  <h2 className={styles.panelTitle}>Transcript timeline</h2>
                  <p className={styles.panelSubtitle}>
                    Jump to any speaker turn and fine-tune labels.
                  </p>
                </div>
                <div className={styles.timelineActions}>
                  <button
                    type="button"
                    onClick={() => handleJump('previous')}
                    className={styles.tertiaryButton}
                    disabled={displaySegments.length === 0}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJump('next')}
                    className={styles.tertiaryButton}
                    disabled={displaySegments.length === 0}
                  >
                    Next
                  </button>
                </div>
              </header>

              {audioUrl ? (
                <div className={styles.audioPlayer}>
                  <audio ref={audioRef} src={audioUrl} controls />
                </div>
              ) : (
                <p className={styles.emptyState}>
                  Add audio to preview the meeting timeline.
                </p>
              )}

              {displaySegments.length > 0 && (
                <div className={styles.speakerPalette}>
                  <p className={styles.paletteTitle}>Speaker labels</p>
                  <div className={styles.speakerGrid}>
                    {Array.from(
                      new Set(
                        displaySegments.map((segment) => segment.speakerId),
                      ),
                    ).map((speakerId) => (
                      <label key={speakerId}>
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
                </div>
              )}

              <ol className={styles.segmentList}>
                {displaySegments.map((segment) => {
                  const isActive = activeSegmentIndex === segment.index;
                  return (
                    <li
                      key={`${segment.speakerId}-${segment.start.toFixed(3)}`}
                      className={`${styles.segmentItem} ${
                        isActive ? styles.segmentItemActive : ''
                      }`}
                      ref={(element) => {
                        segmentRefs.current[segment.index] = element;
                      }}
                    >
                      <button
                        type="button"
                        className={styles.segmentButton}
                        onClick={() => handleSegmentClick(segment)}
                      >
                        <div className={styles.segmentHeader}>
                          <span
                            className={styles.segmentSpeaker}
                            style={{ color: segment.color }}
                          >
                            {segment.displayLabel}
                          </span>
                          <span className={styles.segmentTime}>
                            {segment.displayStart}
                          </span>
                        </div>
                        <p className={styles.segmentText}>{segment.text}</p>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {displaySegments.length === 0 && (
                <p className={styles.emptyState}>
                  Once transcription completes, diarised turns appear here.
                </p>
              )}
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeading}>
                <h2 className={styles.panelTitle}>Highlights</h2>
              </header>
              <div className={styles.insightGrid}>
                {summaryLines.length > 0 && (
                  <article className={styles.insightCard}>
                    <h3>Summary</h3>
                    <ul>
                      {summaryLines.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  </article>
                )}

                {sentimentOverall && (
                  <article className={styles.insightCard}>
                    <h3>Sentiment</h3>
                    <ul>
                      <li>
                        <span>Positive</span>
                        <span>{sentimentOverall.positive_count ?? 0}</span>
                      </li>
                      <li>
                        <span>Neutral</span>
                        <span>{sentimentOverall.neutral_count ?? 0}</span>
                      </li>
                      <li>
                        <span>Negative</span>
                        <span>{sentimentOverall.negative_count ?? 0}</span>
                      </li>
                    </ul>
                  </article>
                )}

                {topicSummaryEntries.length > 0 && (
                  <article className={styles.insightCard}>
                    <h3>Topics</h3>
                    <ul>
                      {topicSummaryEntries.map(([topicName, count]) => (
                        <li key={topicName}>
                          <span>{topicName}</span>
                          <span>{count}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                )}

                {translationEntries.length > 0 && (
                  <article className={styles.insightCard}>
                    <h3>Translations</h3>
                    <ul className={styles.translationList}>
                      {translationEntries.map(([languageCode, sentences]) => (
                        <li key={languageCode}>
                          <span className={styles.translationLanguage}>
                            {languageCode.toUpperCase()}
                          </span>
                          <span className={styles.translationSample}>
                            {sentences[0]?.content ?? 'Ready to review'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                )}

                {summaryLines.length === 0 &&
                  !sentimentOverall &&
                  topicSummaryEntries.length === 0 &&
                  translationEntries.length === 0 && (
                    <p className={styles.emptyState}>
                      Enable enrichment to see highlights and trends.
                    </p>
                  )}
              </div>
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeading}>
                <h2 className={styles.panelTitle}>Meeting Minutes</h2>
                <p className={styles.panelSubtitle}>
                  AI-generated meeting minutes and action items.
                </p>
              </header>
              
              {minutes ? (
                <div className={styles.minutesContainer}>
                  <div
                    className={styles.minutesContent}
                    dangerouslySetInnerHTML={{ __html: minutesHtml }}
                  />
                  <div className={styles.minutesActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() =>
                        handleDownload(
                          minutes,
                          'meeting-minutes.md',
                          'text/markdown;charset=utf-8',
                        )
                      }
                    >
                      Download Minutes
                    </button>
                  </div>
                </div>
              ) : (
                <p className={styles.emptyState}>
                  Meeting minutes will appear here after transcription completes.
                </p>
              )}
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHeading}>
                <h2 className={styles.panelTitle}>Exports</h2>
              </header>
              <div className={styles.downloadList}>
                {plainSpeakerTranscript && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      handleDownload(
                        plainSpeakerTranscript,
                        'transcript_speakers.txt',
                      )
                    }
                  >
                    Speaker-attributed TXT
                  </button>
                )}
                {transcriptText && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      handleDownload(
                        transcriptText,
                        'transcript.txt',
                        'text/plain;charset=utf-8',
                      )
                    }
                  >
                    Transcript (.txt)
                  </button>
                )}
                {transcriptSrt && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      handleDownload(
                        transcriptSrt,
                        'transcript.srt',
                        'text/plain;charset=utf-8',
                      )
                    }
                  >
                    Captions (.srt)
                  </button>
                )}
                {transcriptJson && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      handleDownload(
                        JSON.stringify(transcriptJson, null, 2),
                        'transcript.json',
                        'application/json',
                      )
                    }
                  >
                    Transcript JSON
                  </button>
                )}
                {minutes && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      handleDownload(
                        minutes,
                        'minutes.md',
                        'text/markdown;charset=utf-8',
                      )
                    }
                  >
                    Minutes (.md)
                  </button>
                )}
                {!plainSpeakerTranscript &&
                  !transcriptText &&
                  !transcriptSrt &&
                  !transcriptJson &&
                  !minutes && (
                    <p className={styles.emptyState}>
                      Exports appear after the transcript finishes.
                    </p>
                  )}
              </div>
            </section>


        </div>
      </section>
    </form>
  </main>
    </ProtectedRoute>
  );
}
