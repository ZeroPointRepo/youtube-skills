---
name: youtube-data
description: "Use when structured YouTube data is needed: pasted video/channel/playlist links, transcripts for analysis, video metadata, channel upload history, search results, or playlist contents — without Google API quotas or OAuth. Triggers on YouTube URLs, creator names, topic research, or any request needing YouTube content, even if not mentioned explicitly. Not for uploads, account management, or written-source-only research."
version: "1.6.1"
user-invocable: true
compatibility: Requires internet access to reach transcriptapi.com. No additional runtimes or dependencies needed.
required_environment_variables:
  - name: TRANSCRIPT_API_KEY
    prompt: Your TranscriptAPI key (starts with sk_)
    help: Free account at https://transcriptapi.com — 100 credits, no card required. Or let the agent create one for you.
    required_for: all API requests
metadata: {"openclaw":{"emoji":"📊","requires":{"env":["TRANSCRIPT_API_KEY"]},"primaryEnv":"TRANSCRIPT_API_KEY","homepage":"https://transcriptapi.com"},"hermes":{"tags":["youtube","transcripts","video","search","channels","playlists","data","metadata"],"category":"media"}}
---

# YouTube Data

YouTube data access via [TranscriptAPI.com](https://transcriptapi.com) — lightweight alternative to Google's YouTube Data API.

## Setup

If `$TRANSCRIPT_API_KEY` is not set, read [references/auth-setup.md](references/auth-setup.md) and follow the instructions there to get and store the key.

## Required Headers

Every request needs two headers:

- **Authorization:** `Bearer $TRANSCRIPT_API_KEY`
- **User-Agent:** your agent's name and version if known (e.g. `HermesAgent/0.11.0`, `ClaudeCode/1.0`). Version is optional — agent name alone is fine. Do not omit this header or send a bare default — Cloudflare will return a 403 (error code 1010) and block the request.

## API Reference

Full OpenAPI spec: [transcriptapi.com/openapi.json](https://transcriptapi.com/openapi.json) — consult this for the latest parameters and schemas.

## Video Data (transcript + metadata) — 1 credit

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/transcript\
?video_url=VIDEO_URL&format=json&include_timestamp=true&send_metadata=true" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
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

## Video Info & Rich Metadata

Check languages before spending a transcript credit (free), or pull view/like counts, publish date, description, duration, and tags (1 credit):

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/info?video_url=VIDEO_URL" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/video/metadata\
?video_url=VIDEO_URL&include=details,related" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

`video/metadata` returns `title`, `viewCountText`, `likeCountText`, `publishDate`, `description`, `descriptionLinks`, `channel`, `thumbnails`, plus `details` (duration, category, tags, caption tracks) and `related` videos when requested via `include`.

> **Naming:** `/video/metadata` was previously `/video/info`. The old path still works but is deprecated.

## Search Data — 1 credit/page

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/search?q=QUERY&type=video&limit=20" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

`type` also accepts `playlist` and `movie`. First page only, you can add `sort` (`relevance`/`views`), `upload_date` (`hour`/`today`/`week`/`month`/`year`), `duration` (`short`/`medium`/`long`), and `features` (e.g. `hd,subtitles,cc`).

**Video result fields:** `videoId`, `title`, `channelId`, `channelTitle`, `channelHandle`, `channelVerified`, `lengthText`, `viewCountText`, `publishedTimeText`, `hasCaptions`, `thumbnails`

**Channel result fields** (`type=channel`): `channelId`, `title`, `handle`, `url`, `description`, `subscriberCount`, `verified`, `rssUrl`, `thumbnails`

## Channel Data

Channel endpoints accept `channel` — an `@handle`, channel URL, or `UC...` ID. No need to resolve first.

**Resolve handle to ID (free):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/resolve?input=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns: `{"channel_id": "UCsT0YIqwnpJCM-mx7-gSA4Q", "resolved_from": "@TED"}`

**Latest 15 videos with exact stats (free):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/latest?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns: `channel` info, `results` array with `videoId`, `title`, `published` (ISO), `viewCount` (exact number), `description`, `thumbnail`

**All channel videos (paginated, 1 credit/page):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel=@NASA&tab=videos" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"

# Most-viewed first (channel Videos tab, ~30 per page)
curl -s "https://transcriptapi.com/api/v2/youtube/channel/videos?channel=@NASA&sort=popular" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns ~100 videos per page + `continuation_token` for pagination. `tab` also accepts `shorts` or `streams`, and you repeat the same `tab` when paginating.

**Sorting.** `channel/videos` takes an optional `sort=latest|popular|oldest`. Existing calls are untouched: omitting sort returns the uploads feed exactly as before. sort=latest is a different view (YouTube's Videos tab, Shorts excluded), not a re-ordering of it. Omitted reads the uploads playlist (~100/page, `playlist_info` populated, Shorts mixed in, members-only videos excluded); any `sort` value reads the channel Videos tab (~30/page, `playlist_info: null`, long-form only, members-only videos included and flagged `members_only: true`). They are different *sets*, not one list in two orders. A sorted page holds ~30 items instead of ~100, so paging a whole catalogue with `sort` set costs roughly **3.3x the pages and 3.3x the credits**. Omit `sort` when you just want newest-first. `tab=shorts` / `tab=streams` read the same feed either way; there `sort` only reorders. Repeat the same `tab` **and** `sort` on every page.

**Item fields.** Every item carries `members_only`, `true` only when YouTube badges it "Members only", and those items have no `viewCountText`. `tab=streams` items carry `lengthText` and `publishedTimeText` (for example `Streamed 2 years ago`); `tab=shorts` returns `null` for both, because YouTube's Shorts grid publishes neither. On the channel-tab feeds (`tab=videos` with `sort`, `tab=shorts`, `tab=streams`) `channelId`, `channelTitle`, `channelHandle` and `index` are `null`.

**Search within channel (1 credit):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/search\
?channel=@TED&q=QUERY&limit=30" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

**Channel profile (1 credit):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/info?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns: `title`, `handle`, `verified`, `subscriberCountText`, `videoCountText`, `description`, `tags`, `thumbnails`, `banners`, `availableTabs`

**Channel playlists (1 credit/page):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/playlists?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns: `results` (`playlistId`, `title`, `url`, `videoCountText`, `thumbnails`), `continuation_token`, `has_more`

**Channel community posts (1 credit/page):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/posts?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns: `results` (`postId`, `authorName`, `text`, `publishedTimeText`, `voteCountText`, `attachment`), `continuation_token`, `has_more`

**Channel curated sections (1 credit):**

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/channel/sections?channel=@TED" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns shelves of videos/playlists/shorts/featured channels, in the channel's own order. `tab` also accepts `podcasts` or `releases`.

## Playlist Data — 1 credit/page

Accepts `playlist` — a YouTube playlist URL or playlist ID.

```bash
curl -s "https://transcriptapi.com/api/v2/youtube/playlist/videos?playlist=PL_ID" \
  -H "Authorization: Bearer $TRANSCRIPT_API_KEY" \
  -H "User-Agent: YourAgent/1.0"
```

Returns: `results` (videos), `playlist_info` (`title`, `numVideos`, `ownerName`, `viewCount`), `continuation_token`, `has_more`

## Credit Costs

| Endpoint          | Cost     | Data returned                  |
| ----------------- | -------- | ------------------------------- |
| transcript        | 1        | Full transcript + metadata      |
| info              | **free** | Basic metadata + languages      |
| video/metadata    | 1        | Rich metadata (+ details/related) |
| search            | 1/page   | Video/channel/playlist/movie details |
| channel/resolve   | **free** | Channel ID mapping              |
| channel/info      | 1        | Channel profile                 |
| channel/latest    | **free** | 15 videos + exact stats         |
| channel/videos    | 1/page   | ~100/page unsorted, ~30/page sorted |
| channel/search    | 1        | Videos matching query           |
| channel/playlists | 1/page   | Channel's playlists             |
| channel/posts     | 1/page   | Community tab content           |
| channel/sections  | 1        | Curated home-page shelves       |
| playlist/videos   | 1/page   | 100 videos per page             |

## Errors

| Code     | Meaning          | Action                                         |
| -------- | ---------------- | ---------------------------------------------- |
| 401      | Bad API key      | Check key                                      |
| 402      | No credits       | transcriptapi.com/billing                      |
| 403/1010 | Cloudflare block | Add or fix User-Agent header                   |
| 404      | Not found        | Resource doesn't exist                         |
| 408      | Timeout          | Retry once                                     |
| 422      | Validation error | Check param format                             |

Free tier: 100 credits, 300 req/min.
