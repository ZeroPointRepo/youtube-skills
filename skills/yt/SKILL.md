---
name: yt
description: Quick YouTube utility — fetch transcripts, search videos, get latest from channels. Use when someone shares a YouTube link, asks about a video, or says "yt", "youtube", "check this video", "what's this video about", "find videos about", "latest from".
homepage: https://transcriptapi.com
metadata:
  {
    "moltbot":
      {
        "emoji": "▶️",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# yt

Quick YouTube lookup via [TranscriptAPI.com](https://transcriptapi.com).

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

## Transcript — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Search — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=video&limit=10" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param   | Default | Values                 |
| ------- | ------- | ---------------------- |
| `q`     | —       | 1-200 chars (required) |
| `type`  | `video` | `video`, `channel`     |
| `limit` | `20`    | 1-50                   |

## Channel latest — FREE

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel_id=UC_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns last 15 videos with exact view counts and publish dates.

## Resolve handle — FREE

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@mkbhd" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Use to convert @handle to UC... channel ID.

## Errors

| Code | Action                                 |
| ---- | -------------------------------------- |
| 402  | No credits — transcriptapi.com/billing |
| 404  | Not found / no captions                |
| 408  | Timeout — retry once                   |

Free tier: 100 credits. Search and transcript cost 1 credit. Channel latest and resolve are free.
