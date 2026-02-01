---
name: captions
description: Extract closed captions and subtitles from YouTube videos. Use when the user asks for captions, closed captions, CC, accessibility text, or wants to read what was said in a video. Supports timestamps and multiple languages. Great for deaf/HoH accessibility, content review, quoting, and translation.
homepage: https://transcriptapi.com
metadata:
  {
    "moltbot":
      {
        "emoji": "💬",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# Captions

Extract closed captions from YouTube videos via [TranscriptAPI.com](https://transcriptapi.com).

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
?video_url=VIDEO_URL&format=json&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param               | Required | Default | Values                              |
| ------------------- | -------- | ------- | ----------------------------------- |
| `video_url`         | yes      | —       | YouTube URL or video ID             |
| `format`            | no       | `json`  | `json` (structured), `text` (plain) |
| `include_timestamp` | no       | `true`  | `true`, `false`                     |
| `send_metadata`     | no       | `false` | `true`, `false`                     |

**Response** (`format=json` — best for accessibility/timing):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "We're no strangers to love", "start": 18.0, "duration": 3.5 },
    { "text": "You know the rules and so do I", "start": 21.5, "duration": 2.8 }
  ],
  "metadata": { "title": "...", "author_name": "...", "thumbnail_url": "..." }
}
```

- `start`: seconds from video start
- `duration`: how long caption is displayed

**Response** (`format=text` — readable):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": "[00:00:18] We're no strangers to love\n[00:00:21] You know the rules..."
}
```

## Tips

- Use `format=json` for sync'd captions (accessibility tools, timing analysis).
- Use `format=text` with `include_timestamp=false` for clean reading.
- Auto-generated captions are available for most videos; manual CC is higher quality.

## Errors

| Code | Meaning     | Action                        |
| ---- | ----------- | ----------------------------- |
| 402  | No credits  | transcriptapi.com/billing     |
| 404  | No captions | Video doesn't have CC enabled |
| 408  | Timeout     | Retry once after 2s           |

1 credit per request. Free tier: 100 credits, 300 req/min.
