/**
 * Liste blanche pour l’outil d’édition des images de parcours.
 * Seuls les emails (ou UID) listés peuvent accéder à /dashboard/parcours-images.
 * Variable d’environnement : VITE_PARCOURS_EDITOR_EMAIL (une adresse ou plusieurs séparées par des virgules).
 */

const fromEnv = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PARCOURS_EDITOR_EMAIL
  ? String(import.meta.env.VITE_PARCOURS_EDITOR_EMAIL).split(',').map((s) => s.trim()).filter(Boolean)
  : []

/** Emails autorisés à utiliser l’outil parcours-images (env + liste en dur si besoin). */
export const PARCOURS_EDITOR_ALLOWED_EMAILS = fromEnv.length > 0 ? fromEnv : []

/**
 * Vérifie si l’utilisateur courant peut accéder à l’outil.
 * @param {string|null|undefined} email - user.email
 * @param {string|null|undefined} uid - user.uid (optionnel, pour allowlist UID plus tard)
 * @returns {boolean}
 */
export function canAccessParcoursImagesEditor(email, uid = null) {
  if (!email && !uid) return false
  if (PARCOURS_EDITOR_ALLOWED_EMAILS.length === 0) return false
  if (email && PARCOURS_EDITOR_ALLOWED_EMAILS.includes(email)) return true
  return false
}
