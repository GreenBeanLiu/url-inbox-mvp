"use client";

import { useMemo, useState } from "react";
import { SavedItem, ItemStatus } from "@/lib/types";

const statuses: ItemStatus[] = ["inbox", "later", "done", "archived"];

export function InboxClient({
  initialItems,
}: {
  initialItems: SavedItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "web" | "tweet">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ItemStatus>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (sourceFilter !== "all" && item.sourceType !== sourceFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!q) {
        return true;
      }

      const haystack = [
        item.title,
        item.summary,
        item.contentText,
        item.note,
        item.authorName,
        item.authorHandle,
        item.siteName,
        item.sourceUrl,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, query, sourceFilter, statusFilter]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url,
          note,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        item?: SavedItem;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "Import failed.");
      }

      setItems((current) => {
        const next = current.filter((item) => item.id !== payload.item?.id);
        return [payload.item!, ...next];
      });
      setUrl("");
      setNote("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unknown import error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: ItemStatus) {
    setError(null);

    const response = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const payload = (await response.json()) as {
      error?: string;
      item?: SavedItem;
    };

    if (!response.ok || !payload.item) {
      setError(payload.error || "Status update failed.");
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? payload.item! : item)),
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Quick add</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Paste a normal URL or an x.com / twitter.com status link.
        </p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-900">URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/... or https://example.com/..."
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-900">Note</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Why save this?"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {isSubmitting ? "Saving..." : "Save URL"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p className="font-medium text-zinc-950">TikHub</p>
          <p className="mt-1 leading-6">
            For tweet hydration, add <code>TIKHUB_API_TOKEN</code> to
            <code> .env.local</code>. Without it, tweet links are still stored,
            but detail fetching will stay in failed placeholder mode.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Inbox</h2>
              <p className="text-sm text-zinc-600">
                {filteredItems.length} of {items.length} items
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, note, text..."
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(event.target.value as "all" | "web" | "tweet")
                }
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All sources</option>
                <option value="web">Web</option>
                <option value="tweet">Tweet</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | ItemStatus)
                }
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
              No items yet.
            </div>
          ) : (
            filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 p-4 transition hover:border-zinc-300"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                    {item.sourceType}
                  </span>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                    {item.status}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      item.fetchStatus === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.fetchStatus}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-semibold tracking-tight text-zinc-950 hover:text-sky-700"
                  >
                    {item.title || item.sourceUrl}
                  </a>

                  <div className="text-sm text-zinc-500">
                    {item.authorHandle ? `@${item.authorHandle}` : item.authorName || item.siteName || "Unknown source"}
                  </div>

                  {item.summary ? (
                    <p className="text-sm leading-6 text-zinc-700">{item.summary}</p>
                  ) : null}

                  {item.note ? (
                    <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                      {item.note}
                    </div>
                  ) : null}

                  {item.fetchError ? (
                    <p className="text-sm text-amber-700">{item.fetchError}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatus(item.id, status)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        item.status === status
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
