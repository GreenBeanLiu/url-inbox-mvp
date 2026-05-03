import { SavedItem } from "@/lib/types";

export type ResourceMetaRecord = {
  resource?: unknown;
};

const WORKSPACE_HOST_KEYWORDS = [
  "notion",
  "figma",
  "miro",
  "linear",
  "airtable",
  "docs.google",
  "drive.google",
  "coda",
  "whimsical",
  "slack",
  "trello",
];

const TOOL_HOST_KEYWORDS = [
  "github",
  "vercel",
  "openai",
  "cursor",
  "raycast",
  "zapier",
  "make.",
  "claude",
  "canva",
  "loom",
  "arc.net",
];

const WORKSPACE_HINTS = [
  "workspace",
  "board",
  "boards",
  "doc",
  "docs",
  "project",
  "projects",
  "canvas",
  "whiteboard",
  "roadmap",
  "wiki",
  "notebook",
  "sheet",
  "database",
  "folder",
];

const TOOL_HINTS = [
  "tool",
  "tools",
  "product",
  "platform",
  "app",
  "software",
  "service",
  "api",
  "editor",
  "generator",
  "assistant",
  "copilot",
  "plugin",
  "extension",
  "automation",
];

const ARTICLE_PATH_HINTS = [
  "/blog/",
  "/news/",
  "/post/",
  "/posts/",
  "/article/",
  "/articles/",
  "/essay/",
  "/essays/",
  "/p/",
];

export function classifyWebResource(input: {
  sourceUrl: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  contentText?: string | null;
}): ResourceClassification {
  const host = getUrlHost(input.sourceUrl);
  const hostname = host || "";
  const url = safeParseUrl(input.sourceUrl);
  const normalizedPath = url?.pathname.toLowerCase() || "";
  const queryText = url
    ? Array.from(url.searchParams.entries())
        .flat()
        .join(" ")
        .toLowerCase()
    : "";
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const siteName = cleanText(input.siteName);
  const contentText = cleanText(input.contentText);
  const combinedText = [hostname, normalizedPath, queryText, title, description, siteName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let workspaceScore = 0;
  let toolScore = 0;
  let articleScore = 0;
  const signals: string[] = [];

  if (WORKSPACE_HOST_KEYWORDS.some((keyword) => hostname.includes(keyword))) {
    workspaceScore += 3;
    signals.push("workspace-oriented host");
  }

  if (TOOL_HOST_KEYWORDS.some((keyword) => hostname.includes(keyword))) {
    toolScore += 2;
    signals.push("product/tool host");
  }

  const workspaceMatches = WORKSPACE_HINTS.filter((hint) =>
    combinedText.includes(hint),
  );
  if (workspaceMatches.length > 0) {
    workspaceScore += Math.min(4, workspaceMatches.length + 1);
    signals.push(`workspace hints: ${workspaceMatches.slice(0, 3).join(", ")}`);
  }

  const toolMatches = TOOL_HINTS.filter((hint) => combinedText.includes(hint));
  if (toolMatches.length > 0) {
    toolScore += Math.min(4, toolMatches.length + 1);
    signals.push(`tool hints: ${toolMatches.slice(0, 3).join(", ")}`);
  }

  if (ARTICLE_PATH_HINTS.some((hint) => normalizedPath.includes(hint))) {
    articleScore += 3;
    signals.push("article-like URL path");
  }

  if (contentText.length >= 1800) {
    articleScore += 2;
    signals.push("long readable page text");
  } else if (contentText.length >= 900) {
    articleScore += 1;
  }

  if (
    title.includes("read time") ||
    title.includes("min read") ||
    description.includes("newsletter")
  ) {
    articleScore += 2;
    signals.push("article-style title/description");
  }

  let kind: ResourceKind = "article";

  if (workspaceScore >= 3 && workspaceScore >= toolScore) {
    kind = "workspace";
  } else if (toolScore >= 3) {
    kind = "tool";
  } else if (articleScore === 0 && (workspaceScore > 0 || toolScore > 0)) {
    kind = workspaceScore >= toolScore ? "workspace" : "tool";
  }

  const leadScore =
    kind === "workspace"
      ? workspaceScore
      : kind === "tool"
        ? toolScore
        : articleScore;
  const runnerUp = [workspaceScore, toolScore, articleScore]
    .filter((score) => score !== leadScore)
    .sort((a, b) => b - a)[0] || 0;
  const margin = Math.max(leadScore - runnerUp, 0);
  const confidence = Math.min(0.95, 0.56 + leadScore * 0.05 + margin * 0.04);

  return {
    kind,
    confidence: Number(confidence.toFixed(2)),
    signals: signals.slice(0, 4),
    host,
  };
}

export function readResourceClassification(
  item: Pick<
    SavedItem,
    "sourceType" | "sourceUrl" | "title" | "summary" | "contentText" | "siteName" | "meta"
  >,
): ResourceClassification | null {
  if (item.sourceType !== "web") {
    return null;
  }

  const persisted = readPersistedResource(item.meta);
  if (persisted) {
    return persisted;
  }

  return classifyWebResource({
    sourceUrl: item.sourceUrl,
    title: item.title,
    description: item.summary,
    siteName: item.siteName,
    contentText: item.contentText,
  });
}

export function readResourceKind(
  item: Pick<
    SavedItem,
    "sourceType" | "sourceUrl" | "title" | "summary" | "contentText" | "siteName" | "meta"
  >,
): ResourceKind | null {
  return readResourceClassification(item)?.kind || null;
}

export function isResourceLikeKind(kind: ResourceKind | null) {
  return kind === "tool" || kind === "workspace";
}

export function getUrlHost(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function readPersistedResource(
  meta: SavedItem["meta"],
): ResourceClassification | null {
  const resource = (meta as ResourceMetaRecord | null)?.resource;

  if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
    return null;
  }

  const record = resource as Partial<ResourceClassification>;
  if (
    (record.kind !== "article" &&
      record.kind !== "tool" &&
      record.kind !== "workspace") ||
    typeof record.confidence !== "number" ||
    !Array.isArray(record.signals) ||
    !record.signals.every((signal) => typeof signal === "string")
  ) {
    return null;
  }

  return {
    kind: record.kind,
    confidence: record.confidence,
    signals: record.signals,
    host: typeof record.host === "string" ? record.host : null,
  };
}

function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function cleanText(input?: string | null) {
  return input?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

export type ResourceKind = "article" | "tool" | "workspace";

export interface ResourceClassification {
  kind: ResourceKind;
  confidence: number;
  signals: string[];
  host: string | null;
}
