import type { NextConfig } from "next";

// Aplicação única: páginas de marketing (estáticas) e o módulo de mapas em /mapa,
// que depende das rotas /api/gee/* rodando no servidor. Por causa delas o app
// não pode mais usar output:'export'; o deploy é um Web Service Node.
const nextConfig: NextConfig = {
  // Produz um servidor autocontido em .next/standalone para a imagem Docker.
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
