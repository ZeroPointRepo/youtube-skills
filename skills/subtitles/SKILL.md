---
name: subtitles
description: Get subtitles from YouTube videos for translation, language learning, or reading along. Use when the user asks for subtitles, subs, foreign language text, or wants to read video content. Supports multiple languages and timestamped output for sync'd reading.
homepage: https://transcriptapi.com
metadata:
  {
    "openclaw":
      {
        "emoji": "🗨️",
        "requires": { "env": ["TRANSCRIPT_API_KEY"], "bins": ["node"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# Subtitles

Fetch YouTube video subtitles via [TranscriptAPI.com](https://transcriptapi.com).

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

→ API key saved to your shell profile (~/.zshenv on macOS, ~/.bashrc on Linux, PowerShell profile on Windows) and ~/.transcriptapi. Ready to use.

Manual option: [transcriptapi.com/signup](https://transcriptapi.com/signup) → Dashboard → API Keys.

## GET /api/v2/youtube/transcript

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=text&include_timestamp=false&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param               | Values                  | Use case                                       |
| ------------------- | ----------------------- | ---------------------------------------------- |
| `video_url`         | YouTube URL or video ID | Required                                       |
| `format`            | `json`, `text`          | `json` for sync'd subs with timing             |
| `include_timestamp` | `true`, `false`         | `false` for clean text for reading/translation |
| `send_metadata`     | `true`, `false`         | Include title, channel, description            |

**For language learning** — clean text without timestamps:

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=false" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

**For translation** — structured segments:

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=json&include_timestamp=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

**Response** (`format=json`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "We're no strangers to love", "start": 18.0, "duration": 3.5 }
  ]
}
```

**Response** (`format=text`, `include_timestamp=false`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": "We're no strangers to love\nYou know the rules and so do I..."
}
```

## Tips

- Many videos have auto-generated subtitles in multiple languages.
- Use `format=json` to get timing for each line (great for sync'd reading).
- Use `include_timestamp=false` for clean text suitable for translation apps.

## Errors

| Code | Action                                 |
| ---- | -------------------------------------- |
| 402  | No credits — transcriptapi.com/billing |
| 404  | No subtitles available                 |
| 408  | Timeout — retry once after 2s          |

1 credit per request. Free tier: 100 credits, 300 req/min.
