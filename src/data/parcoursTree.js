/**
 * Arbre du mode Parcours – source de vérité
 * Étages 1–4 : nœuds d'apprentissage (briques) et nœuds cadence (points de contrôle)
 */

/** Phase UI : 1 = Intuition (validation fonction seule), 2 = Précision (QCM), 3 = Maîtrise (sélecteur complet) */
export const PHASE_INTUITION = 1
export const PHASE_PRECISION = 2
export const PHASE_MAITRISE = 3

/** Type de nœud */
export const NODE_TYPE_LEARNING = 'learning'
export const NODE_TYPE_CADENCE = 'cadence'
export const NODE_TYPE_REVISION = 'revision'

/** Titres des sections pour l'affichage regroupé (CampaignMap, etc.) */
export const STAGE_LABELS = {
  1: 'Phase 1 – Logique tonale',
  2: 'Phase 2 – Architecture & Précision',
  3: 'Phase 3 – Nuances diatoniques',
  4: 'Phase 4 – Chromatisme & Tensions'
}

/**
 * Définition complète de chaque nœud
 * @typedef {Object} NodeDef
 * @property {string} id - ID unique
 * @property {'learning'|'cadence'|'revision'} type - learning (brique) | cadence (point de contrôle) | revision (bilan)
 * @property {number} stage - Étage 1–4
 * @property {string[]} prereqs - IDs des nœuds à maîtriser pour débloquer
 * @property {number} phase - Phase UI par défaut (1|2|3)
 * @property {string[]} enabledFunctions - Boutons T/SD/D cliquables en phase 1/2 (ex. ['T','D'])
 * @property {string[]} [unlockedChordKeys] - Clés d'accords débloqués en phase 3 (ex. ['I','I6','V'])
 * @property {string[]} [precisionFunctions] - En phase 2/3, seules ces fonctions utilisent la clé précise (unlockedChordKeys). Les autres = validation fonction seule. Défaut: ['T','SD','D']
 * @property {string} shortLabel - Libellé court dans le cercle (ex. 'T', 'Cad.')
 * @property {string} subtitle - Sous-titre sous le cercle
 * @property {string} description - Description pour la modale
 */

export const PARCOURS_NODES = {
  // --- ÉTAGE 1 : L'Intuition (Phase 1) ---
  '1.1': {
    id: '1.1',
    type: NODE_TYPE_LEARNING,
    stage: 1,
    prereqs: [],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    unlockedChordKeys: ['I', 'V', 'I6', 'V6'], // fondamentaux + renversés de base pour écoute (V64 débloqué en 2.2)
    shortLabel: 'Tonique / Dominante',
    subtitle: 'Axe tonal (T, D)',
    description: 'Identifier les deux pôles magnétiques de la tonalité : la stabilité (T) et la tension (D).'
  },
  'cadence-demi': {
    id: 'cadence-demi',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    shortLabel: 'Demi-cadence',
    subtitle: 'Demi-cadence',
    description: 'Phrase suspensive (fin sur D).'
  },
  'cadence-parfaite': {
    id: 'cadence-parfaite',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    shortLabel: 'Cadence parfaite',
    subtitle: 'Cadence parfaite',
    description: 'Phrase conclusive (D→T).'
  },
  /** Nœud unifié : demi-cadence + cadence parfaite (choix entre les deux) */
  'cadence-demi-et-parfaite': {
    id: 'cadence-demi-et-parfaite',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    shortLabel: 'Demi-cadence / Cadence parfaite',
    subtitle: '½ Cad. & Cad. D→T',
    description: 'Distinguer l\'ouverture (suspens sur D) de la fermeture (résolution sur T).'
  },
  '1.2': {
    id: '1.2',
    type: NODE_TYPE_LEARNING,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'IV', 'II', 'V', 'I6', 'V6', 'II6'],
    shortLabel: 'Préparation de la Dominante',
    subtitle: 'Ouverture du champ (SD)',
    description: 'Perception de l\'éloignement tonal (Sous-Dominante) préparant la mise en tension.'
  },
  'cadence-plagale': {
    id: 'cadence-plagale',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.2'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Cadence plagale',
    subtitle: 'Résolution douce (SD→T)',
    description: 'Reconnaître la conclusion sans sensible, par opposition à la cadence parfaite.'
  },

  // --- ÉTAGE 2 : Architecture & Précision (Phase 2) ---
  '2.3': {
    id: '2.3',
    type: NODE_TYPE_LEARNING,
    stage: 2,
    prereqs: ['1.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    precisionFunctions: ['T', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'V', 'V7', 'V6', 'V65', 'V64', 'II6'],
    shortLabel: 'Densité de la Dominante',
    subtitle: 'Triade vs 7e (V, V7, V6/5)',
    description: 'Percevoir le degré de friction : V (pur), V7 (triton attractif) et son premier renversement V6/5.'
  },
  '2.1': {
    id: '2.1',
    type: NODE_TYPE_LEARNING,
    stage: 2,
    prereqs: ['2.3'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    precisionFunctions: ['T'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'V', 'V7', 'V6', 'V65', 'II6'],
    shortLabel: 'Stabilité & Renversement',
    subtitle: 'Fondamental vs 6 (I, I6)',
    description: 'Discriminer la solidité d\'une basse fondamentale vs la mobilité d\'un premier renversement.'
  },
  '2.2': {
    id: '2.2',
    type: NODE_TYPE_LEARNING,
    stage: 2,
    prereqs: ['2.1'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'V', 'V6', 'V64', 'cad64', 'V65', 'II6'],
    shortLabel: 'Accord de sixte et quarte',
    subtitle: '6/4 de cadence et 6/4 de passage',
    description: 'Identifier la double appogiature 6/4 (de cadence ou de passage) et son rôle de dominante.'
  },
  'cadence-parfaite-composee': {
    id: 'cadence-parfaite-composee',
    type: NODE_TYPE_CADENCE,
    stage: 2,
    prereqs: ['2.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Cadence parfaite composée',
    subtitle: 'Syntaxe complète — Sixte et quarte de cadence → V → I',
    description: 'Reconnaître la Cadence Parfaite Composée : Préparation (Cad. 6/4) → Tension (V) → Résolution (I).'
  },

  // --- ÉTAGE 3 : Nuances diatoniques (Phase 3) ---
  '3.1': {
    id: '3.1',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['cadence-parfaite-composee'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'II6'],
    shortLabel: 'Couleurs de Sous-Dominante',
    subtitle: 'IV, II, II6, II65',
    description: 'Nature des accords de sous-dominante, différentes selon le mode — Majeur, mineur, diminué.'
  },
  '3.5': {
    id: '3.5',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['3.1'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'II6'],
    shortLabel: 'Couleurs du deuxième degré',
    subtitle: 'II avec septième (II7, II4/3, II2)',
    description: 'Affiner la couleur sous-dominante du II grâce à la septième et à ses renversements (basses mobiles).'
  },
  '3.2': {
    id: '3.2',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['3.5'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'VII', 'VII6', 'VII64', 'II6'],
    shortLabel: 'Dominantes complexes',
    subtitle: 'Renversements & VII (V4/3, V2)',
    description: 'Identification des basses mobiles de dominante et de l\'accord diminué (sensible).'
  },
  '3.2-vii7': {
    id: '3.2-vii7',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['3.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6'],
    shortLabel: 'Septième de sensible (7e dim. / semi-dim.)',
    subtitle: 'VII7 et renversements (VII6/5, VII4/3, VII2)',
    description: 'Identifier l\'accord de sensible avec septième (diminuée ou semi-diminuée) et ses positions comme variantes de la fonction dominante.'
  },
  '3.3': {
    id: '3.3',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['3.2-vii7'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6'],
    shortLabel: 'Substitutions',
    subtitle: 'Le VI et le IV6',
    description: 'Repérer l\'ambiguïté fonctionnelle du VI (Tonique relative / Sous-Dominante), le IV au premier renversement (IV6) comme variante de couleur SD sur la même basse, et les enchaînements par tierces.'
  },
  'cadence-rompue': {
    id: 'cadence-rompue',
    type: NODE_TYPE_CADENCE,
    stage: 3,
    prereqs: ['3.3'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'La Rupture',
    subtitle: 'Cadence rompue (V→VI)',
    description: 'Identifier la résolution évitée (V → VI) et l\'effet de surprise harmonique.'
  },
  '3.4': {
    id: '3.4',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['cadence-rompue'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64'],
    shortLabel: 'Quatrième degré au premier renversement',
    subtitle: 'IV6 et VI — même basse, couleur différente (SD)',
    description: 'Distinguer le IV au premier renversement (IV6) du VI : même note à la basse, couleur différente, même rôle de sous-dominante (analogie IV vs II6).'
  },

  // --- ÉTAGE 4 : Chromatisme & Tensions (Phase 4) ---
  '4.1': {
    id: '4.1',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['3.4'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'N6', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64'],
    shortLabel: 'Accord napolitain',
    subtitle: 'Sixte napolitaine N6 IIb6 (Phrygien)',
    description: 'Reconnaître la couleur dramatique du II♭ et sa fonction SD.'
  },
  '4.2': {
    id: '4.2',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.1'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'N6', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'V/V', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64'],
    shortLabel: 'Tonicisation du V',
    subtitle: 'Dominante de la Dominante (V/V)',
    description: 'Entendre la sensible temporaire (#IV) créant un appel vers le V.'
  },
  '4.3': {
    id: '4.3',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.2'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'N6', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'V/V', 'V65/V', 'V43/V', 'V2/V', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64'],
    shortLabel: 'Renversements du V/V',
    subtitle: 'Renversements V/V (V6/5, V4/3, V2)',
    description: 'Percevoir la ligne de basse (fondamentale, 6/5, 4/3, 2) de la dominante secondaire et son rôle dans la tonicisation.'
  },
  '4.4': {
    id: '4.4',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.3'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'N6', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'V/V', 'V65/V', 'V43/V', 'V2/V', 'V/VI', 'V/IV', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64'],
    shortLabel: 'Dominantes secondaires',
    subtitle: 'Dominantes secondaires (V/II, V/IV, V/VI)',
    description: 'Généralisation du principe de tonicisation (V/II, V/IV, V/VI).'
  },
  '4.5': {
    id: '4.5',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.4'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'N6', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'V/V', 'V65/V', 'V43/V', 'V2/V', 'V/VI', 'V/IV', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64', 'It', 'Fr', 'Gr'],
    shortLabel: 'Sixtes augmentées',
    subtitle: 'Italienne, Française, Allemande (It+6, Fr+6, Gr+6)',
    description: 'Identifier les trois types de sixte augmentée et leur fonction de dominante (résolution vers V ou I6/4).'
  },
  '4.6': {
    id: '4.6',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.5'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'II7', 'II43', 'II2', 'N6', 'V', 'V7', 'V6', 'V64', 'V65', 'V43', 'V2', 'V/V', 'V65/V', 'V43/V', 'V2/V', 'V/VI', 'V/IV', 'VI', 'VI6', 'VII', 'VII6', 'VII64', 'VII7', 'VII65', 'VII43', 'VII2', 'II6', 'IV6', 'IV64', 'It', 'Fr', 'Gr', 'I64', 'II64', 'III64', 'VI64'],
    shortLabel: 'Sixte et quarte non fonctionnel',
    subtitle: 'Sensation de suspension',
    description: 'Percevoir le 6/4 comme position suspendue (appoggiature, pédale, couleur) en dehors du 6/4 de cadence.'
  },

  // --- Nœuds de révision (bilan, tout ce qui a été vu jusqu'à ce point) ---
  'revision-etage-1': {
    id: 'revision-etage-1',
    type: NODE_TYPE_REVISION,
    stage: 1,
    prereqs: ['cadence-plagale'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Bilan : Fondations',
    description: 'Validation des réflexes sur les fonctions primaires (T, SD, D).'
  },
  'revision-etage-2': {
    id: 'revision-etage-2',
    type: NODE_TYPE_REVISION,
    stage: 2,
    prereqs: ['cadence-parfaite-composee'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Bilan : Précision harmonique',
    description: 'Maîtrise de la conduite des voix et des renversements usuels.'
  },
  'revision-etage-3': {
    id: 'revision-etage-3',
    type: NODE_TYPE_REVISION,
    stage: 3,
    prereqs: ['3.4'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Bilan : Nuances',
    description: 'Validation de l\'écoute des degrés secondaires et des modes relatifs.'
  },
  'revision-etage-4': {
    id: 'revision-etage-4',
    type: NODE_TYPE_REVISION,
    stage: 4,
    prereqs: ['4.6'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Bilan final',
    description: 'Évaluation finale intégrant diatonisme et chromatisme en contexte réel.'
  }
}

/** Ordre canonique des nœuds (pour affichage et dernier débloqué). Demi-cadence et cadence parfaite réunies en un niveau. */
export const PARCOURS_NODE_ORDER = [
  '1.1',
  'cadence-demi-et-parfaite',
  '1.2',
  'cadence-plagale',
  'revision-etage-1',
  '2.3',
  '2.1',
  '2.2',
  'cadence-parfaite-composee',
  'revision-etage-2',
  '3.1',
  '3.5',
  '3.2',
  '3.2-vii7',
  '3.3',
  'cadence-rompue',
  '3.4',
  'revision-etage-3',
  '4.1',
  '4.2',
  '4.3',
  '4.4',
  '4.5',
  '4.6',
  'revision-etage-4'
]

/** Prérequis dérivés pour progressionService (compatibilité) */
export const NODE_PREREQUISITES = Object.fromEntries(
  PARCOURS_NODE_ORDER.map((id) => [id, PARCOURS_NODES[id]?.prereqs ?? []])
)

/**
 * Retourne la définition d'un nœud
 * @param {string} nodeId
 * @returns {NodeDef|undefined}
 */
export function getNodeDef(nodeId) {
  return PARCOURS_NODES[nodeId]
}

/**
 * Retourne la phase UI pour un nœud (peut être surclassée par la maîtrise si rejoué)
 * @param {string} nodeId
 * @param {Object} [nodeStats] - nodeStats[nodeId] (attempts, averageScore) pour déblocage phase supérieure
 * @returns {number} 1 | 2 | 3
 */
export function getNodePhase(nodeId, nodeStats) {
  const def = PARCOURS_NODES[nodeId]
  if (!def) return PHASE_INTUITION
  const basePhase = def.phase
  // Si l'utilisateur a déjà bien progressé sur ce nœud, débloquer la phase suivante (optionnel)
  const stats = nodeStats?.[nodeId]
  if (stats && (stats.attempts ?? 0) >= 3 && (stats.averageScore ?? 0) >= 75) {
    if (basePhase === PHASE_INTUITION) return PHASE_PRECISION
    if (basePhase === PHASE_PRECISION) return PHASE_MAITRISE
  }
  return basePhase
}

/**
 * Boutons T/SD/D activés pour un nœud (Fog of War phase 1/2)
 * @param {string} nodeId
 * @returns {string[]} ['T'] | ['T','D'] | ['T','SD','D']
 */
export function getEnabledFunctions(nodeId) {
  return PARCOURS_NODES[nodeId]?.enabledFunctions ?? ['T', 'SD', 'D']
}

/**
 * En phase 2/3, fonctions pour lesquelles on vérifie la clé précise (unlockedChordKeys).
 * Les autres fonctions = validation fonction seule (enabledFunctions).
 * @param {string} nodeId
 * @returns {string[]} ex. ['T'] pour 2.1 (I vs I6), ['T','SD','D'] par défaut
 */
export function getPrecisionFunctions(nodeId) {
  const def = PARCOURS_NODES[nodeId]
  const arr = def?.precisionFunctions
  if (arr != null) return arr
  if (def?.prereqs?.length > 0) return getPrecisionFunctions(def.prereqs[0])
  return ['T', 'SD', 'D']
}

/**
 * Clés d'accords débloqués pour un nœud en phase 3 (Fog of War).
 * Les nœuds cadence n'ont pas de liste propre : on utilise celle du nœud d'apprentissage prérequis.
 * @param {string} nodeId
 * @returns {string[]}
 */
export function getUnlockedChordKeys(nodeId) {
  const def = PARCOURS_NODES[nodeId]
  const keys = def?.unlockedChordKeys
  if (keys != null) return keys
  if (def?.prereqs?.length > 0) return getUnlockedChordKeys(def.prereqs[0])
  return []
}

/**
 * Indique si le nœud est une cadence (affichage doré / plus gros)
 * @param {string} nodeId
 * @returns {boolean}
 */
export function isCadenceNode(nodeId) {
  return PARCOURS_NODES[nodeId]?.type === NODE_TYPE_CADENCE
}

/**
 * Indique si le nœud est une révision (bilan)
 * @param {string} nodeId
 * @returns {boolean}
 */
export function isRevisionNode(nodeId) {
  return PARCOURS_NODES[nodeId]?.type === NODE_TYPE_REVISION
}

/** Mapping nœud cadence → value(s) du sélecteur (ChordSelectorModal CADENCES). Une valeur ou un tableau. */
const NODE_ID_TO_CADENCE_VALUE = {
  'cadence-demi': 'demi-cadence',
  'cadence-parfaite': 'perfect',
  'cadence-demi-et-parfaite': ['demi-cadence', 'perfect'],
  'cadence-plagale': 'plagal',
  'cadence-parfaite-composee': 'perfect',
  'cadence-rompue': 'rompue'
}

/**
 * Retourne la liste des valeurs de cadence **requises** pour ce nœud (au moins une doit être présente dans l'exercice).
 * Utilisé pour filtrer les exercices des nœuds cadence. Retourne [] pour les nœuds sans contrainte de cadence.
 * @param {string} nodeId
 * @returns {string[]} ex. ['plagal'] pour cadence-plagale, ['demi-cadence', 'perfect'] pour cadence-demi-et-parfaite
 */
export function getRequiredCadenceValues(nodeId) {
  const raw = NODE_ID_TO_CADENCE_VALUE[nodeId]
  if (raw == null) return []
  return Array.isArray(raw) ? [...raw] : [raw]
}

/**
 * Retourne la liste des valeurs de cadence débloquées (pour le sélecteur).
 * Les cadences s'accumulent : on inclut toutes les cadences des nœuds dans l'ordre du parcours
 * jusqu'au nœud courant inclus (demi → parfaite → plagale → …).
 * @param {string[]} [unlockedNodes] - IDs des nœuds débloqués (ex. progress.unlockedNodes) — utilisé en secours si currentNodeId absent
 * @param {string} [currentNodeId] - Nœud en cours (ex. nodeId du Player) — détermine la position dans le parcours
 * @returns {string[]} ex. ['demi-cadence', 'perfect', 'plagal']
 */
export function getUnlockedCadenceValues(unlockedNodes, currentNodeId) {
  const values = []
  const seen = new Set()
  if (currentNodeId) {
    const currentIndex = PARCOURS_NODE_ORDER.indexOf(currentNodeId)
    if (currentIndex >= 0) {
      for (let i = 0; i <= currentIndex; i++) {
        const nodeId = PARCOURS_NODE_ORDER[i]
        const raw = NODE_ID_TO_CADENCE_VALUE[nodeId]
        const toAdd = Array.isArray(raw) ? raw : (raw != null ? [raw] : [])
        for (const v of toAdd) {
          if (!seen.has(v)) {
            seen.add(v)
            values.push(v)
          }
        }
      }
    } else {
      const raw = NODE_ID_TO_CADENCE_VALUE[currentNodeId]
      const toAdd = Array.isArray(raw) ? raw : (raw != null ? [raw] : [])
      for (const v of toAdd) {
        if (!seen.has(v)) {
          seen.add(v)
          values.push(v)
        }
      }
    }
  }
  if (Array.isArray(unlockedNodes) && values.length === 0) {
    for (const nodeId of unlockedNodes) {
      const raw = NODE_ID_TO_CADENCE_VALUE[nodeId]
      const toAdd = Array.isArray(raw) ? raw : (raw != null ? [raw] : [])
      for (const v of toAdd) {
        if (!seen.has(v)) {
          seen.add(v)
          values.push(v)
        }
      }
    }
  }
  return values
}

/**
 * Indique si la section "Cadence" du sélecteur est disponible pour ce nœud en mode Parcours.
 * Si unlockedNodes est fourni, la section est dispo seulement s'il existe au moins une cadence débloquée.
 * Sinon (rétrocompat), on considère dispo dès que nodeId !== '1.1'.
 * @param {string} nodeId
 * @param {string[]} [unlockedNodes]
 * @returns {boolean}
 */
export function isCadenceAvailableForNode(nodeId, unlockedNodes) {
  if (!nodeId) return true
  return getUnlockedCadenceValues(unlockedNodes, nodeId).length > 0
}
