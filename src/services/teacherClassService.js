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
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { updateUserProfile } from './userService'

const TEACHER_CLASSES_COLLECTION = 'teacherClasses'

/**
 * Génère un code court unique (lettres + chiffres, 8 caractères)
 */
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Crée une classe pour un professeur
 * @param {string} teacherId - uid du professeur
 * @param {string} name - nom affiché de la classe (ex. "1ère S – Groupe A")
 * @param {string} [code] - code optionnel ; si absent, un code unique est généré
 * @returns {Promise<{ id: string, name: string, code: string }>}
 */
export async function createTeacherClass(teacherId, name, code = null) {
  const trimmedName = (name || '').trim()
  if (!trimmedName) throw new Error('Veuillez saisir un nom pour la classe.')

  let finalCode = (code || '').trim().toUpperCase()
  if (!finalCode) finalCode = generateCode()

  const existing = await getTeacherClassByCode(finalCode)
  if (existing) {
    if ((code || '').trim()) throw new Error('Ce code est déjà utilisé. Choisissez un autre code.')
    finalCode = generateCode()
    const retry = await getTeacherClassByCode(finalCode)
    if (retry) finalCode = finalCode + '-' + Date.now().toString(36).slice(-4)
  }

  const ref = await addDoc(collection(db, TEACHER_CLASSES_COLLECTION), {
    teacherId,
    name: trimmedName,
    code: finalCode,
    createdAt: serverTimestamp()
  })

  return { id: ref.id, name: trimmedName, code: finalCode }
}

/**
 * Liste les classes d'un professeur
 * @param {string} teacherId - uid du professeur
 * @returns {Promise<Array<{ id: string, teacherId: string, name: string, code: string, createdAt }>>}
 */
export async function getTeacherClasses(teacherId) {
  const q = query(
    collection(db, TEACHER_CLASSES_COLLECTION),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  const list = []
  snapshot.forEach((d) => {
    list.push({ id: d.id, ...d.data() })
  })
  return list
}

/**
 * Récupère une classe par son id
 * @param {string} classId - id du document teacherClasses
 */
export async function getTeacherClassById(classId) {
  const ref = doc(db, TEACHER_CLASSES_COLLECTION, classId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Récupère une classe par son code (insensible à la casse)
 * @param {string} code - code saisi par l'élève
 */
export async function getTeacherClassByCode(code) {
  const normalized = (code || '').trim().toUpperCase()
  if (!normalized) return null
  const q = query(
    collection(db, TEACHER_CLASSES_COLLECTION),
    where('code', '==', normalized)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const d = snapshot.docs[0]
  return { id: d.id, ...d.data() }
}

/**
 * Met à jour le nom d'une classe (le propriétaire uniquement)
 */
export async function updateTeacherClass(classId, teacherId, data) {
  const ref = doc(db, TEACHER_CLASSES_COLLECTION, classId)
  const snap = await getDoc(ref)
  if (!snap.exists() || snap.data().teacherId !== teacherId) {
    throw new Error('Classe introuvable ou vous n\'êtes pas le propriétaire.')
  }
  const updates = { updatedAt: serverTimestamp() }
  if (data.name !== undefined) updates.name = (data.name || '').trim()
  await updateDoc(ref, updates)
}

/**
 * Supprime une classe (le propriétaire uniquement). Les élèves gardent teacherId/teacherClassId.
 */
export async function deleteTeacherClass(classId, teacherId) {
  const ref = doc(db, TEACHER_CLASSES_COLLECTION, classId)
  const snap = await getDoc(ref)
  if (!snap.exists() || snap.data().teacherId !== teacherId) {
    throw new Error('Classe introuvable ou vous n\'êtes pas le propriétaire.')
  }
  await deleteDoc(ref)
}

/**
 * Fait rejoindre une classe à un élève via le code
 * @param {string} userId - uid de l'élève
 * @param {string} code - code de la classe
 * @returns {Promise<{ name: string }>} - nom de la classe rejointe
 */
export async function joinTeacherClass(userId, code) {
  const tc = await getTeacherClassByCode(code)
  if (!tc) throw new Error('Code invalide. Vérifiez le code fourni par votre professeur.')

  await updateUserProfile(userId, {
    teacherClassId: tc.id,
    teacherId: tc.teacherId
  })
  return { name: tc.name }
}

/**
 * Fait quitter la classe de l'élève
 * @param {string} userId - uid de l'élève
 */
export async function leaveTeacherClass(userId) {
  await updateUserProfile(userId, {
    teacherClassId: null,
    teacherId: null
  })
}
