# Upgrade Notes – Speechmatics Trial App

## Overview
This iteration extends the batch transcription workflow to surface more of Speechmatics' enrichment payloads and improves the review experience for meeting audio.

## Backend additions
- **Configurable job payloads** – API route now accepts diarization mode, summarization, sentiment, topic detection, and translation parameters and forwards them to Speechmatics (`BatchTranscription.transcribe`).
- **Export bundles** – After a job completes, the server fetches and returns plain-text and SRT transcripts alongside the original JSON response for download links.
- **Metadata passthrough** – Speechmatics `job`, `summary`, `sentiment_analysis`, `topics`, and `translations` are forwarded to the client unchanged so UI components can render native insights.

## Frontend additions
- **Recording review panel** – Streams the uploaded audio via a local `ObjectURL`, exposes playback controls, and shows job metadata.
- **Speaker timeline** – Displays diarized segments, supports label editing and color assignment, and seeks the audio element when a segment is clicked (with active highlighting).
- **Feature toggles** – New controls for diarization mode, speaker sensitivity (enabled in speaker diarization), summarization style, sentiment, topic detection, and translation language list.
- **Insight cards** – Panels for Speechmatics summary, sentiment counts, topic frequency histogram, and per-language translation lists.
- **Asset downloads** – Inline buttons to export TXT, SRT, JSON transcripts, and the OpenAI-generated minutes.
- **File picker polish** – Safari used to show `com.apple.WebKit.WebContent.xpc` when a recording finished. We now mirror Chrome’s behaviour with a custom picker label and timestamped filenames.

## Browser compatibility & uploads
- Normalise `MediaRecorder` MIME detection so Safari picks a supported codec (`audio/mp4`) and Chrome stays on Opus/WebM.
- Transcode Safari captures to MP3 (128 kbps) before upload, falling back to WAV only if encoding fails. Chrome retains its smaller WebM recordings.
- Expand API-side MIME validation to accept codec-qualified headers such as `audio/webm;codecs=opus`.

## UX considerations
- Speaker sensitivity slider is automatically disabled unless diarization mode is set to `speaker`, because Speechmatics only uses the sensitivity tuning when clustering speakers in that mode.
- Topic detection optional free-text field expects comma-separated keywords; leaving it blank defaults to automatic detection.
- Translation languages accept comma-separated ISO codes (e.g. `es, fr`), matching Speechmatics batch translation requirements.

## Follow-up ideas
- Persist user preferences in local storage.
- Provide tooltips for per-segment sentiment/topics once Speechmatics exposes fine-grain data.
- Wire OpenAI prompt styles to UI presets for custom minutes output.
