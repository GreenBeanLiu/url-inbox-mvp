# URL Inbox MVP

A local-first MVP for saving URLs now and actually finding them later.

## Scope

- Import normal web pages
- Import `x.com` / `twitter.com` status links
- Normalize everything into one inbox
- Store data in Postgres via Prisma
- Search and filter in the web UI
- Fast mobile capture via `/add`
- Update review status: `inbox`, `later`, `done`, `archived`
- Run AI analysis on saved items and store structured results

## Tech

- Next.js App Router
- React
- Tailwind CSS
- Prisma + Postgres (`DATABASE_URL`)
- `cheerio` for basic web metadata extraction
- TikHub API for tweet hydration and WeChat MP article extraction
- Vercel AI SDK for structured content analysis

## Getting started

```bash
cd ~/Works/url-inbox-mvp
cp .env.example .env
cp .env.example .env.local
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open <http://localhost:3000>

Mobile-friendly quick capture is available at <http://localhost:3000/add>. It supports `?url=`, `?note=`, `?title=`, and `?text=` prefills for iOS Shortcut/share flows.

A practical iPhone Shortcut pattern is: receive a shared URL or Safari page, build `/add?url=...&title=...&text=...`, then open that URL in Safari.

## TikHub setup

Add your token to `.env.local`:

```bash
TIKHUB_API_TOKEN=your_token_here
TIKHUB_API_BASE_URL=https://api.tikhub.io
```

Without the token, tweet links will still be stored, but tweet detail fetch will remain in placeholder/failed mode so you can wire the key later.

If a saved URL is a `mp.weixin.qq.com` article and `TIKHUB_API_TOKEN` is present, imports will prefer TikHub's WeChat MP JSON article detail endpoint before falling back to normal HTML extraction.

## AI analysis setup

Add your model config to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
AI_MODEL=gpt-5.4-mini
AI_REASONING_EFFORT=high
AI_TEXT_VERBOSITY=high
```

Optional for OpenAI-compatible providers:

```bash
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
```

If your provider does not support reasoning controls or GPT-5.5, override these to a compatible model/settings.

Analysis results are stored back onto the item in `meta.aiAnalysis`.

## Database

- Database connection: `DATABASE_URL`
- Prisma schema: `prisma/schema.prisma`
- Production target: Railway Postgres

## API

### `GET /api/items`
Return all items.

### `POST /api/items`
Import a URL.

Request body:

```json
{
  "url": "https://x.com/elonmusk/status/1808168603721650364",
  "note": "Check this later"
}
```

### `GET /api/items/:id`
Return one item.

### `PATCH /api/items/:id`
Update item status or note.

Request body:

```json
{
  "status": "later",
  "note": "Worth turning into a summary"
}
```

### `POST /api/items/:id/analyze`
Run AI analysis for one item and persist the structured result into `meta.aiAnalysis`.

## Current limitations

- No auth or multi-user support
- No browser extension yet
- No native iOS app or share extension yet; v2 currently focuses on mobile web capture and PWA-style installability
- No background queue yet; imports and AI analysis happen inline
- Web extraction is metadata-first, not full article readability
- Tweet normalization is intentionally defensive because TikHub payload shape may vary
- WeChat MP imports prefer TikHub JSON extraction when available, but still fall back to basic HTML extraction if TikHub is unavailable or fails
- AI analysis currently requires a manual button click per item

## Suggested next steps

1. Add background jobs for imports/refetch/analysis
2. Add tags and item detail page
3. Add browser extension / mobile share target
4. Add digest and resurfacing workflow
5. Add auth and multi-user support once the single-user flow is stable
