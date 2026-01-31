/**
 * Illustrations pour les cartes Nouveaux Horizons (styles : film, JV, anime, variété, pop).
 * Une image thématique par style de musique.
 * Sources : Pexels et Unsplash (licences libres, usage gratuit).
 * Cadrage : ratio 8:5 (w=800, h=500) pour cohérence avec le parcours.
 * https://unsplash.com/license — https://www.pexels.com/creative-commons-images/
 */

/** Pexels : w=800, h=500, fit=crop pour un cadrage 8:5 */
const P = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop`

/**
 * URL d'image par style Horizons (film, game, anime, variety, pop).
 */
export const HORIZONS_IMAGE_URLS = {
  film: P(269140),           // Salle de cinéma / projecteur
  game: P(442576),          // Setup gaming / jeu vidéo
  anime: P(2674098),        // Univers coloré / illustration
  variety: P(2744364),       // Scène / concert / variété
  pop: P(1763075),          // Concert / ambiance musique pop
}
