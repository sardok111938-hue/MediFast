"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useLocale } from "../../lib/i18n/locale-context";

export function Button({
  children,
  className = "",
  variant = "primary",
  loading = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  const { t } = useLocale();
  const variantClass = variant === "secondary" ? "secondary-button" : variant === "danger" ? "danger-button" : "";

  return (
    <button className={`button ${variantClass} ${className}`.trim()} {...props} disabled={props.disabled || loading}>
      {typeof children === "string" ? t(children) : children}
    </button>
  );
}
