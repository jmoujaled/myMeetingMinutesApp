# Implementation Journal

This log captures the evolution of the meeting-minutes studio so we can pick the work back up later without re-discovering the context.

## Early setup
- Bootstrapped the project with `create-next-app` and upgraded to the App Router layout (`/src/app`).
- Added `/studio` as the primary workspace with client-side recording, upload, and playback.
- Introduced Speechmatics batch transcription via `/api/transcribe`, including diarization, summaries, sentiment, topics, and translations.
- Integrated OpenAI Responses to turn transcripts into executive-style minutes.

## Enrichment & review experience
- Built diarized segment timeline with speaker colour-coding, click-to-seek audio, and inline label editing.
- Surfaced Speechmatics enrichment blocks (summary, sentiment, topics, translations) and download links for TXT/SRT/JSON + OpenAI minutes.
- Added advanced form controls so users can choose diarization mode, speaker sensitivity, summarisation preferences, sentiment/topics toggles, and translation languages.

## Safari compatibility sprint
- Normalised MIME detection for `MediaRecorder` so Safari falls back to supported codecs while Chrome keeps Opus/WebM.
- Hardened the API allow-list to accept `audio/webm;codecs=opus` and other codec-qualified MIME headers.
- Implemented conversion fallbacks for context recordings and meeting captures so zero-sample blobs or unsupported names are caught before upload.
- Standardised recorded file names to `meeting-<timestamp>` / `context-<timestamp>` regardless of browser quirks.
- Added a custom file picker display so Safari no longer surfaces `com.apple.WebKit.WebContent.xpc` as the chosen file name.

## MP3 encoder rollout
- Bundled `lamejs` and introduced `convertBlobToMp3`, cutting Safari upload sizes by ~6–10×.
- Updated both context and meeting recording flows to try MP3 first, with WAV and original-blob fallbacks for resilience.
- Refreshed documentation to reflect the new pipeline and removed "coming soon" notices.

## Documentation refresh
- Replaced the stock README with project-specific setup, architecture, and testing guidance.
- Added this journal for future contributors and refreshed the docs in `docs/` (see individual files for details).

## Open questions & next steps
- **Large meeting handling** – For 30+ minute recordings we likely need to stage audio in object storage and send Speechmatics a signed URL instead of the raw form upload.
- **Persistence** – Consider storing transcripts and minutes so refreshes or browser crashes don’t drop results.

Refer back here before the next iteration to avoid repeating the investigative work.
