import { Item, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SavedItem } from "@/lib/types";

export async function listItems(): Promise<SavedItem[]> {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
  });
  return items.map(toSavedItem);
}

export async function upsertItem(nextItem: SavedItem): Promise<SavedItem> {
  const item = await prisma.item.upsert({
    where: { id: nextItem.id },
    update: toPrismaInput(nextItem),
    create: {
      id: nextItem.id,
      ...toPrismaInput(nextItem),
    },
  });

  return toSavedItem(item);
}

export async function findItemById(id: string): Promise<SavedItem | null> {
  const item = await prisma.item.findUnique({ where: { id } });
  return item ? toSavedItem(item) : null;
}

export async function findHostRelatedItems(sourceUrl: string, excludeId: string) {
  let host: string;

  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return {
      host: null,
      savedCount: 0,
      items: [] as SavedItem[],
    };
  }

  const candidates = await prisma.item.findMany({
    where: {
      sourceType: "web",
      id: { not: excludeId },
      OR: [
        { sourceUrl: { contains: host, mode: "insensitive" } },
        { canonicalUrl: { contains: host, mode: "insensitive" } },
        { siteName: { contains: host, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const matchingItems = candidates.filter((item) => {
    const urls = [item.sourceUrl, item.canonicalUrl].filter(Boolean) as string[];

    for (const value of urls) {
      try {
        if (new URL(value).hostname.replace(/^www\./, "").toLowerCase() === host) {
          return true;
        }
      } catch {
        // ignore invalid saved URLs
      }
    }

    return item.siteName?.trim().toLowerCase() === host;
  });

  return {
    host,
    savedCount: matchingItems.length + 1,
    items: matchingItems.slice(0, 4).map(toSavedItem),
  };
}

export async function findDuplicate(params: {
  sourceType: SavedItem["sourceType"];
  canonicalUrl?: string;
  externalId?: string | null;
}) {
  const item =
    params.sourceType === "tweet" && params.externalId
      ? await prisma.item.findFirst({
          where: {
            sourceType: params.sourceType,
            externalId: params.externalId,
          },
        })
      : params.canonicalUrl
        ? await prisma.item.findFirst({
            where: {
              sourceType: params.sourceType,
              canonicalUrl: params.canonicalUrl,
            },
          })
        : null;

  return item ? toSavedItem(item) : null;
}

export async function deleteItem(id: string): Promise<boolean> {
  const deleted = await prisma.item.deleteMany({
    where: { id },
  });

  return deleted.count > 0;
}

export async function patchItem(
  id: string,
  updates: Partial<SavedItem>,
): Promise<SavedItem | null> {
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const item = await prisma.item.update({
    where: { id },
    data: {
      status: updates.status ?? undefined,
      note: updates.note === undefined ? undefined : updates.note,
      title: updates.title === undefined ? undefined : updates.title,
      summary: updates.summary === undefined ? undefined : updates.summary,
      contentText:
        updates.contentText === undefined ? undefined : updates.contentText,
      authorName: updates.authorName === undefined ? undefined : updates.authorName,
      authorHandle:
        updates.authorHandle === undefined ? undefined : updates.authorHandle,
      siteName: updates.siteName === undefined ? undefined : updates.siteName,
      coverImageUrl:
        updates.coverImageUrl === undefined ? undefined : updates.coverImageUrl,
      publishedAt:
        updates.publishedAt === undefined
          ? undefined
          : parseNullableDate(updates.publishedAt),
      fetchStatus: updates.fetchStatus ?? undefined,
      fetchError: updates.fetchError === undefined ? undefined : updates.fetchError,
      rawPayload:
        updates.rawPayload === undefined
          ? undefined
          : toNullableJsonInput(updates.rawPayload),
      meta:
        updates.meta === undefined
          ? undefined
          : toNullableJsonInput(updates.meta),
      sourceType: updates.sourceType ?? undefined,
      sourceUrl: updates.sourceUrl ?? undefined,
      canonicalUrl: updates.canonicalUrl ?? undefined,
      externalId:
        updates.externalId === undefined ? undefined : updates.externalId,
    },
  });

  return toSavedItem(item);
}

function toSavedItem(item: Item): SavedItem {
  return {
    id: item.id,
    sourceType: item.sourceType as SavedItem["sourceType"],
    sourceUrl: item.sourceUrl,
    canonicalUrl: item.canonicalUrl,
    externalId: item.externalId,
    title: item.title,
    summary: item.summary,
    contentText: item.contentText,
    authorName: item.authorName,
    authorHandle: item.authorHandle,
    siteName: item.siteName,
    coverImageUrl: item.coverImageUrl,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    note: item.note,
    status: item.status as SavedItem["status"],
    fetchStatus: item.fetchStatus as SavedItem["fetchStatus"],
    fetchError: item.fetchError,
    rawPayload: item.rawPayload,
    meta: isPlainRecord(item.meta) ? item.meta : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toPrismaInput(item: SavedItem) {
  return {
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    canonicalUrl: item.canonicalUrl,
    externalId: item.externalId,
    title: item.title,
    summary: item.summary,
    contentText: item.contentText,
    authorName: item.authorName,
    authorHandle: item.authorHandle,
    siteName: item.siteName,
    coverImageUrl: item.coverImageUrl,
    publishedAt: parseNullableDate(item.publishedAt),
    note: item.note,
    status: item.status,
    fetchStatus: item.fetchStatus,
    fetchError: item.fetchError,
    rawPayload: toNullableJsonInput(item.rawPayload),
    meta: toNullableJsonInput(item.meta),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

function parseNullableDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNullableJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null || value === undefined) {
    return Prisma.DbNull;
  }

  return value as Prisma.InputJsonValue;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
