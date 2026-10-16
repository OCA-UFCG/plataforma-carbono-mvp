// Cache-busting for the API answers keyed by a recorte feature, client side
// only: /api/territorios/territorio and /tema, the report's /base and
// /analise, and the /feicoes list that maps names to ids.
//
// Those answers carry a browser max-age, and a regeneration of the recortes
// (scripts/build-recortes.py) can hand an id to another feature: when the
// first of some homonyms leaves a layer, the next one inherits its bare slug,
// as `sao-domingos` passed from SE to BA in 2026-10. Until the max-age ran
// out, a browser that had opened the old feature would show its figures under
// the new owner's name. The query string is part of the browser's cache key
// and of nothing else (the routes ignore it), so a new value sends every such
// fetch to a fresh entry the moment the release ships.
//
// Bump it with every regeneration that moves an id or redraws a feature.
export const RECORTE_DATA_VERSION = '3'
