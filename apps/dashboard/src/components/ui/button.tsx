"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useLocale } from "../../lib/i18n/locale-context";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

export function Button({
  children,
  className = "",
  variant = "primary",
  loading = false,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const { t } = useLocale();
  const variantClass = variant === "secondary" ? "secondary-button" : variant === "danger" ? "danger-button" : "";

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      className={`button ${variantClass} ${className}`.trim()}
    >
      {typeof children === "string" ? t(children) : children}
    </button>
  );
}
