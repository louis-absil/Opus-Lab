import { 
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'

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
    emoji: '🔥',
    description: '7 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 7
  },
  streak_30: {
    id: 'streak_30',
    name: 'Série de 30',
    emoji: '🔥',
    description: '30 jours consécutifs d\'entraînement',
    check: (attempts) => calculateStreak(attempts) >= 30
  },
  perfect_score: {
    id: 'perfect_score',
    name: 'Score Parfait',
    emoji: '⭐',
    description: 'Obtenir 100% sur un exercice',
    check: (attempts) => attempts.some(a => a.score === 100)
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
    emoji: '📚',
    description: 'Compléter 50 exercices',
    check: (attempts) => attempts.length >= 50
  },
  exercises_100: {
    id: 'exercises_100',
    name: '100 Exercices',
    emoji: '📚',
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
    emoji: '⭐',
    description: 'Atteindre le niveau 5',
    check: (attempts, context) => getLevelFromContext(context) >= 5
  },
  level_10: {
    id: 'level_10',
    name: 'Régulier',
    emoji: '🌟',
    description: 'Atteindre le niveau 10',
    check: (attempts, context) => getLevelFromContext(context) >= 10
  },
  level_25: {
    id: 'level_25',
    name: 'Assidu',
    emoji: '📚',
    description: 'Atteindre le niveau 25',
    check: (attempts, context) => getLevelFromContext(context) >= 25
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
    check: (attempts, context) => getLevelFromContext(context) >= 100
  }
}

function getLevelFromContext(context) {
  if (context?.xp == null) return 0
  return Math.floor(Number(context.xp) / 100) + 1
}

/**
 * Calcule la série (streak) quotidienne
 */
function calculateStreak(attempts) {
  if (!attempts || attempts.length === 0) {
    return 0
  }

  // Grouper les tentatives par jour
  const daysWithActivity = new Set()
  attempts.forEach(attempt => {
    if (!attempt.completedAt) return
    const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    daysWithActivity.add(dateKey)
  })

  if (daysWithActivity.size === 0) {
    return 0
  }

  // Trier les dates
  const sortedDates = Array.from(daysWithActivity).sort().reverse()
  
  // Calculer la série consécutive depuis aujourd'hui
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayKey = `${year}-${month}-${day}`
  
  let streak = 0
  let currentDate = new Date(today)
  
  // Vérifier si aujourd'hui a une activité
  if (sortedDates.includes(todayKey)) {
    streak = 1
    currentDate.setDate(currentDate.getDate() - 1)
  } else {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Continuer à compter les jours consécutifs
  while (true) {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    if (sortedDates.includes(dateKey)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
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

/**
 * Calcule la progression vers un badge (pour les badges progressifs)
 */
function getBadgeProgress(badgeId, attempts, context) {
  switch (badgeId) {
    case 'exercises_10':
      return Math.min(attempts.length, 10)
    case 'exercises_50':
      return Math.min(attempts.length, 50)
    case 'exercises_100':
      return Math.min(attempts.length, 100)
    case 'streak_3':
      return Math.min(calculateStreak(attempts), 3)
    case 'streak_7':
      return Math.min(calculateStreak(attempts), 7)
    case 'streak_30':
      return Math.min(calculateStreak(attempts), 30)
    case 'level_5':
    case 'level_10':
    case 'level_25':
    case 'level_50':
    case 'level_100': {
      const max = getMaxProgress(badgeId)
      return Math.min(getLevelFromContext(context || {}), max)
    }
    default:
      return 1
  }
}

/**
 * Récupère tous les badges avec leur statut (débloqué/en cours/verrouillé)
 */
export async function getAllBadgesWithStatus(userId, attempts, options = {}) {
  try {
    const context = { xp: options.xp }
    const unlockedBadges = await getUserBadges(userId)
    const unlockedBadgeIds = new Set(unlockedBadges.map(b => b.badgeId))
    
    return Object.values(BADGE_DEFINITIONS).map(badgeDef => {
      const isUnlocked = unlockedBadgeIds.has(badgeDef.id)
      const unlockedBadge = unlockedBadges.find(b => b.badgeId === badgeDef.id)
      
      return {
        ...badgeDef,
        unlocked: isUnlocked,
        unlockedAt: unlockedBadge?.unlockedAt,
        progress: getBadgeProgress(badgeDef.id, attempts, context),
        maxProgress: getMaxProgress(badgeDef.id)
      }
    })
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
    case 'exercises_10':
      return 10
    case 'exercises_50':
      return 50
    case 'exercises_100':
      return 100
    case 'streak_3':
      return 3
    case 'streak_7':
      return 7
    case 'streak_30':
      return 30
    case 'level_5':
      return 5
    case 'level_10':
      return 10
    case 'level_25':
      return 25
    case 'level_50':
      return 50
    case 'level_100':
      return 100
    default:
      return 1
  }
}
