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

export default function Home() {
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
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

      if (/^[-*]\s+/.test(line)) {
        if (!listOpen) {
          html.push('<ul>');
          listOpen = true;
        }
        const content = applyInlineFormatting(line.replace(/^[-*]\s+/, ''));
        html.push(`<li>${content}</li>`);
      } else {
        closeList();
        const content = applyInlineFormatting(line);
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
    setStatusMessage('Uploading audio to Speechmatics...');

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('language', language);
    formData.append('diarizationMode', diarizationMode);
    formData.append('speakerSensitivity', speakerSensitivity.toString());
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

      setStatusMessage('Generating meeting minutes with OpenAI...');

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
        <h1 className={styles.heading}>myMeetingMinutesApp</h1>
        <p className={styles.subtitle}>
          Upload an audio file, configure diarization and enrichment options, and
          generate insights powered by Speechmatics and OpenAI.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            <span>Audio file (MP3, WAV, M4A...)</span>
            <input
              type="file"
              name="audio"
              accept="audio/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isSubmitting}
              required
            />
          </label>

          <button
            type="button"
            className={styles.advancedToggle}
            onClick={() => setShowAdvanced((previous) => !previous)}
          >
            {showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
          </button>

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
                  <span>Speechmatics summarization</span>
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
                {jobInfo && (
                  <span className={styles.badge}>Job #{jobInfo.id}</span>
                )}
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
              <h2>OpenAI meeting minutes</h2>
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
