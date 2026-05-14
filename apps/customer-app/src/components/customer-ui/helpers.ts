import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function renderTranslatedText(value: ReactNode, translate: (key: string) => string) {
  return typeof value === "string" ? translate(value) : value;
}
