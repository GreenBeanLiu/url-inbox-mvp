import { AddPageClient } from "@/components/add-page-client";

export const dynamic = "force-dynamic";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{
    url?: string | string[];
    note?: string | string[];
    text?: string | string[];
    title?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialUrl = Array.isArray(resolvedSearchParams.url)
    ? resolvedSearchParams.url[0] || ""
    : resolvedSearchParams.url || "";
  const noteParam = Array.isArray(resolvedSearchParams.note)
    ? resolvedSearchParams.note[0] || ""
    : resolvedSearchParams.note || "";
  const titleParam = Array.isArray(resolvedSearchParams.title)
    ? resolvedSearchParams.title[0] || ""
    : resolvedSearchParams.title || "";
  const textParam = Array.isArray(resolvedSearchParams.text)
    ? resolvedSearchParams.text[0] || ""
    : resolvedSearchParams.text || "";

  const initialNote = Array.from(
    new Set(
      [noteParam, titleParam, textParam]
        .map((value) => value.trim())
        .filter((value) => value && value !== initialUrl),
    ),
  ).join("\n\n");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-sm">
            URL Inbox v2
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Fast mobile capture
          </h1>
          <p className="text-sm leading-6 text-zinc-700 sm:text-base">
            Save first, sort it out later. This page is tuned for iPhone use and iOS Shortcuts.
          </p>
        </div>
      </header>

      <AddPageClient initialUrl={initialUrl} initialNote={initialNote} />
    </main>
  );
}
