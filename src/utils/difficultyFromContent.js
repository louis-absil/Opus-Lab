/**
 * Calcule le niveau de difficulté d'un exercice à partir des accords et modulateurs.
 * Barème : difficulté par accord (chordDifficulties) + durée, cadences rares, densité/figures.
 */

import { getDifficultyForChordKey, SECONDARY_DOMINANT_DIFFICULTY } from '../data/chordDifficulties'
import { normalizeCadence } from './riemannFunctions'

/** Score (1–4) → libellé */
const SCORE_TO_DIFFICULTY = {
  1: 'débutant',
  2: 'intermédiaire',
  3: 'avancé',
  4: 'expert'
}

/** Seuils modulateur durée (secondes) */
const DURATION_THRESHOLD_HARD = 2.5   // < 2,5 s → +0,5
const DURATION_THRESHOLD_VERY_HARD = 1.5 // < 1,5 s → +1

/** Cadences considérées rares → +0,5 */
const RARE_CADENCES = ['plagal', 'rompue', 'évitée']

/** Figures prises en compte pour la densité (hors fondamental 5) */
const DENSITY_FIGURES = ['6', '64', '7', '65', '43', '2']
const DENSITY_THRESHOLD_MEDIUM = 3  // ≥ 3 figures différentes → +0,5
const DENSITY_THRESHOLD_HIGH = 5    // ≥ 5 figures différentes → +1

/** Plafond des modulateurs quand base ≤ 2 (progressions basiques) */
const MODULATOR_CAP_WHEN_BASE_LOW = 0.5

function chordToParcoursKey(chord) {
  if (!chord) return null
  if (chord.specialRoot === 'N') return 'N6'
  if (chord.specialRoot === 'It' || chord.specialRoot === 'Fr' || chord.specialRoot === 'Gr') return chord.specialRoot
  const degree = (chord.degree || '').toUpperCase()
  if (!degree) return null
  const fig = chord.figure && chord.figure !== '5' ? chord.figure : ''
  if (degree === 'I' && fig === '64') {
    if (chord.sixFourVariant === 'passing') return 'V64'
    if (chord.sixFourVariant === 'cadential') return 'cad64'
    return 'I64'
  }
  return degree + fig
}

function isSecondaryDominant(chord) {
  if (!chord) return false
  if (chord.ofDegree != null && chord.ofDegree !== '') return true
  const label = chord.displayLabel || chord.root || ''
  return /\/V|\/IV|\/VI/i.test(String(label))
}

function getMarkerTime(marker) {
  if (marker == null) return null
  if (typeof marker === 'object' && 'time' in marker) return Number(marker.time)
  if (typeof marker === 'number') return marker
  return null
}

/**
 * Calcule le niveau de difficulté à partir des marqueurs et des données d'accords.
 * @param {Array} markers - Tableau des marqueurs (temps numériques ou { time, chord })
 * @param {Object} chordData - Données d'accords par index (chordData[index])
 * @returns {'débutant'|'intermédiaire'|'avancé'|'expert'|null} - null si pas de contenu exploitable
 */
export function computeDifficultyFromContent(markers, chordData) {
  if (!markers?.length || !chordData) return null

  let base = 0
  const figuresSeen = new Set()
  const cadencesSeen = new Set()
  const durations = []

  for (let i = 0; i < markers.length; i++) {
    const chord = chordData[i]
    if (!chord) continue

    const chordDifficulty = isSecondaryDominant(chord)
      ? SECONDARY_DOMINANT_DIFFICULTY
      : getDifficultyForChordKey(chordToParcoursKey(chord))
    base = Math.max(base, chordDifficulty)

    if (chord.figure && chord.figure !== '5') figuresSeen.add(chord.figure)
    const cadence = normalizeCadence(chord.cadence)
    if (cadence) cadencesSeen.add(cadence)

    const t0 = getMarkerTime(markers[i])
    const t1 = i + 1 < markers.length ? getMarkerTime(markers[i + 1]) : null
    if (t0 != null && t1 != null && !isNaN(t0) && !isNaN(t1)) durations.push(t1 - t0)
  }

  if (base < 1) return null

  let modulatorTotal = 0

  // Modulateur durée
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    if (avgDuration < DURATION_THRESHOLD_VERY_HARD) modulatorTotal += 1
    else if (avgDuration < DURATION_THRESHOLD_HARD) modulatorTotal += 0.5
  }

  // Modulateur cadences rares
  const hasRareCadence = RARE_CADENCES.some(c => cadencesSeen.has(c))
  if (hasRareCadence) modulatorTotal += 0.5

  // Modulateur densité / variété (figures différentes)
  const distinctFigures = figuresSeen.size
  if (distinctFigures >= DENSITY_THRESHOLD_HIGH) modulatorTotal += 1
  else if (distinctFigures >= DENSITY_THRESHOLD_MEDIUM) modulatorTotal += 0.5

  // Optionnel : plafonner les modulateurs quand base ≤ 2
  if (base <= 2 && modulatorTotal > MODULATOR_CAP_WHEN_BASE_LOW) modulatorTotal = MODULATOR_CAP_WHEN_BASE_LOW

  let score = base + modulatorTotal
  score = Math.max(1, Math.min(4, Math.round(score * 2) / 2))
  const stage = Math.min(4, Math.max(1, Math.round(score)))
  return SCORE_TO_DIFFICULTY[stage] ?? 'expert'
}
