import { analyzeItem } from "@/lib/ai";
import { findItemById, patchItem } from "@/lib/repo";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = await findItemById(id);

  if (!item) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }

  try {
    const analysis = await analyzeItem(item);
    const nextMeta = {
      ...(item.meta || {}),
      aiAnalysis: analysis,
      aiAnalyzedAt: new Date().toISOString(),
    };

    const updated = await patchItem(id, {
      meta: nextMeta,
    });

    return Response.json({ item: updated, analysis });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "AI analysis failed.",
      },
      { status: 400 },
    );
  }
}
