/**
 * Illustrations pour les cartes du parcours (mode élève).
 * Images adaptées aux fonctions explorées dans chaque nœud (tension/résolution, passage, T-SD-D, etc.).
 * Sources : Unsplash, Pexels, Wikimedia Commons (licences libres). Pour Commons, utiliser wikimediaThumb(url) pour une miniature (évite le lag).
 * Cadrage : ratio 8:5 (w=800, h=500) pour une reconnaissance claire du sujet.
 * https://unsplash.com/license — https://www.pexels.com/creative-commons-images/
 */

/** Pexels : w=800, h=500, fit=crop pour un cadrage 8:5 */
const P = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop`

/** Pexels vue très large : w=1600, h=500 pour limiter le crop vertical (paysage panoramique) */
const Pwide = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600&h=500&fit=crop`

/** Unsplash : w=800, h=500, fit=crop pour un cadrage 8:5 */
const U = (timestamp, id) =>
  `https://images.unsplash.com/photo-${timestamp}-${id}?w=800&h=500&fit=crop&q=85&auto=format`

/**
 * Entrée image : URL seule (string) ou objet { url, crop } avec crop en 0–1 (x, y, w, h).
 * @typedef {string|{ url: string, crop: { x: number, y: number, w: number, h: number } }} ImageEntry
 */

/**
 * Extrait l’URL et le crop d’une entrée (string ou objet).
 * @param {ImageEntry} entry
 * @returns {{ url: string, crop: { x: number, y: number, w: number, h: number } | null }}
 */
export function getImageUrlAndCrop(entry) {
  if (entry == null) return { url: '', crop: null }
  if (typeof entry === 'string') return { url: entry, crop: null }
  const crop = entry.crop && typeof entry.crop === 'object' ? entry.crop : null
  return { url: entry.url || '', crop }
}

/**
 * URL d’image par nodeId — une image thématique par niveau (alignée sur les fonctions explorées).
 * Les valeurs peuvent être une URL (string) ou { url, crop } pour un recadrage.
 */
/**
 * Wikipedia / Wikimedia Commons : renvoie l’URL de la miniature pour éviter le lag
 * (fichiers originaux souvent 10–300+ Mo). Utiliser l’URL directe du fichier
 * (ex. copier « Lien » sur la page Fichier de Commons).
 * @param {string} fullUrl - URL directe (upload.wikimedia.org/.../commons/.../Nom.jpg)
 * @param {number} [width=800] - largeur de la miniature en px (400, 800, 1200…)
 * @returns {string} URL de la miniature
 */
export function wikimediaThumb(fullUrl, width = 800) {
  if (!fullUrl || typeof fullUrl !== 'string') return fullUrl
  if (fullUrl.includes('/thumb/')) return fullUrl
  const m = fullUrl.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)(.+)$/)
  if (!m) return fullUrl
  const [, base, path] = m
  const filename = path.replace(/^.*\//, '')
  return `${base}thumb/${path}/${width}px-${filename}`
}

export const PARCOURS_IMAGE_URLS = {
  // Étage 1 – Intuition
  '1.1': wikimediaThumb('https://upload.wikimedia.org/wikipedia/commons/0/05/Pieter_Bruegel_the_Elder-_The_Harvesters_-_Google_Art_Project.jpg'), // Seurat, tension → résolution
  'cadence-demi-et-parfaite': P(16806202),         // Sentier forêt (passage, ½ cad. / cad. V→I)
  '1.2': P(289327),                                // Pont / passage (préparation de la SD — transition vers D)
  'cadence-plagale': P(356658),                    // Intérieur église / piliers (calme, IV→I plagale)
  // Étage 2 – Précision
  '2.1': P(2372945),                              // Salle théâtre (état des lieux I vs I6)
  '2.2': P(1246078),                              // Escalier (marches, Cad. 6/4 — quarte et sixte)
  'cadence-parfaite-composee': P(2682462),         // Chemin (route 6/4→V→I)
  '2.3': P(2736150),                              // Escalier noir et blanc (nuance V vs V7)
  // Étage 3 – Couleur SD
  '3.1': P(1193743),                              // Palette couleurs (nuances SD IV vs ii)
  '3.5': P(1193743),                              // Couleurs du II (palette)
  '3.2': U(1564195690875, '46647afeecad'),        // Elbphilharmonie (virtuosité D)
  '3.2-vii7': U(1564195690875, '46647afeecad'),   // VII7 — 7e dim. / semi-dim.
  '3.3': P(775201),                               // Pont suspendu forêt (détour, vi fausse tonique)
  'cadence-rompue': P(9184517),                   // Ciel dramatique / éclair (suspense V→vi)
  '3.4': P(1193743),                              // IV6 vs VI (couleur SD)
  // Étage 4 – Chromatisme
  '4.1': P(12496244),                             // Naples — vue large (N6 sixte napolitaine)
  '4.2': P(1190297),                              // Suntory Hall Tokyo (V/V dominant)
  '4.3': P(1105666),                              // Teatro Colón (dominantes secondaires)
  '4.4': P(417074),                               // Lac et montagne (dominantes secondaires)
  '4.5': P(1190297),                              // Sixtes augmentées (dominant)
  '4.6': P(1246078),                              // 6/4 de suspension (escalier / suspension)
  'revision-etage-1': P(289327),                  // Révision étage 1 (pont / passage)
  'revision-etage-2': P(2682462),                 // Révision étage 2 (chemin)
  'revision-etage-3': P(9184517),                 // Révision étage 3 (ciel dramatique)
  'revision-etage-4': P(417074),                  // Révision parcours complet (lac et montagne)
}

/**
 * Thème d’illustration par nœud (classe CSS .campaign-card-illustration-{theme}).
 * Déplacé ici pour éviter l’export mixte dans CampaignMap.jsx qui cassait le Fast Refresh (HMR).
 */
export const NODE_ILLUSTRATIONS = {
  '1.1': 'foundation',
  'cadence-demi': 'path',
  'cadence-parfaite': 'home',
  'cadence-demi-et-parfaite': 'path',
  '1.2': 'trinity',
  'cadence-plagale': 'calm',
  '2.1': 'landmark',
  '2.2': 'steps',
  'cadence-parfaite-composee': 'road',
  '2.3': 'nuance',
  '3.1': 'color',
  '3.5': 'color',
  '3.2': 'virtuosity',
  '3.2-vii7': 'virtuosity',
  '3.3': 'detour',
  'cadence-rompue': 'suspense',
  '3.4': 'color',
  '4.1': 'napoli',
  '4.2': 'dominant',
  '4.3': 'secondary',
  '4.4': 'summit',
  '4.5': 'dominant',
  '4.6': 'steps',
  'revision-etage-1': 'path',
  'revision-etage-2': 'road',
  'revision-etage-3': 'path',
  'revision-etage-4': 'summit',
}
