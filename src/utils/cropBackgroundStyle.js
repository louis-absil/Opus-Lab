/**
 * Styles d'affichage pour une image recadrée en background, sans déformation (scale uniforme).
 * Utilisé par CampaignMap et ParcoursImagesEditor.
 */

const CARD_ASPECT_8_5 = 8 / 5

/**
 * Étend ou normalise le crop pour obtenir un rectangle 8:5 (sans déformer l'image au rendu).
 * @param {{ x: number, y: number, w: number, h: number }} crop - crop en 0-1
 * @returns {{ x: number, y: number, w: number, h: number }} crop effectif 8:5
 */
export function normalizeCropTo85(crop) {
  if (!crop || crop.w <= 0 || crop.h <= 0) return crop
  const currentRatio = crop.w / crop.h
  const targetRatio = CARD_ASPECT_8_5
  let x = crop.x
  let y = crop.y
  let w = crop.w
  let h = crop.h
  if (Math.abs(currentRatio - targetRatio) < 1e-6) return { x, y, w, h }
  if (currentRatio > targetRatio) {
    h = w / targetRatio
    if (h > 1) {
      h = 1
      w = h * targetRatio
    }
    y = clamp01(crop.y + (crop.h - h) / 2)
    if (y + h > 1) y = 1 - h
    if (y < 0) y = 0
  } else {
    w = h * targetRatio
    if (w > 1) {
      w = 1
      h = w / targetRatio
    }
    x = clamp01(crop.x + (crop.w - w) / 2)
    if (x + w > 1) x = 1 - w
    if (x < 0) x = 0
  }
  return { x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h) }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

/**
 * Calcule backgroundSize et backgroundPosition pour afficher la zone crop
 * sans déformer l'image (scale uniforme, overflow masqué).
 * @param {{ x: number, y: number, w: number, h: number }} crop - crop en 0-1 (sera normalisé 8:5 si besoin)
 * @param {number} [imageAspectRatio] - largeur/hauteur de l'image (défaut 1.6 pour thumbs 800×500)
 * @param {number} [containerAspectRatio] - largeur/hauteur du conteneur (défaut 2 = carte large)
 * @returns {{ backgroundSize: string, backgroundPosition: string }}
 */
export function getCropBackgroundStyle(crop, imageAspectRatio = 1.6, containerAspectRatio = 2) {
  if (!crop || crop.w <= 0 || crop.h <= 0) {
    return { backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  const c = normalizeCropTo85(crop)
  const scalePct = Math.max(
    100 / c.w,
    (100 * imageAspectRatio) / (c.h * containerAspectRatio)
  )
  const size = `${scalePct}% auto`
  // Avec background-size: scalePct% auto, la largeur image = scalePct% du conteneur ;
  // la hauteur image (en % de la hauteur conteneur) = (scalePct/100)*containerAspectRatio/imageAspectRatio
  const denomX = scalePct - 100
  const posX = denomX <= 0 ? 0 : (100 * c.x * scalePct) / denomX
  const imageHeightRatio = (scalePct / 100) * containerAspectRatio / imageAspectRatio
  const denomY = imageHeightRatio - 1
  const posY = Math.abs(denomY) < 1e-6 ? 0 : (100 * c.y * imageHeightRatio) / denomY
  return {
    backgroundSize: size,
    backgroundPosition: `${posX}% ${posY}%`,
  }
}
