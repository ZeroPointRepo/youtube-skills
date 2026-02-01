---
name: youtube-playlist
description: Browse YouTube playlists and fetch video transcripts. Use when the user shares a playlist link, asks "what's in this playlist", "list playlist videos", "browse playlist content", or wants to work with playlist videos and get their transcripts.
homepage: https://transcriptapi.com
metadata:
  {
    "moltbot":
      {
        "emoji": "📋",
        "requires": { "env": ["TRANSCRIPT_API_KEY"] },
        "primaryEnv": "TRANSCRIPT_API_KEY",
      },
  }
---

# YouTube Playlist

Browse playlists and fetch transcripts via [TranscriptAPI.com](https://transcriptapi.com).

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

## GET /api/v2/youtube/playlist/videos — 1 credit/page

Paginated playlist video listing (100 per page).

```bash
# First page
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist_id=PL_PLAYLIST_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# Next pages
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?continuation=TOKEN" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

| Param          | Required    | Validation                                  |
| -------------- | ----------- | ------------------------------------------- |
| `playlist_id`  | conditional | starts with `PL`, `UU`, `LL`, `FL`, or `OL` |
| `continuation` | conditional | non-empty string                            |

Provide exactly one of `playlist_id` or `continuation`, not both.

**Accepted playlist ID prefixes:**

- `PL` — user-created playlists
- `UU` — channel uploads playlist
- `LL` — liked videos
- `FL` — favorites
- `OL` — other system playlists

**Response:**

```json
{
  "results": [
    {
      "videoId": "abc123xyz00",
      "title": "Playlist Video Title",
      "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
      "channelTitle": "Channel Name",
      "channelHandle": "@handle",
      "lengthText": "10:05",
      "viewCountText": "1.5M views",
      "thumbnails": [{ "url": "...", "width": 120, "height": 90 }],
      "index": "0"
    }
  ],
  "playlist_info": {
    "title": "Best Tech of 2025",
    "numVideos": "47",
    "description": "My picks for the best tech this year",
    "ownerName": "MKBHD",
    "viewCount": "5000000"
  },
  "continuation_token": "4qmFsgKlARIYVVV1...",
  "has_more": true
}
```

**Pagination flow:**

1. First request: `?playlist_id=PLxxx` — returns first 100 videos + `continuation_token`
2. Next request: `?continuation=TOKEN` — returns next 100 + new token
3. Repeat until `has_more: false` or `continuation_token: null`

## Workflow: Playlist → Transcripts

```bash
# 1. List playlist videos
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist_id=PL_PLAYLIST_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# 2. Get transcript from a video in the playlist
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Extract playlist ID from URL

From `https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`, the playlist ID is `PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`.

## Errors

| Code | Meaning                    | Action                                             |
| ---- | -------------------------- | -------------------------------------------------- |
| 400  | Both or neither params     | Provide exactly one of playlist_id or continuation |
| 402  | No credits                 | transcriptapi.com/billing                          |
| 404  | Playlist not found         | Check if playlist is public                        |
| 408  | Timeout                    | Retry once                                         |
| 422  | Invalid playlist_id format | Must start with PL/UU/LL/FL/OL                     |

1 credit per page. Free tier: 100 credits, 300 req/min.
