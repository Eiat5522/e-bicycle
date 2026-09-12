import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:FilePath/**"
      }
    ]
  },
  transpilePackages: ["@glide/api", "@glide/shared"]
};

export default nextConfig;
