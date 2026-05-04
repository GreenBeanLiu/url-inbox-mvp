"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SavedItem } from "@/lib/types";

export function AddPageClient({
  initialUrl,
  initialNote,
}: {
  initialUrl?: string;
  initialNote?: string;
}) {
  const [url, setUrl] = useState(initialUrl || "");
  const [note, setNote] = useState(initialNote || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedItem, setSavedItem] = useState<SavedItem | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setUrl(initialUrl || "");
  }, [initialUrl]);

  useEffect(() => {
    setNote(initialNote || "");
  }, [initialNote]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    setSavedItem(null);

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

      setSavedItem(payload.item);
      setNotice(payload.duplicate ? payload.message || "URL already saved." : "Saved.");
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

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Quick add
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Built for fast capture on iPhone. Paste a link, leave a note if needed,
              and save it into the inbox.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Mobile capture
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
              placeholder="Paste a web, x.com, or WeChat article link"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
              className="h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-900">Note</span>
              <span className="text-xs text-zinc-500">optional</span>
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What should future-you remember about this?"
              autoComplete="off"
              rows={3}
              className="min-h-24 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-base font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? "Saving..." : "Save URL"}
          </button>
        </form>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <div>{notice}</div>
            {savedItem ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/items/${savedItem.id}`}
                  className="font-medium text-sky-800 underline underline-offset-4"
                >
                  Open saved item
                </Link>
                <Link
                  href="/"
                  className="font-medium text-sky-800 underline underline-offset-4"
                >
                  Open inbox
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-zinc-950">
          iPhone flow
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600">
          <li>Open this page from Safari and add it to your Home Screen.</li>
          <li>Use <code>/add?url=...</code> later for Shortcut-based prefills.</li>
          <li>Full inbox review still stays on the main page.</li>
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Open full inbox
          </Link>
        </div>
      </section>
    </div>
  );
}
