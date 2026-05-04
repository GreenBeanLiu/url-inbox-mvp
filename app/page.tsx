import { listItems } from "@/lib/repo";
import { InboxClient } from "@/components/inbox-client";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const items = await listItems();
  const resolvedSearchParams = await searchParams;
  const initialTag = Array.isArray(resolvedSearchParams.tag)
    ? resolvedSearchParams.tag[0] || null
    : resolvedSearchParams.tag || null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-sm">
              URL Inbox v2
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Save URLs now. Actually find them later.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700 sm:text-base">
              Save web pages, x.com tweets, and WeChat articles. Review them in one inbox,
              now with a faster mobile capture flow.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/add"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Open quick add
          </a>
          <span className="text-sm font-medium text-zinc-700">
            Use this on iPhone for faster capture.
          </span>
        </div>
      </header>

      <InboxClient initialItems={items} initialTag={initialTag} />
    </main>
  );
}
