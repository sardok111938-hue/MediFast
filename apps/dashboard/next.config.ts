import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@medifast/types", "@medifast/supabase", "@medifast/ui"],
  typedRoutes: true,
};

export default nextConfig;
