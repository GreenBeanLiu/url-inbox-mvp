import * as cheerio from "cheerio";
import { classifyWebResource } from "@/lib/resource";
import { parseSource } from "@/lib/source";
import { SavedItem } from "@/lib/types";

export async function buildItemFromUrl(input: {
  id: string;
  url: string;
  note?: string;
  existingCreatedAt?: string;
}): Promise<SavedItem> {
  const parsed = parseSource(input.url);

  if (parsed.sourceType === "tweet") {
    return fetchTweetItem({
      id: input.id,
      url: input.url,
      note: input.note,
      existingCreatedAt: input.existingCreatedAt,
      sourceUrl: parsed.sourceUrl,
      canonicalUrl: parsed.canonicalUrl,
      externalId: parsed.externalId,
    });
  }

  return fetchWebItem({
    id: input.id,
    url: input.url,
    note: input.note,
    existingCreatedAt: input.existingCreatedAt,
    sourceUrl: parsed.sourceUrl,
    canonicalUrl: parsed.canonicalUrl,
    externalId: parsed.externalId,
  });
}

async function fetchWebItem(input: {
  id: string;
  url: string;
  note?: string;
  sourceUrl: string;
  canonicalUrl: string;
  externalId: null;
  existingCreatedAt?: string;
}): Promise<SavedItem> {
  const now = new Date().toISOString();

  try {
    const response = await fetch(input.sourceUrl, {
      headers: {
        "user-agent": "url-inbox-mvp/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = cleanText($("title").first().text()) || input.sourceUrl;
    const description =
      cleanText($("meta[name='description']").attr("content")) || null;
    const canonicalHref = $("link[rel='canonical']").attr("href");
    const canonicalUrl = canonicalHref
      ? safelyResolveUrl(input.sourceUrl, canonicalHref)
      : input.canonicalUrl;

    const siteName =
      cleanText($("meta[property='og:site_name']").attr("content")) ||
      new URL(input.sourceUrl).hostname;

    const coverImageUrl =
      safelyResolveUrl(
        input.sourceUrl,
        $("meta[property='og:image']").attr("content") || undefined,
      ) || null;

    const authorName =
      cleanText($("meta[name='author']").attr("content")) || null;

    const contentText = buildTextPreview($);
    const summary = description || summarizeText(contentText);
    const resource = classifyWebResource({
      sourceUrl: canonicalUrl || input.canonicalUrl,
      title,
      description,
      siteName,
      contentText,
    });

    return {
      id: input.id,
      sourceType: "web",
      sourceUrl: input.sourceUrl,
      canonicalUrl: canonicalUrl || input.canonicalUrl,
      externalId: null,
      title,
      summary,
      contentText,
      authorName,
      authorHandle: null,
      siteName,
      coverImageUrl,
      publishedAt: null,
      note: input.note?.trim() || null,
      status: "inbox",
      fetchStatus: "success",
      fetchError: null,
      rawPayload: null,
      meta: {
        extractedWith: "cheerio",
        resource,
      },
      createdAt: input.existingCreatedAt ?? now,
      updatedAt: now,
    };
  } catch (error) {
    return {
      id: input.id,
      sourceType: "web",
      sourceUrl: input.sourceUrl,
      canonicalUrl: input.canonicalUrl,
      externalId: null,
      title: input.sourceUrl,
      summary: null,
      contentText: null,
      authorName: null,
      authorHandle: null,
      siteName: new URL(input.sourceUrl).hostname,
      coverImageUrl: null,
      publishedAt: null,
      note: input.note?.trim() || null,
      status: "inbox",
      fetchStatus: "failed",
      fetchError: error instanceof Error ? error.message : "Unknown fetch error",
      rawPayload: null,
      meta: {
        extractedWith: "cheerio",
        resource: classifyWebResource({
          sourceUrl: input.canonicalUrl,
          title: input.sourceUrl,
          description: null,
          siteName: new URL(input.sourceUrl).hostname,
          contentText: null,
        }),
      },
      createdAt: input.existingCreatedAt ?? now,
      updatedAt: now,
    };
  }
}

async function fetchTweetItem(input: {
  id: string;
  url: string;
  note?: string;
  sourceUrl: string;
  canonicalUrl: string;
  externalId: string;
  existingCreatedAt?: string;
}): Promise<SavedItem> {
  const now = new Date().toISOString();
  const baseUrl = process.env.TIKHUB_API_BASE_URL || "https://api.tikhub.io";
  const token = process.env.TIKHUB_API_TOKEN;

  if (!token) {
    return {
      id: input.id,
      sourceType: "tweet",
      sourceUrl: input.sourceUrl,
      canonicalUrl: input.canonicalUrl,
      externalId: input.externalId,
      title: `Tweet ${input.externalId}`,
      summary: "Missing TIKHUB_API_TOKEN. Add it in .env.local to fetch tweet details.",
      contentText: null,
      authorName: null,
      authorHandle: null,
      siteName: "x.com",
      coverImageUrl: null,
      publishedAt: null,
      note: input.note?.trim() || null,
      status: "inbox",
      fetchStatus: "failed",
      fetchError: "Missing TIKHUB_API_TOKEN",
      rawPayload: null,
      meta: {
        provider: "tikhub",
      },
      createdAt: input.existingCreatedAt ?? now,
      updatedAt: now,
    };
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/twitter/web/fetch_tweet_detail?tweet_id=${input.externalId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`TikHub fetch failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const normalized = normalizeTweetPayload(payload, input.externalId);

    return {
      id: input.id,
      sourceType: "tweet",
      sourceUrl: input.sourceUrl,
      canonicalUrl: input.canonicalUrl,
      externalId: input.externalId,
      title: normalized.title,
      summary: normalized.summary,
      contentText: normalized.contentText,
      authorName: normalized.authorName,
      authorHandle: normalized.authorHandle,
      siteName: "x.com",
      coverImageUrl: normalized.coverImageUrl,
      publishedAt: normalized.publishedAt,
      note: input.note?.trim() || null,
      status: "inbox",
      fetchStatus: "success",
      fetchError: null,
      rawPayload: payload,
      meta: {
        provider: "tikhub",
        media: normalized.media,
      },
      createdAt: input.existingCreatedAt ?? now,
      updatedAt: now,
    };
  } catch (error) {
    return {
      id: input.id,
      sourceType: "tweet",
      sourceUrl: input.sourceUrl,
      canonicalUrl: input.canonicalUrl,
      externalId: input.externalId,
      title: `Tweet ${input.externalId}`,
      summary: null,
      contentText: null,
      authorName: null,
      authorHandle: null,
      siteName: "x.com",
      coverImageUrl: null,
      publishedAt: null,
      note: input.note?.trim() || null,
      status: "inbox",
      fetchStatus: "failed",
      fetchError: error instanceof Error ? error.message : "Unknown TikHub error",
      rawPayload: null,
      meta: {
        provider: "tikhub",
      },
      createdAt: input.existingCreatedAt ?? now,
      updatedAt: now,
    };
  }
}

function normalizeTweetPayload(payload: Record<string, unknown>, tweetId: string) {
  const data = unwrapData(payload);

  const rawTweetText =
    readString(data, ["full_text"]) ||
    readString(data, ["text"]) ||
    readString(data, ["tweet", "full_text"]) ||
    readString(data, ["tweet", "text"]) ||
    "";

  const articleTitle = readString(data, ["article", "title"]);
  const articleFullText = readString(data, ["article", "full_text"]);
  const articlePreviewText = readString(data, ["article", "preview_text"]);
  const displayText = readString(data, ["display_text"]);
  const expandedUrl =
    readString(data, ["urls", 0, "expanded_url"]) ||
    readString(data, ["entities", "urls", 0, "expanded_url"]) ||
    readString(data, ["card", "url"]);

  const text =
    articleFullText ||
    articlePreviewText ||
    pickUsefulTweetText(rawTweetText, expandedUrl, displayText) ||
    rawTweetText;

  const authorName =
    readString(data, ["author", "name"]) ||
    readString(data, ["user", "name"]) ||
    readString(data, ["core", "user_results", "result", "legacy", "name"]) ||
    null;

  const authorHandle =
    readString(data, ["author", "screen_name"]) ||
    readString(data, ["user", "screen_name"]) ||
    readString(data, ["core", "user_results", "result", "legacy", "screen_name"]) ||
    null;

  const publishedAt =
    readString(data, ["created_at"]) ||
    readString(data, ["tweet", "created_at"]) ||
    null;

  const coverImageUrl =
    readString(data, ["article", "cover_media"]) ||
    readString(data, ["card", "media", "image_url"]) ||
    readString(data, ["media", 0, "media_url_https"]) ||
    readString(data, ["entities", "media", 0, "media_url_https"]) ||
    null;

  const media = readMedia(data);
  const summary = summarizeText(text) || articleTitle || `Saved tweet ${tweetId}`;
  const title = articleTitle || (authorHandle ? `@${authorHandle}` : `Tweet ${tweetId}`);

  return {
    title,
    summary,
    contentText: text || null,
    authorName,
    authorHandle,
    publishedAt,
    coverImageUrl,
    media,
  };
}

function unwrapData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const root = value as Record<string, unknown>;
  const data = root.data;

  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return { text: data };
    }
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return root;
}

function readString(
  value: unknown,
  path: Array<string | number>,
): string | null {
  let current: unknown = value;

  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current)) {
        return null;
      }
      current = current[key];
      continue;
    }

    if (!current || typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim() ? current.trim() : null;
}

function readMedia(value: Record<string, unknown>) {
  const mediaNode =
    readUnknown(value, ["media"]) || readUnknown(value, ["entities", "media"]);

  if (!Array.isArray(mediaNode)) {
    return [] as Array<{ type: string; url: string }>;
  }

  return mediaNode
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const url =
        (typeof record.media_url_https === "string" && record.media_url_https) ||
        (typeof record.media_url === "string" && record.media_url) ||
        null;
      const type = typeof record.type === "string" ? record.type : "unknown";

      if (!url) {
        return null;
      }

      return { type, url };
    })
    .filter((item): item is { type: string; url: string } => Boolean(item));
}

function readUnknown(value: unknown, path: Array<string | number>): unknown {
  let current: unknown = value;

  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current)) {
        return null;
      }
      current = current[key];
      continue;
    }

    if (!current || typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function pickUsefulTweetText(
  rawText: string,
  expandedUrl: string | null,
  displayText: string | null,
) {
  const normalized = rawText.trim();

  if (!normalized) {
    return null;
  }

  const lowered = normalized.toLowerCase();
  const looksLikeOnlyShortUrl =
    /^https?:\/\/t\.co\/[a-z0-9]+$/i.test(normalized) ||
    normalized === expandedUrl ||
    normalized === displayText ||
    lowered.startsWith("https://t.co/");

  return looksLikeOnlyShortUrl ? null : normalized;
}

function buildTextPreview($: cheerio.CheerioAPI) {
  const candidates = [
    $("article").text(),
    $("main").text(),
    $("body").text(),
  ]
    .map(cleanText)
    .filter(Boolean);

  const text = candidates[0] || "";
  return text.slice(0, 4000) || null;
}

function summarizeText(input: string | null) {
  if (!input) {
    return null;
  }

  return input.replace(/\s+/g, " ").trim().slice(0, 220) || null;
}

function cleanText(input?: string | null) {
  return input?.replace(/\s+/g, " ").trim() || "";
}

function safelyResolveUrl(baseUrl: string, maybeUrl?: string | null) {
  if (!maybeUrl) {
    return null;
  }

  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}
