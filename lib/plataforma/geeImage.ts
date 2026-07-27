// Server-only helper, builds an ee.Image from a declarative asset config.
// Used by all /api/gee/* routes so a new GEE layer only needs a JSON entry.

export interface GeeAssetConfig {
  type:        'image' | 'imageCollection'
  id:          string                                              // EE asset or collection id
  band?:       string                                              // band name to .select()
  filterDate?: [string, string]                                    // for collections only
  reducer?:    'mean' | 'median' | 'min' | 'max' | 'first' | 'sum' // for collections only
  scale?:      number                                              // native resolution in meters
  // Mask out-of-range fill/nodata values (raw DN, before scaleFactor). MODIS
  // MOD17 uses 32761-32767 as fill; leaving them in corrupts mean() and Jenks.
  validMin?:   number
  validMax?:   number
  // Physical value = raw DN × scaleFactor (e.g. MODIS GPP/NPP use 0.0001).
  // Applied only where a physical value is shown to the user (point value).
  scaleFactor?: number
  // Applied to the IMAGE ITSELF (tiles + stats + point) so everything is in
  // physical units: value = raw × multiplier + offset (e.g. NDVI ×0.0001;
  // MODIS LST ×0.02 − 273.15 for °C). Use instead of scaleFactor for
  // continuous layers whose stats should read in physical units.
  multiplier?:  number
  offset?:      number
}

/**
 * Load an `ee.Image` from a user-supplied asset config. For ImageCollections,
 * applies date filter + band selection + a scalar reducer so the result is a
 * single-band `ee.Image` ready for visualization / sampling.
 *
 * Parameters on `ee` are typed as `any` because @google/earthengine ships
 * without TypeScript declarations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEeImage(ee: any, asset: GeeAssetConfig, temporalDate?: string): any {
  // Mask raw fill/nodata values so they don't pollute reducers or Jenks
  // sampling. Applied per-image (before any collection reducer runs).
  const hasValidRange = asset.validMin !== undefined || asset.validMax !== undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maskValid = (img: any) => {
    if (!hasValidRange) return img
    let mask = img.mask()
    if (asset.validMin !== undefined) mask = mask.and(img.gte(asset.validMin))
    if (asset.validMax !== undefined) mask = mask.and(img.lte(asset.validMax))
    return img.updateMask(mask)
  }

  // Convert raw DN to physical units on the final single-band image (after any
  // reducer), so tiles, stats and point value are all physical.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transform = (img: any) => {
    let out = img
    if (asset.multiplier !== undefined) out = out.multiply(asset.multiplier)
    if (asset.offset !== undefined) out = out.add(asset.offset)
    return out
  }

  if (asset.type === 'imageCollection') {
    let col = ee.ImageCollection(asset.id)

    // Temporal mode: filter to a single month, take first image (no reducer)
    if (temporalDate) {
      const start = new Date(temporalDate)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      const endStr = end.toISOString().split('T')[0]
      col = col.filterDate(temporalDate, endStr)
      if (asset.band) col = col.select(asset.band)
      return transform(maskValid(col.first()))
    }

    // Non-temporal: use configured date range + reducer
    if (asset.filterDate) {
      col = col.filterDate(asset.filterDate[0], asset.filterDate[1])
    }
    if (asset.band) {
      col = col.select(asset.band)
    }
    // Mask each image before reducing, or fill values would skew the result.
    if (hasValidRange) col = col.map(maskValid)
    const reducer = asset.reducer ?? 'mean'
    switch (reducer) {
      case 'median': return transform(col.median())
      case 'min':    return transform(col.min())
      case 'max':    return transform(col.max())
      case 'first':  return transform(col.first())
      case 'sum':    return transform(col.sum())
      default:       return transform(col.mean())
    }
  }

  // Single image asset
  let img = ee.Image(asset.id)
  if (asset.band) {
    img = img.select(asset.band)
  }
  return transform(maskValid(img))
}

/**
 * Get the effective band name for downstream reducer keys. For collections
 * with an explicit band, that's the band name. For single images without
 * band, returns null (caller must use the first key of the reducer result).
 */
export function effectiveBandName(asset: GeeAssetConfig): string | null {
  return asset.band ?? null
}
