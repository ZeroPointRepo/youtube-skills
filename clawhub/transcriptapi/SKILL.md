---
name: transcriptapi
description: Full TranscriptAPI toolkit — fetch YouTube transcripts, search videos and channels, browse channel uploads, get latest videos, and explore playlists. Use when the user wants to work with YouTube content programmatically, get transcripts for summarization or analysis, find videos, or monitor channels. Triggers on YouTube URLs, "transcript", "transcriptapi", "video summary", "what did they say", "find videos about", "search youtube".
homepage: https://transcriptapi.com
user-invocable: true
metadata: {"openclaw":{"emoji":"📺","requires":{"env":["TRANSCRIPT_API_KEY"],"bins":["node"],"config":["~/.openclaw/openclaw.json"]},"primaryEnv":"TRANSCRIPT_API_KEY"}}
---

# TranscriptAPI

Full YouTube data toolkit via [TranscriptAPI.com](https://transcriptapi.com). Transcripts, search, channels, playlists — one API key.

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

## Auth

All requests: `-H "Authorization: Bearer $TRANSCRIPT_API_KEY"`

## Endpoints

Channel endpoints accept `channel` — an `@handle`, channel URL, or `UC...` ID. No need to resolve first. Playlist endpoints accept `playlist` — a playlist URL or ID.

### GET /api/v2/youtube/transcript — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param               | Required | Default | Validation                      |
| ------------------- | -------- | ------- | ------------------------------- |
| `video_url`         | yes      | —       | YouTube URL or 11-char video ID |
| `format`            | no       | `json`  | `json` or `text`                |
| `include_timestamp` | no       | `true`  | `true` or `false`               |
| `send_metadata`     | no       | `false` | `true` or `false`               |

Accepts: `https://youtube.com/watch?v=ID`, `https://youtu.be/ID`, `youtube.com/shorts/ID`, or bare `ID`.

**Response** (`format=json`):

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "We're no strangers...", "start": 18.0, "duration": 3.5 }
  ],
  "metadata": { "title": "...", "author_name": "...", "author_url": "..." }
}
```

### GET /api/v2/youtube/search — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=video&limit=20" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param   | Required | Default | Validation            |
| ------- | -------- | ------- | --------------------- |
| `q`     | yes      | —       | 1-200 chars (trimmed) |
| `type`  | no       | `video` | `video` or `channel`  |
| `limit` | no       | `20`    | 1-50                  |

**Response** (`type=video`):

```json
{
  "results": [
    {
      "type": "video",
      "videoId": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
      "channelTitle": "Rick Astley",
      "channelHandle": "@RickAstley",
      "channelVerified": true,
      "lengthText": "3:33",
      "viewCountText": "1.5B views",
      "publishedTimeText": "14 years ago",
      "hasCaptions": true,
      "thumbnails": [{ "url": "...", "width": 120, "height": 90 }]
    }
  ],
  "result_count": 20
}
```

**Response** (`type=channel`):

```json
{
  "results": [
    {
      "type": "channel",
      "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
      "title": "Rick Astley",
      "handle": "@RickAstley",
      "subscriberCount": "4.2M subscribers",
      "verified": true,
      "rssUrl": "https://www.youtube.com/feeds/videos.xml?channel_id=UC..."
    }
  ],
  "result_count": 5
}
```

### GET /api/v2/youtube/channel/resolve — FREE (0 credits)

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

If input is already a valid `UC[a-zA-Z0-9_-]{22}` ID, returns immediately without lookup.

### GET /api/v2/youtube/channel/videos — 1 credit/page

```bash
# First page (100 videos)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel=@NASA" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param          | Required    | Validation                                    |
| -------------- | ----------- | --------------------------------------------- |
| `channel`      | conditional | `@handle`, channel URL, or `UC...` ID         |
| `continuation` | conditional | non-empty string (next pages)                 |

Provide exactly one of `channel` or `continuation`.

**Response:**

```json
{
  "results": [{
    "videoId": "abc123xyz00",
    "title": "Latest Video",
    "channelId": "UCsT0YIqwnpJCM-mx7-gSA4Q",
    "channelTitle": "TED",
    "channelHandle": "@TED",
    "lengthText": "15:22",
    "viewCountText": "3.2M views",
    "thumbnails": [...],
    "index": "0"
  }],
  "playlist_info": {"title": "Uploads from TED", "numVideos": "5000"},
  "continuation_token": "4qmFsgKlARIYVVV1...",
  "has_more": true
}
```

### GET /api/v2/youtube/channel/latest — FREE (0 credits)

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param     | Required | Validation                                |
| --------- | -------- | ----------------------------------------- |
| `channel` | yes      | `@handle`, channel URL, or `UC...` ID     |

Returns last 15 videos via RSS with exact view counts and ISO timestamps.

**Response:**

```json
{
  "channel": {
    "channelId": "...",
    "title": "TED",
    "author": "TED",
    "url": "..."
  },
  "results": [
    {
      "videoId": "abc123xyz00",
      "title": "Latest Video",
      "published": "2026-01-30T16:00:00Z",
      "viewCount": "2287630",
      "description": "Full description...",
      "thumbnail": { "url": "...", "width": "480", "height": "360" }
    }
  ],
  "result_count": 15
}
```

### GET /api/v2/youtube/channel/search — 1 credit

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

### GET /api/v2/youtube/playlist/videos — 1 credit/page

```bash
# First page
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist=PL_PLAYLIST_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param          | Required    | Validation                                           |
| -------------- | ----------- | ---------------------------------------------------- |
| `playlist`     | conditional | Playlist URL or ID (`PL`/`UU`/`LL`/`FL`/`OL` prefix) |
| `continuation` | conditional | non-empty string                                     |

## Credit Costs

| Endpoint        | Cost     |
| --------------- | -------- |
| transcript      | 1        |
| search          | 1        |
| channel/resolve | **free** |
| channel/search  | 1        |
| channel/videos  | 1/page   |
| channel/latest  | **free** |
| playlist/videos | 1/page   |

## Errors

| Code | Meaning           | Action                                              |
| ---- | ----------------- | --------------------------------------------------- |
| 401  | Bad API key       | Check key, re-run setup                             |
| 402  | No credits        | Top up at transcriptapi.com/billing                 |
| 404  | Not found         | Video/channel/playlist doesn't exist or no captions |
| 408  | Timeout/retryable | Retry once after 2s                                 |
| 422  | Validation error  | Check param format                                  |
| 429  | Rate limited      | Wait, respect Retry-After                           |

## Tips

- When user shares YouTube URL with no instruction, fetch transcript and summarize key points.
- Use `channel/latest` (free) to check for new uploads before fetching transcripts — pass @handle directly.
- For research: search → pick videos → fetch transcripts.
- Free tier: 100 credits, 300 req/min. Starter ($5/mo): 1,000 credits, 300 req/min.
