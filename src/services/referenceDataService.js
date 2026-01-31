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
import { DEFAULT_ESTABLISHMENTS } from '../data/establishments'
import { DEFAULT_CLASSES } from '../data/classes'

const ESTABLISHMENTS_COLLECTION = 'establishments'
const CLASSES_COLLECTION = 'classes'
const PENDING_ESTABLISHMENTS_COLLECTION = 'pendingEstablishmentRequests'
const PENDING_CLASSES_COLLECTION = 'pendingClassRequests'

/**
 * Normalise un libellé : trim, espaces multiples → un seul espace
 */
function normalizeLabel(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Retourne la liste des établissements : liste par défaut + entrées Firestore (validées par les profs)
 */
export async function getEstablishments() {
  const fromDb = []
  try {
    const q = query(collection(db, ESTABLISHMENTS_COLLECTION))
    const snapshot = await getDocs(q)
    snapshot.forEach((d) => {
      const name = d.data().name
      if (name && !fromDb.includes(name)) fromDb.push(name)
    })
  } catch (err) {
    console.warn('referenceDataService getEstablishments:', err)
  }
  const combined = [...new Set([...DEFAULT_ESTABLISHMENTS, ...fromDb])]
  combined.sort((a, b) => a.localeCompare(b, 'fr'))
  // "Autre" toujours en tête
  const autre = combined.find((x) => x === 'Autre')
  if (autre) {
    return [autre, ...combined.filter((x) => x !== 'Autre')]
  }
  return combined
}

/**
 * Retourne la liste des classes : liste par défaut + entrées Firestore
 */
export async function getClasses() {
  const fromDb = []
  try {
    const q = query(collection(db, CLASSES_COLLECTION))
    const snapshot = await getDocs(q)
    snapshot.forEach((d) => {
      const name = d.data().name
      if (name && !fromDb.includes(name)) fromDb.push(name)
    })
  } catch (err) {
    console.warn('referenceDataService getClasses:', err)
  }
  const combined = [...new Set([...DEFAULT_CLASSES, ...fromDb])]
  combined.sort((a, b) => a.localeCompare(b, 'fr'))
  // "Autre" toujours en tête
  const autre = combined.find((x) => x === 'Autre')
  if (autre) {
    return [autre, ...combined.filter((x) => x !== 'Autre')]
  }
  return combined
}

/**
 * Crée une demande d'ajout d'établissement (élève)
 */
export async function createPendingEstablishmentRequest(userId, requestedValue) {
  const value = normalizeLabel(requestedValue)
  if (!value) throw new Error('Veuillez saisir un établissement.')
  const ref = await addDoc(collection(db, PENDING_ESTABLISHMENTS_COLLECTION), {
    requestedBy: userId,
    requestedValue: value,
    status: 'pending',
    createdAt: serverTimestamp()
  })
  return ref.id
}

/**
 * Crée une demande d'ajout de classe (élève)
 */
export async function createPendingClassRequest(userId, requestedValue) {
  const value = normalizeLabel(requestedValue)
  if (!value) throw new Error('Veuillez saisir une classe.')
  const ref = await addDoc(collection(db, PENDING_CLASSES_COLLECTION), {
    requestedBy: userId,
    requestedValue: value,
    status: 'pending',
    createdAt: serverTimestamp()
  })
  return ref.id
}

/**
 * Liste des demandes d'établissement en attente (profs)
 */
export async function getPendingEstablishmentRequests() {
  const q = query(
    collection(db, PENDING_ESTABLISHMENTS_COLLECTION),
    where('status', '==', 'pending')
  )
  const snapshot = await getDocs(q)
  const list = []
  snapshot.forEach((d) => {
    list.push({ id: d.id, ...d.data() })
  })
  list.sort((a, b) => {
    const ta = a.createdAt?.toDate?.()?.getTime() ?? 0
    const tb = b.createdAt?.toDate?.()?.getTime() ?? 0
    return tb - ta
  })
  return list
}

/**
 * Liste des demandes de classe en attente (profs)
 */
export async function getPendingClassRequests() {
  const q = query(
    collection(db, PENDING_CLASSES_COLLECTION),
    where('status', '==', 'pending')
  )
  const snapshot = await getDocs(q)
  const list = []
  snapshot.forEach((d) => {
    list.push({ id: d.id, ...d.data() })
  })
  list.sort((a, b) => {
    const ta = a.createdAt?.toDate?.()?.getTime() ?? 0
    const tb = b.createdAt?.toDate?.()?.getTime() ?? 0
    return tb - ta
  })
  return list
}

/**
 * Valide une demande d'établissement : ajoute l'entrée (libellé corrigé) et marque la demande approuvée
 * @param {string} resolvedBy - uid du prof qui valide (optionnel)
 */
export async function approveEstablishmentRequest(requestId, resolvedValue, resolvedBy = null) {
  const name = normalizeLabel(resolvedValue)
  if (!name) throw new Error('Libellé invalide.')
  const requestRef = doc(db, PENDING_ESTABLISHMENTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error('Demande introuvable ou déjà traitée.')
  }
  await addDoc(collection(db, ESTABLISHMENTS_COLLECTION), {
    name,
    createdAt: serverTimestamp()
  })
  await updateDoc(requestRef, {
    status: 'approved',
    resolvedValue: name,
    resolvedBy: resolvedBy || null,
    resolvedAt: serverTimestamp()
  })
  return name
}

/**
 * Rejette une demande d'établissement
 */
export async function rejectEstablishmentRequest(requestId, resolvedBy = null) {
  const requestRef = doc(db, PENDING_ESTABLISHMENTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error('Demande introuvable ou déjà traitée.')
  }
  await updateDoc(requestRef, {
    status: 'rejected',
    resolvedBy: resolvedBy || null,
    resolvedAt: serverTimestamp()
  })
}

/**
 * Valide une demande de classe
 * @param {string} resolvedBy - uid du prof qui valide (optionnel)
 */
export async function approveClassRequest(requestId, resolvedValue, resolvedBy = null) {
  const name = normalizeLabel(resolvedValue)
  if (!name) throw new Error('Libellé invalide.')
  const requestRef = doc(db, PENDING_CLASSES_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error('Demande introuvable ou déjà traitée.')
  }
  await addDoc(collection(db, CLASSES_COLLECTION), {
    name,
    createdAt: serverTimestamp()
  })
  await updateDoc(requestRef, {
    status: 'approved',
    resolvedValue: name,
    resolvedBy: resolvedBy || null,
    resolvedAt: serverTimestamp()
  })
  return name
}

/**
 * Rejette une demande de classe
 */
export async function rejectClassRequest(requestId, resolvedBy = null) {
  const requestRef = doc(db, PENDING_CLASSES_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error('Demande introuvable ou déjà traitée.')
  }
  await updateDoc(requestRef, {
    status: 'rejected',
    resolvedBy: resolvedBy || null,
    resolvedAt: serverTimestamp()
  })
}

/**
 * Rejette plusieurs demandes d'établissement
 */
export async function rejectEstablishmentRequests(requestIds, resolvedBy = null) {
  if (!requestIds?.length) return
  await Promise.all(requestIds.map((id) => rejectEstablishmentRequest(id, resolvedBy)))
}

/**
 * Rejette plusieurs demandes de classe
 */
export async function rejectClassRequests(requestIds, resolvedBy = null) {
  if (!requestIds?.length) return
  await Promise.all(requestIds.map((id) => rejectClassRequest(id, resolvedBy)))
}

/**
 * Supprime définitivement une demande d'établissement
 */
export async function deleteEstablishmentRequest(requestId) {
  const requestRef = doc(db, PENDING_ESTABLISHMENTS_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists()) return
  await deleteDoc(requestRef)
}

/**
 * Supprime définitivement une demande de classe
 */
export async function deleteClassRequest(requestId) {
  const requestRef = doc(db, PENDING_CLASSES_COLLECTION, requestId)
  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists()) return
  await deleteDoc(requestRef)
}

/**
 * Supprime définitivement plusieurs demandes d'établissement
 */
export async function deleteEstablishmentRequests(requestIds) {
  if (!requestIds?.length) return
  await Promise.all(requestIds.map((id) => deleteEstablishmentRequest(id)))
}

/**
 * Supprime définitivement plusieurs demandes de classe
 */
export async function deleteClassRequests(requestIds) {
  if (!requestIds?.length) return
  await Promise.all(requestIds.map((id) => deleteClassRequest(id)))
}
