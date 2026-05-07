"use client";

import type { CSSProperties, ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { useLocale } from "../../lib/i18n/locale-context";

export function Table({
  title,
  headers,
  rows,
  emptyMessage = "There are no records to show right now.",
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}) {
  const { t } = useLocale();
  const tableStyle = { ["--table-columns" as const]: `${headers.length}` } as CSSProperties;

  return (
    <section className="table">
      <h3>{t(title)}</h3>
      <div className="table-row table-row-header" style={tableStyle}>
        {headers.map((header) => (
          <strong key={header}>{t(header)}</strong>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState message={emptyMessage} /> : null}
      {rows.map((row, index) => (
        <div className="table-row" key={`${title}-${index}`} style={tableStyle}>
          {row.map((cell, cellIndex) => (
            <div key={`${title}-${index}-${cellIndex}`} className="table-cell" data-label={t(headers[cellIndex] ?? "")}>
              {typeof cell === "string" ? t(cell) : cell}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
