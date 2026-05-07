"use client";

import type { ReactNode } from "react";
import { Badge } from "./badge";
import { useLocale } from "../../lib/i18n/locale-context";

export function PageHeader({
  badge,
  title,
  description,
  children,
}: {
  badge?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <section className="hero">
      {badge ? <Badge>{badge}</Badge> : null}
      <h1>{t(title)}</h1>
      <p className="muted">{t(description)}</p>
      {children}
    </section>
  );
}
