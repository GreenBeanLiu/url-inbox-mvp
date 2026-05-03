# URL Inbox MVP

A local-first MVP for saving URLs now and actually finding them later.

## Scope

- Import normal web pages
- Import `x.com` / `twitter.com` status links
- Normalize everything into one inbox
- Store data in Postgres via Prisma
- Search and filter in the web UI
- Update review status: `inbox`, `later`, `done`, `archived`

## Tech

- Next.js App Router
- React
- Tailwind CSS
- Prisma + Postgres (`DATABASE_URL`)
- `cheerio` for basic web metadata extraction
- TikHub API for tweet hydration

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

## TikHub setup

Add your token to `.env.local`:

```bash
TIKHUB_API_TOKEN=your_token_here
TIKHUB_API_BASE_URL=https://api.tikhub.io
```

Without the token, tweet links will still be stored, but tweet detail fetch will remain in placeholder/failed mode so you can wire the key later.

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

## Current limitations

- No auth or multi-user support
- No browser extension yet
- No background queue yet; imports happen inline
- Web extraction is metadata-first, not full article readability
- Tweet normalization is intentionally defensive because TikHub payload shape may vary

## Suggested next steps

1. Add background jobs for imports/refetch
2. Add tags and item detail page
3. Add browser extension / mobile share target
4. Add digest and resurfacing workflow
5. Add auth and multi-user support once the single-user flow is stable
