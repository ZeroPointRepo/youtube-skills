---
name: transcript
description: Get transcripts from any YouTube video — for summarization, research, translation, quoting, or content analysis. Use when the user shares a video link or asks "what did they say", "get the transcript", "transcribe this video", "summarize this video", or wants to analyze spoken content.
homepage: https://transcriptapi.com
user-invocable: true
---

# Transcript

Fetch video transcripts via [TranscriptAPI.com](https://transcriptapi.com).

## Setup

If `$TRANSCRIPT_API_KEY` is not set, help the user create an account (100 free credits, no card):

**Step 1 — Register:** Ask user for their email.

```bash
node ./scripts/tapi-auth.js register --email USER_EMAIL
```

→ OTP sent to email. Ask user: _"Check your email for a 6-digit verification code."_

**Step 2 — Verify:** Once user provides the OTP:

```bash
node ./scripts/tapi-auth.js verify --token TOKEN_FROM_STEP_1 --otp CODE
```

> API key saved to your shell profile and agent config. Ready to use.

Manual option: [transcriptapi.com/signup](https://transcriptapi.com/signup) → Dashboard → API Keys.

## GET /api/v2/youtube/transcript

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param               | Required | Default | Values                          |
| ------------------- | -------- | ------- | ------------------------------- |
| `video_url`         | yes      | —       | YouTube URL or 11-char video ID |
| `format`            | no       | `json`  | `json`, `text`                  |
| `include_timestamp` | no       | `true`  | `true`, `false`                 |
| `send_metadata`     | no       | `false` | `true`, `false`                 |

Accepts: full URLs (`youtube.com/watch?v=ID`), short URLs (`youtu.be/ID`), shorts (`youtube.com/shorts/ID`), or bare video IDs.

> **Prerequisite:** Before requesting a transcript, verify the video has captions available. On YouTube, click the "Transcript" button below the video. If no transcript button appears, the video doesn't have captions and the API will return 404.

**Default:** Always use `format=text&include_timestamp=true&send_metadata=true` unless user specifies otherwise.

**Response** (`format=json`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "We're no strangers to love", "start": 18.0, "duration": 3.5 },
    { "text": "You know the rules and so do I", "start": 21.5, "duration": 2.8 }
  ],
  "metadata": {
    "title": "Rick Astley - Never Gonna Give You Up",
    "author_name": "Rick Astley",
    "author_url": "https://www.youtube.com/@RickAstley",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  }
}
```

**Response** (`format=text`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": "[00:00:18] We're no strangers to love\n[00:00:21] You know the rules...",
  "metadata": {...}
}
```

## Errors

| Code | Meaning              | Action                                                                                                                                                                                                 |
| ---- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401  | Bad API key          | Check key or re-setup                                                                                                                                                                                  |
| 402  | No credits           | Top up at transcriptapi.com/billing                                                                                                                                                                   |
| 404  | No transcript avail | Video exists but has no captions/subtitles. **This is common** — public videos often don't have captions enabled. Check YouTube directly: click the transcript button under the video. |
| 408  | Timeout              | Retry once after 2s                                                                                                                                                                                    |
| 429  | Rate limited         | Wait and retry                                                                                                                                                                                        |

> **Why does my video return 404 even though it's public?** A public video may not have captions enabled. YouTube requires either auto-generated captions (which may fail for poor audio) or manually uploaded subtitles. The transcript API cannot generate captions from audio — it can only retrieve existing caption tracks.

## Tips

- For long videos, summarize key points first, offer full transcript on request.
- Use `format=json` when you need precise timestamps for quoting specific moments.
- Use `include_timestamp=false` for clean text suitable for translation or analysis.
- 1 credit per successful request. Errors don't cost credits.
- Free tier: 100 credits, 300 req/min.
