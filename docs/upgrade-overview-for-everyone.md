# What's New (Explained the Easy Way)

## Smarter setup before you upload
- **Choose how voices are split** – Pick from different diarization modes (like “speaker” or “speaker change”). If you pick “speaker”, the sensitivity slider wakes up. Moving it changes how picky Speechmatics is about telling voices apart: higher = treats similar voices as different people, lower = merges them more often.
- **Decide what extras you want** – Switch on Speechmatics-made summaries, mood (sentiment) checks, topic spotting, and translations into other languages. Just tick the boxes you care about.
- **Say which languages to translate into** – Type ISO codes like `es` for Spanish or `fr` for French, separated by commas.

## Better results page
- **Built-in audio player** – Listen to the meeting right inside the app. Each transcript chunk is clickable; hit it and the audio jumps to that moment.
- **Rename speakers** – Change “Speaker 1” into “Alex” or “Coach” so everything makes sense. Each speaker gets their own color badge.
- **Speechmatics goodies** – You now see:
  - A summary written directly by Speechmatics
  - Mood counts (how many parts were positive, neutral, or negative)
  - Key topics with how often they came up
  - Translations for any languages you asked for
- **OpenAI minutes stay** – The AI-written meeting minutes are still there, just in their own card.

## Recording quality-of-life
- **Safari behaves now** – The recorder figures out which formats each browser can handle. Safari gets a friendly filename that matches Chrome (`meeting-2025-…`) instead of the unreadable `com.apple.WebKit.WebContent.xpc` placeholder.
- **Uploads stay small** – Safari audio is transcoded to MP3 (about 6–10× smaller than WAV) before uploading to Speechmatics, with WAV as a quiet fallback. Chrome keeps its efficient WebM recording.

## Easy downloads
- Want to save the transcript? Grab it as plain text, SRT subtitles, or raw JSON. You can also download the OpenAI minutes as a Markdown file.

## Quick reminder on the “speaker sensitivity” slider
- Only usable when the diarization mode is set to **Speaker attribution**.
- Think of it like a strictness knob: move it right and Speechmatics separates voices even if they sound alike; move it left and it groups similar voices together. If you choose a diarization mode where sensitivity doesn’t matter (like just marking speaker changes), the slider greys out.

Enjoy exploring the new controls and insights. You now have way more levers to shape the transcript and the story you tell afterwards!
