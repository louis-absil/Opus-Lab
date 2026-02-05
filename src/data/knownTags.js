/**
 * Liste des tags connus pour l'autocomplete lors de l'édition manuelle des tags.
 * Alignée sur les tags générés par tagGenerator (generateAutoTags) et formations (getFormationTag).
 */

import { CLASSICAL_FORMATIONS, HORIZONS_FORMATIONS, CLASSICAL_GENRES, getFormationTag, getGenreTag } from './formations'

const formationTags = [
  ...CLASSICAL_FORMATIONS.map(f => getFormationTag(f.id)).filter(Boolean),
  ...HORIZONS_FORMATIONS.map(f => getFormationTag(f.id)).filter(Boolean)
]
const formationTagsUnique = [...new Set(formationTags)]
const genreTags = CLASSICAL_GENRES.map(g => getGenreTag(g.id)).filter(Boolean)

export const KNOWN_TAGS = [
  // Fonctions
  'Tonique',
  'Dominante',
  'SousDominante',
  // Cadences
  'CadenceParfaite',
  'CadenceImparfaite',
  'CadencePlagale',
  'CadenceRompue',
  'DemiCadence',
  'Cadence6/4',
  'MultiplesCadences',
  // Renversements
  'PremierRenversement',
  'SecondRenversement',
  'SeptièmePremierRenversement',
  'SeptièmeSecondRenversement',
  'SeptièmeTroisièmeRenversement',
  'RenversementsMultiples',
  // Extensions
  'Septième',
  'Neuvième',
  'Onzième',
  'Treizième',
  // Qualités
  'Diminué',
  'Augmenté',
  // Accords spéciaux
  'SixteAugmentée',
  'Allemande',
  'Française',
  'Italienne',
  'Napolitaine',
  'EmpruntModal',
  // Retards
  'Retard',
  'RetardTierce',
  // Structure
  'StructureComplexe',
  // Progressions
  'ProgressionII-V-I',
  'ProgressionCircleOfFifths',
  'ProgressionChromatic',
  'ProgressionDescendante',
  'ProgressionAscendante',
  // Contexte modal
  'Majeur',
  'Mineur',
  // Styles (périodes)
  'Baroque',
  'Classique',
  'Romantique',
  'Moderne',
  // Degrés (exemples courants)
  'DegréI',
  'DegréII',
  'DegréIII',
  'DegréIV',
  'DegréV',
  'DegréVI',
  'DegréVII',
  'Degré 1',
  'Degré 2',
  'Degré 3',
  'Degré 4',
  'Degré 5',
  'Degré 6',
  'Degré 7',
  // Formations (instrumentation) et Genres (type d'œuvre)
  ...formationTagsUnique,
  ...genreTags
]

/**
 * Filtre les tags connus selon une requête (pour autocomplete).
 * @param {string} query - Texte saisi
 * @returns {string[]} - Tags correspondants (max 10)
 */
export function filterKnownTags(query) {
  if (!query || typeof query !== 'string') return KNOWN_TAGS.slice(0, 10)
  const q = query.trim().toLowerCase()
  if (!q) return KNOWN_TAGS.slice(0, 10)
  return KNOWN_TAGS.filter(tag => tag.toLowerCase().includes(q)).slice(0, 10)
}
