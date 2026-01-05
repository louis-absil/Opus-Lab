import { 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Crée ou récupère un utilisateur dans Firestore
 * Vérifie automatiquement si l'email est autorisé et promeut en professeur si nécessaire
 * @param {string} userId - L'ID de l'utilisateur
 * @param {object} userData - Les données de l'utilisateur
 * @param {boolean} forceServer - Si true, force la récupération depuis le serveur (ignore le cache)
 */
export async function getOrCreateUser(userId, userData, forceServer = false) {
  try {
    const userRef = doc(db, 'users', userId)
    // Si forceServer est true, récupérer depuis le serveur pour éviter le cache
    const userSnap = forceServer 
      ? await getDocFromServer(userRef)
      : await getDoc(userRef)
    
    if (userSnap.exists()) {
      // Utilisateur existe déjà
      const existingUser = {
        id: userSnap.id,
        ...userSnap.data()
      }
      
      // Vérifier si l'email est autorisé et mettre à jour le rôle si nécessaire
      if (userData.email) {
        const isAuthorized = await isEmailAuthorized(userData.email)
        if (isAuthorized && existingUser.role !== 'teacher') {
          // Promouvoir automatiquement en professeur
          await updateDoc(userRef, {
            role: 'teacher',
            updatedAt: serverTimestamp()
          })
          existingUser.role = 'teacher'
        }
      }
      
      return existingUser
    } else {
      // Créer un nouvel utilisateur
      // Vérifier si l'email est autorisé pour déterminer le rôle initial
      let initialRole = 'student'
      if (userData.email) {
        const isAuthorized = await isEmailAuthorized(userData.email)
        if (isAuthorized) {
          initialRole = 'teacher'
        }
      }
      
      const newUser = {
        email: userData.email,
        displayName: userData.displayName || userData.email,
        photoURL: userData.photoURL || null,
        role: initialRole,
        xp: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      await setDoc(userRef, newUser)
      
      return {
        id: userId,
        ...newUser
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création/récupération de l\'utilisateur:', error)
    throw error
  }
}

/**
 * Récupère un utilisateur par son ID
 * @param {string} userId - L'ID de l'utilisateur
 * @param {boolean} forceServer - Si true, force la récupération depuis le serveur (ignore le cache)
 */
export async function getUserById(userId, forceServer = false) {
  try {
    const userRef = doc(db, 'users', userId)
    // Si forceServer est true, récupérer depuis le serveur pour éviter le cache
    const userSnap = forceServer 
      ? await getDocFromServer(userRef)
      : await getDoc(userRef)
    
    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...userSnap.data()
      }
    }
    return null
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error)
    throw error
  }
}

/**
 * Vérifie si un email est autorisé à devenir professeur
 */
export async function isEmailAuthorized(email) {
  try {
    if (!email) {
      return false
    }
    
    // Normaliser l'email en minuscules pour la comparaison
    const normalizedEmail = email.toLowerCase().trim()
    
    const authorizedRef = collection(db, 'authorizedTeachers')
    const q = query(authorizedRef, where('email', '==', normalizedEmail))
    const querySnapshot = await getDocs(q)
    
    return !querySnapshot.empty
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'email autorisé:', error)
    return false
  }
}

/**
 * Vérifie si l'email est autorisé et promeut l'utilisateur en teacher
 */
export async function promoteToTeacher(userId, userEmail) {
  try {
    if (!userEmail) {
      throw new Error('Email utilisateur non disponible')
    }
    
    // Vérifier si l'email est autorisé
    const isAuthorized = await isEmailAuthorized(userEmail)
    if (!isAuthorized) {
      throw new Error('Votre email n\'est pas autorisé à devenir professeur. Contactez l\'administrateur.')
    }
    
    // Promouvoir l'utilisateur
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      role: 'teacher',
      updatedAt: serverTimestamp()
    })
    
    return true
  } catch (error) {
    console.error('Erreur lors de la promotion:', error)
    throw error
  }
}

/**
 * Incrémente l'XP d'un utilisateur
 */
export async function incrementUserXP(userId, points) {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      const currentXP = userSnap.data().xp || 0
      await updateDoc(userRef, {
        xp: currentXP + points,
        updatedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Erreur lors de l\'incrémentation de l\'XP:', error)
    throw error
  }
}


