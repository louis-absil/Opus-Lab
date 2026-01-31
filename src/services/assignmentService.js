import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

const ASSIGNMENTS_COLLECTION = 'assignments'
const DEFAULT_LIST_LIMIT = 30

/**
 * Crée un devoir (exercice assigné à une classe).
 * Dénormalise exerciseTitle et optionnellement exerciseThumbnail pour limiter les lectures Firestore.
 * @param {string} teacherId - uid du professeur
 * @param {string} teacherClassId - id du document teacherClasses
 * @param {string} exerciseId - id de l'exercice
 * @param {Object} options - { title?, dueDate?, exerciseTitle, exerciseThumbnail? }
 * @returns {Promise<{ id: string }>}
 */
export async function createAssignment(teacherId, teacherClassId, exerciseId, options = {}) {
  const { title = null, dueDate = null, exerciseTitle = '', exerciseThumbnail = null } = options
  if (!teacherId || !teacherClassId || !exerciseId) {
    throw new Error('teacherId, teacherClassId et exerciseId sont requis.')
  }
  const ref = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
    teacherId,
    teacherClassId,
    exerciseId,
    title: title && String(title).trim() ? String(title).trim() : null,
    dueDate: dueDate != null ? (dueDate instanceof Date ? dueDate : (dueDate?.toDate?.() ?? null)) : null,
    exerciseTitle: String(exerciseTitle || '').trim() || 'Exercice',
    exerciseThumbnail: exerciseThumbnail != null ? exerciseThumbnail : null,
    createdAt: serverTimestamp()
  })
  return { id: ref.id }
}

/**
 * Liste les devoirs du professeur (limité pour économiser les lectures).
 * @param {string} teacherId - uid du professeur
 * @param {number} maxCount - nombre max de devoirs (défaut 30)
 */
export async function getAssignmentsByTeacher(teacherId, maxCount = DEFAULT_LIST_LIMIT) {
  const q = query(
    collection(db, ASSIGNMENTS_COLLECTION),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  )
  const snapshot = await getDocs(q)
  const list = []
  snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }))
  return list
}

/**
 * Liste les devoirs d'une classe (pour l'élève ou le détail prof).
 * @param {string} teacherClassId - id du document teacherClasses
 * @param {number} maxCount - nombre max (défaut 30)
 */
export async function getAssignmentsByClass(teacherClassId, maxCount = DEFAULT_LIST_LIMIT) {
  if (!teacherClassId) return []
  const q = query(
    collection(db, ASSIGNMENTS_COLLECTION),
    where('teacherClassId', '==', teacherClassId),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  )
  const snapshot = await getDocs(q)
  const list = []
  snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }))
  return list
}

/**
 * Récupère un devoir par id.
 */
export async function getAssignmentById(assignmentId) {
  const ref = doc(db, ASSIGNMENTS_COLLECTION, assignmentId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Met à jour le titre et/ou la date limite d'un devoir.
 */
export async function updateAssignment(assignmentId, teacherId, data) {
  const ref = doc(db, ASSIGNMENTS_COLLECTION, assignmentId)
  const snap = await getDoc(ref)
  if (!snap.exists() || snap.data().teacherId !== teacherId) {
    throw new Error('Devoir introuvable ou vous n\'êtes pas le propriétaire.')
  }
  const updates = { updatedAt: serverTimestamp() }
  if (data.title !== undefined) updates.title = data.title && String(data.title).trim() ? String(data.title).trim() : null
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate != null ? (data.dueDate instanceof Date ? data.dueDate : (data.dueDate?.toDate?.() ?? null)) : null
  await updateDoc(ref, updates)
}

/**
 * Supprime un devoir.
 */
export async function deleteAssignment(assignmentId, teacherId) {
  const ref = doc(db, ASSIGNMENTS_COLLECTION, assignmentId)
  const snap = await getDoc(ref)
  if (!snap.exists() || snap.data().teacherId !== teacherId) {
    throw new Error('Devoir introuvable ou vous n\'êtes pas le propriétaire.')
  }
  await deleteDoc(ref)
}
