import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpandableContent } from "@/components/expandable-content";
import { readAnalysis, readAnalyzedAt } from "@/lib/item-analysis";
import { findItemById } from "@/lib/repo";

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
  const contentText = item.contentText?.trim() || null;
  const summaryText = item.summary?.trim() || null;
  const fullContent = contentText || summaryText;
  const showSummary =
    Boolean(summaryText) && Boolean(contentText) && summaryText !== contentText;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-sky-700 hover:text-sky-800"
        >
          ← Back to inbox
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {analysis?.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {analysis.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
          >
            Open source
          </a>
        </div>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
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

        <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {item.title || item.sourceUrl}
        </h1>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
          <span>
            {item.authorHandle
              ? `@${item.authorHandle}`
              : item.authorName || item.siteName || "Unknown source"}
          </span>
          {item.publishedAt ? (
            <span>Published {formatDateTime(item.publishedAt)}</span>
          ) : null}
          <span>Saved {formatDateTime(item.createdAt)}</span>
          {analyzedAt ? <span>AI analyzed {formatDateTime(analyzedAt)}</span> : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {analysis ? (
            <section className="rounded-3xl border border-violet-200 bg-violet-50/70 p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950">
                    AI summary
                  </h2>
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

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-800 sm:text-base">
                {analysis.summary}
              </p>

              <SectionList title="Key points" items={analysis.keyPoints} />
              <SectionList title="Insights" items={analysis.insights} />
              <SectionList title="Action items" items={analysis.actionItems} />
            </section>
          ) : null}

          {showSummary ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-zinc-950">Summary</h2>
                <span className="text-xs uppercase tracking-wide text-zinc-400">
                  quick preview
                </span>
              </div>

              <p className="mt-4 max-w-3xl whitespace-pre-wrap text-[15px] leading-8 text-zinc-700 sm:text-base">
                {summaryText}
              </p>
            </section>
          ) : null}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-zinc-950">Original content</h2>
              <span className="text-xs uppercase tracking-wide text-zinc-400">
                {contentText ? "full extracted text" : "saved summary"}
              </span>
            </div>

            {fullContent ? (
              <div className="mt-5">
                <ExpandableContent text={fullContent} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">No readable content yet.</p>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          {item.note ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">Your note</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                {item.note}
              </p>
            </section>
          ) : null}

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">Overview</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <MetaStack label="Status" value={item.status} />
              <MetaStack label="Source" value={item.siteName || item.sourceType} />
              <MetaStack
                label="Author"
                value={
                  item.authorHandle
                    ? `@${item.authorHandle}`
                    : item.authorName || null
                }
              />
              <MetaStack
                label="Published"
                value={item.publishedAt ? formatDateTime(item.publishedAt) : null}
              />
              <MetaStack label="Saved" value={formatDateTime(item.createdAt)} />
              {analyzedAt ? (
                <MetaStack label="AI analyzed" value={formatDateTime(analyzedAt)} />
              ) : null}
            </dl>
          </section>

          <details className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer list-none text-lg font-semibold text-zinc-950 marker:hidden">
              Technical metadata
            </summary>

            <dl className="mt-5 space-y-4 text-sm">
              <MetaStack label="Source URL" value={item.sourceUrl} />
              <MetaStack label="Canonical URL" value={item.canonicalUrl} />
              <MetaStack label="Source type" value={item.sourceType} />
              <MetaStack label="Fetch status" value={item.fetchStatus} />
              <MetaStack label="Site" value={item.siteName} />
            </dl>

            {item.fetchError ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {item.fetchError}
              </div>
            ) : null}
          </details>
        </aside>
      </div>
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
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-7 text-zinc-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetaStack({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-zinc-900">{value || "—"}</dd>
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
