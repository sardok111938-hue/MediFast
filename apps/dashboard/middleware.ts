import type { NextRequest } from "next/server";
import { updateDashboardSession } from "./src/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateDashboardSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
