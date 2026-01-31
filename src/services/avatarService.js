import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

const AVATAR_PATH = 'avatars'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Vérifie que le fichier est une image valide (type et taille).
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAvatarFile(file) {
  if (!file || !file.type) {
    return { valid: false, error: 'Fichier invalide.' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Format non accepté. Utilisez JPG, PNG, WebP ou GIF.' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: 'L\'image ne doit pas dépasser 2 Mo.' }
  }
  return { valid: true }
}

/**
 * Upload l'avatar dans Storage et retourne l'URL de téléchargement.
 * Chemin : avatars/{userId} (on écrase l'ancienne image).
 * @param {string} userId - ID utilisateur
 * @param {File} file - Fichier image
 * @returns {Promise<string>} URL publique de l'avatar
 */
export async function uploadAvatar(userId, file) {
  const validation = validateAvatarFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const path = `${AVATAR_PATH}/${userId}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: { uploadedBy: userId }
  })
  const url = await getDownloadURL(storageRef)
  return url
}
