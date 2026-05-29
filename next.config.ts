import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.recreation.gov",
        pathname: "/public/**",
      },
    ],
    // rec.gov CDN blocks server-side requests — skip Next.js optimization,
    // pass URLs directly to the browser
    unoptimized: true,
  },
};

export default nextConfig;
