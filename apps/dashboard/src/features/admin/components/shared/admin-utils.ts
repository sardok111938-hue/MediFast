import { formatCategoryLabel } from "@medifast/i18n";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";

export function readSingle<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function readName(value: { full_name?: string } | { full_name?: string }[] | null | undefined, fallback: string) {
  return readSingle(value)?.full_name ?? fallback;
}

export function readCategoryName(value: { name?: string; name_ar?: string | null } | { name?: string; name_ar?: string | null }[] | null | undefined) {
  const record = readSingle(value);
  return formatCategoryLabel(record) || "-";
}

export function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر تحميل بيانات لوحة التحكم الآن.";
}

export async function fetchCount(table: string) {
  const supabase = getSupabaseBrowserClient();
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}
