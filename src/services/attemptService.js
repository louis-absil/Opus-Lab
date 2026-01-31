import { 
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'
import { incrementUserXP } from './userService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'

/** Remplace récursivement undefined par null (Firebase n'accepte pas undefined). */
function sanitizeForFirestore(value) {
  if (value === undefined) return null
  if (value === null) return null
  if (Array.isArray(value)) return value.map(sanitizeForFirestore)
  if (typeof value === 'object' && value !== null) {
    const out = {}
    for (const key of Object.keys(value)) {
      out[key] = sanitizeForFirestore(value[key])
    }
    return out
  }
  return value
}

/**
 * Sauvegarde une tentative d'exercice
 * @param {Object} options - Options (functionOnlyAvailable, exerciseMetadata: { composer, difficulty, autoTags, sourceNodeId })
 */
export async function saveAttempt(userId, exerciseId, userAnswers, correctAnswers, score, exerciseTitle = null, options = {}) {
  try {
    // Calculer l'XP par marqueur selon le niveau de validation (réponses partielles = XP partielle)
    const XP_BY_LEVEL = { 1: 10, 2: 6, 3: 4, 0.5: 5, 0: 0 }
    let xpGained = 0
    let correctCount = 0
    correctAnswers.forEach((correct, index) => {
      const userAnswer = userAnswers[index]
      if (!correct) return
      if (!userAnswer) return
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        userAnswer.selectedFunction || userAnswer.function || null,
        { functionOnlyAvailable: options.functionOnlyAvailable }
      )
      const level = validation?.level ?? 0
      xpGained += XP_BY_LEVEL[level] ?? 0
      if (level === 1) correctCount += 1
    })
    
    const meta = options.exerciseMetadata || {}
    const attemptData = {
      userId,
      exerciseId,
      exerciseTitle: exerciseTitle ?? null,
      userAnswers: sanitizeForFirestore(userAnswers),
      correctAnswers: sanitizeForFirestore(correctAnswers),
      score,
      correctCount,
      totalQuestions: correctAnswers.length,
      completedAt: serverTimestamp(),
      ...(options.authorId != null && { authorId: options.authorId }),
      ...(options.authorName != null && { authorName: options.authorName }),
      ...(meta.composer != null && { composer: meta.composer }),
      ...(meta.difficulty != null && { difficulty: meta.difficulty }),
      ...(Array.isArray(meta.autoTags) && { autoTags: sanitizeForFirestore(meta.autoTags) }),
      ...(meta.sourceNodeId != null && { sourceNodeId: meta.sourceNodeId }),
      ...(meta.section != null && { section: meta.section }),
      ...(meta.musicCategory != null && { musicCategory: meta.musicCategory })
    }
    
    const docRef = await addDoc(collection(db, 'attempts'), attemptData)
    
    // Incrémenter l'XP (déjà calculée selon level par marqueur)
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
 * Récupère la dernière tentative d'un utilisateur (pour afficher "dernière activité")
 * Nécessite un index Firestore : collection attempts, userId (ASC), completedAt (DESC)
 */
export async function getLastAttemptForUser(userId) {
  try {
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() }
  } catch (error) {
    console.warn('getLastAttemptForUser:', error)
    return null
  }
}

/**
 * Retourne le nombre de tentatives réalisées sur les exercices d'un auteur (prof).
 * Nécessite que les tentatives aient le champ authorId (dénormalisation).
 */
export async function getAttemptsCountByAuthor(authorId) {
  try {
    const q = query(
      collection(db, 'attempts'),
      where('authorId', '==', authorId)
    )
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count ?? 0
  } catch (error) {
    console.error('Erreur lors du comptage des tentatives par auteur:', error)
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

