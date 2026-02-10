---
name: youtube-full
description: Complete YouTube toolkit — transcripts, search, channels, playlists, and metadata all in one skill. Use when you need comprehensive YouTube access, want to search and then get transcripts, browse channel content, work with playlists, or need the full suite of YouTube data endpoints. The all-in-one YouTube skill for agents.
homepage: https://transcriptapi.com
metadata:
  {
    "openclaw":
      {
        "emoji": "🎯",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# YouTube Full

Complete YouTube toolkit via [TranscriptAPI.com](https://transcriptapi.com). Everything in one skill.

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

## API Reference

Full OpenAPI spec: [transcriptapi.com/openapi.json](https://transcriptapi.com/openapi.json) — consult this for the latest parameters and schemas.

## Transcript — 1 credit

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

**Response** (`format=json`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [{ "text": "...", "start": 18.0, "duration": 3.5 }],
  "metadata": { "title": "...", "author_name": "...", "author_url": "..." }
}
```

## Search — 1 credit

```bash
# Videos
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=video&limit=20" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Channels
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=channel&limit=10" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param   | Required | Default | Validation         |
| ------- | -------- | ------- | ------------------ |
| `q`     | yes      | —       | 1-200 chars        |
| `type`  | no       | `video` | `video`, `channel` |
| `limit` | no       | `20`    | 1-50               |

## Channels

All channel endpoints accept `channel` — an `@handle`, channel URL, or `UC...` channel ID. No need to resolve first.

### Resolve handle — FREE

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Response: `{"channel_id": "UC...", "resolved_from": "@TED"}`

### Latest 15 videos — FREE

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns exact `viewCount` and ISO `published` timestamps.

### All channel videos — 1 credit/page

```bash
# First page (100 videos)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel=@NASA" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Provide exactly one of `channel` or `continuation`. Response includes `continuation_token` and `has_more`.

### Search within channel — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/search\
?channel=@TED&q=QUERY&limit=30" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Playlists — 1 credit/page

Accepts `playlist` — a YouTube playlist URL or playlist ID.

```bash
# First page
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist=PL_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Valid ID prefixes: `PL`, `UU`, `LL`, `FL`, `OL`. Response includes `playlist_info`, `results`, `continuation_token`, `has_more`.

## Credit Costs

| Endpoint        | Cost     |
| --------------- | -------- |
| transcript      | 1        |
| search          | 1        |
| channel/resolve | **free** |
| channel/latest  | **free** |
| channel/videos  | 1/page   |
| channel/search  | 1        |
| playlist/videos | 1/page   |

## Validation Rules

| Field      | Rule                                                    |
| ---------- | ------------------------------------------------------- |
| `channel`  | `@handle`, channel URL, or `UC...` ID                   |
| `playlist` | Playlist URL or ID (`PL`/`UU`/`LL`/`FL`/`OL` prefix)   |
| `q`        | 1-200 chars                                             |
| `limit`    | 1-50                                                    |

## Errors

| Code | Meaning          | Action                                |
| ---- | ---------------- | ------------------------------------- |
| 401  | Bad API key      | Check key                             |
| 402  | No credits       | transcriptapi.com/billing             |
| 404  | Not found        | Resource doesn't exist or no captions |
| 408  | Timeout          | Retry once after 2s                   |
| 422  | Validation error | Check param format                    |
| 429  | Rate limited     | Wait, respect Retry-After             |

## Typical Workflows

**Research workflow:** search → pick videos → fetch transcripts

```bash
# 1. Search
curl -s "https://transcriptapi.com/api/v2/youtube/search\
?q=machine+learning+explained&limit=5" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
# 2. Transcript
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

**Channel monitoring:** latest (free) → transcript

```bash
# 1. Latest uploads (free — pass @handle directly)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
# 2. Transcript of latest
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Free tier: 100 credits, 300 req/min. Starter ($5/mo): 1,000 credits.
