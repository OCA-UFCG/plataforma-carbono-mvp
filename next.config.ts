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

  // Let the browser keep the vector recortes, but check with the server before
  // using them. They are boundary files that change rarely -- and that is the
  // trap: `max-age=86400, stale-while-revalidate=604800` served a whole day of
  // stale data after the properties were enriched, and a further stale load
  // after that. The map read a state's name as undefined and the search found
  // nothing, with no error anywhere to explain it.
  //
  // `no-cache` stores the file and revalidates it; Next already sends ETag and
  // Last-Modified, so an unchanged file costs a 304 of a few hundred bytes
  // rather than the ~4.85 MB. Versioning the URLs instead would cache better,
  // but `layer.url` is also the path the server reads from disk, and it has to
  // be bumped by hand on every data change -- forgetting to is this same bug.
  async headers() {
    return [
      {
        source: "/data/vector/:path*",
        headers: [{ key: "Cache-Control", value: "public, no-cache" }],
      },
    ];
  },
};

export default nextConfig;
