import { findItemById, patchItem } from "@/lib/repo";
import { ItemPatchInput, ItemStatus } from "@/lib/types";

const validStatuses = new Set<ItemStatus>([
  "inbox",
  "later",
  "done",
  "archived",
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = await findItemById(id);

  if (!item) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }

  return Response.json({ item });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: ItemPatchInput;
  try {
    body = (await request.json()) as ItemPatchInput;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.status && !validStatuses.has(body.status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await patchItem(id, {
    status: body.status,
    note: typeof body.note === "string" ? body.note.trim() || null : undefined,
  });

  if (!updated) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }

  return Response.json({ item: updated });
}
