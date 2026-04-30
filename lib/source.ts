import { SourceType } from "@/lib/types";

const TWEET_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

export type ParsedSource =
  | {
      sourceType: "tweet";
      sourceUrl: string;
      canonicalUrl: string;
      externalId: string;
    }
  | {
      sourceType: "web";
      sourceUrl: string;
      canonicalUrl: string;
      externalId: null;
    };

export function normalizeUrl(input: string): URL {
  let normalized = input.trim();

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  const url = new URL(normalized);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }

  url.hash = "";
  return url;
}

export function parseSource(input: string): ParsedSource {
  const url = normalizeUrl(input);
  const hostname = url.hostname.toLowerCase();

  if (TWEET_HOSTS.has(hostname)) {
    const tweetId = extractTweetId(url);

    if (!tweetId) {
      throw new Error("Unsupported x.com/twitter URL. Expected a /status/{id} link.");
    }

    return {
      sourceType: "tweet",
      sourceUrl: url.toString(),
      canonicalUrl: `https://x.com/i/status/${tweetId}`,
      externalId: tweetId,
    };
  }

  url.searchParams.sort();

  return {
    sourceType: "web",
    sourceUrl: url.toString(),
    canonicalUrl: url.toString(),
    externalId: null,
  };
}

function extractTweetId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const statusIndex = segments.findIndex((segment) => segment === "status");

  if (statusIndex < 0) {
    return null;
  }

  const candidate = segments[statusIndex + 1];
  if (!candidate || !/^\d+$/.test(candidate)) {
    return null;
  }

  return candidate;
}
