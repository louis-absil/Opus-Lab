/**
 * Sélection du conseil du jour personnalisé selon difficultés (degrés/cadences),
 * étape du parcours et niveau. Utilisé par DailyLearningBlock sur l'accueil élève.
 */

import { computeProfileStatsFromAttempts } from './profileStats'
import { TAGGED_TIPS, getTipOfTheDay } from '../data/pedagogicalTips'

/** Seuil minimal de réponses pour considérer un degré/cadence comme "point faible" */
const MIN_RESPONSES_FOR_WEAK = 3

/** Score moyen en dessous duquel on considère un point faible (sur 100) */
const WEAK_AVERAGE_THRESHOLD = 70

/** Nombre de tentatives en dessous duquel on considère l'élève comme débutant */
const BEGINNER_ATTEMPT_THRESHOLD = 15

/** Score moyen en dessous duquel on considère l'élève comme débutant (sur 100) */
const BEGINNER_SCORE_THRESHOLD = 65

/**
 * Normalise une clé cadence (stockée dans correctAnswers / cadenceStats) vers nos tags conseil.
 * @param {string} key - ex. "demi-cadence", "perfect", "plagal", "rompue"
 * @returns {string|null} - "demi" | "parfaite" | "plagale" | "64" | "rompue" | null
 */
function normalizeCadenceKey(key) {
  if (!key || typeof key !== 'string') return null
  const k = key.toLowerCase().trim()
  if (k === 'demi-cadence' || k === 'half' || k === 'demi') return 'demi'
  if (k === 'perfect' || k === 'parfaite') return 'parfaite'
  if (k === 'plagal' || k === 'plagale') return 'plagale'
  if (k === 'rompue' || k === 'deceptive') return 'rompue'
  if (k.includes('64') || k === 'cadence6/4' || k === 'cad64') return '64'
  return null
}

/**
 * Identifie les degrés les plus faibles (averageScore bas, avec assez de données).
 * @param {Record<string, { total: number, averageScore: number }>} degreeStats
 * @returns {string[]} - Liste des degrés les plus faibles (ex. ['V', 'II'])
 */
function getWeakDegrees(degreeStats) {
  if (!degreeStats || typeof degreeStats !== 'object') return []
  const entries = Object.entries(degreeStats)
    .filter(([, s]) => s.total >= MIN_RESPONSES_FOR_WEAK && (s.averageScore ?? 0) < WEAK_AVERAGE_THRESHOLD)
    .sort((a, b) => (a[1].averageScore ?? 0) - (b[1].averageScore ?? 0))
  return entries.slice(0, 2).map(([degree]) => degree)
}

/**
 * Identifie les cadences les plus faibles (averageScore bas, avec assez de données).
 * Retourne les tags normalisés (demi, parfaite, plagale, 64, rompue).
 * @param {Record<string, { total: number, averageScore: number }>} cadenceStats
 * @returns {string[]}
 */
function getWeakCadences(cadenceStats) {
  if (!cadenceStats || typeof cadenceStats !== 'object') return []
  const withTag = Object.entries(cadenceStats)
    .filter(([, s]) => s.total >= MIN_RESPONSES_FOR_WEAK && (s.averageScore ?? 0) < WEAK_AVERAGE_THRESHOLD)
    .map(([key, s]) => ({ tag: normalizeCadenceKey(key), key, averageScore: s.averageScore }))
    .filter((x) => x.tag != null)
  const byScore = withTag.sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
  return [...new Set(byScore.slice(0, 2).map((x) => x.tag))]
}

/**
 * Indique si un conseil matche un thème parcours (activeNodeId).
 * parcoursTheme peut être un string ou un tableau de nodeIds.
 * @param {{ parcoursTheme?: string | string[] }} tip
 * @param {string|null} activeNodeId
 * @returns {boolean}
 */
function tipMatchesParcours(tip, activeNodeId) {
  if (!activeNodeId || !tip.parcoursTheme) return false
  const themes = Array.isArray(tip.parcoursTheme) ? tip.parcoursTheme : [tip.parcoursTheme]
  return themes.includes(activeNodeId)
}

/**
 * Indique si un conseil matche un degré ou une cadence.
 * @param {{ degree?: string, cadence?: string }} tip
 * @param {string[]} weakDegrees
 * @param {string[]} weakCadences
 * @returns {boolean}
 */
function tipMatchesWeakness(tip, weakDegrees, weakCadences) {
  if (weakDegrees.length && tip.degree && weakDegrees.includes(tip.degree)) return true
  if (weakCadences.length && tip.cadence && weakCadences.includes(tip.cadence)) return true
  return false
}

/**
 * Choisit un élément de façon déterministe à partir d'un seed (ex. jour + id).
 * @param {Array<{ id: string }>} arr
 * @param {number} seed
 * @returns {*}
 */
function pickDeterministic(arr, seed) {
  if (!arr.length) return null
  const index = Math.abs(seed) % arr.length
  return arr[index]
}

/**
 * Sélectionne le conseil personnalisé.
 * @param {Object[]} attempts - Tentatives de l'élève (ex. allAttemptsForStreak)
 * @param {Object} progress - Progression parcours { unlockedNodes, activeNodeId optionnel }
 * @returns {{ text: string, reason?: string }}
 */
export function getPersonalizedTip(attempts, progress = {}) {
  const fallbackText = getTipOfTheDay()
  const fallback = { text: fallbackText }

  if (!attempts || !Array.isArray(attempts) || attempts.length === 0) {
    return fallback
  }

  const stats = computeProfileStatsFromAttempts(attempts)
  const { degreeStats, cadenceStats, averageScore, totalAttempts } = stats
  const activeNodeId = progress.activeNodeId ?? null
  const weakDegrees = getWeakDegrees(degreeStats)
  const weakCadences = getWeakCadences(cadenceStats)
  const isBeginner = totalAttempts < BEGINNER_ATTEMPT_THRESHOLD || (averageScore ?? 0) < BEGINNER_SCORE_THRESHOLD
  const level = isBeginner ? 'beginner' : 'advanced'

  const daySeed = (() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    return Math.floor((now - start) / (24 * 60 * 60 * 1000))
  })()

  // Priorité 1 : conseil ciblant un point faible (degré ou cadence)
  if (weakDegrees.length > 0 || weakCadences.length > 0) {
    const matching = TAGGED_TIPS.filter((t) => tipMatchesWeakness(t, weakDegrees, weakCadences))
    if (matching.length > 0) {
      const chosen = pickDeterministic(matching, daySeed + (weakDegrees[0] || '').charCodeAt(0) + (weakCadences[0] || '').charCodeAt(0))
      const reason = weakDegrees.length
        ? `Tu hésites encore sur le degré ${weakDegrees[0]}.`
        : `Tu hésites encore sur la cadence.`
      return { text: chosen.text, reason }
    }
  }

  // Priorité 2 : conseil aligné sur l'étape du parcours
  if (activeNodeId) {
    const matching = TAGGED_TIPS.filter((t) => tipMatchesParcours(t, activeNodeId))
    if (matching.length > 0) {
      const chosen = pickDeterministic(matching, daySeed + activeNodeId.length)
      return { text: chosen.text, reason: 'Pour ton étape du parcours.' }
    }
  }

  // Priorité 3 : conseil adapté au niveau (beginner / advanced)
  const matchingByLevel = TAGGED_TIPS.filter((t) => t.level === level)
  if (matchingByLevel.length > 0) {
    const chosen = pickDeterministic(matchingByLevel, daySeed)
    return { text: chosen.text }
  }

  // Priorité 4 : fallback par jour
  return fallback
}
