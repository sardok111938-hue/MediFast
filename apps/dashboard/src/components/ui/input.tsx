"use client";

import type { InputHTMLAttributes } from "react";
import { useLocale } from "../../lib/i18n/locale-context";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useLocale();

  return <input className="input" {...props} placeholder={props.placeholder ? t(props.placeholder) : props.placeholder} />;
}
