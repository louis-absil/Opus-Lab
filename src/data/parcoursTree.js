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
  1: "Étage 1 – L'intuition",
  2: 'Étage 2 – La précision',
  3: 'Étage 3 – Couleur SD',
  4: 'Étage 4 – Chromatisme'
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
    unlockedChordKeys: ['I', 'V', 'I6', 'V6', 'V64'], // fondamentaux + renversés de base pour écoute
    shortLabel: 'T·D',
    subtitle: 'Polarité (T vs D)',
    description: 'Distinguer la fonction Tonique de la Dominante. Mélange de I et V (fondamentaux et renversés). La Cadence 6/4 compte comme D.'
  },
  'cadence-demi': {
    id: 'cadence-demi',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    shortLabel: '½ Cad.',
    subtitle: 'Demi-cadence',
    description: 'Phrase suspensive (fin sur V).'
  },
  'cadence-parfaite': {
    id: 'cadence-parfaite',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    shortLabel: 'Cad. V→I',
    subtitle: 'Cadence parfaite',
    description: 'Phrase conclusive (V → I).'
  },
  /** Nœud unifié : demi-cadence + cadence parfaite (choix entre les deux) */
  'cadence-demi-et-parfaite': {
    id: 'cadence-demi-et-parfaite',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'D'],
    shortLabel: '½ Cad. / Cad. V→I',
    subtitle: 'Demi-cadence ou cadence parfaite',
    description: 'Distinguer la demi-cadence (fin sur V) de la cadence parfaite (V → I).'
  },
  '1.2': {
    id: '1.2',
    type: NODE_TYPE_LEARNING,
    stage: 1,
    prereqs: ['1.1'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'IV', 'II', 'V', 'I6', 'V6', 'II6'],
    shortLabel: 'La SD',
    subtitle: 'Ajout de la Sous-Dominante',
    description: 'Ajout de la Sous-Dominante. Valider IV, ii, ii6… comme SD.'
  },
  'cadence-plagale': {
    id: 'cadence-plagale',
    type: NODE_TYPE_CADENCE,
    stage: 1,
    prereqs: ['1.2'],
    phase: PHASE_INTUITION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Cad. IV→I',
    subtitle: 'Cadence plagale',
    description: 'IV → I (couleur conclusive).'
  },

  // --- ÉTAGE 2 : La Précision T & D (Phase 2) ---
  '2.1': {
    id: '2.1',
    type: NODE_TYPE_LEARNING,
    stage: 2,
    prereqs: ['1.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    precisionFunctions: ['T'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'V', 'V6', 'V65', 'II6'],
    shortLabel: 'I vs I6',
    subtitle: 'État des lieux (T)',
    description: 'Préciser pour la Tonique : I (fondamental) ou I6 (renversement). SD et D restent en validation fonction simple.'
  },
  '2.2': {
    id: '2.2',
    type: NODE_TYPE_LEARNING,
    stage: 2,
    prereqs: ['2.1'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'V', 'V6', 'V64', 'cad64', 'V65', 'II6'],
    shortLabel: 'Cad. 6/4',
    subtitle: 'Quarte et Sixte',
    description: 'L’accord Cadence 6/4 (I6/4) doit être classé en fonction D (tension vers V).'
  },
  'cadence-parfaite-composee': {
    id: 'cadence-parfaite-composee',
    type: NODE_TYPE_CADENCE,
    stage: 2,
    prereqs: ['2.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Cad. 6/4→V→I',
    subtitle: 'Cadence parfaite composée',
    description: 'Cadence 6/4 → V → I.'
  },
  '2.3': {
    id: '2.3',
    type: NODE_TYPE_LEARNING,
    stage: 2,
    prereqs: ['2.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    precisionFunctions: ['T', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'V', 'V7', 'V6', 'V65', 'V64', 'II6'],
    shortLabel: 'V vs V7',
    subtitle: 'Nuances de D',
    description: 'Préciser pour la Dominante : V (triade) ou V7, et renversements V6, V6/5. SD reste en validation fonction simple.'
  },

  // --- ÉTAGE 3 : Couleur SD & Enrichissement (Phase 2 → 3) ---
  '3.1': {
    id: '3.1',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['2.3'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'II6'],
    shortLabel: 'IV vs ii',
    subtitle: 'Nuances de SD',
    description: 'Distinguer SD majeur (IV) et mineur (ii, ii6, ii6/5).'
  },
  '3.2': {
    id: '3.2',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['3.1'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'VII', 'VII6', 'VII7', 'II6'],
    shortLabel: 'D virtuose',
    subtitle: 'Virtuosité D',
    description: 'Renversements complexes de D (V4/3, V2) et accords de sensible (vii°, vii°6, vii°7).'
  },
  '3.3': {
    id: '3.3',
    type: NODE_TYPE_LEARNING,
    stage: 3,
    prereqs: ['3.2'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'VI', 'VI6', 'VII', 'VII6', 'VII7', 'II6'],
    shortLabel: 'vi',
    subtitle: 'Fausse Tonique',
    description: 'Introduction du VI (tonique parallèle et SD). vi6. Cadence rompue V → vi.'
  },
  'cadence-rompue': {
    id: 'cadence-rompue',
    type: NODE_TYPE_CADENCE,
    stage: 3,
    prereqs: ['3.3'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'V→vi',
    subtitle: 'Cadence rompue',
    description: 'V → vi (suspens).'
  },

  // --- ÉTAGE 4 : Chromatisme ---
  '4.1': {
    id: '4.1',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['3.3'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'N6', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'VI', 'VI6', 'VII', 'VII6', 'VII7', 'II6'],
    shortLabel: 'N6',
    subtitle: 'Sixte napolitaine',
    description: 'L’accord N6 (II♭6) dans le menu SD. Ne pas confondre avec IV ou ii6.'
  },
  '4.2': {
    id: '4.2',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.1'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'N6', 'V', 'V7', 'V65', 'V43', 'V2', 'V/V', 'VI', 'VI6', 'VII', 'VII6', 'VII7', 'II6'],
    shortLabel: 'V/V',
    subtitle: 'Dominante de Dominante',
    description: 'V7/V (dominante de la dominante). Distinguer V7/V et V/V.'
  },
  '4.3': {
    id: '4.3',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.2'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'N6', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'V/V', 'V65/V', 'V43/V', 'V2/V', 'VI', 'VI6', 'VII', 'VII6', 'VII7', 'II6'],
    shortLabel: 'V/V renv.',
    subtitle: 'Renversements V/V',
    description: 'V6/5 de V, V4/3 de V, V2 de V.'
  },
  '4.4': {
    id: '4.4',
    type: NODE_TYPE_LEARNING,
    stage: 4,
    prereqs: ['4.3'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    unlockedChordKeys: ['I', 'I6', 'IV', 'II', 'II6', 'II65', 'N6', 'V', 'V7', 'V6', 'V65', 'V43', 'V2', 'V/V', 'V65/V', 'V43/V', 'V2/V', 'V/VI', 'V/IV', 'VI', 'VI6', 'VII', 'VII6', 'VII7', 'II6'],
    shortLabel: 'Domin. sec.',
    subtitle: 'Dominantes secondaires',
    description: 'Généralisation : V/vi, V/IV, etc.'
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
    subtitle: 'Bilan T, SD & D',
    description: 'Révision de tout l\'étage 1 : polarité T/D, SD, demi-cadence, parfaite, plagale.'
  },
  'revision-etage-2': {
    id: 'revision-etage-2',
    type: NODE_TYPE_REVISION,
    stage: 2,
    prereqs: ['2.3'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Bilan précision',
    description: 'Révision de l\'étage 2 : I vs I6, Cad. 6/4, V vs V7, cadence parfaite composée.'
  },
  'revision-etage-3': {
    id: 'revision-etage-3',
    type: NODE_TYPE_REVISION,
    stage: 3,
    prereqs: ['cadence-rompue'],
    phase: PHASE_PRECISION,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Bilan couleurs & cadences',
    description: 'Révision de l\'étage 3 : IV/ii, D virtuose, vi, cadence rompue.'
  },
  'revision-etage-4': {
    id: 'revision-etage-4',
    type: NODE_TYPE_REVISION,
    stage: 4,
    prereqs: ['4.4'],
    phase: PHASE_MAITRISE,
    enabledFunctions: ['T', 'SD', 'D'],
    shortLabel: 'Révision',
    subtitle: 'Parcours complet',
    description: 'Révision de tout le parcours : N6, V/V, dominantes secondaires.'
  }
}

/** Ordre canonique des nœuds (pour affichage et dernier débloqué). Demi-cadence et cadence parfaite réunies en un niveau. */
export const PARCOURS_NODE_ORDER = [
  '1.1',
  'cadence-demi-et-parfaite',
  '1.2',
  'cadence-plagale',
  'revision-etage-1',
  '2.1',
  '2.2',
  'cadence-parfaite-composee',
  '2.3',
  'revision-etage-2',
  '3.1',
  '3.2',
  '3.3',
  'cadence-rompue',
  'revision-etage-3',
  '4.1',
  '4.2',
  '4.3',
  '4.4',
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
