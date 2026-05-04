"use client";

import type { ReactNode } from "react";
import { Badge } from "./badge";

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
  return (
    <section className="hero">
      {badge ? <Badge>{badge}</Badge> : null}
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      {children}
    </section>
  );
}