/**
 * Helpers pour le Codex : récupérer les fiches selon le nœud, les tags, l'ID ou le contexte de correction.
 */

import { CODEX_ENTRIES } from '../data/codexEntries'

/** Mapping fonction (T, SD, D) → tag pour la recherche de fiches */
const FUNCTION_TO_TAG = {
  T: 'Tonique',
  SD: 'SousDominante',
  D: 'Dominante'
}

/** Mapping valeur cadence (stockée dans chord.cadence) → tag */
const CADENCE_VALUE_TO_TAG = {
  'perfect': 'CadenceParfaite',
  'imperfect': 'CadenceImparfaite',
  'plagal': 'CadencePlagale',
  'rompue': 'CadenceRompue',
  'demi-cadence': 'DemiCadence',
  'half': 'DemiCadence',
  'Cadence6/4': 'Cadence6/4'
}

/**
 * Retourne les fiches dont relatedNodeIds contient nodeId.
 * @param {string} nodeId - ID du nœud parcours (ex. '1.1', 'cadence-parfaite')
 * @returns {Array<object>}
 */
export function getCodexEntriesForNode(nodeId) {
  if (!nodeId || typeof nodeId !== 'string') return []
  return CODEX_ENTRIES.filter(
    (entry) => Array.isArray(entry.relatedNodeIds) && entry.relatedNodeIds.includes(nodeId)
  )
}

/**
 * Retourne les fiches dont au moins un relatedTag est dans la liste tags.
 * @param {string[]} tags - Tags (ex. ['CadenceParfaite', 'Tonique'])
 * @param {number} [limit] - Nombre max de fiches à retourner
 * @returns {Array<object>}
 */
export function getCodexEntriesForTags(tags, limit = 10) {
  if (!Array.isArray(tags) || tags.length === 0) return []
  const set = new Set(tags.map((t) => (t || '').trim()).filter(Boolean))
  const found = CODEX_ENTRIES.filter(
    (entry) =>
      Array.isArray(entry.relatedTags) &&
      entry.relatedTags.some((tag) => set.has(tag))
  )
  return limit ? found.slice(0, limit) : found
}

/**
 * Retourne une fiche par ID.
 * @param {string} id - ID de la fiche (ex. 'fiche-fonctions-tsd-d')
 * @returns {object|null}
 */
export function getCodexEntryById(id) {
  if (!id || typeof id !== 'string') return null
  return CODEX_ENTRIES.find((entry) => entry.id === id) || null
}

/**
 * Suggère 1 à 2 fiches pertinentes à partir de la réponse correcte (pour le feedback de correction).
 * Priorité : fiches liées au nodeId (mode parcours), puis fonction de l'accord, puis cadence.
 * @param {object} correctChord - Accord correct (degree, selectedFunction, cadence, etc.)
 * @param {string|null} [nodeId] - Nœud parcours si en mode parcours
 * @returns {Array<object>} - 1 ou 2 fiches, sans doublon
 */
export function getCodexEntriesForCorrection(correctChord, nodeId = null) {
  const seen = new Set()
  const result = []

  // 1. Fiches liées au nœud (mode parcours)
  if (nodeId) {
    const forNode = getCodexEntriesForNode(nodeId)
    for (const entry of forNode) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id)
        result.push(entry)
      }
      if (result.length >= 2) return result
    }
  }

  // 2. Fiche liée à la fonction de l'accord
  const func = correctChord?.selectedFunction || (correctChord?.degree && degreeToFunction(correctChord.degree))
  if (func && FUNCTION_TO_TAG[func]) {
    const tag = FUNCTION_TO_TAG[func]
    const forFunc = getCodexEntriesForTags([tag], 1)
    if (forFunc.length > 0 && !seen.has(forFunc[0].id)) {
      seen.add(forFunc[0].id)
      result.push(forFunc[0])
    }
    if (result.length >= 2) return result
  }

  // 3. Fiche liée à la cadence (si l'accord a une cadence attendue)
  const cadence = correctChord?.cadence
  if (cadence) {
    const tag = CADENCE_VALUE_TO_TAG[cadence] || (cadence === 'Cadence6/4' ? 'Cadence6/4' : null)
    if (tag) {
      const forCadence = getCodexEntriesForTags([tag], 1)
      if (forCadence.length > 0 && !seen.has(forCadence[0].id)) {
        seen.add(forCadence[0].id)
        result.push(forCadence[0])
      }
    }
  }

  return result
}

/** Degré principal → fonction unique pour suggestion (I→T, IV→SD, V→D, etc.) */
const DEGREE_TO_FUNCTION = {
  I: 'T', III: 'T', VI: 'T',
  IV: 'SD', II: 'SD',
  V: 'D', VII: 'D'
}
function degreeToFunction(degree) {
  const d = (degree || '').toString().trim()
  return DEGREE_TO_FUNCTION[d] || null
}

/**
 * Retourne toutes les fiches, groupées par catégorie (pour l'affichage liste).
 * @returns {Record<string, object[]>}
 */
export function getCodexEntriesByCategory() {
  const byCategory = {}
  for (const entry of CODEX_ENTRIES) {
    const cat = entry.category || 'parcours'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(entry)
  }
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  return byCategory
}

/** Ordre des catégories pour liste plate */
const CATEGORY_ORDER = ['fonctions', 'cadences', 'enchainements', 'renversements', 'couleurs', 'parcours']

/**
 * Retourne toutes les fiches dans l'ordre d'affichage (pour navigation précédent/suivant).
 * @returns {object[]}
 */
export function getCodexEntriesOrdered() {
  const byCategory = getCodexEntriesByCategory()
  const result = []
  for (const cat of CATEGORY_ORDER) {
    if (byCategory[cat]) result.push(...byCategory[cat])
  }
  return result
}
