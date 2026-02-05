/**
 * Catégorise les tags d'exercices selon la théorie musicale.
 * Utilisé par FreeMode et Dashboard pour les filtres par tag.
 * @param {string[]} tags - Liste de tags (ex: autoTags)
 * @returns {Object} - Objet avec clés renversements, extensions, qualites, etc.
 */
export function categorizeTags(tags) {
  const categories = {
    renversements: [],
    extensions: [],
    qualites: [],
    accordsSpeciaux: [],
    cadences: [],
    retards: [],
    degres: [],
    structure: [],
    fonctionsHarmoniques: [],
    progressions: [],
    contexteModal: [],
    styles: [],
    formations: [],
    genres: []
  }

  const normalizeTagForExclusion = (tag) => tag.replace(/_/g, '').toLowerCase()
  const excludedTagsNormalized = ['renversementsmultiples']

  if (!Array.isArray(tags)) return categories

  tags.forEach((tag) => {
    if (excludedTagsNormalized.includes(normalizeTagForExclusion(tag))) return

    const tagLower = tag.toLowerCase()
    if (tagLower.includes('renversement')) {
      categories.renversements.push(tag)
    } else if (['septième', 'neuvième', 'onzième', 'treizième'].some((ext) => tagLower.includes(ext))) {
      categories.extensions.push(tag)
    } else if (['diminué', 'augmenté'].some((q) => tagLower.includes(q))) {
      categories.qualites.push(tag)
    } else if (['allemande', 'française', 'italienne', 'napolitaine', 'sixteaugmentée', 'sixte augmentée'].some((s) => tagLower.includes(s))) {
      categories.accordsSpeciaux.push(tag)
    } else if (tagLower.includes('cadence') || tagLower.includes('demi')) {
      categories.cadences.push(tag)
    } else if (tagLower.includes('retard')) {
      categories.retards.push(tag)
    } else if (tag.startsWith('Degré') || tagLower.startsWith('degre')) {
      categories.degres.push(tag)
    } else if (['structure', 'multiples', 'renversementsmultiples'].some((s) => tagLower.includes(s))) {
      if (!excludedTagsNormalized.includes(normalizeTagForExclusion(tag))) {
        categories.structure.push(tag)
      }
    } else if (['tonique', 'dominante', 'sousdominante', 'empruntmodal', 'emprunt modal'].some((f) => tagLower.includes(f))) {
      categories.fonctionsHarmoniques.push(tag)
    } else if (tagLower.includes('progression') || tagLower.includes('cycle') || tagLower.includes('chromatique') || tagLower.includes('descendante') || tagLower.includes('ascendante')) {
      categories.progressions.push(tag)
    } else if (['majeur', 'mineur'].some((m) => tagLower === m)) {
      categories.contexteModal.push(tag)
    } else if (['baroque', 'classique', 'romantique', 'moderne'].some((s) => tagLower === s)) {
      categories.styles.push(tag)
    } else if (tag.startsWith('Formation')) {
      categories.formations.push(tag)
    } else if (tag.startsWith('Genre')) {
      categories.genres.push(tag)
    }
  })

  Object.keys(categories).forEach((key) => {
    categories[key].sort()
  })
  return categories
}

/** Labels d'affichage pour chaque catégorie (bloc Tags) */
export const TAG_CATEGORY_LABELS = {
  renversements: 'Renversements',
  extensions: 'Extensions',
  qualites: 'Qualités',
  accordsSpeciaux: 'Accords spéciaux',
  cadences: 'Cadences',
  retards: 'Retards',
  degres: 'Degrés',
  structure: 'Structure',
  fonctionsHarmoniques: 'Fonctions harmoniques',
  progressions: 'Progressions harmoniques',
  contexteModal: 'Contexte modal',
  styles: 'Période stylistique',
  formations: 'Formation (instrumentation)',
  genres: "Genre (type d'œuvre)"
}
