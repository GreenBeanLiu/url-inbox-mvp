import { randomUUID } from "node:crypto";
import { buildItemFromUrl } from "@/lib/fetchers";
import { findDuplicate, listItems, upsertItem } from "@/lib/repo";
import { parseSource } from "@/lib/source";
import { ImportUrlInput } from "@/lib/types";

export async function GET() {
  const items = await listItems();
  return Response.json({ items });
}

export async function POST(request: Request) {
  let body: ImportUrlInput;

  try {
    body = (await request.json()) as ImportUrlInput;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.url?.trim()) {
    return Response.json({ error: "url is required." }, { status: 400 });
  }

  try {
    const parsed = parseSource(body.url);
    const duplicate = await findDuplicate({
      sourceType: parsed.sourceType,
      canonicalUrl: parsed.canonicalUrl,
      externalId: parsed.externalId,
    });

    if (duplicate) {
      const refreshed = await buildItemFromUrl({
        id: duplicate.id,
        url: parsed.sourceUrl,
        note: body.note || duplicate.note || undefined,
        existingCreatedAt: duplicate.createdAt,
      });

      const saved = await upsertItem(refreshed);
      return Response.json({ item: saved, duplicate: true });
    }

    const item = await buildItemFromUrl({
      id: randomUUID(),
      url: parsed.sourceUrl,
      note: body.note,
    });

    const saved = await upsertItem(item);
    return Response.json({ item: saved, duplicate: false }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown import error",
      },
      { status: 400 },
    );
  }
}
