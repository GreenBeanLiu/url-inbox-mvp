import { AddPageClient } from "@/components/add-page-client";

export const dynamic = "force-dynamic";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string | string[]; note?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialUrl = Array.isArray(resolvedSearchParams.url)
    ? resolvedSearchParams.url[0] || ""
    : resolvedSearchParams.url || "";
  const initialNote = Array.isArray(resolvedSearchParams.note)
    ? resolvedSearchParams.note[0] || ""
    : resolvedSearchParams.note || "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-3">
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
          URL Inbox v2
        </span>
        <p className="text-sm leading-6 text-zinc-600">
          Fast capture page for mobile. Save first, sort it out later.
        </p>
      </header>

      <AddPageClient initialUrl={initialUrl} initialNote={initialNote} />
    </main>
  );
}
