import type { NextConfig } from "next";

// Single application: marketing pages (static) and the maps module at /mapa,
// which depends on the /api/gee/* routes running on the server. Because of them
// the app cannot use output:'export'; the deploy needs a Node process, either
// the Docker image of this repository or a Web Service on Render.
const nextConfig: NextConfig = {
  // Produces a self-contained server in .next/standalone for the Docker image.
  output: "standalone",

  // Keep @google/earthengine out of the server bundle. It's a CommonJS package
  // with Node-only dependencies (crypto, Buffer, http via google-auth-library)
  // and Turbopack will fail to bundle it. Listing it here makes Next.js
  // `require()` it at runtime instead.
  serverExternalPackages: ["@google/earthengine"],

  // Cache the vector recortes aggressively. They're static boundary files that
  // change only when build-recortes.py is re-run; a day of freshness plus a
  // week of stale-while-revalidate avoids re-downloading ~4.85 MB per visit.
  async headers() {
    return [
      {
        source: "/data/vector/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
