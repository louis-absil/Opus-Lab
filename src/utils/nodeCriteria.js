/**
 * Utilitaires pour identifier les accords pertinents selon les nœuds de progression
 * Aligné sur l'arbre parcoursTree (étages 1–4)
 */

import { DEGREE_TO_FUNCTIONS, normalizeCadence } from './riemannFunctions'
import { getNodeDef, getUnlockedCadenceValues, getRequiredCadenceValues, NODE_TYPE_REVISION } from '../data/parcoursTree'

/**
 * Résout un nœud cadence ou révision vers le nœud d'apprentissage dont les critères s'appliquent
 * (ex. cadence-parfaite → 1.1 ; revision-etage-1 → cadence-plagale → 1.2)
 */
function resolveCriteriaNodeId(nodeId) {
  const def = getNodeDef(nodeId)
  if (!def) return nodeId
  if (def.type === 'cadence' && def.prereqs && def.prereqs.length > 0) {
    return resolveCriteriaNodeId(def.prereqs[0])
  }
  if (def.type === 'revision' && def.prereqs && def.prereqs.length > 0) {
    return resolveCriteriaNodeId(def.prereqs[0])
  }
  return nodeId
}

/**
 * Définition des critères pour chaque nœud d'apprentissage
 * (Les nœuds cadence utilisent les critères du nœud résolu via resolveCriteriaNodeId.)
 */
export const NODE_CRITERIA = {
  '1.1': { functions: ['T', 'D'], degrees: ['I', 'V'], figures: ['5', '6', '64'] },
  '1.2': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V'], figures: ['5', '6', '64'] },
  '2.1': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V'], figures: ['5', '6'] },
  '2.2': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V'], figures: ['5', '6', '64', '65'], cad64AsD: true },
  '2.3': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VII'], figures: ['5', '6', '64', '7', '65'] },
  '3.1': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'] },
  '3.5': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'] },
  '3.2': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'] },
  '3.2-vii7': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'] },
  '3.3': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'] },
  '3.4': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'] },
  '4.1': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'], specialRoots: ['N'] },
  '4.2': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'], specialRoots: ['N'], secondaryDominants: true },
  '4.3': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'], specialRoots: ['N'], secondaryDominants: true },
  '4.4': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'], specialRoots: ['N'], secondaryDominants: true },
  '4.5': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'], specialRoots: ['N', 'It', 'Fr', 'Gr'], secondaryDominants: true },
  '4.6': { functions: ['T', 'SD', 'D'], degrees: ['I', 'IV', 'II', 'III', 'V', 'VI', 'VII'], figures: ['5', '6', '64', '7', '65', '43', '2'], specialRoots: ['N', 'It', 'Fr', 'Gr'], secondaryDominants: true }
}

const SPECIAL_ROOT_TO_FUNCTION = {
  N: 'SD',
  It: 'D',
  Fr: 'D',
  Gr: 'D'
}

/**
 * Obtient la fonction tonale d'un accord (Cad64 = D).
 * Exporté pour le verrouillage des cases en mode parcours (phase Intuition = verrouiller par fonction).
 */
export function getChordFunction(chord) {
  if (!chord) return null
  if (chord.selectedFunction) return chord.selectedFunction
  if (chord.specialRoot) return SPECIAL_ROOT_TO_FUNCTION[chord.specialRoot] || null
  // I64 dépendant du contexte : passage (V64) et cadence (cad64) → D ; I64 avancé → T
  if (chord.degree && chord.degree.toUpperCase() === 'I' && chord.figure === '64') {
    if (chord.sixFourVariant === 'passing' || chord.sixFourVariant === 'cadential') return 'D'
    return 'T'
  }
  if (chord.degree) {
    const functions = DEGREE_TO_FUNCTIONS[chord.degree] || []
    return functions.length > 0 ? functions[0] : null
  }
  return null
}

/**
 * Vérifie si un accord est pertinent pour un nœud
 */
export function isChordRelevantForNode(chord, nodeId) {
  const criteriaNodeId = resolveCriteriaNodeId(nodeId)
  const criteria = NODE_CRITERIA[criteriaNodeId]
  if (!criteria || !chord) return false

  if (criteria.functions) {
    const chordFunction = getChordFunction(chord)
    if (chordFunction && criteria.functions.includes(chordFunction)) return true
  }

  if (criteria.degrees && chord.degree) {
    const normalizedDegree = chord.degree.toUpperCase()
    if (criteria.degrees.includes(normalizedDegree)) return true
  }

  if (criteria.figures && chord.figure) {
    if (criteria.figures.includes(chord.figure)) return true
  }

  if (criteria.specialRoots && chord.specialRoot) {
    if (criteria.specialRoots.includes(chord.specialRoot)) return true
  }

  return false
}

export function getRelevantChordIndices(nodeId, exercise) {
  if (!exercise || !exercise.markers) return []
  const relevantIndices = []
  exercise.markers.forEach((marker, index) => {
    const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
    if (chord && isChordRelevantForNode(chord, nodeId)) relevantIndices.push(index)
  })
  return relevantIndices
}

export function countRelevantChords(nodeId, exercise) {
  return getRelevantChordIndices(nodeId, exercise).length
}

/**
 * Pour les nœuds cadence, retourne le nœud learning qui les débloque ; sinon null
 */
export function getParentNodeId(nodeId) {
  const def = getNodeDef(nodeId)
  if (!def || def.type !== 'cadence' || !def.prereqs?.length) return null
  return def.prereqs[0]
}

export function getNodeShortLabel(nodeId) {
  const def = getNodeDef(nodeId)
  return def?.shortLabel ?? nodeId
}

export function getNodeSubtitle(nodeId) {
  const def = getNodeDef(nodeId)
  return def?.subtitle ?? (getParentNodeId(nodeId) ? 'Cadence' : nodeId)
}

export function getNodeDisplayName(nodeId) {
  const def = getNodeDef(nodeId)
  if (def) return `${def.shortLabel} — ${def.subtitle}`
  return nodeId
}

export function getNodeDescription(nodeId) {
  const def = getNodeDef(nodeId)
  return def?.description ?? ''
}

/**
 * Concepts interdits par nœud (exercices à filtrer)
 */
const FORBIDDEN_CONCEPTS = {
  '1.1': { borrowed: true, specialRoots: true, extensions: true },
  '1.2': { borrowed: true, specialRoots: true, extensions: true },
  '2.1': { borrowed: true, specialRoots: true, extensions: true },
  '2.2': { borrowed: true, specialRoots: true, extensions: true },
  '2.3': { borrowed: true, specialRoots: true, extensions: true },
  '3.1': { borrowed: true, specialRoots: true },
  '3.5': { borrowed: true, specialRoots: true },
  '3.2': { borrowed: true, specialRoots: true },
  '3.2-vii7': { borrowed: true, specialRoots: true },
  '3.3': { borrowed: true, specialRoots: true },
  '3.4': { borrowed: true, specialRoots: true },
  '4.1': { borrowed: true },
  '4.2': { borrowed: true },
  '4.3': {},
  '4.4': {},
  '4.5': {},
  '4.6': {}
}

function hasForbiddenConcepts(chord, forbidden) {
  if (!chord || !forbidden) return false
  if (forbidden.borrowed && chord.isBorrowed) return true
  if (forbidden.specialRoots && chord.specialRoot) return true
  if (forbidden.extensions && chord.figure && ['9', '11', '13'].includes(chord.figure)) return true
  return false
}

export function hasAdvancedConceptsForbiddenForNode(exercise, nodeId) {
  if (!exercise || !exercise.markers) return false
  const criteriaNodeId = resolveCriteriaNodeId(nodeId)
  const forbidden = FORBIDDEN_CONCEPTS[criteriaNodeId]
  if (!forbidden) return false
  for (const marker of exercise.markers) {
    const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
    if (chord && hasForbiddenConcepts(chord, forbidden)) return true
  }
  return false
}

/**
 * Vérifie que toutes les cadences présentes dans l'exercice sont débloquées pour le nœud.
 * Évite d'attribuer un exercice dont la bonne cadence n'est pas encore débloquée (réponse forcée fausse).
 */
export function exerciseCadencesAllowedForNode(exercise, nodeId) {
  if (!exercise || !exercise.markers) return true
  const unlockedCadences = getUnlockedCadenceValues(undefined, nodeId)
  if (unlockedCadences.length === 0) return true
  for (const marker of exercise.markers) {
    const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
    const cadence = chord?.cadence
    if (cadence) {
      const norm = normalizeCadence(cadence)
      if (!norm || !unlockedCadences.includes(norm)) return false
    }
  }
  return true
}

function getChord(marker) {
  return typeof marker === 'object' && marker.chord ? marker.chord : null
}

/**
 * Vérifie que l'exercice contient au moins une fois la séquence cad64 → V (ou V7) → I
 * (cadence parfaite composée).
 */
function exerciseHasCad64VISequence(exercise) {
  if (!exercise?.markers || exercise.markers.length < 3) return false
  const markers = exercise.markers
  for (let i = 0; i <= markers.length - 3; i++) {
    const c1 = getChord(markers[i])
    const c2 = getChord(markers[i + 1])
    const c3 = getChord(markers[i + 2])
    if (!c1 || !c2 || !c3) continue
    const isCad64 = c1.degree === 'I' && (c1.figure === '64' || c1.inversion === '64') && c1.sixFourVariant === 'cadential'
    const isV = c2.degree === 'V' && (c2.figure === '5' || c2.figure === '7' || c2.figure === '65' || c2.figure === '43' || c2.figure === '2' || !c2.figure)
    const isI = c3.degree === 'I' && c3.figure !== '64'
    if (isCad64 && isV && isI) return true
  }
  return false
}

/**
 * Vérifie que l'exercice contient au moins un élément requis pour le nœud (cadence ou accord précis).
 * Les nœuds de révision (type 'revision' ou id commençant par 'revision-') n'ont pas de contenu requis.
 * Pour cadence-parfaite-composee, l'exercice doit contenir la séquence cad64 → V → I (comme pour les autres nœuds cadence qui exigent la cadence en question).
 * @param {Object} exercise - Exercice avec markers
 * @param {string} nodeId - ID du nœud
 * @returns {boolean}
 */
export function exerciseHasRequiredContent(exercise, nodeId) {
  if (!exercise || !exercise.markers) return false
  const def = getNodeDef(nodeId)
  if (def?.type === NODE_TYPE_REVISION) return true

  // Cadence parfaite composée : l'exercice doit contenir la séquence cad64 → V (ou V7) → I
  if (nodeId === 'cadence-parfaite-composee') {
    return exerciseHasCad64VISequence(exercise)
  }

  const requiredCadences = getRequiredCadenceValues(nodeId)
  if (requiredCadences.length > 0) {
    for (const marker of exercise.markers) {
      const chord = getChord(marker)
      const cadence = chord?.cadence
      if (cadence) {
        const norm = normalizeCadence(cadence)
        if (norm && requiredCadences.includes(norm)) return true
      }
    }
    return false
  }

  if (nodeId === '2.2') {
    const hasCad64 = exercise.markers.some((marker) => {
      const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
      return chord && chord.degree === 'I' && (chord.figure === '64' || chord.inversion === '64') && chord.sixFourVariant === 'cadential'
    })
    if (hasCad64) return true
    const autoTags = exercise.autoTags || []
    if (autoTags.includes('Cadence6/4')) return true
    return false
  }

  if (nodeId === '4.1') {
    return exercise.markers.some((marker) => {
      const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
      return chord && chord.specialRoot === 'N'
    })
  }

  if (nodeId === '4.2' || nodeId === '4.3' || nodeId === '4.4' || nodeId === '4.5' || nodeId === '4.6') {
    const autoTags = exercise.autoTags || []
    if (autoTags.includes('DominanteSecondaire')) return true
    return true
  }

  return true
}

export function isExerciseSuitableForNode(exercise, nodeId, minRelevantChords = 2) {
  if (!exercise) return false
  if (hasAdvancedConceptsForbiddenForNode(exercise, nodeId)) return false
  if (!exerciseCadencesAllowedForNode(exercise, nodeId)) return false
  if (!exerciseHasRequiredContent(exercise, nodeId)) return false
  return countRelevantChords(nodeId, exercise) >= minRelevantChords
}
