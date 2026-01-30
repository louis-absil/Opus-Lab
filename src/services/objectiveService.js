import { 
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'
import { incrementUserXP } from './userService'

/**
 * Génère des objectifs adaptatifs basés sur les performances passées
 */
export function generateAdaptiveObjectives(attempts, currentWeekAttempts) {
  const objectives = []

  // Objectif 1 : Nombre d'exercices cette semaine
  const avgExercisesPerWeek = calculateAverageExercisesPerWeek(attempts)
  const targetExercises = Math.max(5, Math.ceil(avgExercisesPerWeek * 1.2)) // 20% de plus que la moyenne
  objectives.push({
    id: 'weekly_exercises',
    type: 'weekly',
    title: 'Exercices cette semaine',
    description: `Compléter ${targetExercises} exercices cette semaine`,
    target: targetExercises,
    current: currentWeekAttempts.length,
    unit: 'exercices',
    reward: targetExercises * 5, // 5 XP par exercice
    category: 'quantity'
  })

  // Objectif 2 : Score moyen cette semaine
  if (attempts.length > 0) {
    const avgScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
    const targetScore = Math.min(100, Math.ceil(avgScore + 5)) // +5% par rapport à la moyenne
    const currentWeekAvg = currentWeekAttempts.length > 0
      ? currentWeekAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / currentWeekAttempts.length
      : 0
    objectives.push({
      id: 'weekly_score',
      type: 'weekly',
      title: 'Score moyen',
      description: `Atteindre ${targetScore}% de score moyen cette semaine`,
      target: targetScore,
      current: Math.round(currentWeekAvg),
      unit: '%',
      reward: 50, // 50 XP bonus
      category: 'quality'
    })
  }

  return objectives
}

/**
 * Calcule la moyenne d'exercices par semaine
 */
function calculateAverageExercisesPerWeek(attempts) {
  if (attempts.length === 0) return 5 // Valeur par défaut

  // Grouper par semaine
  const weeks = new Map()
  attempts.forEach(attempt => {
    if (!attempt.completedAt) return
    const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
    const weekKey = getWeekKey(date)
    weeks.set(weekKey, (weeks.get(weekKey) || 0) + 1)
  })

  if (weeks.size === 0) return 5

  const totalExercises = Array.from(weeks.values()).reduce((sum, count) => sum + count, 0)
  return totalExercises / weeks.size
}

/**
 * Retourne une clé unique pour une semaine (année-semaine)
 */
function getWeekKey(date) {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${week}`
}

/**
 * Calcule le numéro de semaine dans l'année
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * Récupère les objectifs actifs d'un utilisateur
 */
export async function getUserObjectives(userId) {
  try {
    const now = new Date()
    const q = query(
      collection(db, 'objectives'),
      where('userId', '==', userId),
      where('endDate', '>=', now)
    )
    
    const querySnapshot = await getDocs(q)
    const objectives = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      // Extraire le champ 'id' original si présent pour éviter qu'il écrase l'ID du document
      const { id: objectiveTypeId, ...restData } = data
      objectives.push({
        ...restData,
        id: doc.id, // Utiliser l'ID du document Firestore (unique) - placé après pour garantir qu'il n'est pas écrasé
        objectiveTypeId: objectiveTypeId // Conserver l'ID original du type d'objectif si nécessaire
      })
    })
    
    return objectives
  } catch (error) {
    console.error('Erreur lors de la récupération des objectifs:', error)
    throw error
  }
}

/**
 * Crée un nouvel objectif pour un utilisateur
 */
export async function createObjective(userId, objectiveData) {
  try {
    const now = new Date()
    const startDate = objectiveData.type === 'weekly' 
      ? getStartOfWeek(now)
      : getStartOfMonth(now)
    const endDate = objectiveData.type === 'weekly'
      ? getEndOfWeek(now)
      : getEndOfMonth(now)

    const objective = {
      userId,
      ...objectiveData,
      startDate,
      endDate,
      completed: false,
      createdAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, 'objectives'), objective)
    return {
      id: docRef.id,
      ...objective
    }
  } catch (error) {
    console.error('Erreur lors de la création de l\'objectif:', error)
    throw error
  }
}

/**
 * Met à jour la progression d'un objectif
 */
export async function updateObjectiveProgress(objectiveId, currentValue) {
  try {
    const objectiveRef = doc(db, 'objectives', objectiveId)
    const objectiveDoc = await getDoc(objectiveRef)
    
    if (!objectiveDoc.exists()) {
      throw new Error('Objectif introuvable')
    }
    
    const objective = objectiveDoc.data()
    const isCompleted = currentValue >= objective.target
    
    await updateDoc(objectiveRef, {
      current: currentValue,
      completed: isCompleted,
      completedAt: isCompleted ? serverTimestamp() : null
    })

    // Si l'objectif est complété, donner la récompense
    if (isCompleted && objective.reward) {
      await incrementUserXP(objective.userId, objective.reward)
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objectif:', error)
    throw error
  }
}

/**
 * Retourne le début de la semaine (lundi)
 */
function getStartOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajuster pour lundi
  return new Date(d.setDate(diff))
}

/**
 * Retourne la fin de la semaine (dimanche)
 */
function getEndOfWeek(date) {
  const start = getStartOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Retourne le début du mois
 */
function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Retourne la fin du mois
 */
function getEndOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}
