import { SavedItem } from "@/lib/types";

export type ReferencedLink = {
  url: string;
  label: string;
};

const referenceCuePattern =
  /(原文|来源|出处|相关文章|延伸阅读|参考|链接|link|links|source|sources|related|reference|references)/i;

export function extractReferencedLinks(
  item: Pick<SavedItem, "contentText" | "summary" | "sourceUrl" | "canonicalUrl">,
) {
  const text = item.contentText || item.summary || "";
  if (!text.trim()) {
    return [] as ReferencedLink[];
  }

  const seen = new Set<string>();
  const currentUrls = new Set(
    [item.sourceUrl, item.canonicalUrl].filter(Boolean).map(normalizeUrl),
  );
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const links: ReferencedLink[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const matches = Array.from(line.matchAll(/https?:\/\/[^\s<>"]+/g));
    if (matches.length === 0) {
      continue;
    }

    for (const match of matches) {
      const rawUrl = trimTrailingPunctuation(match[0]);
      const normalizedUrl = normalizeUrl(rawUrl);

      if (seen.has(normalizedUrl) || currentUrls.has(normalizedUrl)) {
        continue;
      }

      const label = buildLinkLabel(lines, index, rawUrl, links.length + 1);
      if (!label || !hasReferenceCue(lines, index, label)) {
        continue;
      }

      seen.add(normalizedUrl);
      links.push({
        url: rawUrl,
        label,
      });

      if (links.length >= 6) {
        return links;
      }
    }
  }

  return links;
}

function buildLinkLabel(
  lines: string[],
  index: number,
  url: string,
  order: number,
) {
  const currentLine = lines[index] || "";
  const withoutUrl = currentLine.replace(url, "").trim();
  const inlineLabel = cleanLabel(withoutUrl);
  if (inlineLabel) {
    return inlineLabel;
  }

  for (let offset = 1; offset <= 2; offset += 1) {
    const previous = lines[index - offset]?.trim();
    if (!previous) {
      continue;
    }

    const cleaned = cleanLabel(previous);
    if (cleaned) {
      return cleaned;
    }
  }

  return `Referenced link ${order}`;
}

function hasReferenceCue(lines: string[], index: number, label: string) {
  if (referenceCuePattern.test(label)) {
    return true;
  }

  const currentLine = lines[index] || "";
  if (referenceCuePattern.test(currentLine)) {
    return true;
  }

  for (let offset = 1; offset <= 2; offset += 1) {
    const previous = lines[index - offset]?.trim();
    if (previous && referenceCuePattern.test(previous)) {
      return true;
    }
  }

  return false;
}

function cleanLabel(value: string) {
  const cleaned = value
    .replace(/[：:]+$/g, "")
    .replace(/^[-•·\d.\s]+/, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return null;
  }

  if (cleaned.length > 40) {
    return null;
  }

  return cleaned;
}

function trimTrailingPunctuation(value: string) {
  return value.replace(/[),.;!?]+$/g, "");
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value.trim();
  }
}
