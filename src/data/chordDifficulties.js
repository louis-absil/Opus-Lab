/**
 * Difficulté par accord (clé parcours) pour le calcul automatique de la difficulté des exercices.
 * Aligné sur le plan : 1 = débutant, 2 = intermédiaire, 3 = avancé, 4 = expert.
 * Niveaux 3–4 = emprunts, dominantes secondaires, ou contenu très complexe (sixtes augmentées).
 */

/** Clé parcours → difficulté (1–4). Défaut pour toute clé non listée : 2. */
export const CHORD_KEY_DIFFICULTY = {
  I: 1,
  IV: 1,
  V: 1,
  II: 1,
  V7: 1,
  I6: 2,
  V6: 2,
  V64: 2,
  II6: 2,
  VI: 2,
  VII: 2,
  cad64: 2,
  V65: 2,
  V43: 2,
  V2: 2,
  II65: 2,
  VII6: 2,
  VII7: 2,
  VII64: 2,
  VII65: 2,
  VII43: 2,
  VII2: 2,
  VI6: 2,
  IV6: 2,
  IV64: 3,
  II64: 3,
  II7: 2,
  II43: 2,
  II2: 2,
  III64: 3,
  VI64: 3,
  N6: 3,
  I64: 3,
  It: 4,
  Fr: 4,
  Gr: 4
}

/** Difficulté pour une clé inconnue */
export const DEFAULT_CHORD_DIFFICULTY = 2

/** Difficulté pour tout accord détecté comme dominante secondaire (ofDegree ou label /V, /IV, /VI) */
export const SECONDARY_DOMINANT_DIFFICULTY = 3

/**
 * Retourne la difficulté (1–4) pour une clé parcours.
 * @param {string} key - Clé parcours (ex. I, V7, cad64, N6)
 * @returns {number}
 */
export function getDifficultyForChordKey(key) {
  if (!key) return DEFAULT_CHORD_DIFFICULTY
  return CHORD_KEY_DIFFICULTY[key] ?? DEFAULT_CHORD_DIFFICULTY
}
