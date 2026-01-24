import { 
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'
import { incrementUserXP } from './userService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'

/**
 * Sauvegarde une tentative d'exercice
 */
export async function saveAttempt(userId, exerciseId, userAnswers, correctAnswers, score, exerciseTitle = null) {
  try {
    // Calculer le nombre de bonnes réponses pour l'XP
    // Utiliser validateAnswerWithFunctions pour une comparaison robuste
    const correctCount = correctAnswers.filter((correct, index) => {
      const userAnswer = userAnswers[index]
      if (!userAnswer || !correct) return false
      // Utiliser validateAnswerWithFunctions pour une validation robuste
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        userAnswer.selectedFunction || userAnswer.function || null
      )
      // Niveau 1 = réponse parfaite (correcte)
      return validation.level === 1
    }).length
    
    // Sauvegarder la tentative
    const attemptData = {
      userId,
      exerciseId,
      exerciseTitle, // Titre de l'exercice pour l'affichage
      userAnswers,
      correctAnswers, // Sauvegarder les bonnes réponses pour les statistiques
      score, // Score en pourcentage (0-100)
      correctCount,
      totalQuestions: correctAnswers.length,
      completedAt: serverTimestamp()
    }
    
    const docRef = await addDoc(collection(db, 'attempts'), attemptData)
    
    // Incrémenter l'XP : +10 points par bonne réponse
    const xpGained = correctCount * 10
    if (xpGained > 0) {
      await incrementUserXP(userId, xpGained)
    }
    
    return {
      id: docRef.id,
      ...attemptData,
      xpGained
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la tentative:', error)
    throw error
  }
}

/**
 * Récupère l'historique des tentatives d'un utilisateur
 */
export async function getUserAttempts(userId, limitCount = 10) {
  try {
    // Récupérer toutes les tentatives de l'utilisateur (sans orderBy pour éviter l'index)
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const attempts = []
    
    querySnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Trier côté client par date (plus récent en premier)
    attempts.sort((a, b) => {
      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt || 0)
      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt || 0)
      return dateB - dateA
    })
    
    // Limiter le nombre de résultats
    return attempts.slice(0, limitCount)
  } catch (error) {
    console.error('Erreur lors de la récupération des tentatives:', error)
    throw error
  }
}

/**
 * Récupère toutes les tentatives d'un utilisateur (pour les stats)
 */
export async function getAllUserAttempts(userId) {
  try {
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const attempts = []
    
    querySnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return attempts
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les tentatives:', error)
    throw error
  }
}

/**
 * Récupère les tentatives d'un exercice spécifique
 */
export async function getExerciseAttempts(exerciseId) {
  try {
    // Récupérer toutes les tentatives de l'exercice (sans orderBy pour éviter l'index)
    const q = query(
      collection(db, 'attempts'),
      where('exerciseId', '==', exerciseId)
    )
    
    const querySnapshot = await getDocs(q)
    const attempts = []
    
    querySnapshot.forEach((doc) => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Trier côté client par date (plus récent en premier)
    attempts.sort((a, b) => {
      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt || 0)
      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt || 0)
      return dateB - dateA
    })
    
    return attempts
  } catch (error) {
    console.error('Erreur lors de la récupération des tentatives:', error)
    throw error
  }
}

