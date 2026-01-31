import { 
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import { HORIZONS_STYLE_ORDER } from '../utils/tagGenerator'

function getLevelFromContext(context) {
  if (context?.xp == null) return 0
  return Math.floor(Number(context.xp) / 100) + 1
}

/**
 * Calcule la série (streak) quotidienne
 */
function calculateStreak(attempts) {
  if (!attempts || attempts.length === 0) return 0
  const daysWithActivity = new Set()
  attempts.forEach(attempt => {
    if (!attempt.completedAt) return
    const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    daysWithActivity.add(dateKey)
  })
  const sortedDates = Array.from(daysWithActivity).sort().reverse()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let streak = 0
  let currentDate = new Date(today)
  if (sortedDates.includes(todayKey)) {
    streak = 1
    currentDate.setDate(currentDate.getDate() - 1)
  } else {
    currentDate.setDate(currentDate.getDate() - 1)
  }
  while (true) {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
    if (sortedDates.includes(dateKey)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else break
  }
  return streak
}

function getAttemptsThisWeek(attempts) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return attempts.filter(a => {
    const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= weekAgo
  })
}

function countCorrectAnswers(attempts) {
  let total = 0
  attempts.forEach(attempt => {
    const userAnswers = attempt.userAnswers || []
    const correctAnswers = attempt.correctAnswers || []
    correctAnswers.forEach((correct, index) => {
      const userAnswer = userAnswers[index]
      if (!correct || !userAnswer) return
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        userAnswer.selectedFunction || userAnswer.function || null,
        {}
      )
      if ((validation?.level ?? 0) >= 1) total += 1
    })
  })
  return total
}

function countCorrectByDegree(attempts) {
  const byDegree = {}
  attempts.forEach(attempt => {
    const userAnswers = attempt.userAnswers || []
    const correctAnswers = attempt.correctAnswers || []
    correctAnswers.forEach((correct, index) => {
      const userAnswer = userAnswers[index]
      if (!correct || !userAnswer) return
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        userAnswer.selectedFunction || userAnswer.function || null,
        {}
      )
      if ((validation?.level ?? 0) >= 1) {
        const deg = (correct.degree || '').toUpperCase()
        if (deg) byDegree[deg] = (byDegree[deg] || 0) + 1
      }
    })
  })
  return byDegree
}

function countCorrectByCadence(attempts) {
  const byCadence = {}
  attempts.forEach(attempt => {
    const userAnswers = attempt.userAnswers || []
    const correctAnswers = attempt.correctAnswers || []
    correctAnswers.forEach((correct, index) => {
      if (!correct?.cadence) return
      const userAnswer = userAnswers[index]
      if (!userAnswer) return
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        userAnswer.selectedFunction || userAnswer.function || null,
        {}
      )
      if ((validation?.level ?? 0) >= 1) {
        const cad = String(correct.cadence || '')
        byCadence[cad] = (byCadence[cad] || 0) + 1
      }
    })
  })
  return byCadence
}

function countCorrectByFigure(attempts) {
  const byFigure = {}
  attempts.forEach(attempt => {
    const userAnswers = attempt.userAnswers || []
    const correctAnswers = attempt.correctAnswers || []
    correctAnswers.forEach((correct, index) => {
      const userAnswer = userAnswers[index]
      if (!correct || !userAnswer) return
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        userAnswer.selectedFunction || userAnswer.function || null,
        {}
      )
      if ((validation?.level ?? 0) >= 1) {
        const fig = (correct.figure && correct.figure !== '5') ? String(correct.figure) : 'fundamental'
        byFigure[fig] = (byFigure[fig] || 0) + 1
      }
    })
  })
  return byFigure
}

function countExercisesWithTag(attempts, tag) {
  return attempts.filter(a => Array.isArray(a.autoTags) && a.autoTags.includes(tag)).length
}

function countUniqueComposers(attempts) {
  return new Set(attempts.map(a => a.composer).filter(Boolean)).size
}

function countAttemptsWithDifficulty(attempts, difficulty) {
  return attempts.filter(a => (a.difficulty || '').toLowerCase() === String(difficulty).toLowerCase()).length
}

function countAttemptsWithParcours(attempts) {
  return attempts.filter(a => a.sourceNodeId != null && a.sourceNodeId !== '').length
}

/**
 * Définition de tous les badges disponibles
 */
export const BADGE_DEFINITIONS = {
  first_exercise: {
    id: 'first_exercise',
    name: 'Premier Pas',
    emoji: '🏆',
    description: 'Compléter le premier exercice',
    check: (attempts) => attempts.length >= 1
  },
  streak_3: {
    id: 'streak_3',
    name: 'Série de 3',
    emoji: '🔥',
    description: '3 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 3
  },
  streak_7: {
    id: 'streak_7',
    name: 'Série de 7',
    emoji: '🕯️',
    description: '7 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 7
  },
  streak_30: {
    id: 'streak_30',
    name: 'Série de 30',
    emoji: '🏅',
    description: '30 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 30
  },
  perfect_score: {
    id: 'perfect_score',
    name: 'Score Parfait',
    emoji: '⭐',
    description: 'Obtenir 100% sur un exercice',
    check: (attempts) => attempts.some(a => a.score === 100),
    unlocks: { type: 'challenge', label: 'Défi précision' }
  },
  exercises_10: {
    id: 'exercises_10',
    name: '10 Exercices',
    emoji: '📚',
    description: 'Compléter 10 exercices',
    check: (attempts) => attempts.length >= 10
  },
  exercises_50: {
    id: 'exercises_50',
    name: '50 Exercices',
    emoji: '📖',
    description: 'Compléter 50 exercices',
    check: (attempts) => attempts.length >= 50
  },
  exercises_100: {
    id: 'exercises_100',
    name: '100 Exercices',
    emoji: '📕',
    description: 'Compléter 100 exercices',
    check: (attempts) => attempts.length >= 100
  },
  improving: {
    id: 'improving',
    name: 'En Progression',
    emoji: '📈',
    description: 'Améliorer son score moyen de 10%',
    check: (attempts) => {
      if (attempts.length < 5) return false
      const recent = attempts.slice(0, 5)
      const older = attempts.slice(5, 10)
      if (older.length === 0) return false
      const recentAvg = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length
      const olderAvg = older.reduce((sum, a) => sum + (a.score || 0), 0) / older.length
      return recentAvg >= olderAvg + 10
    }
  },
  regular_5: {
    id: 'regular_5',
    name: 'Régulier',
    emoji: '🎯',
    description: 'Compléter 5 exercices en une semaine',
    check: (attempts) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const thisWeek = attempts.filter(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        return date >= weekAgo
      })
      return thisWeek.length >= 5
    }
  },
  determined_10: {
    id: 'determined_10',
    name: 'Déterminé',
    emoji: '💪',
    description: 'Compléter 10 exercices en une semaine',
    check: (attempts) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const thisWeek = attempts.filter(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        return date >= weekAgo
      })
      return thisWeek.length >= 10
    }
  },
  level_5: {
    id: 'level_5',
    name: 'En route',
    emoji: '🔆',
    description: 'Atteindre le niveau 5',
    check: (attempts, context) => getLevelFromContext(context) >= 5
  },
  level_10: {
    id: 'level_10',
    name: 'Dix étoiles',
    emoji: '🌟',
    description: 'Atteindre le niveau 10',
    check: (attempts, context) => getLevelFromContext(context) >= 10
  },
  level_25: {
    id: 'level_25',
    name: 'Assidu',
    emoji: '📗',
    description: 'Atteindre le niveau 25',
    check: (attempts, context) => getLevelFromContext(context) >= 25,
    unlocks: { type: 'profileTitle', value: 'Reconnu : niveau Assidu' }
  },
  level_50: {
    id: 'level_50',
    name: 'Expert en herbe',
    emoji: '💎',
    description: 'Atteindre le niveau 50',
    check: (attempts, context) => getLevelFromContext(context) >= 50
  },
  level_100: {
    id: 'level_100',
    name: 'Maître',
    emoji: '👑',
    description: 'Atteindre le niveau 100',
    check: (attempts, context) => getLevelFromContext(context) >= 100,
    unlocks: { type: 'profileTitle', value: 'Maître de l\'analyse' }
  },
  // Badges métier (analyse harmonique)
  score_90_5: {
    id: 'score_90_5',
    name: 'Excellence',
    emoji: '💫',
    description: 'Obtenir au moins 90 % sur 5 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 90).length >= 5,
    unlocks: { type: 'profileTitle', value: 'Analyste en progression' }
  },
  variety_5_week: {
    id: 'variety_5_week',
    name: 'Éclectique',
    emoji: '🎵',
    description: '5 exercices différents en une semaine',
    check: (attempts) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const thisWeek = attempts.filter(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        return date >= weekAgo
      })
      const uniqueIds = new Set(thisWeek.map(a => a.exerciseId).filter(Boolean))
      return uniqueIds.size >= 5
    }
  },

  // --- Volume (5, 25, 200, 500 ; 1 = first_exercise) ---
  exercises_5: {
    id: 'exercises_5',
    name: '5 Exercices',
    emoji: '📘',
    description: 'Compléter 5 exercices',
    check: (attempts) => attempts.length >= 5
  },
  exercises_25: {
    id: 'exercises_25',
    name: '25 Exercices',
    emoji: '📙',
    description: 'Compléter 25 exercices',
    check: (attempts) => attempts.length >= 25
  },
  exercises_200: {
    id: 'exercises_200',
    name: '200 Exercices',
    emoji: '📓',
    description: 'Compléter 200 exercices',
    check: (attempts) => attempts.length >= 200
  },
  exercises_500: {
    id: 'exercises_500',
    name: '500 Exercices',
    emoji: '📔',
    description: 'Compléter 500 exercices',
    check: (attempts) => attempts.length >= 500
  },

  // --- Streak (1, 5, 14, 21, 60, 100) ---
  streak_1: {
    id: 'streak_1',
    name: 'Un jour',
    emoji: '🌱',
    description: '1 jour consécutif d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 1
  },
  streak_5: {
    id: 'streak_5',
    name: 'Série de 5',
    emoji: '🍀',
    description: '5 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 5
  },
  streak_14: {
    id: 'streak_14',
    name: 'Deux semaines',
    emoji: '🌿',
    description: '14 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 14
  },
  streak_21: {
    id: 'streak_21',
    name: 'Trois semaines',
    emoji: '🌳',
    description: '21 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 21
  },
  streak_60: {
    id: 'streak_60',
    name: '60 Jours',
    emoji: '🌲',
    description: '60 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 60
  },
  streak_100: {
    id: 'streak_100',
    name: '100 Jours',
    emoji: '🥇',
    description: '100 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 100
  },

  // --- Niveau XP (15, 20, 30, 40, 75) ---
  level_15: {
    id: 'level_15',
    name: 'Niveau 15',
    emoji: '🥈',
    description: 'Atteindre le niveau 15',
    check: (attempts, context) => getLevelFromContext(context) >= 15
  },
  level_20: {
    id: 'level_20',
    name: 'Niveau 20',
    emoji: '🥉',
    description: 'Atteindre le niveau 20',
    check: (attempts, context) => getLevelFromContext(context) >= 20
  },
  level_30: {
    id: 'level_30',
    name: 'Niveau 30',
    emoji: '🎖️',
    description: 'Atteindre le niveau 30',
    check: (attempts, context) => getLevelFromContext(context) >= 30
  },
  level_40: {
    id: 'level_40',
    name: 'Niveau 40',
    emoji: '🏵️',
    description: 'Atteindre le niveau 40',
    check: (attempts, context) => getLevelFromContext(context) >= 40
  },
  level_75: {
    id: 'level_75',
    name: 'Niveau 75',
    emoji: '💠',
    description: 'Atteindre le niveau 75',
    check: (attempts, context) => getLevelFromContext(context) >= 75
  },

  // --- Score (≥90% sur 3, 10, 25 ; ≥80% sur 5, 10, 20 ; moyenne ≥70% sur 10) ---
  score_90_3: {
    id: 'score_90_3',
    name: '90 % x 3',
    emoji: '🔶',
    description: 'Obtenir au moins 90 % sur 3 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 90).length >= 3
  },
  score_90_10: {
    id: 'score_90_10',
    name: 'Excellence x 10',
    emoji: '🎁',
    description: 'Obtenir au moins 90 % sur 10 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 90).length >= 10
  },
  score_90_25: {
    id: 'score_90_25',
    name: 'Excellence x 25',
    emoji: '🎉',
    description: 'Obtenir au moins 90 % sur 25 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 90).length >= 25
  },
  score_80_5: {
    id: 'score_80_5',
    name: '80 % x 5',
    emoji: '📊',
    description: 'Obtenir au moins 80 % sur 5 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 80).length >= 5
  },
  score_80_10: {
    id: 'score_80_10',
    name: '80 % x 10',
    emoji: '📉',
    description: 'Obtenir au moins 80 % sur 10 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 80).length >= 10
  },
  score_80_20: {
    id: 'score_80_20',
    name: '80 % x 20',
    emoji: '📐',
    description: 'Obtenir au moins 80 % sur 20 exercices',
    check: (attempts) => attempts.filter(a => (a.score || 0) >= 80).length >= 20
  },
  score_avg_70_10: {
    id: 'score_avg_70_10',
    name: 'Moyenne 70 %',
    emoji: '🧭',
    description: 'Score moyen ≥ 70 % sur les 10 derniers exercices',
    check: (attempts) => {
      const last10 = attempts.slice(0, 10)
      if (last10.length < 10) return false
      const avg = last10.reduce((s, a) => s + (a.score || 0), 0) / 10
      return avg >= 70
    }
  },

  // --- Hebdo (3, 15, 20 exercices ; 3, 10 exercices différents) ---
  week_3: {
    id: 'week_3',
    name: '3 cette semaine',
    emoji: '🎪',
    description: 'Compléter 3 exercices en une semaine',
    check: (attempts) => getAttemptsThisWeek(attempts).length >= 3
  },
  week_15: {
    id: 'week_15',
    name: '15 cette semaine',
    emoji: '🦾',
    description: 'Compléter 15 exercices en une semaine',
    check: (attempts) => getAttemptsThisWeek(attempts).length >= 15
  },
  week_20: {
    id: 'week_20',
    name: '20 cette semaine',
    emoji: '🏋️',
    description: 'Compléter 20 exercices en une semaine',
    check: (attempts) => getAttemptsThisWeek(attempts).length >= 20
  },
  variety_3_week: {
    id: 'variety_3_week',
    name: '3 exercices différents',
    emoji: '🎶',
    description: '3 exercices différents en une semaine',
    check: (attempts) => getUniqueExerciseIdsThisWeek(attempts).size >= 3
  },
  variety_10_week: {
    id: 'variety_10_week',
    name: '10 exercices différents',
    emoji: '🥁',
    description: '10 exercices différents en une semaine',
    check: (attempts) => getUniqueExerciseIdsThisWeek(attempts).size >= 10
  },

  // --- Progression (amélioration 5 %, 15 %, 20 % ; 3 consécutifs ≥80 %) ---
  improving_5: {
    id: 'improving_5',
    name: 'En progrès',
    emoji: '🔺',
    description: 'Améliorer son score moyen de 5 % (5 derniers vs 5 précédents)',
    check: (attempts) => {
      if (attempts.length < 10) return false
      const recent = attempts.slice(0, 5)
      const older = attempts.slice(5, 10)
      const recentAvg = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length
      const olderAvg = older.reduce((sum, a) => sum + (a.score || 0), 0) / older.length
      return recentAvg >= olderAvg + 5
    }
  },
  improving_15: {
    id: 'improving_15',
    name: 'Belle progression',
    emoji: '🔻',
    description: 'Améliorer son score moyen de 15 %',
    check: (attempts) => {
      if (attempts.length < 10) return false
      const recent = attempts.slice(0, 5)
      const older = attempts.slice(5, 10)
      const recentAvg = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length
      const olderAvg = older.reduce((sum, a) => sum + (a.score || 0), 0) / older.length
      return recentAvg >= olderAvg + 15
    }
  },
  improving_20: {
    id: 'improving_20',
    name: 'Progression majeure',
    emoji: '🔷',
    description: 'Améliorer son score moyen de 20 %',
    check: (attempts) => {
      if (attempts.length < 10) return false
      const recent = attempts.slice(0, 5)
      const older = attempts.slice(5, 10)
      const recentAvg = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length
      const olderAvg = older.reduce((sum, a) => sum + (a.score || 0), 0) / older.length
      return recentAvg >= olderAvg + 20
    }
  },
  consecutive_80_3: {
    id: 'consecutive_80_3',
    name: '3 x 80 % d\'affilée',
    emoji: '🎫',
    description: '3 exercices consécutifs à au moins 80 %',
    check: (attempts) => {
      if (attempts.length < 3) return false
      for (let i = 0; i <= attempts.length - 3; i++) {
        if (attempts[i].score >= 80 && attempts[i + 1].score >= 80 && attempts[i + 2].score >= 80) return true
      }
      return false
    }
  },

  // --- Régularité & divers ---
  daily_5: {
    id: 'daily_5',
    name: '5 jours d\'affilée',
    emoji: '📅',
    description: 'Au moins 1 exercice par jour pendant 5 jours',
    check: (attempts) => calculateStreak(attempts) >= 5
  },
  first_of_month: {
    id: 'first_of_month',
    name: 'Premier du mois',
    emoji: '📆',
    description: 'Compléter un exercice le 1er jour du mois',
    check: (attempts) => attempts.some(a => {
      const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
      return date.getDate() === 1
    })
  },
  weekend_2: {
    id: 'weekend_2',
    name: 'Week-end studieux',
    emoji: '🗓️',
    description: 'Compléter 2 exercices un week-end',
    check: (attempts) => {
      const weekendAttempts = attempts.filter(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        const day = date.getDay()
        return day === 0 || day === 6
      })
      const byDay = {}
      weekendAttempts.forEach(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        byDay[key] = (byDay[key] || 0) + 1
      })
      const weekendDays = Object.keys(byDay).filter((_, i, arr) => arr.length >= 1)
      return weekendAttempts.length >= 2
    }
  },
  early_bird: {
    id: 'early_bird',
    name: 'Lève-tôt',
    emoji: '🌅',
    description: 'Compléter un premier exercice avant 10 h',
    check: (attempts) => attempts.some(a => {
      const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
      return date.getHours() < 10
    })
  },
  night_owl: {
    id: 'night_owl',
    name: 'Couche-tard',
    emoji: '🌙',
    description: 'Compléter un exercice après 20 h',
    check: (attempts) => attempts.some(a => {
      const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
      return date.getHours() >= 20
    })
  },
  day_5: {
    id: 'day_5',
    name: '5 en un jour',
    emoji: '⚡',
    description: 'Compléter 5 exercices en une même journée',
    check: (attempts) => {
      const byDay = {}
      attempts.forEach(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        byDay[key] = (byDay[key] || 0) + 1
      })
      return Object.values(byDay).some(n => n >= 5)
    }
  },
  day_10: {
    id: 'day_10',
    name: '10 en un jour',
    emoji: '🔋',
    description: 'Compléter 10 exercices en une même journée',
    check: (attempts) => {
      const byDay = {}
      attempts.forEach(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        byDay[key] = (byDay[key] || 0) + 1
      })
      return Object.values(byDay).some(n => n >= 10)
    }
  },
  total_correct_100: {
    id: 'total_correct_100',
    name: '100 réponses correctes',
    emoji: '✅',
    description: 'Cumuler 100 réponses correctes',
    check: (attempts) => countCorrectAnswers(attempts) >= 100
  },
  total_correct_500: {
    id: 'total_correct_500',
    name: '500 réponses correctes',
    emoji: '✔️',
    description: 'Cumuler 500 réponses correctes',
    check: (attempts) => countCorrectAnswers(attempts) >= 500
  },
  total_correct_1000: {
    id: 'total_correct_1000',
    name: '1000 réponses correctes',
    emoji: '☑️',
    description: 'Cumuler 1000 réponses correctes',
    check: (attempts) => countCorrectAnswers(attempts) >= 1000
  },

  // --- Contenu musical : degrés ---
  degree_I_10: {
    id: 'degree_I_10',
    name: 'Tonique I',
    emoji: '🎹',
    description: '10 réponses correctes sur le degré I',
    check: (attempts) => (countCorrectByDegree(attempts).I || 0) >= 10
  },
  degree_I_20: {
    id: 'degree_I_20',
    name: 'Maîtrise du I',
    emoji: '🎸',
    description: '20 réponses correctes sur le degré I',
    check: (attempts) => (countCorrectByDegree(attempts).I || 0) >= 20
  },
  degree_II_5: {
    id: 'degree_II_5',
    name: 'Sous-dominante II',
    emoji: '🎺',
    description: '5 réponses correctes sur le degré II',
    check: (attempts) => (countCorrectByDegree(attempts).II || 0) >= 5
  },
  degree_III_5: {
    id: 'degree_III_5',
    name: 'Degré III',
    emoji: '🎷',
    description: '5 réponses correctes sur le degré III',
    check: (attempts) => (countCorrectByDegree(attempts).III || 0) >= 5
  },
  degree_IV_10: {
    id: 'degree_IV_10',
    name: 'Sous-dominante IV',
    emoji: '🪗',
    description: '10 réponses correctes sur le degré IV',
    check: (attempts) => (countCorrectByDegree(attempts).IV || 0) >= 10
  },
  degree_V_10: {
    id: 'degree_V_10',
    name: 'Dominante V',
    emoji: '🎻',
    description: '10 réponses correctes sur le degré V',
    check: (attempts) => (countCorrectByDegree(attempts).V || 0) >= 10
  },
  degree_V_20: {
    id: 'degree_V_20',
    name: 'Maîtrise du V',
    emoji: '🎼',
    description: '20 réponses correctes sur le degré V',
    check: (attempts) => (countCorrectByDegree(attempts).V || 0) >= 20
  },
  degree_VI_5: {
    id: 'degree_VI_5',
    name: 'Degré VI',
    emoji: '🎤',
    description: '5 réponses correctes sur le degré VI',
    check: (attempts) => (countCorrectByDegree(attempts).VI || 0) >= 5
  },
  degree_VII_5: {
    id: 'degree_VII_5',
    name: 'Degré VII',
    emoji: '🎧',
    description: '5 réponses correctes sur le degré VII',
    check: (attempts) => (countCorrectByDegree(attempts).VII || 0) >= 5
  },
  degree_I_V_10: {
    id: 'degree_I_V_10',
    name: 'Tonique et dominante',
    emoji: '🎜',
    description: '10 réponses correctes sur I et 10 sur V',
    check: (attempts) => {
      const by = countCorrectByDegree(attempts)
      return (by.I || 0) >= 10 && (by.V || 0) >= 10
    }
  },

  // --- Contenu musical : cadences ---
  cadence_parfaite_5: {
    id: 'cadence_parfaite_5',
    name: 'Cadence parfaite x 5',
    emoji: '♪',
    description: '5 réponses correctes en cadence parfaite',
    check: (attempts) => {
      const by = countCorrectByCadence(attempts)
      const key = Object.keys(by).find(k => /parfait|perfect/i.test(k))
      return key ? (by[key] || 0) >= 5 : false
    }
  },
  cadence_parfaite_10: {
    id: 'cadence_parfaite_10',
    name: 'Cadence parfaite x 10',
    emoji: '♫',
    description: '10 réponses correctes en cadence parfaite',
    check: (attempts) => {
      const by = countCorrectByCadence(attempts)
      const key = Object.keys(by).find(k => /parfait|perfect/i.test(k))
      return key ? (by[key] || 0) >= 10 : false
    }
  },
  cadence_parfaite_20: {
    id: 'cadence_parfaite_20',
    name: 'Maîtrise cadence parfaite',
    emoji: '𝄢',
    description: '20 réponses correctes en cadence parfaite',
    check: (attempts) => {
      const by = countCorrectByCadence(attempts)
      const key = Object.keys(by).find(k => /parfait|perfect/i.test(k))
      return key ? (by[key] || 0) >= 20 : false
    }
  },
  cadence_demi_5: {
    id: 'cadence_demi_5',
    name: 'Demi-cadence',
    emoji: '𝄞',
    description: '5 réponses correctes en demi-cadence',
    check: (attempts) => {
      const by = countCorrectByCadence(attempts)
      const key = Object.keys(by).find(k => /demi|half/i.test(k))
      return key ? (by[key] || 0) >= 5 : false
    }
  },
  cadence_plagale_5: {
    id: 'cadence_plagale_5',
    name: 'Cadence plagale',
    emoji: '𝄡',
    description: '5 réponses correctes en cadence plagale',
    check: (attempts) => {
      const by = countCorrectByCadence(attempts)
      const key = Object.keys(by).find(k => /plagal|plagale/i.test(k))
      return key ? (by[key] || 0) >= 5 : false
    }
  },
  cadence_64_3: {
    id: 'cadence_64_3',
    name: 'Cadence 6/4',
    emoji: '🎙️',
    description: '3 réponses correctes en cadence 6/4',
    check: (attempts) => {
      const by = countCorrectByCadence(attempts)
      const key = Object.keys(by).find(k => /64|6\/4/i.test(k))
      return key ? (by[key] || 0) >= 3 : false
    }
  },

  // --- Contenu musical : renversements / figures ---
  figure_fundamental_10: {
    id: 'figure_fundamental_10',
    name: 'Position fondamentale',
    emoji: '⌨️',
    description: '10 réponses correctes en position fondamentale',
    check: (attempts) => (countCorrectByFigure(attempts).fundamental || 0) >= 10
  },
  figure_first_inv_5: {
    id: 'figure_first_inv_5',
    name: 'Premier renversement',
    emoji: '🎛️',
    description: '5 réponses correctes au premier renversement',
    check: (attempts) => {
      const by = countCorrectByFigure(attempts)
      const nonFund = Object.entries(by).reduce((s, [k, v]) => (k === 'fundamental' ? s : s + v), 0)
      return nonFund >= 5
    }
  },

  // --- Pastilles (tags) ---
  tag_cadence_parfaite_5: {
    id: 'tag_cadence_parfaite_5',
    name: '5 exercices Cadence parfaite',
    emoji: '🏷️',
    description: '5 exercices avec la pastille Cadence parfaite',
    check: (attempts) => countExercisesWithTag(attempts, 'CadenceParfaite') >= 5
  },
  tag_baroque_3: {
    id: 'tag_baroque_3',
    name: 'Baroque',
    emoji: '🔖',
    description: '3 exercices avec la pastille Baroque',
    check: (attempts) => countExercisesWithTag(attempts, 'Baroque') >= 3
  },
  tag_septieme_5: {
    id: 'tag_septieme_5',
    name: 'Accords de septième',
    emoji: '📌',
    description: '5 exercices avec la pastille Septième',
    check: (attempts) => countExercisesWithTag(attempts, 'Septieme') >= 5
  },
  tag_renversement_5: {
    id: 'tag_renversement_5',
    name: 'Renversements',
    emoji: '📍',
    description: '5 exercices avec la pastille Renversement',
    check: (attempts) => countExercisesWithTag(attempts, 'Renversement') >= 5 || countExercisesWithTag(attempts, 'PremierRenversement') >= 5
  },

  // --- Filtres : compositeur, difficulté ---
  composers_3: {
    id: 'composers_3',
    name: '3 compositeurs',
    emoji: '🔔',
    description: 'Pratiquer 3 compositeurs différents',
    check: (attempts) => countUniqueComposers(attempts) >= 3
  },
  composers_5: {
    id: 'composers_5',
    name: '5 compositeurs',
    emoji: '🪕',
    description: 'Pratiquer 5 compositeurs différents',
    check: (attempts) => countUniqueComposers(attempts) >= 5
  },
  difficulty_debutant_5: {
    id: 'difficulty_debutant_5',
    name: '5 exercices débutant',
    emoji: '🌻',
    description: '5 exercices en difficulté débutant',
    check: (attempts) => countAttemptsWithDifficulty(attempts, 'débutant') >= 5
  },
  difficulty_intermediate_10: {
    id: 'difficulty_intermediate_10',
    name: '10 exercices intermédiaire',
    emoji: '📘',
    description: '10 exercices en difficulté intermédiaire',
    check: (attempts) => countAttemptsWithDifficulty(attempts, 'intermédiaire') >= 10
  },
  difficulty_avance_5: {
    id: 'difficulty_avance_5',
    name: '5 exercices avancé',
    emoji: '📕',
    description: '5 exercices en difficulté avancé',
    check: (attempts) => countAttemptsWithDifficulty(attempts, 'avancé') >= 5
  },

  // --- Parcours ---
  parcours_5: {
    id: 'parcours_5',
    name: '5 en parcours',
    emoji: '🛤️',
    description: 'Compléter 5 exercices en mode parcours',
    check: (attempts) => countAttemptsWithParcours(attempts) >= 5
  },
  parcours_10: {
    id: 'parcours_10',
    name: '10 en parcours',
    emoji: '🗺️',
    description: 'Compléter 10 exercices en mode parcours',
    check: (attempts) => countAttemptsWithParcours(attempts) >= 10
  },
  parcours_15: {
    id: 'parcours_15',
    name: '15 en parcours',
    emoji: '🧩',
    description: 'Compléter 15 exercices en mode parcours',
    check: (attempts) => countAttemptsWithParcours(attempts) >= 15
  },
  week_10: {
    id: 'week_10',
    name: '10 cette semaine',
    emoji: '🏹',
    description: 'Compléter 10 exercices en une semaine',
    check: (attempts) => getAttemptsThisWeek(attempts).length >= 10
  },
  improving_25: {
    id: 'improving_25',
    name: 'Progression exceptionnelle',
    emoji: '🔸',
    description: 'Améliorer son score moyen de 25 %',
    check: (attempts) => {
      if (attempts.length < 10) return false
      const recent = attempts.slice(0, 5)
      const older = attempts.slice(5, 10)
      const recentAvg = recent.reduce((sum, a) => sum + (a.score || 0), 0) / recent.length
      const olderAvg = older.reduce((sum, a) => sum + (a.score || 0), 0) / older.length
      return recentAvg >= olderAvg + 25
    }
  },
  day_3: {
    id: 'day_3',
    name: '3 en un jour',
    emoji: '🔌',
    description: 'Compléter 3 exercices en une même journée',
    check: (attempts) => {
      const byDay = {}
      attempts.forEach(a => {
        const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        byDay[key] = (byDay[key] || 0) + 1
      })
      return Object.values(byDay).some(n => n >= 3)
    }
  },
  total_correct_200: {
    id: 'total_correct_200',
    name: '200 réponses correctes',
    emoji: '🌐',
    description: 'Cumuler 200 réponses correctes',
    check: (attempts) => countCorrectAnswers(attempts) >= 200
  },
  degree_II_10: {
    id: 'degree_II_10',
    name: 'Degré II x 10',
    emoji: '🎲',
    description: '10 réponses correctes sur le degré II',
    check: (attempts) => (countCorrectByDegree(attempts).II || 0) >= 10
  },
  degree_III_10: {
    id: 'degree_III_10',
    name: 'Degré III x 10',
    emoji: '🎋',
    description: '10 réponses correctes sur le degré III',
    check: (attempts) => (countCorrectByDegree(attempts).III || 0) >= 10
  },
  degree_VI_10: {
    id: 'degree_VI_10',
    name: 'Degré VI x 10',
    emoji: '🎬',
    description: '10 réponses correctes sur le degré VI',
    check: (attempts) => (countCorrectByDegree(attempts).VI || 0) >= 10
  },
  degree_VII_10: {
    id: 'degree_VII_10',
    name: 'Degré VII x 10',
    emoji: '🎞️',
    description: '10 réponses correctes sur le degré VII',
    check: (attempts) => (countCorrectByDegree(attempts).VII || 0) >= 10
  },
  composers_7: {
    id: 'composers_7',
    name: '7 compositeurs',
    emoji: '🪘',
    description: 'Pratiquer 7 compositeurs différents',
    check: (attempts) => countUniqueComposers(attempts) >= 7
  },
  difficulty_debutant_10: {
    id: 'difficulty_debutant_10',
    name: '10 exercices débutant',
    emoji: '📒',
    description: '10 exercices en difficulté débutant',
    check: (attempts) => countAttemptsWithDifficulty(attempts, 'débutant') >= 10
  },
  tag_classique_3: {
    id: 'tag_classique_3',
    name: 'Classique',
    emoji: '🎭',
    description: '3 exercices avec la pastille Classique',
    check: (attempts) => countExercisesWithTag(attempts, 'Classique') >= 3
  },
  tag_romantique_3: {
    id: 'tag_romantique_3',
    name: 'Romantique',
    emoji: '🎨',
    description: '3 exercices avec la pastille Romantique',
    check: (attempts) => countExercisesWithTag(attempts, 'Romantique') >= 3
  },
  figure_fundamental_20: {
    id: 'figure_fundamental_20',
    name: 'Fondamental x 20',
    emoji: '🖼️',
    description: '20 réponses correctes en position fondamentale',
    check: (attempts) => (countCorrectByFigure(attempts).fundamental || 0) >= 20
  },

  // --- Nouveaux Horizons : déblocage d'un style (un badge par style) ---
  horizons_unlock_film: {
    id: 'horizons_unlock_film',
    name: 'Horizons : Film',
    emoji: '🎬',
    description: 'Débloquer le style Musique de film dans Nouveaux Horizons',
    check: (attempts, context) => getUnlockedHorizonsStyles(attempts || [], { xp: context?.xp }).includes('film'),
    unlocks: { type: 'horizons', label: 'Nouveaux Horizons' },
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_unlock_game: {
    id: 'horizons_unlock_game',
    name: 'Horizons : Jeu vidéo',
    emoji: '🎮',
    description: 'Débloquer le style Jeu vidéo dans Nouveaux Horizons',
    check: (attempts, context) => getUnlockedHorizonsStyles(attempts || [], { xp: context?.xp }).includes('game'),
    unlocks: { type: 'horizons', label: 'Nouveaux Horizons' },
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_unlock_anime: {
    id: 'horizons_unlock_anime',
    name: 'Horizons : Anime',
    emoji: '🌸',
    description: 'Débloquer le style Anime dans Nouveaux Horizons',
    check: (attempts, context) => getUnlockedHorizonsStyles(attempts || [], { xp: context?.xp }).includes('anime'),
    unlocks: { type: 'horizons', label: 'Nouveaux Horizons' },
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_unlock_variety: {
    id: 'horizons_unlock_variety',
    name: 'Horizons : Variété',
    emoji: '🎤',
    description: 'Débloquer le style Variété dans Nouveaux Horizons',
    check: (attempts, context) => getUnlockedHorizonsStyles(attempts || [], { xp: context?.xp }).includes('variety'),
    unlocks: { type: 'horizons', label: 'Nouveaux Horizons' },
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_unlock_pop: {
    id: 'horizons_unlock_pop',
    name: 'Horizons : Pop',
    emoji: '🎧',
    description: 'Débloquer le style Pop dans Nouveaux Horizons',
    check: (attempts, context) => getUnlockedHorizonsStyles(attempts || [], { xp: context?.xp }).includes('pop'),
    unlocks: { type: 'horizons', label: 'Nouveaux Horizons' },
    hiddenUntilHorizonsUnlocked: true
  },

  // --- Nouveaux Horizons : paliers par style (5, 10, 25, 50 exercices par style) ---
  horizons_film_5: {
    id: 'horizons_film_5',
    name: 'Film x 5',
    emoji: '🎬',
    description: '5 exercices Nouveaux Horizons en musique de film',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'film').length) >= 5,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_film_10: {
    id: 'horizons_film_10',
    name: 'Film x 10',
    emoji: '🎬',
    description: '10 exercices Nouveaux Horizons en musique de film',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'film').length) >= 10,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_film_25: {
    id: 'horizons_film_25',
    name: 'Film x 25',
    emoji: '🎬',
    description: '25 exercices Nouveaux Horizons en musique de film',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'film').length) >= 25,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_film_50: {
    id: 'horizons_film_50',
    name: 'Film x 50',
    emoji: '🎬',
    description: '50 exercices Nouveaux Horizons en musique de film',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'film').length) >= 50,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_game_5: {
    id: 'horizons_game_5',
    name: 'Jeu vidéo x 5',
    emoji: '🎮',
    description: '5 exercices Nouveaux Horizons en jeu vidéo',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'game').length) >= 5,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_game_10: {
    id: 'horizons_game_10',
    name: 'Jeu vidéo x 10',
    emoji: '🎮',
    description: '10 exercices Nouveaux Horizons en jeu vidéo',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'game').length) >= 10,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_game_25: {
    id: 'horizons_game_25',
    name: 'Jeu vidéo x 25',
    emoji: '🎮',
    description: '25 exercices Nouveaux Horizons en jeu vidéo',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'game').length) >= 25,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_game_50: {
    id: 'horizons_game_50',
    name: 'Jeu vidéo x 50',
    emoji: '🎮',
    description: '50 exercices Nouveaux Horizons en jeu vidéo',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'game').length) >= 50,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_anime_5: {
    id: 'horizons_anime_5',
    name: 'Anime x 5',
    emoji: '🌸',
    description: '5 exercices Nouveaux Horizons en anime',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'anime').length) >= 5,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_anime_10: {
    id: 'horizons_anime_10',
    name: 'Anime x 10',
    emoji: '🌸',
    description: '10 exercices Nouveaux Horizons en anime',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'anime').length) >= 10,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_anime_25: {
    id: 'horizons_anime_25',
    name: 'Anime x 25',
    emoji: '🌸',
    description: '25 exercices Nouveaux Horizons en anime',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'anime').length) >= 25,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_anime_50: {
    id: 'horizons_anime_50',
    name: 'Anime x 50',
    emoji: '🌸',
    description: '50 exercices Nouveaux Horizons en anime',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'anime').length) >= 50,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_variety_5: {
    id: 'horizons_variety_5',
    name: 'Variété x 5',
    emoji: '🎤',
    description: '5 exercices Nouveaux Horizons en variété',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'variety').length) >= 5,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_variety_10: {
    id: 'horizons_variety_10',
    name: 'Variété x 10',
    emoji: '🎤',
    description: '10 exercices Nouveaux Horizons en variété',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'variety').length) >= 10,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_variety_25: {
    id: 'horizons_variety_25',
    name: 'Variété x 25',
    emoji: '🎤',
    description: '25 exercices Nouveaux Horizons en variété',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'variety').length) >= 25,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_variety_50: {
    id: 'horizons_variety_50',
    name: 'Variété x 50',
    emoji: '🎤',
    description: '50 exercices Nouveaux Horizons en variété',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'variety').length) >= 50,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_pop_5: {
    id: 'horizons_pop_5',
    name: 'Pop x 5',
    emoji: '🎧',
    description: '5 exercices Nouveaux Horizons en pop',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'pop').length) >= 5,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_pop_10: {
    id: 'horizons_pop_10',
    name: 'Pop x 10',
    emoji: '🎧',
    description: '10 exercices Nouveaux Horizons en pop',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'pop').length) >= 10,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_pop_25: {
    id: 'horizons_pop_25',
    name: 'Pop x 25',
    emoji: '🎧',
    description: '25 exercices Nouveaux Horizons en pop',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'pop').length) >= 25,
    hiddenUntilHorizonsUnlocked: true
  },
  horizons_pop_50: {
    id: 'horizons_pop_50',
    name: 'Pop x 50',
    emoji: '🎧',
    description: '50 exercices Nouveaux Horizons en pop',
    check: (attempts) => (getHorizonsAttempts(attempts).filter(a => a.musicCategory === 'pop').length) >= 50,
    hiddenUntilHorizonsUnlocked: true
  }
}

/**
 * Badges à étapes : un seul badge par thème avec paliers (ex. 5 → 10 → 25 → 50)
 * Chaque ancien badgeId (exercises_5, streak_3, etc.) est mappé vers un stagedId + stageValue.
 */
export const STAGED_BADGE_DEFINITIONS = {
  staged_exercises: {
    id: 'staged_exercises',
    name: 'Exercices complétés',
    emoji: '📚',
    description: 'Compléter des exercices (paliers : 5, 10, 25, 50, 100, 200, 500)',
    stages: [5, 10, 25, 50, 100, 200, 500],
    legacyIdPrefix: 'exercises_',
    getProgress: (attempts) => (attempts || []).length
  },
  staged_streak: {
    id: 'staged_streak',
    name: 'Série de jours',
    emoji: '🔥',
    description: 'Jours consécutifs d\'entraînement (paliers : 1, 3, 5, 7, 14, 21, 30, 60, 100)',
    stages: [1, 3, 5, 7, 14, 21, 30, 60, 100],
    legacyIdPrefix: 'streak_',
    getProgress: (attempts) => calculateStreak(attempts || [])
  },
  staged_level: {
    id: 'staged_level',
    name: 'Niveau',
    emoji: '🌟',
    description: 'Atteindre des niveaux XP (paliers : 5, 10, 15, 20, 25, 30, 40, 50, 75, 100)',
    stages: [5, 10, 15, 20, 25, 30, 40, 50, 75, 100],
    legacyIdPrefix: 'level_',
    getProgress: (attempts, context) => getLevelFromContext(context || {})
  }
}

/** Mapping ancien badgeId (Firebase) → { stagedId, stageValue } pour rétrocompatibilité */
const LEGACY_BADGE_TO_STAGED = {}
Object.entries(STAGED_BADGE_DEFINITIONS).forEach(([stagedId, def]) => {
  const prefix = def.legacyIdPrefix
  def.stages.forEach((stageValue) => {
    LEGACY_BADGE_TO_STAGED[prefix + stageValue] = { stagedId, stageValue }
  })
})

const LEGACY_IDS_IN_STAGED = new Set(Object.keys(LEGACY_BADGE_TO_STAGED))

function getUniqueExerciseIdsThisWeek(attempts) {
  const week = getAttemptsThisWeek(attempts)
  return new Set(week.map(a => a.exerciseId).filter(Boolean))
}

/** Tentatives Nouveaux Horizons (section === 'horizons' ou musicCategory défini) */
function getHorizonsAttempts(attempts) {
  if (!attempts || !attempts.length) return []
  return attempts.filter(a => a.section === 'horizons' || (a.musicCategory && HORIZONS_STYLE_ORDER.includes(a.musicCategory)))
}

/** Nombre d'exercices Horizons par style { film: n, game: n, ... } */
function countHorizonsByCategory(attempts) {
  const horizons = getHorizonsAttempts(attempts)
  const by = {}
  HORIZONS_STYLE_ORDER.forEach(id => { by[id] = 0 })
  horizons.forEach(a => {
    const cat = a.musicCategory
    if (cat && by.hasOwnProperty(cat)) by[cat]++
  })
  return by
}

/** Nombre de styles Horizons pour lesquels l'utilisateur a au moins 1 exercice */
function countHorizonsStylesPracticed(attempts) {
  const by = countHorizonsByCategory(attempts)
  return Object.values(by).filter(n => n >= 1).length
}

/**
 * Calcule les styles Nouveaux Horizons débloqués pour un utilisateur (critères du plan, rythme long).
 * @param {Array} attempts - Toutes les tentatives (ordre récent en premier)
 * @param {{ xp?: number }} options - Contexte optionnel (xp pour niveau)
 * @returns {string[]} - IDs des styles débloqués, ex. ['film', 'game']
 */
export function getUnlockedHorizonsStyles(attempts, options = {}) {
  const level = options.xp != null ? Math.floor(Number(options.xp) / 100) + 1 : 0
  const totalAttempts = (attempts || []).length
  const streak = calculateStreak(attempts || [])
  const horizonsAttempts = getHorizonsAttempts(attempts || [])
  const horizonsTotal = horizonsAttempts.length
  const byCategory = countHorizonsByCategory(attempts || [])
  const stylesPracticed = countHorizonsStylesPracticed(attempts || [])

  const unlocked = []

  // Film : 25 exercices OU Série de 7 OU Niveau 10
  if (totalAttempts >= 25 || streak >= 7 || level >= 10) {
    unlocked.push('film')
  }

  // Game : 10 exercices Horizons (film) OU 50 exercices total
  if (byCategory.film >= 10 || totalAttempts >= 50) {
    if (!unlocked.includes('game')) unlocked.push('game')
  }

  // Anime : 20 exercices Horizons OU Niveau 15
  if (horizonsTotal >= 20 || level >= 15) {
    if (!unlocked.includes('anime')) unlocked.push('anime')
  }

  // Variety : 3 styles pratiqués (film, game, anime) OU 100 exercices
  const hasFilmGameAnime = (byCategory.film >= 1 && byCategory.game >= 1 && byCategory.anime >= 1)
  if (hasFilmGameAnime || totalAttempts >= 100) {
    if (!unlocked.includes('variety')) unlocked.push('variety')
  }

  // Pop : 10 exercices dans 3 styles OU Niveau 25 + 50 exercices Horizons
  const has10In3Styles = horizonsTotal >= 10 && stylesPracticed >= 3
  const hasLevel25And50Horizons = level >= 25 && horizonsTotal >= 50
  if (has10In3Styles || hasLevel25And50Horizons) {
    if (!unlocked.includes('pop')) unlocked.push('pop')
  }

  return HORIZONS_STYLE_ORDER.filter(id => unlocked.includes(id))
}

/**
 * Récupère tous les badges débloqués par un utilisateur
 */
export async function getUserBadges(userId) {
  try {
    const q = query(
      collection(db, 'badges'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const badges = []
    
    querySnapshot.forEach((doc) => {
      badges.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return badges
  } catch (error) {
    console.error('Erreur lors de la récupération des badges:', error)
    throw error
  }
}

/**
 * Vérifie et débloque les badges pour un utilisateur
 * Retourne les nouveaux badges débloqués
 */
export async function checkAndUnlockBadges(userId, attempts, options = {}) {
  try {
    const context = { xp: options.xp }
    // Récupérer les badges déjà débloqués
    const unlockedBadges = await getUserBadges(userId)
    const unlockedBadgeIds = new Set(unlockedBadges.map(b => b.badgeId))
    
    const newlyUnlocked = []
    
    // Vérifier chaque badge
    for (const [badgeId, badgeDef] of Object.entries(BADGE_DEFINITIONS)) {
      // Si déjà débloqué, passer au suivant
      if (unlockedBadgeIds.has(badgeId)) {
        continue
      }
      
      // Vérifier si le badge doit être débloqué (check reçoit attempts et optionnellement context)
      const checkResult = badgeDef.check(attempts, context)
      if (checkResult) {
        // Débloquer le badge
        const badgeData = {
          userId,
          badgeId,
          unlockedAt: serverTimestamp(),
          progress: getBadgeProgress(badgeId, attempts, context)
        }
        
        const docRef = await addDoc(collection(db, 'badges'), badgeData)
        newlyUnlocked.push({
          id: docRef.id,
          ...badgeData,
          ...badgeDef
        })
      }
    }
    
    return newlyUnlocked
  } catch (error) {
    console.error('Erreur lors de la vérification des badges:', error)
    throw error
  }
}

function getCadenceParfaiteCount(attempts) {
  const by = countCorrectByCadence(attempts)
  const key = Object.keys(by).find(k => /parfait|perfect/i.test(k))
  return key ? (by[key] || 0) : 0
}

/**
 * Calcule la progression vers un badge (pour les badges progressifs)
 */
function getBadgeProgress(badgeId, attempts, context) {
  switch (badgeId) {
    case 'exercises_5':
    case 'exercises_10':
      return Math.min(attempts.length, 10)
    case 'exercises_25':
      return Math.min(attempts.length, 25)
    case 'exercises_50':
      return Math.min(attempts.length, 50)
    case 'exercises_100':
      return Math.min(attempts.length, 100)
    case 'exercises_200':
      return Math.min(attempts.length, 200)
    case 'exercises_500':
      return Math.min(attempts.length, 500)
    case 'streak_1':
    case 'streak_3':
      return Math.min(calculateStreak(attempts), 3)
    case 'streak_5':
    case 'streak_7':
      return Math.min(calculateStreak(attempts), 7)
    case 'streak_14':
      return Math.min(calculateStreak(attempts), 14)
    case 'streak_21':
      return Math.min(calculateStreak(attempts), 21)
    case 'streak_30':
      return Math.min(calculateStreak(attempts), 30)
    case 'streak_60':
      return Math.min(calculateStreak(attempts), 60)
    case 'streak_100':
      return Math.min(calculateStreak(attempts), 100)
    case 'level_5':
    case 'level_10':
    case 'level_15':
    case 'level_20':
    case 'level_25':
    case 'level_30':
    case 'level_40':
    case 'level_50':
    case 'level_75':
    case 'level_100': {
      const max = getMaxProgress(badgeId)
      return Math.min(getLevelFromContext(context || {}), max)
    }
    case 'score_90_3':
    case 'score_90_5':
      return Math.min(attempts.filter(a => (a.score || 0) >= 90).length, getMaxProgress(badgeId))
    case 'score_90_10':
    case 'score_90_25':
      return Math.min(attempts.filter(a => (a.score || 0) >= 90).length, getMaxProgress(badgeId))
    case 'score_80_5':
    case 'score_80_10':
    case 'score_80_20':
      return Math.min(attempts.filter(a => (a.score || 0) >= 80).length, getMaxProgress(badgeId))
    case 'week_3':
    case 'week_10':
    case 'week_15':
    case 'week_20':
      return Math.min(getAttemptsThisWeek(attempts).length, getMaxProgress(badgeId))
    case 'variety_3_week':
    case 'variety_5_week':
    case 'variety_10_week':
      return Math.min(getUniqueExerciseIdsThisWeek(attempts).size, getMaxProgress(badgeId))
    case 'total_correct_100':
    case 'total_correct_200':
    case 'total_correct_500':
    case 'total_correct_1000':
      return Math.min(countCorrectAnswers(attempts), getMaxProgress(badgeId))
    case 'degree_I_10':
    case 'degree_I_20':
    case 'degree_II_5':
    case 'degree_II_10':
    case 'degree_III_5':
    case 'degree_III_10':
    case 'degree_IV_10':
    case 'degree_V_10':
    case 'degree_V_20':
    case 'degree_VI_5':
    case 'degree_VI_10':
    case 'degree_VII_5':
    case 'degree_VII_10': {
      const byDeg = countCorrectByDegree(attempts)
      const degMatch = badgeId.match(/^degree_(I{1,3}|IV|V|VI|VII)_/)
      const deg = degMatch ? degMatch[1] : ''
      const max = getMaxProgress(badgeId)
      return Math.min(byDeg[deg] || 0, max)
    }
    case 'degree_I_V_10': {
      const byDeg = countCorrectByDegree(attempts)
      return Math.min(Math.min(byDeg.I || 0, 10) + Math.min(byDeg.V || 0, 10), 20)
    }
    default:
      if (badgeId.startsWith('degree_')) {
        const byDeg = countCorrectByDegree(attempts)
        const degMatch = badgeId.match(/^degree_(I{1,3}|IV|V|VI|VII)_/)
        const deg = degMatch ? degMatch[1] : ''
        const max = getMaxProgress(badgeId)
        return Math.min(byDeg[deg] || 0, max)
      }
      if (badgeId.startsWith('cadence_parfaite_')) {
        return Math.min(getCadenceParfaiteCount(attempts), getMaxProgress(badgeId))
      }
      if (badgeId.startsWith('tag_') || badgeId.startsWith('composers_') || badgeId.startsWith('difficulty_') || badgeId.startsWith('parcours_')) {
        const max = getMaxProgress(badgeId)
        if (max === 1) return 1
        if (badgeId.startsWith('tag_cadence')) return Math.min(countExercisesWithTag(attempts, 'CadenceParfaite'), max)
        if (badgeId.startsWith('tag_baroque')) return Math.min(countExercisesWithTag(attempts, 'Baroque'), max)
        if (badgeId.startsWith('tag_classique')) return Math.min(countExercisesWithTag(attempts, 'Classique'), max)
        if (badgeId.startsWith('tag_romantique')) return Math.min(countExercisesWithTag(attempts, 'Romantique'), max)
        if (badgeId.startsWith('tag_septieme')) return Math.min(countExercisesWithTag(attempts, 'Septieme'), max)
        if (badgeId.startsWith('tag_renversement')) return Math.min(countExercisesWithTag(attempts, 'Renversement') + countExercisesWithTag(attempts, 'PremierRenversement'), max)
        if (badgeId.startsWith('composers_')) return Math.min(countUniqueComposers(attempts), max)
        if (badgeId.startsWith('difficulty_debutant')) return Math.min(countAttemptsWithDifficulty(attempts, 'débutant'), max)
        if (badgeId.startsWith('difficulty_intermediate')) return Math.min(countAttemptsWithDifficulty(attempts, 'intermédiaire'), max)
        if (badgeId.startsWith('difficulty_avance')) return Math.min(countAttemptsWithDifficulty(attempts, 'avancé'), max)
        if (badgeId.startsWith('parcours_')) return Math.min(countAttemptsWithParcours(attempts), max)
        if (badgeId === 'figure_fundamental_20') return Math.min(countCorrectByFigure(attempts).fundamental || 0, 20)
      }
      if (badgeId.startsWith('horizons_unlock_')) {
        const style = badgeId.replace('horizons_unlock_', '')
        return getUnlockedHorizonsStyles(attempts || [], { xp: context?.xp }).includes(style) ? 1 : 0
      }
      const horizonsTierMatch = badgeId.match(/^horizons_(film|game|anime|variety|pop)_(\d+)$/)
      if (horizonsTierMatch) {
        const cat = horizonsTierMatch[1]
        const max = parseInt(horizonsTierMatch[2], 10)
        return Math.min(getHorizonsAttempts(attempts || []).filter(a => a.musicCategory === cat).length, max)
      }
      return 1
  }
}

/**
 * Récupère tous les badges avec leur statut (débloqué/en cours/verrouillé)
 * Retourne badges simples (non fusionnés) + badges à étapes (staged).
 */
export async function getAllBadgesWithStatus(userId, attempts, options = {}) {
  try {
    const context = { xp: options.xp }
    const unlockedBadges = await getUserBadges(userId)
    const unlockedBadgeIds = new Set(unlockedBadges.map(b => b.badgeId))
    const unlockedHorizonsStyles = getUnlockedHorizonsStyles(attempts || [], { xp: options.xp })
    const showHorizonsBadges = unlockedHorizonsStyles.length > 0

    // Badges simples : exclure ceux qui font partie d'un groupe à étapes ; masquer badges Horizons si aucun style débloqué
    const simpleBadges = Object.values(BADGE_DEFINITIONS)
      .filter((def) => !LEGACY_IDS_IN_STAGED.has(def.id))
      .filter((def) => !def.hiddenUntilHorizonsUnlocked || showHorizonsBadges)
      .map((badgeDef) => {
        const isUnlocked = unlockedBadgeIds.has(badgeDef.id)
        const unlockedBadge = unlockedBadges.find((b) => b.badgeId === badgeDef.id)
        return {
          ...badgeDef,
          staged: false,
          unlocked: isUnlocked,
          unlockedAt: unlockedBadge?.unlockedAt,
          progress: getBadgeProgress(badgeDef.id, attempts, context),
          maxProgress: getMaxProgress(badgeDef.id)
        }
      })

    // Badges à étapes : un par STAGED_BADGE_DEFINITIONS
    const stagedBadges = Object.values(STAGED_BADGE_DEFINITIONS).map((def) => {
      const progress = def.getProgress(attempts, context)
      const stages = def.stages
      const maxProgress = stages[stages.length - 1]
      const unlockedStagesSet = new Set()
      let mostRecentUnlockedAt = null
      unlockedBadges.forEach((b) => {
        const mapped = LEGACY_BADGE_TO_STAGED[b.badgeId]
        if (mapped && mapped.stagedId === def.id) {
          unlockedStagesSet.add(mapped.stageValue)
          const at = b.unlockedAt?.toDate ? b.unlockedAt.toDate() : (b.unlockedAt ? new Date(b.unlockedAt) : null)
          if (at && (!mostRecentUnlockedAt || at > mostRecentUnlockedAt)) mostRecentUnlockedAt = at
        }
      })
      const unlockedStages = stages.map((s) => unlockedStagesSet.has(s))
      const currentStageIndex = unlockedStages.lastIndexOf(true)
      const currentStage = currentStageIndex >= 0 ? stages[currentStageIndex] : 0
      const unlocked = currentStageIndex >= 0

      return {
        ...def,
        staged: true,
        stages,
        progress,
        maxProgress,
        currentStage,
        unlockedStages,
        unlocked,
        unlockedAt: mostRecentUnlockedAt
      }
    })

    return [...simpleBadges, ...stagedBadges]
  } catch (error) {
    console.error('Erreur lors de la récupération des badges avec statut:', error)
    throw error
  }
}

/**
 * Retourne la progression maximale pour un badge
 */
function getMaxProgress(badgeId) {
  switch (badgeId) {
    case 'exercises_5':
      return 5
    case 'exercises_10':
      return 10
    case 'exercises_25':
      return 25
    case 'exercises_50':
      return 50
    case 'exercises_100':
      return 100
    case 'exercises_200':
      return 200
    case 'exercises_500':
      return 500
    case 'streak_1':
      return 1
    case 'streak_3':
      return 3
    case 'streak_5':
      return 5
    case 'streak_7':
      return 7
    case 'streak_14':
      return 14
    case 'streak_21':
      return 21
    case 'streak_30':
      return 30
    case 'streak_60':
      return 60
    case 'streak_100':
      return 100
    case 'level_5':
      return 5
    case 'level_10':
      return 10
    case 'level_15':
      return 15
    case 'level_20':
      return 20
    case 'level_25':
      return 25
    case 'level_30':
      return 30
    case 'level_40':
      return 40
    case 'level_50':
      return 50
    case 'level_75':
      return 75
    case 'level_100':
      return 100
    case 'score_90_3':
      return 3
    case 'score_90_5':
      return 5
    case 'score_90_10':
      return 10
    case 'score_90_25':
      return 25
    case 'score_80_5':
      return 5
    case 'score_80_10':
      return 10
    case 'score_80_20':
      return 20
    case 'week_3':
      return 3
    case 'week_15':
      return 15
    case 'week_20':
      return 20
    case 'variety_3_week':
      return 3
    case 'variety_5_week':
      return 5
    case 'variety_10_week':
      return 10
    case 'total_correct_100':
      return 100
    case 'total_correct_500':
      return 500
    case 'total_correct_1000':
      return 1000
    case 'degree_I_10':
    case 'degree_IV_10':
    case 'degree_V_10':
      return 10
    case 'degree_I_20':
    case 'degree_V_20':
    case 'cadence_parfaite_20':
      return 20
    case 'degree_II_5':
    case 'degree_III_5':
    case 'degree_VI_5':
    case 'degree_VII_5':
    case 'cadence_parfaite_5':
    case 'cadence_demi_5':
    case 'cadence_plagale_5':
    case 'figure_first_inv_5':
    case 'tag_cadence_parfaite_5':
    case 'tag_septieme_5':
    case 'tag_renversement_5':
    case 'difficulty_debutant_5':
    case 'difficulty_avance_5':
    case 'parcours_5':
      return 5
    case 'cadence_parfaite_10':
      return 10
    case 'cadence_64_3':
      return 3
    case 'figure_fundamental_10':
      return 10
    case 'tag_baroque_3':
    case 'composers_3':
      return 3
    case 'composers_5':
      return 5
    case 'difficulty_intermediate_10':
    case 'difficulty_debutant_10':
    case 'parcours_10':
    case 'week_10':
      return 10
    case 'parcours_15':
    case 'week_15':
      return 15
    case 'total_correct_200':
      return 200
    case 'degree_II_10':
    case 'degree_III_10':
    case 'degree_VI_10':
    case 'degree_VII_10':
      return 10
    case 'composers_7':
      return 7
    case 'tag_classique_3':
    case 'tag_romantique_3':
      return 3
    case 'figure_fundamental_20':
      return 20
    case 'degree_I_V_10':
      return 20
    case 'horizons_unlock_film':
    case 'horizons_unlock_game':
    case 'horizons_unlock_anime':
    case 'horizons_unlock_variety':
    case 'horizons_unlock_pop':
      return 1
    case 'horizons_film_5':
    case 'horizons_game_5':
    case 'horizons_anime_5':
    case 'horizons_variety_5':
    case 'horizons_pop_5':
      return 5
    case 'horizons_film_10':
    case 'horizons_game_10':
    case 'horizons_anime_10':
    case 'horizons_variety_10':
    case 'horizons_pop_10':
      return 10
    case 'horizons_film_25':
    case 'horizons_game_25':
    case 'horizons_anime_25':
    case 'horizons_variety_25':
    case 'horizons_pop_25':
      return 25
    case 'horizons_film_50':
    case 'horizons_game_50':
    case 'horizons_anime_50':
    case 'horizons_variety_50':
    case 'horizons_pop_50':
      return 50
    default:
      return 1
  }
}
