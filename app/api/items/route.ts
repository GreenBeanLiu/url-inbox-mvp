import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
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
      return Response.json(
        {
          item: duplicate,
          duplicate: true,
          message: "URL already saved.",
        },
        { status: 200 },
      );
    }

    const item = await buildItemFromUrl({
      id: randomUUID(),
      url: parsed.sourceUrl,
      note: body.note,
    });

    try {
      const saved = await upsertItem(item);
      return Response.json({ item: saved, duplicate: false }, { status: 201 });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await findDuplicate({
          sourceType: parsed.sourceType,
          canonicalUrl: parsed.canonicalUrl,
          externalId: parsed.externalId,
        });

        if (existing) {
          return Response.json(
            {
              item: existing,
              duplicate: true,
              message: "URL already saved.",
            },
            { status: 200 },
          );
        }
      }

      throw error;
    }
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown import error",
      },
      { status: 400 },
    );
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
