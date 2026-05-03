import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { SavedItem } from "@/lib/types";

const analysisSchema = z.object({
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1).max(5),
  insights: z.array(z.string().min(1)).min(1).max(5),
  actionItems: z.array(z.string().min(1)).min(0).max(5),
  tags: z.array(z.string().min(1)).min(0).max(8),
  confidence: z.number().min(0).max(1),
});

export type ItemAnalysis = z.infer<typeof analysisSchema>;

function getModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const provider = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  return provider(process.env.AI_MODEL || "gpt-4o-mini");
}

export async function analyzeItem(item: SavedItem): Promise<ItemAnalysis> {
  const content = [
    item.title ? `Title: ${item.title}` : null,
    item.authorHandle ? `Author: @${item.authorHandle}` : item.authorName ? `Author: ${item.authorName}` : null,
    item.publishedAt ? `PublishedAt: ${item.publishedAt}` : null,
    item.sourceUrl ? `Source URL: ${item.sourceUrl}` : null,
    item.note ? `User note: ${item.note}` : null,
    item.summary ? `Existing summary: ${item.summary}` : null,
    item.contentText ? `Content:\n${item.contentText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!item.contentText && !item.summary) {
    throw new Error("Item has no readable content to analyze yet.");
  }

  const { object } = await generateObject({
    model: getModel(),
    schema: analysisSchema,
    system:
      "You analyze saved links and tweets for a personal inbox product. Return concise, practical Chinese output. Focus on what the content says, why it matters, and what the user may want to do next. Avoid fluff.",
    prompt: [
      "Analyze this saved inbox item and produce structured output.",
      "Requirements:",
      "- summary: 2-4 sentences in Chinese.",
      "- keyPoints: the main claims/facts.",
      "- insights: why this matters / notable implications.",
      "- actionItems: concrete follow-up actions for the user.",
      "- tags: short topical tags.",
      "- confidence: 0 to 1 based on content completeness.",
      "",
      content,
    ].join("\n"),
  });

  return object;
}
