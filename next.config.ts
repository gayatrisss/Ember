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
    // Optimizer is ON. The old "rec.gov blocks server-side requests" note was wrong for
    // Next 16: server-side fetch succeeds, and although rec.gov serves images as
    // `application/octet-stream`, Next detects the type from the bytes (webp), not the
    // header, so optimization works. Images that must stay raw opt out per-<Image> with
    // `unoptimized`: topo-map (a Mapbox URL, host not in remotePatterns) and, for now,
    // cabin-photo and the alert-card thumbnails.
    //
    // rec.gov photos are frozen, so cache an optimized variant for a month rather than
    // re-fetching and re-encoding the 1440px source on every miss.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
