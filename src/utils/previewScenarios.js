/**
 * Scénarios de preview pour les professeurs : simuler niveau, déblocage et XP d'un élève.
 * Utilisé en mode "Interface élève" pour tester différents états (débutant, intermédiaire, avancé).
 */
import { PARCOURS_NODE_ORDER } from '../data/parcoursTree'

const defaultNodeStat = (overrides = {}) => ({
  attempts: 0,
  successes: 0,
  consecutiveSuccesses: 0,
  averageScore: 0,
  masteryLevel: 'beginner',
  progressionMode: 'functions',
  unlocked: false,
  unlockedAt: null,
  lastAttemptAt: null,
  ...overrides
})

const masteredStat = () =>
  defaultNodeStat({
    attempts: 6,
    successes: 5,
    consecutiveSuccesses: 3,
    averageScore: 78,
    masteryLevel: 'intermediate',
    progressionMode: 'qcm',
    unlocked: true,
    unlockedAt: { toDate: () => new Date() },
    lastAttemptAt: { toDate: () => new Date() }
  })

const inProgressStat = (attempts = 2, consecutive = 1) =>
  defaultNodeStat({
    attempts,
    successes: 1,
    consecutiveSuccesses: consecutive,
    averageScore: 55,
    masteryLevel: 'beginner',
    progressionMode: 'functions',
    unlocked: true,
    unlockedAt: { toDate: () => new Date() },
    lastAttemptAt: { toDate: () => new Date() }
  })

function buildProgress(unlockedNodes, nodeStatsOverrides = {}) {
  const nodeStats = {}
  unlockedNodes.forEach((nodeId) => {
    nodeStats[nodeId] = nodeStatsOverrides[nodeId] ?? defaultNodeStat({
      unlocked: true,
      unlockedAt: { toDate: () => new Date() }
    })
  })
  return {
    userId: 'preview',
    unlockedNodes,
    nodeStats,
    updatedAt: { toDate: () => new Date() }
  }
}

/** Définition des scénarios : id, label, description, progression simulée, XP, streak */
export const PREVIEW_SCENARIOS = [
  {
    id: 'beginner',
    label: 'Débutant',
    description: 'Seul le nœud 1.1 est débloqué, 0 tentative',
    xp: 0,
    streak: 0,
    getProgress: () =>
      buildProgress(['1.1'], {
        '1.1': defaultNodeStat({ unlocked: true, unlockedAt: { toDate: () => new Date() } })
      })
  },
  {
    id: 'beginner_in_progress',
    label: '1.1 en cours',
    description: 'Quelques tentatives sur 1.1, pas encore maîtrisé',
    xp: 25,
    streak: 1,
    getProgress: () =>
      buildProgress(['1.1'], {
        '1.1': inProgressStat(3, 1)
      })
  },
  {
    id: 'stage1',
    label: 'Étape 1 maîtrisée',
    description: '1.1, cadences demi/parfaite, 1.2 débloqués',
    xp: 180,
    streak: 3,
    getProgress: () =>
      buildProgress(['1.1', 'cadence-demi', 'cadence-parfaite', '1.2'], {
        '1.1': masteredStat(),
        'cadence-demi': masteredStat(),
        'cadence-parfaite': masteredStat(),
        '1.2': defaultNodeStat({ unlocked: true, unlockedAt: { toDate: () => new Date() } })
      })
  },
  {
    id: 'stage2',
    label: 'Étape 2',
    description: 'Phase 2 (Densité dominante, Stabilité, Sixte-quarte, Cadence composée)',
    xp: 380,
    streak: 5,
    getProgress: () => {
      const nodes = PARCOURS_NODE_ORDER.slice(0, PARCOURS_NODE_ORDER.indexOf('revision-etage-2'))
      const stats = {}
      nodes.forEach((id, i) => {
        const isLast = i === nodes.length - 1
        stats[id] = isLast
          ? defaultNodeStat({ unlocked: true, unlockedAt: { toDate: () => new Date() } })
          : masteredStat()
      })
      return buildProgress(nodes, stats)
    }
  },
  {
    id: 'intermediate',
    label: 'Intermédiaire',
    description: 'Jusqu\'à l\'étage 3 (cadence rompue, vi)',
    xp: 580,
    streak: 7,
    getProgress: () => {
      const nodes = PARCOURS_NODE_ORDER.filter((id) =>
        ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6'].indexOf(id) === -1
      )
      const stats = {}
      nodes.forEach((id, i) => {
        const isLast = i === nodes.length - 1
        stats[id] = isLast
          ? defaultNodeStat({ unlocked: true, unlockedAt: { toDate: () => new Date() } })
          : masteredStat()
      })
      return buildProgress(nodes, stats)
    }
  },
  {
    id: 'advanced',
    label: 'Avancé',
    description: 'Tout le parcours débloqué et maîtrisé',
    xp: 850,
    streak: 14,
    getProgress: () => {
      const nodes = [...PARCOURS_NODE_ORDER]
      const stats = {}
      nodes.forEach((id) => {
        stats[id] = masteredStat()
      })
      return buildProgress(nodes, stats)
    }
  }
]

export function getPreviewProgress(scenarioId) {
  const scenario = PREVIEW_SCENARIOS.find((s) => s.id === scenarioId)
  return scenario ? scenario.getProgress() : null
}

export function getPreviewXP(scenarioId) {
  const scenario = PREVIEW_SCENARIOS.find((s) => s.id === scenarioId)
  return scenario != null ? scenario.xp : null
}

export function getPreviewStreak(scenarioId) {
  const scenario = PREVIEW_SCENARIOS.find((s) => s.id === scenarioId)
  return scenario != null ? scenario.streak : null
}
