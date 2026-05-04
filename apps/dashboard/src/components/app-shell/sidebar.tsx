"use client";

import type { ReactNode } from "react";
import type { NavItem } from "../../types/dashboard";
import { NavLink } from "./nav-link";

export function Sidebar({
  title,
  subtitle,
  nav,
  topSlot,
}: {
  title: string;
  subtitle: string;
  nav: readonly NavItem[];
  topSlot?: ReactNode;
}) {
  return (
    <aside className="sidebar">
      {topSlot}
      <h2>{title}</h2>
      <p className="muted">{subtitle}</p>
      <nav>
        {nav.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>
    </aside>
  );
}