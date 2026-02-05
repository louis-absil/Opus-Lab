import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const CONFIG_COLLECTION = 'config'
const PARCOURS_IMAGES_DOC = 'parcoursImages'

/**
 * Retourne les overrides d’images parcours (nœuds modifiés).
 * Chaque clé est un nodeId, la valeur est string (URL) ou { url, crop }.
 * @returns {Promise<Record<string, string|{ url: string, crop: { x: number, y: number, w: number, h: number } }>>}
 */
export async function getParcoursImageOverrides() {
  try {
    const ref = doc(db, CONFIG_COLLECTION, PARCOURS_IMAGES_DOC)
    const snap = await getDoc(ref)
    if (!snap.exists()) return {}
    const data = snap.data()
    return data.entries && typeof data.entries === 'object' ? data.entries : {}
  } catch (err) {
    console.warn('parcoursImagesService getParcoursImageOverrides:', err)
    return {}
  }
}

/**
 * Met à jour une entrée pour un nœud (override). Fusionne avec les overrides existants.
 * @param {string} nodeId
 * @param {string|{ url: string, crop?: { x: number, y: number, w: number, h: number } }} entry
 */
export async function setParcoursImageEntry(nodeId, entry) {
  const ref = doc(db, CONFIG_COLLECTION, PARCOURS_IMAGES_DOC)
  const current = await getParcoursImageOverrides()
  const next = { ...current, [nodeId]: entry }
  await setDoc(ref, { entries: next }, { merge: true })
}
