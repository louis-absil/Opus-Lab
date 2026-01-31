import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'
import { countRelevantChords, isExerciseSuitableForNode } from '../utils/nodeCriteria'
import { getUnlockedCadenceValues } from '../data/parcoursTree'

/**
 * Récupère tous les exercices d'un auteur
 */
export async function getExercisesByAuthor(authorId) {
  try {
    const q = query(
      collection(db, 'exercises'),
      where('authorId', '==', authorId)
    )
    const querySnapshot = await getDocs(q)
    const exercises = []
    querySnapshot.forEach((doc) => {
      exercises.push({
        id: doc.id,
        ...doc.data()
      })
    })
    // Trier par date de création (plus récent en premier)
    exercises.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })
    return exercises
  } catch (error) {
    console.error('Erreur lors de la récupération des exercices:', error)
    throw error
  }
}

/**
 * Récupère tous les exercices (pour les profs : vue "Tous les exercices")
 */
export async function getAllExercisesForTeachers() {
  try {
    const q = query(collection(db, 'exercises'))
    const querySnapshot = await getDocs(q)
    const exercises = []
    querySnapshot.forEach((docSnap) => {
      exercises.push({
        id: docSnap.id,
        ...docSnap.data()
      })
    })
    exercises.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })
    return exercises
  } catch (error) {
    console.error('Erreur lors de la récupération des exercices:', error)
    throw error
  }
}

/**
 * Récupère un exercice par son ID
 */
export async function getExerciseById(exerciseId) {
  try {
    const docRef = doc(db, 'exercises', exerciseId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      }
    } else {
      return null
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'exercice:', error)
    throw error
  }
}

/**
 * Recherche des exercices publics avec filtres
 */
export async function searchPublicExercises(filters = {}) {
  try {
    let q = query(
      collection(db, 'exercises'),
      where('status', '==', 'published')
    )
    
    // Filtre par compositeur
    if (filters.composer) {
      q = query(q, where('metadata.composer', '==', filters.composer))
    }
    
    // Filtre par difficulté
    if (filters.difficulty) {
      q = query(q, where('metadata.difficulty', '==', filters.difficulty))
    }
    
    // Filtre par tags (autoTags contient un tag spécifique)
    // Note: Firestore ne supporte pas les requêtes "array-contains-any" directement
    // On va récupérer tous les exercices publics et filtrer côté client
    const querySnapshot = await getDocs(q)
    const exercises = []
    
    querySnapshot.forEach((doc) => {
      exercises.push({
        id: doc.id,
        ...doc.data()
      })
    })

    // Nouveaux Horizons : ne filtrer par section que lorsqu'on demande explicitement les horizons
    // Sinon on renvoie tous les exercices publiés (y compris classiques sans section, pour éviter que des exercices publiés n'apparaissent nulle part)
    if (filters.onlyHorizons) {
      exercises = exercises.filter(ex => ex.metadata?.section === 'horizons')
    }

    // Filtrer par musicCategory si onlyHorizons et qu'un style est demandé
    if (filters.onlyHorizons && filters.musicCategory) {
      exercises = exercises.filter(ex => ex.metadata?.musicCategory === filters.musicCategory)
    }

    // Filtrer par tags côté client si nécessaire
    if (filters.tags && filters.tags.length > 0) {
      return exercises.filter(exercise => {
        const exerciseTags = exercise.autoTags || []
        return filters.tags.some(tag => exerciseTags.includes(tag))
      })
    }
    
    // Filtrer par type d'accord (ex: "Contient des 6tes Augmentées")
    if (filters.chordType) {
      return exercises.filter(exercise => {
        const exerciseTags = exercise.autoTags || []
        return exerciseTags.some(tag => 
          tag.toLowerCase().includes(filters.chordType.toLowerCase())
        )
      })
    }
    
    // Recherche textuelle (filtrage côté client)
    // Recherche dans workTitle, exerciseTitle, et composer
    if (filters.searchText && filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase().trim()
      return exercises.filter(exercise => {
        const workTitle = exercise.metadata?.workTitle || ''
        const exerciseTitle = exercise.metadata?.exerciseTitle || ''
        const composer = exercise.metadata?.composer || ''
        return (
          workTitle.toLowerCase().includes(searchLower) ||
          exerciseTitle.toLowerCase().includes(searchLower) ||
          composer.toLowerCase().includes(searchLower)
        )
      })
    }
    
    // Filtre par genre (inféré depuis workTitle)
    if (filters.genre) {
      return exercises.filter(exercise => {
        const workTitle = exercise.metadata?.workTitle || ''
        return workTitle.toLowerCase().includes(filters.genre.toLowerCase())
      })
    }
    
    return exercises
  } catch (error) {
    console.error('Erreur lors de la recherche d\'exercices:', error)
    throw error
  }
}

/**
 * Récupère les derniers exercices publics ajoutés (tri par createdAt décroissant)
 */
export async function getLatestPublicExercises(limit = 10) {
  try {
    const exercises = await searchPublicExercises({})
    const sorted = [...exercises].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0)
      const dateB = b.createdAt?.toDate?.() || new Date(0)
      return dateB - dateA
    })
    return sorted.slice(0, limit)
  } catch (error) {
    console.error('Erreur lors de la récupération des derniers exercices:', error)
    throw error
  }
}

/**
 * Récupère un exercice aléatoire parmi les exercices publics
 */
export async function getRandomPublicExercise(filters = {}) {
  try {
    const exercises = await searchPublicExercises(filters)
    
    if (exercises.length === 0) {
      return null
    }
    
    // Sélectionner un exercice aléatoire
    const randomIndex = Math.floor(Math.random() * exercises.length)
    return exercises[randomIndex]
  } catch (error) {
    console.error('Erreur lors de la récupération d\'un exercice aléatoire:', error)
    throw error
  }
}

/**
 * Crée un nouvel exercice
 */
export async function createExercise(exerciseData) {
  try {
    const docRef = await addDoc(collection(db, 'exercises'), {
      ...exerciseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error('Erreur lors de la création de l\'exercice:', error)
    throw error
  }
}

/**
 * Met à jour un exercice existant
 */
export async function updateExercise(exerciseId, exerciseData) {
  try {
    const docRef = doc(db, 'exercises', exerciseId)
    await updateDoc(docRef, {
      ...exerciseData,
      updatedAt: serverTimestamp()
    })
    return exerciseId
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'exercice:', error)
    throw error
  }
}

/**
 * Supprime un exercice
 */
export async function deleteExercise(exerciseId) {
  try {
    const docRef = doc(db, 'exercises', exerciseId)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'exercice:', error)
    throw error
  }
}

/**
 * Duplique un exercice (crée une copie)
 */
export async function duplicateExercise(exerciseId, newAuthorId, newAuthorName) {
  try {
    const originalExercise = await getExerciseById(exerciseId)
    if (!originalExercise) {
      throw new Error('Exercice introuvable')
    }
    
    // Créer une copie sans l'ID et les timestamps
    const { id, createdAt, updatedAt, ...exerciseData } = originalExercise
    
    const newExercise = {
      ...exerciseData,
      authorId: newAuthorId,
      authorName: newAuthorName,
      metadata: {
        ...exerciseData.metadata,
        title: `${exerciseData.metadata.title} (Copie)`
      },
      status: 'draft'
    }
    
    return await createExercise(newExercise)
  } catch (error) {
    console.error('Erreur lors de la duplication de l\'exercice:', error)
    throw error
  }
}

/**
 * Recherche les exercices utilisant la même vidéo YouTube
 */
export async function findExercisesByVideoId(videoId) {
  try {
    const q = query(
      collection(db, 'exercises'),
      where('video.id', '==', videoId)
    )
    const querySnapshot = await getDocs(q)
    const exercises = []
    querySnapshot.forEach((doc) => {
      exercises.push({
        id: doc.id,
        ...doc.data()
      })
    })
    return exercises
  } catch (error) {
    console.error('Erreur lors de la recherche d\'exercices par vidéo:', error)
    throw error
  }
}

/**
 * Récupère un exercice adapté pour un nœud de progression
 * Sélectionne un exercice qui contient au moins 2-3 accords pertinents pour le nœud
 */
export async function getExercisesForNode(nodeId) {
  try {
    // Récupérer tous les exercices publics
    const allExercises = await searchPublicExercises({})
    
    // Filtrer les exercices qui conviennent pour le nœud
    // (assez d'accords pertinents ET pas de concepts avancés interdits)
    const suitableExercises = allExercises.filter(exercise => {
      return isExerciseSuitableForNode(exercise, nodeId, 2)
    })
    
    if (suitableExercises.length === 0) {
      console.warn(`Aucun exercice trouvé pour le nœud ${nodeId}`)
      return null
    }
    
    // Sélectionner un exercice aléatoire parmi ceux qui conviennent
    const randomIndex = Math.floor(Math.random() * suitableExercises.length)
    const exercise = suitableExercises[randomIndex]
    return exercise
  } catch (error) {
    console.error('Erreur lors de la récupération d\'un exercice pour le nœud:', error)
    return null
  }
}

