import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone: imagen Docker pequeña sin node_modules completos
  output: "standalone",
};

export default nextConfig;
