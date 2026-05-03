import { ItemAnalysis, SavedItem } from "@/lib/types";

export function readAnalysis(
  item: Pick<SavedItem, "meta">,
): ItemAnalysis | null {
  const maybeAnalysis = item.meta?.aiAnalysis;
  if (!maybeAnalysis || typeof maybeAnalysis !== "object") {
    return null;
  }

  const analysis = maybeAnalysis as Partial<ItemAnalysis>;
  if (
    typeof analysis.summary !== "string" ||
    !isStringArray(analysis.keyPoints) ||
    !isStringArray(analysis.insights) ||
    !isStringArray(analysis.actionItems) ||
    !isStringArray(analysis.tags) ||
    typeof analysis.confidence !== "number"
  ) {
    return null;
  }

  return analysis as ItemAnalysis;
}

export function readAnalyzedAt(item: Pick<SavedItem, "meta">): string | null {
  const value = item.meta?.aiAnalyzedAt;
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
