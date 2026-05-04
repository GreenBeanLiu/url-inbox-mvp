"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { readAnalysis, readAnalyzedAt } from "@/lib/item-analysis";
import { extractReferencedLinks } from "@/lib/referenced-links";
import {
  getUrlHost,
  isResourceLikeKind,
  readResourceClassification,
} from "@/lib/resource";
import { ItemStatus, SavedItem } from "@/lib/types";

const statuses: ItemStatus[] = ["inbox", "later", "done", "archived"];

type SourceGroupFilter =
  | { kind: "none" }
  | { kind: "web"; key: string }
  | { kind: "tweet"; key: string };

type SourceGroup = {
  key: string;
  label: string;
  count: number;
  subtitle?: string;
};

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
  const [sourceGroupFilter, setSourceGroupFilter] = useState<SourceGroupFilter>({
    kind: "none",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTagFilter(initialTag || "");
  }, [initialTag]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (
      sourceGroupFilter.kind !== "none" &&
      sourceFilter !== "all" &&
      sourceFilter !== sourceGroupFilter.kind
    ) {
      setSourceGroupFilter({ kind: "none" });
    }
  }, [sourceFilter, sourceGroupFilter]);

  const availableTags = useMemo(() => {
    return Array.from(
      new Set(
        items.flatMap((item) => readAnalysis(item)?.tags || []).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [items]);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTag = tagFilter.trim().toLowerCase();

  const contextItems = useMemo(() => {
    return items.filter((item) =>
      matchesContextFilters(item, {
        query: normalizedQuery,
        statusFilter,
        tagFilter: normalizedTag,
      }),
    );
  }, [items, normalizedQuery, normalizedTag, statusFilter]);

  const webSourceGroups = useMemo(
    () => buildWebSourceGroups(contextItems),
    [contextItems],
  );
  const tweetAuthorGroups = useMemo(
    () => buildTweetAuthorGroups(contextItems),
    [contextItems],
  );
  const webSourceCounts = useMemo(
    () => new Map(webSourceGroups.map((group) => [group.key, group.count])),
    [webSourceGroups],
  );
  const tweetAuthorCounts = useMemo(
    () => new Map(tweetAuthorGroups.map((group) => [group.key, group.count])),
    [tweetAuthorGroups],
  );
  const activeGroupLabel = useMemo(() => {
    if (sourceGroupFilter.kind === "none") {
      return null;
    }

    const groups =
      sourceGroupFilter.kind === "web" ? webSourceGroups : tweetAuthorGroups;
    const match = groups.find((group) => group.key === sourceGroupFilter.key);

    if (!match) {
      return null;
    }

    return sourceGroupFilter.kind === "web"
      ? `Source: ${match.label}`
      : `Author: ${match.label}`;
  }, [sourceGroupFilter, tweetAuthorGroups, webSourceGroups]);
  const activeFilters = useMemo(() => {
    const filters: string[] = [];

    if (normalizedQuery) {
      filters.push(`Query: ${query.trim()}`);
    }

    if (sourceFilter !== "all") {
      filters.push(`Source: ${sourceFilter}`);
    }

    if (statusFilter !== "all") {
      filters.push(`Status: ${statusFilter}`);
    }

    if (tagFilter.trim()) {
      filters.push(`#${tagFilter.trim()}`);
    }

    if (activeGroupLabel) {
      filters.push(activeGroupLabel);
    }

    return filters;
  }, [activeGroupLabel, normalizedQuery, query, sourceFilter, statusFilter, tagFilter]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.sourceType !== sourceFilter) {
        return false;
      }

      if (
        !matchesContextFilters(item, {
          query: normalizedQuery,
          statusFilter,
          tagFilter: normalizedTag,
        })
      ) {
        return false;
      }

      if (sourceGroupFilter.kind === "web") {
        return (
          item.sourceType === "web" &&
          getWebSourceKey(item) === sourceGroupFilter.key
        );
      }

      if (sourceGroupFilter.kind === "tweet") {
        return (
          item.sourceType === "tweet" &&
          getTweetAuthorKey(item) === sourceGroupFilter.key
        );
      }

      return true;
    });
  }, [
    items,
    normalizedQuery,
    normalizedTag,
    sourceFilter,
    sourceGroupFilter,
    statusFilter,
  ]);

  function toggleSourceGroup(kind: "web" | "tweet", key: string) {
    setSourceFilter(kind);
    setSourceGroupFilter((current) =>
      current.kind === kind && current.key === key
        ? { kind: "none" }
        : { kind, key },
    );
  }

  function clearAllFilters() {
    setQuery("");
    setSourceFilter("all");
    setStatusFilter("all");
    setTagFilter("");
    setSourceGroupFilter({ kind: "none" });
  }

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
      urlInputRef.current?.focus();
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

  async function removeItem(id: string) {
    if (!window.confirm("Delete this saved item?")) {
      return;
    }

    setError(null);
    setNotice(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Delete failed.");
      }

      setItems((current) => current.filter((item) => item.id !== id));
      setNotice("Deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unknown delete error",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm xl:sticky xl:top-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Quick add
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Save a normal page or an x.com / twitter.com status into the inbox.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Manual save
          </span>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-900">URL</span>
              <span className="text-xs text-zinc-500">required</span>
            </div>
            <input
              ref={urlInputRef}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste any article or x.com link"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-900">Note</span>
              <span className="text-xs text-zinc-500">optional</span>
            </div>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why are you saving this?"
              autoComplete="off"
              className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Save URL
            </button>

            <div className="min-h-5 text-sm text-zinc-500">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700" />
                  Saving...
                </span>
              ) : null}
            </div>
          </div>
        </form>

        {notice ? (
          <p className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-700">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 border-b border-zinc-200 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                Inbox
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {filteredItems.length} of {items.length} items
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                {showFilters ? "Hide filters" : "Show filters"}
              </button>
            </div>
          </div>

          {activeFilters.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Active filters
                </span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700"
                  >
                    {filter}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  Clear all
                </button>
              </div>
            </div>
          ) : null}

          {showFilters ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title, note, text..."
                    className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2"
                  />

                  <select
                    value={sourceFilter}
                    onChange={(event) =>
                      setSourceFilter(event.target.value as "all" | "web" | "tweet")
                    }
                    className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
                    className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      !tagFilter
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    All
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter(tag)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        tagFilter.toLowerCase() === tag.toLowerCase()
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <GroupedSourceList
                    title="Blog sources"
                    emptyLabel="No web sources in this view."
                    groups={webSourceGroups}
                    activeKey={sourceGroupFilter.kind === "web" ? sourceGroupFilter.key : null}
                    onSelect={(key) => toggleSourceGroup("web", key)}
                  />
                  <GroupedSourceList
                    title="X authors"
                    emptyLabel="No tweet authors in this view."
                    groups={tweetAuthorGroups}
                    activeKey={
                      sourceGroupFilter.kind === "tweet" ? sourceGroupFilter.key : null
                    }
                    onSelect={(key) => toggleSourceGroup("tweet", key)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
              No items yet.
            </div>
          ) : (
            filteredItems.map((item) => {
              const previewText = buildPreviewText(item);
              const analysis = readAnalysis(item);
              const analyzedAt = readAnalyzedAt(item);
              const resource = readResourceClassification(item);
              const resourceKind = resource?.kind || null;
              const isResourceLike = isResourceLikeKind(resourceKind);
              const referencedLinks = extractReferencedLinks(item);
              const webSourceKey = getWebSourceKey(item);
              const webSourceCount =
                item.sourceType === "web" && webSourceKey
                  ? webSourceCounts.get(webSourceKey) || 0
                  : 0;
              const tweetAuthorKey = getTweetAuthorKey(item);
              const tweetAuthorCount =
                item.sourceType === "tweet" && tweetAuthorKey
                  ? tweetAuthorCounts.get(tweetAuthorKey) || 0
                  : 0;

              return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                      {item.sourceType}
                    </span>
                    {resourceKind ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                        {resourceKind}
                      </span>
                    ) : null}
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
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-lg font-semibold tracking-tight text-zinc-950 transition hover:text-sky-700"
                        >
                          {item.title || item.sourceUrl}
                        </a>

                        <div className="mt-1 text-sm text-zinc-500">
                          {item.authorHandle
                            ? `@${item.authorHandle}`
                            : item.authorName || item.siteName || "Unknown source"}
                        </div>

                        {item.sourceType === "web" && webSourceKey ? (
                          <button
                            type="button"
                            onClick={() => toggleSourceGroup("web", webSourceKey)}
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                              sourceGroupFilter.kind === "web" &&
                              sourceGroupFilter.key === webSourceKey
                                ? "bg-sky-600 text-white"
                                : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                            }`}
                          >
                            Saved {webSourceCount} from {getUrlHost(item.sourceUrl) || item.siteName || "this host"}
                          </button>
                        ) : null}

                        {item.sourceType === "tweet" && tweetAuthorKey ? (
                          <button
                            type="button"
                            onClick={() => toggleSourceGroup("tweet", tweetAuthorKey)}
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition ${
                              sourceGroupFilter.kind === "tweet" &&
                              sourceGroupFilter.key === tweetAuthorKey
                                ? "bg-sky-600 text-white"
                                : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                            }`}
                          >
                            Saved {tweetAuthorCount} from this author
                          </button>
                        ) : null}
                      </div>

                      <Link
                        href={`/items/${item.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Details
                      </Link>
                    </div>

                    {previewText ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">
                        {previewText}
                      </p>
                    ) : isResourceLike ? (
                      <p className="text-sm leading-6 text-zinc-500">
                        Saved as a resource link. Open details for host context and AI analysis.
                      </p>
                    ) : null}

                    {item.note ? (
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
                        {item.note}
                      </div>
                    ) : null}

                    {referencedLinks.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Referenced links
                        </span>
                        {referencedLinks.slice(0, 3).map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200"
                            title={link.url}
                          >
                            <span className="truncate">{link.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {item.fetchError ? (
                      <p className="text-sm text-amber-700">{item.fetchError}</p>
                    ) : null}

                    {analysis ? (
                      <div className="mt-2 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-zinc-800">
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

                        <p className="mt-2 leading-6 text-zinc-700">
                          {truncateText(analysis.summary, 220)}
                        </p>

                        {analysis.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {analysis.tags.slice(0, 4).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setTagFilter(tag)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
                              >
                                #{tag}
                              </button>
                            ))}
                            {analysis.tags.length > 4 ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-500 ring-1 ring-violet-100">
                                +{analysis.tags.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-3">
                          <Link
                            href={`/items/${item.id}`}
                            className="text-xs font-medium text-violet-700 transition hover:text-violet-800"
                          >
                            Open details for full AI analysis →
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      onClick={() => analyzeItem(item.id)}
                      disabled={
                        deletingId === item.id ||
                        analyzingId === item.id ||
                        (!item.contentText && !item.summary)
                      }
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
                        disabled={deletingId === item.id}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          item.status === status
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {status}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={deletingId === item.id || analyzingId === item.id}
                      className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
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

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function buildPreviewText(item: SavedItem) {
  const resourceKind = readResourceClassification(item)?.kind || null;
  const raw =
    item.sourceType === "tweet"
      ? item.contentText || item.summary
      : isResourceLikeKind(resourceKind)
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

function GroupedSourceList({
  title,
  emptyLabel,
  groups,
  activeKey,
  onSelect,
}: {
  title: string;
  emptyLabel: string;
  groups: SourceGroup[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
          {groups.length}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-auto pr-1">
          {groups.map((group) => {
            const isActive = activeKey === group.key;

            return (
              <button
                key={group.key}
                type="button"
                onClick={() => onSelect(group.key)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  isActive
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {group.label}
                  </span>
                  {group.subtitle ? (
                    <span
                      className={`block truncate text-xs ${
                        isActive ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {group.subtitle}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {group.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function matchesContextFilters(
  item: SavedItem,
  {
    query,
    statusFilter,
    tagFilter,
  }: {
    query: string;
    statusFilter: "all" | ItemStatus;
    tagFilter: string;
  },
) {
  const analysis = readAnalysis(item);

  if (statusFilter !== "all" && item.status !== statusFilter) {
    return false;
  }

  if (
    tagFilter &&
    !(analysis?.tags || []).some((tag) => tag.toLowerCase() === tagFilter)
  ) {
    return false;
  }

  if (!query) {
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

  return haystack.includes(query);
}

function buildWebSourceGroups(items: SavedItem[]) {
  const groups = new Map<string, SourceGroup>();

  for (const item of items) {
    if (item.sourceType !== "web") {
      continue;
    }

    const key = getWebSourceKey(item);
    if (!key) {
      continue;
    }

    const current = groups.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    const label = item.siteName?.trim() || key;
    const subtitle = label === key ? undefined : key;
    groups.set(key, { key, label, count: 1, subtitle });
  }

  return sortGroups(groups);
}

function buildTweetAuthorGroups(items: SavedItem[]) {
  const groups = new Map<string, SourceGroup>();

  for (const item of items) {
    if (item.sourceType !== "tweet") {
      continue;
    }

    const key = getTweetAuthorKey(item);
    if (!key) {
      continue;
    }

    const current = groups.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    const label = item.authorHandle?.trim()
      ? `@${item.authorHandle.trim()}`
      : item.authorName?.trim() || "Unknown author";
    groups.set(key, { key, label, count: 1 });
  }

  return sortGroups(groups);
}

function sortGroups(groups: Map<string, SourceGroup>) {
  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.label.localeCompare(b.label, "en");
  });
}

function getTweetAuthorKey(item: SavedItem) {
  const handle = item.authorHandle?.trim().toLowerCase();
  if (handle) {
    return handle;
  }

  const name = item.authorName?.trim().toLowerCase();
  return name || null;
}

function getWebSourceKey(item: SavedItem) {
  return (
    extractHostname(item.canonicalUrl) ||
    extractHostname(item.sourceUrl) ||
    item.siteName?.trim().toLowerCase() ||
    null
  );
}

function extractHostname(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
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
