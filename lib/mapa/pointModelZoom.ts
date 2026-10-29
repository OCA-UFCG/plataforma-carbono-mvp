// Below this zoom a tower is a pixel or two: the pulsing point says more. Its
// own module so MapView can wait for this zoom without importing three.js,
// which lib/mapa/pointModels.ts loads.
export const POINT_MODEL_MIN_ZOOM = 14
