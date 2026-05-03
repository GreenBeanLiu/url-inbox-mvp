import Link from "next/link";
import { notFound } from "next/navigation";
import { findItemById } from "@/lib/repo";
import { readAnalysis, readAnalyzedAt } from "@/lib/item-analysis";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await findItemById(id);

  if (!item) {
    notFound();
  }

  const analysis = readAnalysis(item);
  const analyzedAt = readAnalyzedAt(item);
  const previewText = item.sourceType === "tweet"
    ? item.contentText || item.summary
    : item.summary || item.contentText;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-sky-700 hover:text-sky-800"
        >
          ← Back to inbox
        </Link>

        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
        >
          Open source
        </a>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
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

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
          {item.title || item.sourceUrl}
        </h1>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
          <span>
            {item.authorHandle
              ? `@${item.authorHandle}`
              : item.authorName || item.siteName || "Unknown source"}
          </span>
          {item.publishedAt ? <span>Published {formatDateTime(item.publishedAt)}</span> : null}
          <span>Saved {formatDateTime(item.createdAt)}</span>
          {analyzedAt ? <span>AI analyzed {formatDateTime(analyzedAt)}</span> : null}
        </div>

        {item.note ? (
          <div className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-950">Your note</p>
            <p className="mt-1 whitespace-pre-wrap leading-6">{item.note}</p>
          </div>
        ) : null}
      </section>

      {analysis ? (
        <section className="rounded-3xl border border-violet-200 bg-violet-50/70 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">AI analysis</h2>
              {analyzedAt ? (
                <p className="mt-1 text-sm text-zinc-500">
                  Last analyzed {formatDateTime(analyzedAt)}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
              confidence {(analysis.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-800">
            {analysis.summary}
          </p>

          <SectionList title="Key points" items={analysis.keyPoints} />
          <SectionList title="Insights" items={analysis.insights} />
          <SectionList title="Action items" items={analysis.actionItems} />

          {analysis.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {analysis.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">Content</h2>

        {previewText ? (
          <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-800">
            {previewText}
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">No readable content yet.</p>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">Metadata</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetaRow label="Source URL" value={item.sourceUrl} />
          <MetaRow label="Canonical URL" value={item.canonicalUrl} />
          <MetaRow label="Source type" value={item.sourceType} />
          <MetaRow label="Status" value={item.status} />
          <MetaRow label="Fetch status" value={item.fetchStatus} />
          <MetaRow label="Site" value={item.siteName} />
          <MetaRow label="Author" value={item.authorName} />
          <MetaRow label="Author handle" value={item.authorHandle ? `@${item.authorHandle}` : null} />
          <MetaRow label="Published at" value={item.publishedAt ? formatDateTime(item.publishedAt) : null} />
          <MetaRow label="Saved at" value={formatDateTime(item.createdAt)} />
        </dl>

        {item.fetchError ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {item.fetchError}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <h3 className="font-medium text-zinc-950">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm text-zinc-900">{value || "—"}</dd>
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
