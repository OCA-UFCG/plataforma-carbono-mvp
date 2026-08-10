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
  // Fill masked pixels with a constant, applied after the collection reducer.
  // The ESA CCI AGB masks non-woody cover instead of writing 0, so a
  // territorial mean over the Caatinga comes out ~54% above reality (measured:
  // 40,86 vs 26,50 Mg/ha em 2022). `unmaskValue: 0` restores the territorial
  // reading. Leave undefined to keep the asset's own masking.
  unmaskValue?: number
  // Séries cujo ano está no nome da banda em vez de estar em datas de uma
  // coleção. O MapBiomas grava `classification_1985` a `classification_2024`
  // numa imagem só, e o Fogo grava a frequência acumulada em
  // `fire_frequency_1985_1985` a `fire_frequency_1985_2023`. Com este campo o
  // ano pedido seleciona a banda, o que também traz os assets do tipo `image`
  // para o caminho temporal. Substitui `band` enquanto o modo temporal roda.
  bandPattern?: string
}

/** Nome da banda de um ano, a partir do padrão configurado. */
export function bandaDoAno(bandPattern: string, ano: string): string {
  return bandPattern.replace('{ano}', ano)
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
  // reducer), so tiles, stats and point value are all physical. The unmask
  // step runs first, so the filled pixels also go through the unit conversion.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transform = (img: any) => {
    let out = img
    if (asset.unmaskValue !== undefined) out = out.unmask(asset.unmaskValue)
    if (asset.multiplier !== undefined) out = out.multiply(asset.multiplier)
    if (asset.offset !== undefined) out = out.add(asset.offset)
    return out
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reduzir = (col: any) => {
    switch (asset.reducer ?? 'mean') {
      case 'median': return col.median()
      case 'min':    return col.min()
      case 'max':    return col.max()
      case 'first':  return col.first()
      case 'sum':    return col.sum()
      default:       return col.mean()
    }
  }

  // Modo temporal por banda: o ano está no nome da banda, então a imagem é
  // única e o filtro de data não se aplica. Vem antes do desvio por tipo
  // porque vale igualmente para `image` e para `imageCollection`.
  if (temporalDate && asset.bandPattern) {
    const banda = bandaDoAno(asset.bandPattern, temporalDate.slice(0, 4))
    return transform(maskValid(ee.Image(asset.id).select(banda)))
  }

  if (asset.type === 'imageCollection') {
    let col = ee.ImageCollection(asset.id)

    // Modo temporal por data: a janela é o ano pedido, e o redutor é o mesmo
    // da camada estática. Usar `first()` aqui, como fazia antes, quebraria o
    // CHIRPS, cujo `sum` é o que transforma chuva diária em total do ano.
    if (temporalDate) {
      const ano = Number(temporalDate.slice(0, 4))
      col = col.filterDate(`${ano}-01-01`, `${ano + 1}-01-01`)
      if (asset.band) col = col.select(asset.band)
      if (hasValidRange) col = col.map(maskValid)
      return transform(reduzir(col))
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
    return transform(reduzir(col))
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
