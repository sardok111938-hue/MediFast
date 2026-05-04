"use client";

import type { ReactNode } from "react";
import { useLocale } from "../../lib/i18n/locale-context";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { t } = useLocale();

  return <div className={`pill ${className}`.trim()}>{typeof children === "string" ? t(children) : children}</div>;
}
