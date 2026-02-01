---
name: youtube-search
description: Search YouTube for videos and channels, search within specific channels, then fetch transcripts. Use when the user asks to "find videos about X", "search YouTube for", "look up a channel", "who makes videos about", "find on youtube", or wants to discover YouTube content on a topic.
homepage: https://transcriptapi.com
metadata:
  {
    "moltbot":
      {
        "emoji": "🔍",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# YouTube Search

Search YouTube and fetch transcripts via [TranscriptAPI.com](https://transcriptapi.com).

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

## GET /api/v2/youtube/search — 1 credit

Search YouTube globally for videos or channels.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=video&limit=20" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param   | Required | Default | Validation            |
| ------- | -------- | ------- | --------------------- |
| `q`     | yes      | —       | 1-200 chars (trimmed) |
| `type`  | no       | `video` | `video` or `channel`  |
| `limit` | no       | `20`    | 1-50                  |

**Video search response:**

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

**Channel search response** (`type=channel`):

```json
{
  "results": [{
    "type": "channel",
    "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "title": "Rick Astley",
    "handle": "@RickAstley",
    "url": "https://www.youtube.com/@RickAstley",
    "description": "Official channel...",
    "subscriberCount": "4.2M subscribers",
    "verified": true,
    "rssUrl": "https://www.youtube.com/feeds/videos.xml?channel_id=UC...",
    "thumbnails": [...]
  }],
  "result_count": 5
}
```

## GET /api/v2/youtube/channel/search — 1 credit

Search videos within a specific channel.

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

Returns up to ~30 results (YouTube limit). Same video response shape as global search.

## GET /api/v2/youtube/channel/resolve — FREE

Convert @handle to channel ID for channel/search:

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@mkbhd" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Workflow: Search → Transcript

```bash
# 1. Search for videos
curl -s "https://transcriptapi.com/api/v2/youtube/search\
?q=python+web+scraping&type=video&limit=5" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# 2. Get transcript from result
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Errors

| Code | Action                                 |
| ---- | -------------------------------------- |
| 402  | No credits — transcriptapi.com/billing |
| 404  | Not found                              |
| 408  | Timeout — retry once                   |
| 422  | Invalid channel_id format              |

Free tier: 100 credits, 300 req/min.
