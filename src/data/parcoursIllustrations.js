/**
 * Illustrations pour les cartes du parcours (mode élève).
 * Images adaptées aux fonctions explorées dans chaque nœud (tension/résolution, passage, T-SD-D, etc.).
 * Sources : Unsplash et Pexels (licences libres, usage gratuit).
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
 * URL d’image par nodeId — une image thématique par niveau (alignée sur les fonctions explorées).
 */
export const PARCOURS_IMAGE_URLS = {
  // Étage 1 – Intuition
  '1.1': P(1202751),                               // Coucher de soleil (tension → résolution, stabilité vs tension)
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
  '3.2': U(1564195690875, '46647afeecad'),        // Elbphilharmonie (virtuosité D)
  '3.3': P(775201),                               // Pont suspendu forêt (détour, vi fausse tonique)
  'cadence-rompue': P(9184517),                   // Ciel dramatique / éclair (suspense V→vi)
  // Étage 4 – Chromatisme
  '4.1': P(12496244),                         // Naples — vue large (N6 sixte napolitaine ; idéal : panorama ville + Vésuve)
  '4.2': P(1190297),                              // Suntory Hall Tokyo (V/V dominant)
  '4.3': P(1105666),                              // Teatro Colón (dominantes secondaires)
  '4.4': P(417074),                               // Lac et montagne (sommet — dominantes secondaires)
  'revision-etage-1': P(289327),                  // Révision étage 1 (pont / passage)
  'revision-etage-2': P(2682462),                 // Révision étage 2 (chemin)
  'revision-etage-3': P(9184517),                 // Révision étage 3 (ciel dramatique)
  'revision-etage-4': P(417074),                  // Révision parcours complet (lac et montagne)
}
