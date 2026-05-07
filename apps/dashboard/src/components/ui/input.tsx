"use client";

import type { InputHTMLAttributes } from "react";
import { useLocale } from "../../lib/i18n/locale-context";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { t, isRTL } = useLocale();

  return <input className="input" dir={isRTL ? "rtl" : "ltr"} {...props} placeholder={props.placeholder ? t(props.placeholder) : props.placeholder} />;
}
