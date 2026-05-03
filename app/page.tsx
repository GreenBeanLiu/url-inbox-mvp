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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3">
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">
          URL Inbox MVP
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Save URLs now. Actually find them later.
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
          MVP scope: import normal web pages and x.com tweets, normalize them,
          store them locally, and review them in one inbox.
        </p>
      </header>

      <InboxClient initialItems={items} initialTag={initialTag} />
    </main>
  );
}
