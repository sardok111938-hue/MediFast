"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "../../lib/i18n/locale-context";

export function NavLink({ href, label }: { href: string; label: string }) {
  const { t } = useLocale();
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link
      href={href as never}
      className={isActive ? "active" : ""}
    >
      {t(label) || label}
    </Link>
  );
}