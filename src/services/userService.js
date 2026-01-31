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
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Fonction utilitaire pour réessayer une opération en cas d'erreur réseau
 * @param {Function} operation - La fonction async à exécuter
 * @param {number} maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @param {number} delay - Délai initial entre les tentatives en ms (défaut: 1000)
 * @returns {Promise} Le résultat de l'opération
 */
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      // Vérifier si c'est une erreur réseau
      const isNetworkError = 
        error.code === 'unavailable' ||
        error.code === 'deadline-exceeded' ||
        error.message?.includes('network') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('ERR_INTERNET_DISCONNECTED')
      
      // Si c'est la dernière tentative ou si ce n'est pas une erreur réseau, lancer l'erreur
      if (i === maxRetries - 1 || !isNetworkError) {
        throw error
      }
      
      // Vérifier la connexion avant de réessayer
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const networkError = new Error('Aucune connexion internet')
        networkError.code = 'network/offline'
        throw networkError
      }
      
      // Attendre avant de réessayer (backoff exponentiel)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
}

/**
 * Crée ou récupère un utilisateur dans Firestore
 * Vérifie automatiquement si l'email est autorisé et promeut en professeur si nécessaire
 * @param {string} userId - L'ID de l'utilisateur
 * @param {object} userData - Les données de l'utilisateur
 * @param {boolean} forceServer - Si true, force la récupération depuis le serveur (ignore le cache)
 */
export async function getOrCreateUser(userId, userData, forceServer = false) {
  // Vérifier la connexion
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const networkError = new Error('Aucune connexion internet')
    networkError.code = 'network/offline'
    throw networkError
  }

  return retryOperation(async () => {
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
            listedInTeacherCatalogue: true,
            updatedAt: serverTimestamp()
          })
          existingUser.role = 'teacher'
          existingUser.listedInTeacherCatalogue = true
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
        ...(initialRole === 'teacher' ? { listedInTeacherCatalogue: true } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      await setDoc(userRef, newUser)
      
      return {
        id: userId,
        ...newUser
      }
    }
  }).catch((error) => {
    console.error('Erreur lors de la création/récupération de l\'utilisateur:', error)
    throw error
  })
}

/**
 * Récupère un utilisateur par son ID
 * @param {string} userId - L'ID de l'utilisateur
 * @param {boolean} forceServer - Si true, force la récupération depuis le serveur (ignore le cache)
 */
export async function getUserById(userId, forceServer = false) {
  // Vérifier la connexion
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const networkError = new Error('Aucune connexion internet')
    networkError.code = 'network/offline'
    throw networkError
  }

  return retryOperation(async () => {
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
  }).catch((error) => {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error)
    throw error
  })
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
      listedInTeacherCatalogue: true,
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

/**
 * Met à jour le profil utilisateur (établissement, classe, classe prof)
 * Les valeurs établissement/classe doivent provenir des listes validées.
 * teacherClassId/teacherId : utilisés pour « rejoindre une classe » (code donné par le prof).
 * teacherEstablishments / teacherSubjects : tableaux pour les profs (établissements et matières enseignées).
 */
export async function updateUserProfile(userId, data) {
  try {
    const userRef = doc(db, 'users', userId)
    const updates = { updatedAt: serverTimestamp() }
    if (data.establishment !== undefined) updates.establishment = data.establishment || null
    if (data.class !== undefined) updates.class = data.class || null
    if (data.displayName !== undefined) updates.displayName = data.displayName
    if (data.photoURL !== undefined) updates.photoURL = data.photoURL || null
    if (data.teacherClassId !== undefined) updates.teacherClassId = data.teacherClassId || null
    if (data.teacherId !== undefined) updates.teacherId = data.teacherId || null
    if (data.teacherEstablishments !== undefined) updates.teacherEstablishments = Array.isArray(data.teacherEstablishments) ? data.teacherEstablishments : []
    if (data.teacherSubjects !== undefined) updates.teacherSubjects = Array.isArray(data.teacherSubjects) ? data.teacherSubjects : []
    if (data.listedInTeacherCatalogue !== undefined) updates.listedInTeacherCatalogue = data.listedInTeacherCatalogue === true
    await updateDoc(userRef, updates)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    throw error
  }
}

/**
 * Retourne le nombre total d'élèves (catalogue). Réservé aux professeurs.
 * Utilise getCountFromServer pour éviter de charger tous les documents.
 */
export async function getStudentsCount() {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    )
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count ?? 0
  } catch (error) {
    console.error('Erreur lors du comptage des élèves:', error)
    throw error
  }
}

/**
 * Récupère les élèves avec pagination et filtres optionnels
 * @param {Object} options - { pageSize, startAfterDoc, establishment?, class?, teacherId? }
 * @returns {Promise<{ students: Array, lastDoc: FirestoreDocumentSnapshot | null }>}
 * Note : Firestore nécessite des index composites si establishment, class ou teacherId sont utilisés.
 */
export async function getStudentsPaginated(options = {}) {
  const { pageSize = 25, startAfterDoc = null, establishment = null, class: classFilter = null, teacherId = null } = options
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.js:getStudentsPaginated',message:'options received',data:{teacherId,establishment,classFilter},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  try {
    const constraints = [
      where('role', '==', 'student')
    ]
    if (establishment) constraints.push(where('establishment', '==', establishment))
    if (classFilter) constraints.push(where('class', '==', classFilter))
    if (teacherId) constraints.push(where('teacherId', '==', teacherId))
    constraints.push(orderBy('displayName'), limit(pageSize))
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc))

    const q = query(collection(db, 'users'), ...constraints)
    const snapshot = await getDocs(q)
    const students = []
    snapshot.forEach((d) => {
      students.push({ id: d.id, ...d.data() })
    })
    const lastDoc = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null
    return { students, lastDoc }
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves:', error)
    throw error
  }
}

/**
 * Récupère les professeurs avec pagination (uniquement ceux qui apparaissent dans l'annuaire).
 * @param {Object} options - { pageSize, startAfterDoc }
 * @returns {Promise<{ teachers: Array, lastDoc: FirestoreDocumentSnapshot | null }>}
 */
export async function getTeachersPaginated(options = {}) {
  const { pageSize = 25, startAfterDoc = null } = options
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.js:getTeachersPaginated',message:'entry',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2c'})}).catch(()=>{});
  // #endregion
  try {
    const constraints = [
      where('role', '==', 'teacher'),
      where('listedInTeacherCatalogue', '==', true),
      orderBy('displayName'),
      limit(pageSize)
    ]
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc))

    const q = query(collection(db, 'users'), ...constraints)
    const snapshot = await getDocs(q)
    const teachers = []
    snapshot.forEach((d) => {
      teachers.push({ id: d.id, ...d.data() })
    })
    const lastDoc = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.js:getTeachersPaginated',message:'success',data:{size:snapshot.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2b'})}).catch(()=>{});
    // #endregion
    return { teachers, lastDoc }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.js:getTeachersPaginated',message:'error',data:{message:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2a'})}).catch(()=>{});
    // #endregion
    console.error('Erreur lors de la récupération des professeurs:', error)
    throw error
  }
}

