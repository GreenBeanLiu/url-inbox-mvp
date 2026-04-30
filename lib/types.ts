export type SourceType = "web" | "tweet";

export type ItemStatus = "inbox" | "later" | "done" | "archived";

export type FetchStatus = "pending" | "success" | "failed";

export interface SavedItem {
  id: string;
  sourceType: SourceType;
  sourceUrl: string;
  canonicalUrl: string;
  externalId: string | null;
  title: string | null;
  summary: string | null;
  contentText: string | null;
  authorName: string | null;
  authorHandle: string | null;
  siteName: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  note: string | null;
  status: ItemStatus;
  fetchStatus: FetchStatus;
  fetchError: string | null;
  rawPayload: unknown;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportUrlInput {
  url: string;
  note?: string;
}

export interface ItemPatchInput {
  status?: ItemStatus;
  note?: string;
}
