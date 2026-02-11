---
name: youtube-search
description: Search YouTube for videos and channels, search within specific channels, then fetch transcripts. Use when the user asks to "find videos about X", "search YouTube for", "look up a channel", "who makes videos about", "find on youtube", or wants to discover YouTube content on a topic.
homepage: https://transcriptapi.com
user-invocable: true
metadata: {"openclaw":{"emoji":"🔍","requires":{"env":["TRANSCRIPT_API_KEY"],"bins":["node"],"config":["~/.transcriptapi","~/.openclaw/openclaw.json","~/.zshenv","~/.bashrc","~/.profile","~/.config/fish/config.fish"]},"primaryEnv":"TRANSCRIPT_API_KEY"}}
---

# YouTube Search

Search YouTube and fetch transcripts via [TranscriptAPI.com](https://transcriptapi.com).

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

Search videos within a specific channel. Accepts `channel` — an `@handle`, channel URL, or `UC...` ID.

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

Returns up to ~30 results (YouTube limit). Same video response shape as global search.

## GET /api/v2/youtube/channel/resolve — FREE

Convert @handle to channel ID:

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@TED" \
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
| 422  | Invalid channel identifier             |

Free tier: 100 credits, 300 req/min.
