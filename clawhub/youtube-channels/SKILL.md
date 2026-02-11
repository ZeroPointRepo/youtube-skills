---
name: youtube-channels
description: Work with YouTube channels — resolve handles to IDs, browse uploads, get latest videos, search within channels. Use when the user asks about a specific channel, wants to see recent uploads, or says "what has X posted lately", "latest from TED", "show me their channel", "list channel videos", "browse channel uploads".
homepage: https://transcriptapi.com
user-invocable: true
metadata: {"openclaw":{"emoji":"📡","requires":{"env":["TRANSCRIPT_API_KEY"],"bins":["node"],"config":["~/.openclaw/openclaw.json"]},"primaryEnv":"TRANSCRIPT_API_KEY"}}
---

# YouTube Channels

YouTube channel tools via [TranscriptAPI.com](https://transcriptapi.com).

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

> API key saved to `~/.openclaw/openclaw.json`. See **File Writes** below for details. Existing file is backed up before modification.

Manual option: [transcriptapi.com/signup](https://transcriptapi.com/signup) → Dashboard → API Keys.

## File Writes

The verify and save-key commands save the API key to `~/.openclaw/openclaw.json` (sets `skills.entries.transcriptapi.apiKey` and `enabled: true`). **Existing file is backed up to `~/.openclaw/openclaw.json.bak` before modification.**

To use the API key in terminal/CLI outside the agent, add to your shell profile manually:
`export TRANSCRIPT_API_KEY=<your-key>`

## API Reference

Full OpenAPI spec: [transcriptapi.com/openapi.json](https://transcriptapi.com/openapi.json) — consult this for the latest parameters and schemas.

All channel endpoints accept flexible input — `@handle`, channel URL, or `UC...` channel ID. No need to resolve first.

## GET /api/v2/youtube/channel/resolve — FREE

Convert @handle, URL, or UC... ID to canonical channel ID.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param   | Required | Validation                              |
| ------- | -------- | --------------------------------------- |
| `input` | yes      | 1-200 chars — @handle, URL, or UC... ID |

**Response:**

```json
{ "channel_id": "UCsT0YIqwnpJCM-mx7-gSA4Q", "resolved_from": "@TED" }
```

If input is already `UC[a-zA-Z0-9_-]{22}`, returns immediately.

## GET /api/v2/youtube/channel/latest — FREE

Latest 15 videos via RSS with exact stats.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param     | Required | Validation                                |
| --------- | -------- | ----------------------------------------- |
| `channel` | yes      | `@handle`, channel URL, or `UC...` ID     |

**Response:**

```json
{
  "channel": {
    "channelId": "UCsT0YIqwnpJCM-mx7-gSA4Q",
    "title": "TED",
    "author": "TED",
    "url": "https://www.youtube.com/channel/UCsT0YIqwnpJCM-mx7-gSA4Q",
    "published": "2006-04-17T00:00:00Z"
  },
  "results": [
    {
      "videoId": "abc123xyz00",
      "title": "Latest Video Title",
      "channelId": "UCsT0YIqwnpJCM-mx7-gSA4Q",
      "author": "TED",
      "published": "2026-01-30T16:00:00Z",
      "updated": "2026-01-31T02:00:00Z",
      "link": "https://www.youtube.com/watch?v=abc123xyz00",
      "description": "Full video description...",
      "thumbnail": { "url": "https://i1.ytimg.com/vi/.../hqdefault.jpg" },
      "viewCount": "2287630",
      "starRating": {
        "average": "4.92",
        "count": "15000",
        "min": "1",
        "max": "5"
      }
    }
  ],
  "result_count": 15
}
```

Great for monitoring channels — free and gives exact view counts + ISO timestamps.

## GET /api/v2/youtube/channel/videos — 1 credit/page

Paginated list of ALL channel uploads (100 per page).

```bash
# First page
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel=@NASA" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param          | Required    | Validation                                    |
| -------------- | ----------- | --------------------------------------------- |
| `channel`      | conditional | `@handle`, channel URL, or `UC...` ID         |
| `continuation` | conditional | non-empty (next pages)                        |

Provide exactly one of `channel` or `continuation`, not both.

**Response:**

```json
{
  "results": [{
    "videoId": "abc123xyz00",
    "title": "Video Title",
    "channelId": "UCsT0YIqwnpJCM-mx7-gSA4Q",
    "channelTitle": "TED",
    "channelHandle": "@TED",
    "lengthText": "15:22",
    "viewCountText": "3.2M views",
    "thumbnails": [...],
    "index": "0"
  }],
  "playlist_info": {"title": "Uploads from TED", "numVideos": "5000", "ownerName": "TED"},
  "continuation_token": "4qmFsgKlARIYVVV1...",
  "has_more": true
}
```

Keep calling with `continuation` until `has_more: false`.

## GET /api/v2/youtube/channel/search — 1 credit

Search within a specific channel.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/search\
?channel=@TED&q=climate+change&limit=30" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param     | Required | Validation                                |
| --------- | -------- | ----------------------------------------- |
| `channel` | yes      | `@handle`, channel URL, or `UC...` ID     |
| `q`       | yes      | 1-200 chars                               |
| `limit`   | no       | 1-50 (default 30)                         |

## Typical workflow

```bash
# 1. Check latest uploads (free — pass @handle directly)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# 2. Get transcript of recent video
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Errors

| Code | Action                                                         |
| ---- | -------------------------------------------------------------- |
| 400  | Invalid param combination (both or neither channel/continuation) |
| 402  | No credits — transcriptapi.com/billing                         |
| 404  | Channel not found                                              |
| 408  | Timeout — retry once                                           |
| 422  | Invalid channel identifier                                     |

Free tier: 100 credits, 300 req/min. Free endpoints (resolve, latest) require auth but don't consume credits.
