# Speechmatics Meeting Minutes Studio

A full-stack Next.js lab that uploads meeting recordings to Speechmatics for transcription, enriches the results with diarization, summaries, sentiment, and topics, and then asks OpenAI to draft action-oriented minutes. The UI also records meetings directly in the browser, captures organiser context, and keeps results tidy for later download.

## Highlights
- **Browser recorder + uploads** – Capture a meeting or drop an existing file, then preview it in the app.
- **Safari hardening** – Fallback conversions, MIME normalisation, and consistent naming so Apple browsers behave like Chrome.
- **Speechmatics controls** – Pick diarization mode, tune speaker sensitivity, enable summaries, sentiment, topics, and translations.
- **Insight dashboards** – Review diarised segments, Speechmatics summaries, sentiment totals, topic breakdowns, translations, and OpenAI minutes in one place.
- **Exports** – Download TXT, SRT, JSON transcripts, and Markdown minutes with a single click.

## Prerequisites
- Node.js 18 or newer (Next.js App Router requires modern runtimes).
- Speechmatics Batch transcription API access and key.
- OpenAI API key with access to `gpt-5-mini-2025-08-07` (or adjust the model in `src/app/api/transcribe/route.ts`).

## Getting started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.local.example` (or create `.env.local`) and provide secrets:
   ```dotenv
   SPEECHMATICS_API_KEY=your-speechmatics-key
   OPENAI_API_KEY=your-openai-key
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Visit [http://localhost:3000/studio](http://localhost:3000/studio) to use the recording studio UI.

## Project structure
- `src/app/api/transcribe/route.ts` – Orchestrates the batch transcription workflow, retries with progressively simpler configs, fetches Speechmatics exports, and calls OpenAI for meeting minutes.
- `src/app/api/context-transcribe/route.ts` – Transcribes short organiser context clips through OpenAI Whisper / gpt-4o-mini-transcribe.
- `src/app/studio/page.tsx` – Client-side studio, in-browser recording, diarised segment renderer, exports, and settings.
- `src/utils/audio.ts` – Browser audio helpers (recorder capability detection, conversions).
- `docs/` – High-level overviews, upgrade notes, and implementation timeline.

## Browser & audio notes
- The recorder negotiates supported MIME types at runtime (`MediaRecorder.isTypeSupported`). Safari captures `audio/mp4`, we transcode it to MP3 (128 kbps) before upload, and fall back to WAV only if encoding fails. Chrome keeps the more efficient WebM/Opus stream.
- Speechmatics accepts MP3, MP4/AAC, WebM/Opus, and WAV, so transcripts stay consistent regardless of the originating browser.

## Useful scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with hot reload. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (recommended before committing). |

## Testing suggestions
- Record short clips in Safari, Chrome, and Firefox to confirm MIME handling.
- Exercise the advanced settings (diarization, summaries, sentiment, topics, translations) to ensure the server forwards everything correctly.
- Inspect warnings surfaced by the API route; repeated fallbacks indicate Speechmatics rejected a config.

## Future work
1. Stream large recordings directly to object storage and hand Speechmatics a signed URL for multi-hour meetings.
2. Cache/persist transcripts so a refresh doesn’t drop results.
3. Surface per-segment sentiment/topics once Speechmatics exposes them.

Happy shipping!
