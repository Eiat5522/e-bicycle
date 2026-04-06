import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@glide/api", "@glide/shared"]
};

export default nextConfig;
