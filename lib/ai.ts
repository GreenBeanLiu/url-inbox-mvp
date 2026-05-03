import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { SavedItem } from "@/lib/types";

const analysisSchema = z.object({
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1).max(5),
  insights: z.array(z.string().min(1)).min(1).max(5),
  actionItems: z.array(z.string().min(1)).max(5),
  tags: z.array(z.string().min(1)).max(8),
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

  return provider.chat(process.env.AI_MODEL || "gpt-4o-mini");
}

export async function analyzeItem(item: SavedItem): Promise<ItemAnalysis> {
  const content = [
    item.title ? `Title: ${item.title}` : null,
    item.authorHandle
      ? `Author: @${item.authorHandle}`
      : item.authorName
        ? `Author: ${item.authorName}`
        : null,
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

  const prompt = [
    "Analyze this saved inbox item and return only valid JSON.",
    "Do not wrap JSON in markdown fences.",
    "Do not add explanations before or after JSON.",
    "Output schema:",
    JSON.stringify({
      summary: "2-4句中文总结",
      keyPoints: ["要点1"],
      insights: ["洞察1"],
      actionItems: ["可执行动作1"],
      tags: ["标签1"],
      confidence: 0.86,
    }),
    "Requirements:",
    "- summary: 2-4 sentences in Chinese.",
    "- keyPoints: 1-5 concise Chinese bullets as strings.",
    "- insights: 1-5 concise Chinese bullets as strings.",
    "- actionItems: 0-5 concrete follow-up actions in Chinese.",
    "- tags: 0-8 short topical tags in Chinese or English.",
    "- confidence: a number between 0 and 1.",
    "",
    content,
  ].join("\n");

  const { text } = await generateText({
    model: getModel(),
    system:
      "You analyze saved links and tweets for a personal inbox product. Return concise, practical Chinese output. You must return raw JSON only.",
    prompt,
    temperature: 0.2,
  });

  const jsonText = extractJsonObject(text);

  try {
    return analysisSchema.parse(JSON.parse(jsonText));
  } catch {
    throw new Error("AI analysis failed.");
  }
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    return withoutFence.trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}
