/**
 * Illustrations pour les fiches du Codex.
 * Mapping ficheId → URL (Pexels / Unsplash, licences libres).
 * Ratio 16:9 ou 8:5 pour bannière ou encart.
 */

const P = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop`

const U = (timestamp, id) =>
  `https://images.unsplash.com/photo-${timestamp}-${id}?w=800&h=500&fit=crop&q=85&auto=format`

/** URL d'image par fiche Codex (ficheId → URL) */
export const CODEX_IMAGE_URLS = {
  'fiche-fonctions-tsd-d': P(1202751),
  'fiche-tonique': P(1202751),
  'fiche-sous-dominante': P(289327),
  'fiche-dominante': P(2736150),
  'fiche-demi-cadence-parfaite': P(16806202),
  'fiche-cadence-plagale': P(356658),
  'fiche-cadence-64': P(1246078),
  'fiche-cadence-rompue': P(9184517),
  'fiche-enchainements-typiques': P(289327),
  'fiche-renversements': P(2372945),
  'fiche-sixte-napolitaine': P(12496244),
  'fiche-dominante-dominante': P(1190297)
}

/**
 * Retourne l'URL d'illustration pour une fiche (ou null).
 * @param {string} ficheId - ID de la fiche
 * @returns {string|null}
 */
export function getCodexImageUrl(ficheId) {
  if (!ficheId || typeof ficheId !== 'string') return null
  return CODEX_IMAGE_URLS[ficheId] ?? null
}
