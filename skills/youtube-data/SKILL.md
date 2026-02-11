---
name: youtube-data
description: Access YouTube video data — transcripts, metadata, channel info, search, and playlists. A lightweight alternative to Google's YouTube Data API with no quota limits. Use when the user needs structured data from YouTube videos, channels, or playlists without dealing with Google API setup, OAuth, or daily quotas.
homepage: https://transcriptapi.com
user-invocable: true
metadata: {"openclaw":{"emoji":"📊","requires":{"env":["TRANSCRIPT_API_KEY"],"bins":["node"],"config":["~/.transcriptapi","~/.openclaw/openclaw.json","~/.zshenv","~/.bashrc","~/.profile","~/.config/fish/config.fish"]},"primaryEnv":"TRANSCRIPT_API_KEY"}}
---

# YouTube Data

YouTube data access via [TranscriptAPI.com](https://transcriptapi.com) — lightweight alternative to Google's YouTube Data API.

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

## Video Data (transcript + metadata) — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=json&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

**Response:**

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "We're no strangers to love", "start": 18.0, "duration": 3.5 }
  ],
  "metadata": {
    "title": "Rick Astley - Never Gonna Give You Up",
    "author_name": "Rick Astley",
    "author_url": "https://www.youtube.com/@RickAstley",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  }
}
```

## Search Data — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=video&limit=20" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

**Video result fields:** `videoId`, `title`, `channelId`, `channelTitle`, `channelHandle`, `channelVerified`, `lengthText`, `viewCountText`, `publishedTimeText`, `hasCaptions`, `thumbnails`

**Channel result fields** (`type=channel`): `channelId`, `title`, `handle`, `url`, `description`, `subscriberCount`, `verified`, `rssUrl`, `thumbnails`

## Channel Data

Channel endpoints accept `channel` — an `@handle`, channel URL, or `UC...` ID. No need to resolve first.

**Resolve handle to ID (free):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns: `{"channel_id": "UCsT0YIqwnpJCM-mx7-gSA4Q", "resolved_from": "@TED"}`

**Latest 15 videos with exact stats (free):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns: `channel` info, `results` array with `videoId`, `title`, `published` (ISO), `viewCount` (exact number), `description`, `thumbnail`

**All channel videos (paginated, 1 credit/page):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel=@NASA" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns 100 videos per page + `continuation_token` for pagination.

**Search within channel (1 credit):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/search\
?channel=@TED&q=QUERY&limit=30" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

## Playlist Data — 1 credit/page

Accepts `playlist` — a YouTube playlist URL or playlist ID.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist=PL_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns: `results` (videos), `playlist_info` (`title`, `numVideos`, `ownerName`, `viewCount`), `continuation_token`, `has_more`

## Credit Costs

| Endpoint        | Cost     | Data returned              |
| --------------- | -------- | -------------------------- |
| transcript      | 1        | Full transcript + metadata |
| search          | 1        | Video/channel details      |
| channel/resolve | **free** | Channel ID mapping         |
| channel/latest  | **free** | 15 videos + exact stats    |
| channel/videos  | 1/page   | 100 videos per page        |
| channel/search  | 1        | Videos matching query      |
| playlist/videos | 1/page   | 100 videos per page        |

## Errors

| Code | Action                                 |
| ---- | -------------------------------------- |
| 402  | No credits — transcriptapi.com/billing |
| 404  | Not found                              |
| 408  | Timeout — retry once                   |
| 422  | Invalid param format                   |

Free tier: 100 credits, 300 req/min.
