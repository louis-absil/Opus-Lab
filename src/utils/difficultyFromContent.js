/**
 * Calcule le niveau de difficulté d'un exercice à partir de ses accords et cadences.
 * Aligné sur le parcours (parcoursTree) : stage 1–4 → débutant, intermédiaire, avancé, expert.
 */

import { PARCOURS_NODE_ORDER, getNodeDef, getUnlockedChordKeys, getRequiredCadenceValues } from '../data/parcoursTree'
import { normalizeCadence } from './riemannFunctions'

/** Stage (1–4) → libellé de difficulté */
const STAGE_TO_DIFFICULTY = {
  1: 'débutant',
  2: 'intermédiaire',
  3: 'avancé',
  4: 'expert'
}

/** Map : clé parcours (ex. I, I6, N6, cad64) → premier stage qui la débloque */
let chordKeyToStage = null

/** Map : cadence normalisée (ex. perfect, rompue) → stage du nœud qui l'introduit */
let cadenceToStage = null

function buildChordKeyToStage() {
  if (chordKeyToStage != null) return chordKeyToStage
  chordKeyToStage = {}
  for (const nodeId of PARCOURS_NODE_ORDER) {
    const def = getNodeDef(nodeId)
    const stage = def?.stage
    if (stage == null) continue
    const keys = getUnlockedChordKeys(nodeId)
    for (const key of keys) {
      if (!(key in chordKeyToStage)) chordKeyToStage[key] = stage
    }
  }
  return chordKeyToStage
}

function buildCadenceToStage() {
  if (cadenceToStage != null) return cadenceToStage
  cadenceToStage = {}
  for (const nodeId of PARCOURS_NODE_ORDER) {
    const def = getNodeDef(nodeId)
    const stage = def?.stage
    if (stage == null) continue
    const values = getRequiredCadenceValues(nodeId)
    for (const v of values) {
      if (!(v in cadenceToStage)) cadenceToStage[v] = stage
    }
  }
  return cadenceToStage
}

/**
 * Convertit un accord en clé parcours (ex. I, I6, V7, N6, V64, cad64).
 * Cohérent avec chordToParcoursKey dans Player.jsx.
 */
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

/**
 * Détecte si l'accord est une dominante secondaire (V/V, V/VI, etc.) → stage 4.
 */
function isSecondaryDominant(chord) {
  if (!chord) return false
  if (chord.ofDegree != null && chord.ofDegree !== '') return true
  const label = chord.displayLabel || chord.root || ''
  return /\/V|\/IV|\/VI/i.test(String(label))
}

/**
 * Calcule le niveau de difficulté à partir des marqueurs et des données d'accords.
 * @param {Array} markers - Tableau des marqueurs temporels
 * @param {Object} chordData - Données d'accords par index (chordData[index])
 * @returns {'débutant'|'intermédiaire'|'avancé'|'expert'|null} - null si pas de contenu exploitable
 */
export function computeDifficultyFromContent(markers, chordData) {
  if (!markers?.length || !chordData) return null

  const keyToStage = buildChordKeyToStage()
  const cadToStage = buildCadenceToStage()
  let maxStage = 0

  for (let i = 0; i < markers.length; i++) {
    const chord = chordData[i]
    if (!chord) continue

    if (isSecondaryDominant(chord)) {
      maxStage = Math.max(maxStage, 4)
    }

    const key = chordToParcoursKey(chord)
    if (key && key in keyToStage) {
      maxStage = Math.max(maxStage, keyToStage[key])
    }

    const cadence = normalizeCadence(chord.cadence)
    if (cadence && cadence in cadToStage) {
      maxStage = Math.max(maxStage, cadToStage[cadence])
    }
  }

  if (maxStage < 1) return null
  return STAGE_TO_DIFFICULTY[Math.min(maxStage, 4)] ?? 'expert'
}
