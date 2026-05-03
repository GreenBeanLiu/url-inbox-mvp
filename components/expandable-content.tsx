"use client";

import { useMemo, useState } from "react";

export function ExpandableContent({
  text,
  collapsedChars = 2200,
}: {
  text: string;
  collapsedChars?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const normalizedText = text.trim();
  const isLong = normalizedText.length > collapsedChars;

  const visibleText = useMemo(() => {
    if (expanded || !isLong) {
      return normalizedText;
    }

    return `${normalizedText.slice(0, collapsedChars).trimEnd()}…`;
  }, [collapsedChars, expanded, isLong, normalizedText]);

  return (
    <div>
      <div className="max-w-3xl whitespace-pre-wrap break-words text-[15px] leading-8 text-zinc-800 sm:text-base">
        {visibleText}
      </div>

      {isLong ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            {expanded ? "Collapse" : "Expand full text"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
