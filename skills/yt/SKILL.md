---
name: yt
description: Quick YouTube utility — fetch transcripts, search videos, get latest from channels. Use when someone shares a YouTube link, asks about a video, or says "yt", "youtube", "check this video", "what's this video about", "find videos about", "latest from".
homepage: https://transcriptapi.com
user-invocable: true
metadata: {"openclaw":{"emoji":"▶️","requires":{"env":["TRANSCRIPT_API_KEY"],"bins":["node"],"config":["~/.transcriptapi","~/.openclaw/openclaw.json","~/.zshenv","~/.bashrc","~/.profile","~/.config/fish/config.fish"]},"primaryEnv":"TRANSCRIPT_API_KEY"}}
---

# yt

Quick YouTube lookup via [TranscriptAPI.com](https://transcriptapi.com).

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
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
```

Returns last 15 videos with exact view counts and publish dates. Accepts `@handle`, channel URL, or `UC...` ID.

## Resolve handle — FREE

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@TED" \
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
