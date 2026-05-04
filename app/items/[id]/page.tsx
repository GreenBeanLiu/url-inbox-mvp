import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpandableContent } from "@/components/expandable-content";
import { readAnalysis, readAnalyzedAt } from "@/lib/item-analysis";
import { extractReferencedLinks } from "@/lib/referenced-links";
import {
  getUrlHost,
  isResourceLikeKind,
  readResourceClassification,
} from "@/lib/resource";
import { findHostRelatedItems, findItemById } from "@/lib/repo";

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

  const hostContext =
    item.sourceType === "web"
      ? await findHostRelatedItems(item.sourceUrl, item.id)
      : { host: null, savedCount: 0, items: [] };

  const analysis = readAnalysis(item);
  const analyzedAt = readAnalyzedAt(item);
  const resource = readResourceClassification(item);
  const resourceKind = resource?.kind || null;
  const isResourceLike = isResourceLikeKind(resourceKind);
  const hostLabel = hostContext.host || getUrlHost(item.sourceUrl);
  const contentText = item.contentText?.trim() || null;
  const summaryText = item.summary?.trim() || null;
  const fullContent = contentText || summaryText;
  const referencedLinks = extractReferencedLinks(item);
  const lowQualityExtract = isLowQualityExtract(contentText);
  const showSummary =
    Boolean(summaryText) && Boolean(contentText) && summaryText !== contentText;
  const aiSectionTitle = isResourceLike ? "AI analysis" : "AI summary";
  const summarySectionTitle = isResourceLike ? "Saved preview" : "Summary";
  const contentSectionTitle = lowQualityExtract
    ? "Raw extract"
    : isResourceLike
      ? "Saved details"
      : "Original content";
  const contentSectionLabel = lowQualityExtract
    ? "low-quality captured text"
    : contentText
      ? isResourceLike
        ? "captured page text"
        : "full extracted text"
      : isResourceLike
        ? "saved snippet"
        : "saved summary";
  const resourceDescription = buildResourceDescription(resourceKind, item.siteName);

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
                    {aiSectionTitle}
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
                <h2 className="text-xl font-semibold text-zinc-950">
                  {summarySectionTitle}
                </h2>
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
              <h2 className="text-xl font-semibold text-zinc-950">
                {contentSectionTitle}
              </h2>
              <span className="text-xs uppercase tracking-wide text-zinc-400">
                {contentSectionLabel}
              </span>
            </div>

            {fullContent ? (
              lowQualityExtract ? (
                <div className="mt-5">
                  <p className="text-sm leading-7 text-zinc-500">
                    This extract looks noisy or poorly formatted. Prefer the AI summary above or open the source page directly.
                  </p>

                  <details className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 marker:hidden">
                      Show raw extracted text
                    </summary>
                    <div className="mt-4">
                      <ExpandableContent text={fullContent} collapsedChars={1400} />
                    </div>
                  </details>
                </div>
              ) : (
                <div className="mt-5">
                  <ExpandableContent text={fullContent} />
                </div>
              )
            ) : (
              <p className="mt-4 text-sm text-zinc-500">No readable content yet.</p>
            )}
          </section>

          {referencedLinks.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-zinc-950">
                  Referenced links
                </h2>
                <span className="text-xs uppercase tracking-wide text-zinc-400">
                  extracted from content
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {referencedLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-zinc-200 px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <div className="text-sm font-medium text-zinc-950">{link.label}</div>
                    <div className="mt-1 break-all text-xs text-zinc-500">{link.url}</div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          {isResourceLike ? (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    Resource overview
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {resourceDescription}
                  </p>
                </div>
                {resource ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    {(resource.confidence * 100).toFixed(0)}% match
                  </span>
                ) : null}
              </div>

              {resource?.signals?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.signals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-white px-2.5 py-1 text-xs text-amber-800 ring-1 ring-amber-200"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

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
              {hostLabel ? (
                <MetaStack
                  label="Host"
                  value={
                    hostContext.savedCount > 0
                      ? `${hostLabel} · saved ${hostContext.savedCount} time${
                          hostContext.savedCount === 1 ? "" : "s"
                        }`
                      : hostLabel
                  }
                />
              ) : null}
              {resourceKind ? (
                <MetaStack label="Kind" value={resourceKind} />
              ) : null}
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

          {hostContext.items.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-950">
                  More from this host
                </h2>
                {hostLabel ? (
                  <span className="text-xs uppercase tracking-wide text-zinc-400">
                    {hostLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {hostContext.items.map((related) => (
                  <Link
                    key={related.id}
                    href={`/items/${related.id}`}
                    className="rounded-2xl border border-zinc-200 px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <div className="text-sm font-medium text-zinc-950">
                      {related.title || related.sourceUrl}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Saved {formatDateTime(related.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

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

function isLowQualityExtract(text: string | null) {
  if (!text) {
    return false;
  }

  const normalized = text.trim();
  if (normalized.length < 280) {
    return false;
  }

  const newlineCount = (normalized.match(/\n/g) || []).length;
  const punctuationCount = (normalized.match(/[。！？.!?]/g) || []).length;
  const denseUrlCount = (normalized.match(/https?:\/\//g) || []).length;
  const suspiciousJoinCount =
    (normalized.match(/[a-z0-9][A-Z][a-z]/g) || []).length +
    (normalized.match(/[a-z][\u4e00-\u9fff]/g) || []).length +
    (normalized.match(/[\u4e00-\u9fff][A-Za-z]/g) || []).length;

  return (
    newlineCount <= 1 &&
    (suspiciousJoinCount >= 4 || denseUrlCount >= 1) &&
    punctuationCount <= 12
  );
}

function buildResourceDescription(
  kind: "article" | "tool" | "workspace" | null,
  siteName: string | null,
) {
  if (kind === "workspace") {
    return `This looks more like a saved workspace or project surface than a reading page${siteName ? ` from ${siteName}` : ""}. Review it as a working context, document, board, or project artifact.`;
  }

  if (kind === "tool") {
    return `This looks like a product or tool link${siteName ? ` from ${siteName}` : ""}. Focus on what it does, where it fits, and whether it is worth trying or sharing.`;
  }

  return `This item is treated as a reading-oriented page${siteName ? ` from ${siteName}` : ""}.`;
}
