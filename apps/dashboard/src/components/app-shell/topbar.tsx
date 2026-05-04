"use client";

import type { ReactNode } from "react";

export function Topbar({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div className="topbar-slot">{left}</div>
      <div className="topbar-slot">{right}</div>
    </div>
  );
}