/**
 * Dérive des "notions globales" à partir des autoTags d'un exercice,
 * pour affichage sur les cartes sans spoiler le contenu.
 * (Pastille "Fonctions" exclue : tous les exercices ont des fonctions.)
 */

const NOTION_ORDER = ['Style', 'Cadences', 'Renversements', 'AccordsDe7e', 'Couleurs', 'Structure']

/** Tags qui déclenchent chaque notion (un tag peut appartenir à plusieurs notions) */
const NOTION_TAGS = {
  Style: ['Baroque', 'Classique', 'Romantique', 'Moderne'],
  Cadences: ['CadenceParfaite', 'CadenceImparfaite', 'CadencePlagale', 'CadenceRompue', 'DemiCadence', 'Cadence6/4'],
  Renversements: [
    'PremierRenversement',
    'SecondRenversement',
    'SeptièmePremierRenversement',
    'SeptièmeSecondRenversement',
    'SeptièmeTroisièmeRenversement',
    'RenversementsMultiples',
  ],
  AccordsDe7e: ['Septième', 'SeptièmePremierRenversement', 'SeptièmeSecondRenversement', 'SeptièmeTroisièmeRenversement'],
  Couleurs: [
    'Diminué',
    'Augmenté',
    'Napolitaine',
    'SixteAugmentée',
    'Allemande',
    'Française',
    'Italienne',
    'EmpruntModal',
  ],
  Structure: ['StructureComplexe', 'StructureMoyenne', 'MultiplesCadences'],
}

const NOTION_LABELS = {
  Style: null, // remplacé par le tag trouvé (Baroque, Classique, etc.)
  Cadences: 'Cadences',
  Renversements: 'Renversements',
  AccordsDe7e: '7e',
  Couleurs: 'Couleurs',
  Structure: 'Structure',
}

/** PascalCase (avec accents, éventuellement /) → snake_case minuscule sans accents, pour matcher les tags Firestore */
function toSnakeCase(str) {
  if (!str || typeof str !== 'string') return ''
  const noAccent = str.normalize('NFD').replace(/\u0300-\u036f/g, '')
  return noAccent
    .replace(/\//g, '_')
    .replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`)
    .replace(/^_/, '')
}

/**
 * Retourne la liste des notions globales pour l'affichage (ordre de priorité, sans doublon).
 * Les autoTags peuvent être en PascalCase (éditeur) ou snake_case minuscule (Firestore).
 * @param {string[]} autoTags - autoTags de l'exercice
 * @returns {string[]}
 */
export function getGlobalNotionsFromAutoTags(autoTags) {
  if (!Array.isArray(autoTags) || autoTags.length === 0) return []

  const raw = autoTags.map((t) => (t && typeof t === 'string' ? t.trim() : '')).filter(Boolean)
  const tagSet = new Set(raw)
  const result = []

  for (const notionKey of NOTION_ORDER) {
    const tags = NOTION_TAGS[notionKey]
    const foundTag = tags.find(
      (tag) => tagSet.has(tag) || tagSet.has(toSnakeCase(tag))
    )
    if (!foundTag) continue

    if (notionKey === 'Style') {
      result.push(foundTag)
    } else {
      result.push(NOTION_LABELS[notionKey])
    }
  }

  return result
}

/**
 * Retourne le tag brut (tel que dans autoTags) qui correspond à une étiquette de pastille.
 * Utilisé pour le filtre Mode Libre au clic sur une pastille notion.
 * @param {string[]} autoTags - autoTags de l'exercice
 * @param {string} displayLabel - étiquette affichée (ex. "Cadences", "Baroque", "7e")
 * @returns {string|null} - le tag tel que stocké dans l'exercice, ou null
 */
export function getTagForNotionLabel(autoTags, displayLabel) {
  if (!Array.isArray(autoTags) || !autoTags.length || !displayLabel || typeof displayLabel !== 'string') return null
  const raw = autoTags.map((t) => (t && typeof t === 'string' ? t.trim() : '')).filter(Boolean)
  const tagSet = new Set(raw)

  const displayNorm = (s) => (s || '').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  for (const notionKey of NOTION_ORDER) {
    const tags = NOTION_TAGS[notionKey]
    const labelForNotion = notionKey === 'Style' ? null : NOTION_LABELS[notionKey]
    const matchesLabel =
      notionKey === 'Style'
        ? tags.some((t) => t === displayLabel || displayNorm(toSnakeCase(t)) === displayNorm(displayLabel))
        : labelForNotion === displayLabel
    if (!matchesLabel) continue

    const foundTag = tags.find((tag) => tagSet.has(tag) || tagSet.has(toSnakeCase(tag)))
    if (!foundTag) continue
    const inRaw = raw.find((t) => t === foundTag || toSnakeCase(t) === toSnakeCase(foundTag))
    return inRaw != null ? inRaw : foundTag
  }
  return null
}
