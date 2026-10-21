// Runs once when a Next.js server starts. In production it warms the map by
// feature in the background (lib/mapa/choroplethPrewarm.ts), so the first
// readers after a deploy find it ready. Set CHOROPLETH_PREWARM=false to skip.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return
  if (process.env.CHOROPLETH_PREWARM === 'false') return

  // Imported here, not at the top: the Earth Engine client is Node-only and
  // must stay out of the edge runtime's bundle.
  const { prewarmChoropleths } = await import('@/lib/mapa/choroplethPrewarm')
  void prewarmChoropleths()
}
