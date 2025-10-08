# Speechmatics JS SDK – Capability Overview

The Speechmatics JavaScript SDK wraps the REST and WebSocket APIs for the Speechmatics speech-to-text platform. It gives you both **batch** (asynchronous file-based) and **real-time** (streaming) transcription workflows in Node.js, browsers, or hybrid environments.

This note breaks down the important classes, helper utilities, and the feature flags you can combine when designing an app.

## Core entry point – `Speechmatics`

```ts
import { Speechmatics } from 'speechmatics';
```

- Accepts either an API key string or a full `ConnectionConfig` object (host overrides, async JWT fetchers, optional `appId`).
- Exposes two main helpers:
  - `speechmatics.batch`: lazily instantiates a `BatchTranscription` client for file uploads and job control.
  - `speechmatics.realtime(...)`: returns a `RealtimeSession` bound to either the default connection config or an override (useful for separate JWTs per user/device).

Behind the scenes every HTTP/WebSocket call passes through `ConnectionConfigFull`, which carries default endpoints (`https://asr.api.speechmatics.com/v2` for batch, `wss://eu2.rt.speechmatics.com/v2` for realtime) and injects SDK metadata into requests.

## Batch transcription pipeline

`BatchTranscription` (`node_modules/speechmatics/src/batch/client.ts`) is your workhorse when you want to handle pre-recorded files (MP3, WAV, etc.) and wait for a full transcript.

### Key methods

| Method | Purpose |
| --- | --- |
| `transcribe(input, jobConfig, format?)` | One-shot helper that uploads a file/URL, polls the Speechmatics job, and returns the transcript in JSON (`RetrieveTranscriptResponse`), SRT, or plain text. |
| `createTranscriptionJob(input, createJobConfig)` | Submit a job but leave the polling to you—for background processing or queue systems. |
| `listJobs(filters?)` | Enumerate recent jobs (status filters, pagination) to drive dashboards. |
| `getJob(jobId)` | Fetch job metadata (status, errors, timings). |
| `getJobResult(jobId, format?)` | Download the transcript once the job is complete. |
| `deleteJob(jobId, force?)` | Clean up jobs (useful for compliance or cost control). |
| `getDataFile(jobId)` | Retrieve the original audio file Speechmatics stored. |
| `getFeatureDiscovery()` | Ask the API which languages/advanced features your account can use.

### Configuration highlights (from `BatchTranscriptionConfig`)

- **Language & locale**: choose input language and optional output locale variant.
- **Diarization modes**: `speaker`, `channel`, `speaker_change`, or combinations (`channel_and_speaker_change`).
  - `speaker_diarization_config.speaker_sensitivity` tailors how aggressively different voices are separated.
- **Translation**: attach a `translation_config` to produce multi-language transcripts.
- **Summarization** and **sentiment analysis**: enable via `summarization_config` / `sentiment_analysis_config` for post-processing.
- **Topics & entities**: detect keywords, named entities, numbers (`enable_entities`).
- **Audio filters & punctuation overrides**: clean noisy recordings, customize punctuation style.
- **Channel labels**: merge multi-channel recordings with custom labels.
- **Operating point**: switch between accuracy/latency trade-offs if your account supports it.

The JSON transcript (`RetrieveTranscriptResponse`) includes:

- Per-word timings, confidences, and optional speaker IDs (`BatchRecognitionResult`).
- Chapter summaries, audio events, sentiment/summary/topic payloads when enabled.
- Translation arrays keyed by ISO language code.

### Common app ideas powered by batch mode

1. **Meeting and interview pipelines**: Upload conference recordings, diarize speakers, and generate summaries or action items (as we’ve started with OpenAI).
2. **Podcast/video post-production**: Batch jobs for episode transcripts, language translation, and SRT export.
3. **Compliance monitoring**: Process call-center recordings with sentiment analysis and entity extraction for quality assurance.
4. **Content search**: Store JSON word timings in a search index to provide "jump-to-quote" within long recordings.

## Real-time transcription

`RealtimeSession` (`node_modules/speechmatics/src/realtime/client.ts`) delivers low-latency transcripts over WebSockets. It works in Node.js, browsers, and Chrome extensions thanks to environment-specific socket wrappers (`node.ts`, `browser.ts`, `extension.ts`).

### Lifecycle

1. **Instantiate**: `const session = new RealtimeSession(apiKeyOrConfig);`
2. **Register listeners** with `session.addListener(event, handler)` for events like:
   - `RecognitionStarted`, `AddPartialTranscript`, `AddTranscript`
   - `AddPartialTranslation`, `AddTranslation`
   - `AudioEventStarted`, `AudioEventEnded` (when audio events are enabled)
   - `Error`, `EndOfTranscript`, `Warning`, `Info`
3. **Start**: `await session.start({ transcription_config, audio_format, translation_config, audio_events_config });`
4. **Stream audio**: `session.rtSocketHandler.sendAudioBuffer(...)` (abstracted via `session.sendAudio` helper if you use higher-level APIs).
5. **Stop**: `await session.stop();` (sends an `EndOfStream` message, waits for clean disconnect).

### Transcription options (`RealtimeTranscriptionConfig` & `SessionConfig`)

- Input language (defaults to `en`).
- Partial vs. full transcripts (already handled by event types).
- Translation targets in parallel with transcription.
- Audio events (non-speech detection like laughter, music, etc.)
- Speaker change detection (different to full diarization but gives boundary markers).
- Custom audio formats if you are streaming PCM, Opus, etc. from WebRTC or native clients.

### Real-time use cases

1. **Live captioning** for webinars, livestreams, or in-person events.
2. **Voice typing / command interfaces** that react to partial transcripts for responsiveness.
3. **Agent-assist dashboards** in contact centres, mixing live transcripts with CRM lookups.
4. **Dual-channel recording monitors** (e.g., analyst + caller) with channel diarization and translation for supervisors.

## Auth & security helpers

- **Bearer key**: pass the long-lived API key server-side.
- **Short-lived tokens**: call `getShortLivedToken('batch' | 'rt', apiKey, managementPlatformUrl, ttl)` from the SDK’s management-platform helper to mint JWTs for browser/mobile clients.
- All network calls run through `request(...)`, which injects SDK metadata and raises typed errors (`SpeechmaticsNetworkError`, `SpeechmaticsResponseError`, `SpeechmaticsInvalidTypeError`).

## Error handling & diagnostics

- Batch methods throw `SpeechmaticsConfigurationError` if you forget keys.
- HTTP failure responses wrap the API’s JSON payload so you can log precise error codes.
- Realtime sessions surface server warnings/info messages via event listeners—useful for handling codec or throttling issues.

## Composing features into products

Because both batch and realtime APIs share the same config objects, you can mix and match:

- Capture live audio with `RealtimeSession` for instant captions, while archiving the stream and later rerunning `BatchTranscription` for high-accuracy post-processing.
- Use diarization metadata to build speaker-aware analytics (talk-time heatmaps, interruption tracking).
- Feed partial transcripts into a knowledge base search to suggest articles during a call.
- Combine translation outputs with OpenAI or another LLM to produce multi-lingual minutes or summaries.

## Implementation tips

- **Client safety**: never ship long-lived API keys to the browser. Use the short-lived token helper or proxy calls through your backend.
- **Polling vs. webhooks**: `BatchTranscription.transcribe` internally polls; for high volume you can use `createTranscriptionJob` plus `notification_config` webhooks (configurable via `JobConfig`).
- **SRT/Text export**: request `format: 'srt'` or `'text'` in `getJobResult` for friendly export formats.
- **Advanced diarization**: `speaker_change` mode is faster if you only need boundaries; full `speaker` mode performs clustering to label recurring voices.
- **SDK metadata**: The SDK automatically adds `sm-sdk` query params so Speechmatics can attribute traffic—handy when debugging with support.
- **Audio formats**: Speechmatics accepts MP3, MP4/AAC, WebM/Opus, and WAV. The studio uploads the browser’s native container (WebM/Opus on Chromium, MP4/AAC on Safari) and only falls back to WAV when conversion fails.

## Brainstorming app ideas

1. **Hybrid meeting assistant**: Real-time captions during a call, followed by batch reprocessing for polished minutes, action items, and translations.
2. **Media localization studio**: Upload episodes, auto-generate bilingual transcripts, diarize speakers for subtitle styling, and export SRTs.
3. **Sales coaching tool**: Stream live calls for keyword detection, then run batch analytics overnight for sentiment and topic trends.
4. **Voice-driven knowledge base search**: Users speak questions, realtime partial transcripts query a search index, and playback continues uninterrupted.
5. **Regulatory compliance monitor**: Schedule batch jobs against call archives, flag entities (accounts, policies), and send alerts when risky phrases appear.

With these building blocks you can prototype anything from dashboards to fully automated assistants—all while taking advantage of Speechmatics’ diarization, translation, and enrichment features.
