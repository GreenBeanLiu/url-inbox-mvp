"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ItemStatus, SavedItem } from "@/lib/types";
import { readAnalysis, readAnalyzedAt } from "@/lib/item-analysis";

const statuses: ItemStatus[] = ["inbox", "later", "done", "archived"];

export function InboxClient({
  initialItems,
  initialTag,
}: {
  initialItems: SavedItem[];
  initialTag?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "web" | "tweet">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ItemStatus>("all");
  const [tagFilter, setTagFilter] = useState(initialTag || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setTagFilter(initialTag || "");
  }, [initialTag]);

  const availableTags = useMemo(() => {
    return Array.from(
      new Set(
        items.flatMap((item) => readAnalysis(item)?.tags || []).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const normalizedTag = tagFilter.trim().toLowerCase();

    return items.filter((item) => {
      const analysis = readAnalysis(item);

      if (sourceFilter !== "all" && item.sourceType !== sourceFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (
        normalizedTag &&
        !(analysis?.tags || []).some((tag) => tag.toLowerCase() === normalizedTag)
      ) {
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
        analysis?.summary,
        ...(analysis?.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, query, sourceFilter, statusFilter, tagFilter]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

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
        message?: string;
        duplicate?: boolean;
        item?: SavedItem;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "Import failed.");
      }

      setItems((current) => {
        const next = current.filter((item) => item.id !== payload.item?.id);
        return [payload.item!, ...next];
      });

      if (payload.duplicate) {
        setNotice(payload.message || "URL already saved.");
      } else {
        setNotice("Saved.");
      }

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
    setNotice(null);

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

  async function analyzeItem(id: string) {
    setError(null);
    setNotice(null);
    setAnalyzingId(id);

    try {
      const response = await fetch(`/api/items/${id}/analyze`, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        item?: SavedItem;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "AI analysis failed.");
      }

      setItems((current) =>
        current.map((item) => (item.id === id ? payload.item! : item)),
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Unknown AI analysis error",
      );
    } finally {
      setAnalyzingId(null);
    }
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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              Save URL
            </button>

            <div className="min-h-5 text-sm text-zinc-500">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                  Saving...
                </span>
              ) : null}
            </div>
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p className="font-medium text-zinc-950">TikHub + AI</p>
          <p className="mt-1 leading-6">
            Tweet hydration uses <code>TIKHUB_API_TOKEN</code>. AI analysis uses
            <code> OPENAI_API_KEY</code> and optional <code>AI_MODEL</code>.
          </p>
        </div>

        {notice ? (
          <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            {notice}
          </p>
        ) : null}

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

          <div className="grid gap-3 sm:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, note, text..."
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2"
            />

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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tags
            </span>
            <button
              type="button"
              onClick={() => setTagFilter("")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !tagFilter
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  tagFilter.toLowerCase() === tag.toLowerCase()
                    ? "bg-violet-600 text-white"
                    : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
              No items yet.
            </div>
          ) : (
            filteredItems.map((item) => {
              const previewText = buildPreviewText(item);
              const analysis = readAnalysis(item);
              const analyzedAt = readAnalyzedAt(item);

              return (
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
                    {analysis ? (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                        analyzed
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-lg font-semibold tracking-tight text-zinc-950 hover:text-sky-700"
                        >
                          {item.title || item.sourceUrl}
                        </a>

                        <div className="mt-1 text-sm text-zinc-500">
                          {item.authorHandle
                            ? `@${item.authorHandle}`
                            : item.authorName || item.siteName || "Unknown source"}
                        </div>
                      </div>

                      <Link
                        href={`/items/${item.id}`}
                        className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400"
                      >
                        Details
                      </Link>
                    </div>

                    {previewText ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">
                        {previewText}
                      </p>
                    ) : null}

                    {item.note ? (
                      <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                        {item.note}
                      </div>
                    ) : null}

                    {item.fetchError ? (
                      <p className="text-sm text-amber-700">{item.fetchError}</p>
                    ) : null}

                    {analysis ? (
                      <div className="mt-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-zinc-800">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-zinc-950">AI analysis</h3>
                            {analyzedAt ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                analyzed {formatDateTime(analyzedAt)}
                              </p>
                            ) : null}
                          </div>
                          <span className="text-xs text-zinc-500">
                            confidence {(analysis.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <p className="mt-2 leading-6">{analysis.summary}</p>

                        <SectionList title="Key points" items={analysis.keyPoints} />
                        <SectionList title="Insights" items={analysis.insights} />
                        <SectionList title="Action items" items={analysis.actionItems} />

                        {analysis.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {analysis.tags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setTagFilter(tag)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => analyzeItem(item.id)}
                      disabled={analyzingId === item.id || (!item.contentText && !item.summary)}
                      className="rounded-full border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analyzingId === item.id
                        ? "Analyzing..."
                        : analysis
                          ? "Re-analyze"
                          : "Analyze"}
                    </button>

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
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function buildPreviewText(item: SavedItem) {
  const raw =
    item.sourceType === "tweet"
      ? item.contentText || item.summary
      : item.summary || item.contentText;

  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length > 700 ? `${trimmed.slice(0, 700)}…` : trimmed;
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <h4 className="font-medium text-zinc-950">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(date);
}
