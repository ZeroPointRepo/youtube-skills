---
name: youtube-playlist
description: Browse YouTube playlists and fetch video transcripts. Use when the user shares a playlist link, asks "what's in this playlist", "list playlist videos", "browse playlist content", or wants to work with playlist videos and get their transcripts.
homepage: https://transcriptapi.com
user-invocable: true
metadata: {"openclaw":{"emoji":"📋","requires":{"env":["TRANSCRIPT_API_KEY"],"bins":["node"],"config":["~/.transcriptapi","~/.openclaw/openclaw.json","~/.zshenv","~/.bashrc","~/.profile","~/.config/fish/config.fish"]},"primaryEnv":"TRANSCRIPT_API_KEY"}}
---

# YouTube Playlist

Browse playlists and fetch transcripts via [TranscriptAPI.com](https://transcriptapi.com).

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

> API key saved. See **File Writes** below for all paths. Existing files are backed up to `<file>.bak` before modification.

Manual option: [transcriptapi.com/signup](https://transcriptapi.com/signup) → Dashboard → API Keys.

## File Writes

This skill is designed for autonomous/background use — it needs persistent `TRANSCRIPT_API_KEY` access across shells, agents, and sessions so it can authenticate without manual setup each time. The verify and save-key commands write the API key to multiple locations. **Existing files are backed up to `<file>.bak` before modification.**

| File | When | What is written |
|------|------|-----------------|
| `~/.transcriptapi` | Always | API key plaintext (mode 0600) |
| `~/.openclaw/openclaw.json` | If OpenClaw installed | `skills.entries.transcriptapi.apiKey` + `enabled: true` |
| `~/.zshenv` | macOS always; Linux if zsh installed | `export TRANSCRIPT_API_KEY=<key>` |
| `~/.zprofile` | macOS, only if file already exists | `export TRANSCRIPT_API_KEY=<key>` |
| `~/.profile` | Linux | `export TRANSCRIPT_API_KEY=<key>` |
| `~/.bashrc` | Linux, only if file already exists | `export TRANSCRIPT_API_KEY=<key>` |
| `~/.config/environment.d/transcript-api.conf` | Linux | `TRANSCRIPT_API_KEY=<key>` (systemd user env) |
| `~/.config/fish/config.fish` | If fish shell installed | `set -gx TRANSCRIPT_API_KEY <key>` |
| `~/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1` | Windows | `$env:TRANSCRIPT_API_KEY = "<key>"` |

The OpenClaw config update (`enabled: true`) allows the agent to access the API key at runtime without manual `export` steps. This is intentional — the skill works in the background (fetching transcripts during research, summarization, etc.) and needs to authenticate autonomously across sessions.

## API Reference

Full OpenAPI spec: [transcriptapi.com/openapi.json](https://transcriptapi.com/openapi.json) — consult this for the latest parameters and schemas.

## GET /api/v2/youtube/playlist/videos — 1 credit/page

Paginated playlist video listing (100 per page). Accepts `playlist` — a YouTube playlist URL or playlist ID.

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

Provide exactly one of `playlist` or `continuation`, not both.

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
    "title": "Best Science Talks",
    "numVideos": "47",
    "description": "Top science presentations",
    "ownerName": "TED",
    "viewCount": "5000000"
  },
  "continuation_token": "4qmFsgKlARIYVVV1...",
  "has_more": true
}
```

**Pagination flow:**

1. First request: `?playlist=PLxxx` — returns first 100 videos + `continuation_token`
2. Next request: `?continuation=TOKEN` — returns next 100 + new token
3. Repeat until `has_more: false` or `continuation_token: null`

## Workflow: Playlist → Transcripts

```bash
# 1. List playlist videos
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist=PL_PLAYLIST_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"

# 2. Get transcript from a video in the playlist
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_ID&format=text&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Extract playlist ID from URL

From `https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`, the playlist ID is `PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf`. You can also pass the full URL directly to the `playlist` parameter.

## Errors

| Code | Meaning                    | Action                                           |
| ---- | -------------------------- | ------------------------------------------------ |
| 400  | Both or neither params     | Provide exactly one of playlist or continuation  |
| 402  | No credits                 | transcriptapi.com/billing                        |
| 404  | Playlist not found         | Check if playlist is public                      |
| 408  | Timeout                    | Retry once                                       |
| 422  | Invalid playlist format    | Must be a valid playlist URL or ID               |

1 credit per page. Free tier: 100 credits, 300 req/min.
