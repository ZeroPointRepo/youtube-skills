---
name: video-transcript
description: Extract full transcripts from video content for analysis, summarization, note-taking, or research. Use when the user wants a written version of video content, asks to "transcribe this", "get the text from this video", "convert video to text", or shares a video URL for content extraction.
homepage: https://transcriptapi.com
metadata:
  {
    "moltbot":
      {
        "emoji": "🎬",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# Video Transcript

Extract transcripts from videos via [TranscriptAPI.com](https://transcriptapi.com).

## Setup

If `$TRANSCRIPT_API_KEY` is not set, help the user create an account (100 free credits, no card):

**Step 1 — Register:** Ask user for their email, generate a secure password.

```bash
node ./scripts/tapi-auth.js register --email USER_EMAIL --password SECURE_PASS --json
```

→ OTP sent to email. Ask user: _"Check your email for a 6-digit verification code."_
⚠️ **SAVE THE PASSWORD** — you need it again in Step 2!

**Step 2 — Verify:** Once user provides the OTP (use SAME password from Step 1):

```bash
node ./scripts/tapi-auth.js verify --email USER_EMAIL --password SECURE_PASS --otp CODE --json
```

→ Returns `api_key` (starts with `sk_`).

**Step 3 — Save:** Store the key (auto-configures agent + shell):

```bash
node ./scripts/tapi-auth.js save-key --key API_KEY --json
```

→ Ready to use. Agent runtime picks up the key automatically.

Manual option: [transcriptapi.com/signup](https://transcriptapi.com/signup) → Dashboard → API Keys.

## GET /api/v2/youtube/transcript

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param               | Required | Default | Values                                 |
| ------------------- | -------- | ------- | -------------------------------------- |
| `video_url`         | yes      | —       | YouTube URL or 11-char video ID        |
| `format`            | no       | `json`  | `json` (structured), `text` (readable) |
| `include_timestamp` | no       | `true`  | `true`, `false`                        |
| `send_metadata`     | no       | `false` | `true`, `false`                        |

Accepted URL formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/shorts/VIDEO_ID`
- Bare video ID: `dQw4w9WgXcQ`

**Response** (`format=text&send_metadata=true`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": "[00:00:18] We're no strangers to love\n[00:00:21] You know the rules...",
  "metadata": {
    "title": "Rick Astley - Never Gonna Give You Up",
    "author_name": "Rick Astley",
    "author_url": "https://www.youtube.com/@RickAstley",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  }
}
```

**Response** (`format=json`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "We're no strangers to love", "start": 18.0, "duration": 3.5 },
    { "text": "You know the rules and so do I", "start": 21.5, "duration": 2.8 }
  ]
}
```

## Tips

- Summarize long transcripts into key points first, offer full text on request.
- Use `format=json` when you need precise timestamps for quoting specific moments.
- Use `send_metadata=true` to get video title and channel for context.
- Works with YouTube Shorts too.

## Errors

| Code | Meaning       | Action                              |
| ---- | ------------- | ----------------------------------- |
| 401  | Bad API key   | Check key or re-setup               |
| 402  | No credits    | Top up at transcriptapi.com/billing |
| 404  | No transcript | Video may not have captions enabled |
| 408  | Timeout       | Retry once after 2s                 |

1 credit per successful request. Errors don't consume credits. Free tier: 100 credits, 300 req/min.
