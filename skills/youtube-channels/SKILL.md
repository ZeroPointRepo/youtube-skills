---
name: youtube-channels
description: Work with YouTube channels — resolve handles to IDs, browse uploads, get latest videos, search within channels. Use when the user asks about a specific channel, wants to see recent uploads, or says "what has X posted lately", "latest from MKBHD", "show me their channel", "list channel videos", "browse channel uploads".
homepage: https://transcriptapi.com
metadata:
  {
    "moltbot":
      {
        "emoji": "📡",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# YouTube Channels

YouTube channel tools via [TranscriptAPI.com](https://transcriptapi.com).

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

## GET /api/v2/youtube/channel/resolve — FREE

Convert @handle, URL, or UC... ID to canonical channel ID.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@mkbhd" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param   | Required | Validation                              |
| ------- | -------- | --------------------------------------- |
| `input` | yes      | 1-200 chars — @handle, URL, or UC... ID |

**Response:**

```json
{ "channel_id": "UCBcRF18a7Qf58cCRy5xuWwQ", "resolved_from": "@mkbhd" }
```

If input is already `UC[a-zA-Z0-9_-]{22}`, returns immediately.

## GET /api/v2/youtube/channel/latest — FREE

Latest 15 videos via RSS with exact stats.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel_id=UC_CHANNEL_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param        | Required | Validation                               |
| ------------ | -------- | ---------------------------------------- |
| `channel_id` | yes      | `^UC[a-zA-Z0-9_-]{22}$` (24 chars total) |

**Response:**

```json
{
  "channel": {
    "channelId": "UCBcRF18a7Qf58cCRy5xuWwQ",
    "title": "MKBHD",
    "author": "MKBHD",
    "url": "https://www.youtube.com/channel/UCBcRF18a7Qf58cCRy5xuWwQ",
    "published": "2008-03-21T00:00:00Z"
  },
  "results": [
    {
      "videoId": "abc123xyz00",
      "title": "Latest Video Title",
      "channelId": "UCBcRF18a7Qf58cCRy5xuWwQ",
      "author": "MKBHD",
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
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel_id=UC_CHANNEL_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param          | Required    | Validation                           |
| -------------- | ----------- | ------------------------------------ |
| `channel_id`   | conditional | `^UC[a-zA-Z0-9_-]{22}$` (first page) |
| `continuation` | conditional | non-empty (next pages)               |

Provide exactly one of `channel_id` or `continuation`, not both.

**Response:**

```json
{
  "results": [{
    "videoId": "abc123xyz00",
    "title": "Video Title",
    "channelId": "UCBcRF18a7Qf58cCRy5xuWwQ",
    "channelTitle": "MKBHD",
    "channelHandle": "@mkbhd",
    "lengthText": "15:22",
    "viewCountText": "3.2M views",
    "thumbnails": [...],
    "index": "0"
  }],
  "playlist_info": {"title": "Uploads from MKBHD", "numVideos": "1893", "ownerName": "MKBHD"},
  "continuation_token": "4qmFsgKlARIYVVV1...",
  "has_more": true
}
```

Keep calling with `continuation` until `has_more: false`.

## GET /api/v2/youtube/channel/search — 1 credit

Search within a specific channel.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/search\
?channel_id=UC_CHANNEL_ID&q=iphone+review&limit=30" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param        | Required | Validation              |
| ------------ | -------- | ----------------------- |
| `channel_id` | yes      | `^UC[a-zA-Z0-9_-]{22}$` |
| `q`          | yes      | 1-200 chars             |
| `limit`      | no       | 1-50 (default 30)       |

## Typical workflow

```bash
# 1. Resolve handle to ID (free)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@mkbhd" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# 2. Check latest uploads (free)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel_id=UC_CHANNEL_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# 3. Get transcript of recent video
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Errors

| Code | Action                                                              |
| ---- | ------------------------------------------------------------------- |
| 400  | Invalid param combination (both or neither channel_id/continuation) |
| 402  | No credits — transcriptapi.com/billing                              |
| 404  | Channel not found                                                   |
| 408  | Timeout — retry once                                                |
| 422  | Invalid channel_id format                                           |

Free tier: 100 credits, 300 req/min. Free endpoints (resolve, latest) require auth but don't consume credits.
