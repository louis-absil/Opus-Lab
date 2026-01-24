/**
 * Utilitaires pour la théorie des fonctions de Riemann
 * Mapping des fonctions (T, SD, D) vers les degrés
 */

// Mapping des fonctions vers les degrés
export const FUNCTION_TO_DEGREES = {
  T: ['I', 'VI', 'III'], // Tonique : I (principal), VI et III (parallèles)
  SD: ['IV', 'II', 'VI'], // Sous-Dominante : IV (principal), II et VI (parallèles)
  D: ['V', 'VII', 'III']  // Dominante : V (principal), VII et III (parallèles)
}

// Mapping inverse : degré vers fonction(s)
// Note: III et VI peuvent appartenir à plusieurs fonctions selon le contexte
export const DEGREE_TO_FUNCTIONS = {
  'I': ['T'],
  'II': ['SD'],
  'III': ['T', 'D'],  // III peut être Tp ou Dp
  'IV': ['SD'],
  'V': ['D'],
  'VI': ['T', 'SD'],  // VI peut être Tp ou SDp (pas Dp)
  'VII': ['D']
}

// Degrés principaux pour chaque fonction
export const PRIMARY_DEGREES = {
  'T': ['I'],
  'SD': ['IV'],
  'D': ['V']
}

// Degrés parallèles pour chaque fonction
export const PARALLEL_DEGREES = {
  'T': ['III', 'VI'],
  'SD': ['II', 'VI'],
  'D': ['VII', 'III']  // III est aussi Dp, mais VI n'est que Tp et SDp
}

// Couleurs pour chaque fonction
export const FUNCTION_COLORS = {
  T: {
    primary: '#3b82f6',   // Bleu
    secondary: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  SD: {
    primary: '#f59e0b',   // Orange
    secondary: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  D: {
    primary: '#ef4444',  // Rouge
    secondary: '#f87171',
    glow: 'rgba(239, 68, 68, 0.4)'
  }
}

/**
 * Obtient la fonction d'un degré
 * @param {string} degree - Le degré (I, II, III, etc.)
 * @returns {string[]} - Tableau des fonctions associées
 */
export function getFunctionFromDegree(degree) {
  return DEGREE_TO_FUNCTIONS[degree] || []
}

/**
 * Obtient les degrés d'une fonction
 * @param {string} functionName - La fonction (T, SD, D)
 * @returns {string[]} - Tableau des degrés associés
 */
export function getDegreesFromFunction(functionName) {
  return FUNCTION_TO_DEGREES[functionName] || []
}

/**
 * Vérifie si deux degrés appartiennent à la même fonction
 * @param {string} degree1 - Premier degré
 * @param {string} degree2 - Deuxième degré
 * @returns {boolean} - True si les degrés partagent au moins une fonction
 */
export function areDegreesInSameFunction(degree1, degree2) {
  const func1 = getFunctionFromDegree(degree1)
  const func2 = getFunctionFromDegree(degree2)
  return func1.some(f => func2.includes(f))
}

/**
 * Normalise un degré en majuscules pour la comparaison
 * Utilise directement le champ 'degree' si disponible, sinon extrait depuis root ou displayLabel
 * @param {Object} chord - Objet accord avec degree, root, ou displayLabel
 * @returns {string|null} - Degré normalisé en majuscules (I, II, III, etc.) ou null
 */
function normalizeDegree(chord) {
  // Si le champ 'degree' existe directement, l'utiliser (c'est le plus fiable)
  if (chord.degree) {
    return chord.degree.toUpperCase()
  }
  // Sinon, essayer d'extraire depuis root
  if (chord.root) {
    return chord.root.toUpperCase()
  }
  // En dernier recours, extraire depuis displayLabel (en gérant majuscules et minuscules)
  if (chord.displayLabel) {
    // Regex qui accepte majuscules et minuscules (i flag)
    const match = chord.displayLabel.match(/^[♭#]?([ivx]+)/i)?.[1]
    if (match) {
      return match.toUpperCase()
    }
  }
  return null
}

/**
 * Normalise un chiffrage pour la comparaison
 * Le chiffrage "5" (état fondamental) est équivalent à l'absence de chiffrage
 * @param {string} figure - Le chiffrage à normaliser
 * @returns {string} - Chiffrage normalisé (chaîne vide si "5" ou vide)
 */
function normalizeFigure(figure) {
  const normalized = (figure || '').toString().trim()
  // "5" représente l'état fondamental, équivalent à l'absence de chiffrage
  return normalized === '5' ? '' : normalized
}

/**
 * Normalise une cadence pour la comparaison
 * Gère les variations de nommage (ex: 'deceptive' vs 'rompue', 'half' vs 'demi-cadence')
 * @param {string} cadence - La cadence à normaliser
 * @returns {string|null} - Cadence normalisée ou null
 */
function normalizeCadence(cadence) {
  if (!cadence) return null
  const normalized = cadence.toString().trim().toLowerCase()
  
  // Mapping des variations
  const cadenceMap = {
    'perfect': 'perfect',
    'imperfect': 'imperfect',
    'plagal': 'plagal',
    'rompue': 'rompue',
    'deceptive': 'rompue', // 'deceptive' = 'rompue'
    'évitée': 'évitée',
    'demi-cadence': 'demi-cadence',
    'half': 'demi-cadence', // 'half' = 'demi-cadence'
    'demie-cadence': 'demi-cadence'
  }
  
  return cadenceMap[normalized] || normalized
}

/**
 * Compare une réponse utilisateur avec la solution correcte
 * Retourne un objet avec le niveau de précision et le score
 * @param {Object} userAnswer - Réponse de l'utilisateur { degree, root, displayLabel, figure, cadence, ... }
 * @param {Object} correctAnswer - Solution correcte { degree, root, displayLabel, figure, cadence, ... }
 * @param {string} selectedFunction - Fonction sélectionnée par l'utilisateur (optionnel)
 * @returns {Object} - { level: 1|2|3, score: 0-100, cadenceBonus: 0-10, feedback: string }
 */
export function validateAnswerWithFunctions(userAnswer, correctAnswer, selectedFunction = null) {
  if (!userAnswer || !correctAnswer) {
    return {
      level: 0,
      score: 0,
      cadenceBonus: 0,
      feedback: 'Réponse manquante'
    }
  }

  // Normaliser les degrés en majuscules pour la comparaison (indépendamment du mode)
  const userRoot = normalizeDegree(userAnswer)
  const correctRoot = normalizeDegree(correctAnswer)

  // Vérifier la cadence (bonus si correcte, pas de pénalité si absente)
  let cadenceBonus = 0
  const userCadence = normalizeCadence(userAnswer.cadence)
  const correctCadence = normalizeCadence(correctAnswer.cadence)
  
  // Bonus de 10 points si la cadence est correcte (seulement si une cadence est attendue)
  if (correctCadence && userCadence && userCadence === correctCadence) {
    cadenceBonus = 10
  }
  // Pas de pénalité si l'utilisateur n'a pas mis de cadence ou si aucune cadence n'est attendue

  // Si on a les degrés normalisés, comparer directement
  if (userRoot && correctRoot) {
    // Vérifier aussi le chiffrage (figure) pour une validation complète
    // Normaliser les figures : "5" (état fondamental) = absence de chiffrage
    const userFigure = normalizeFigure(userAnswer.figure)
    const correctFigure = normalizeFigure(correctAnswer.figure)
    
    // Niveau 1 : Réponse parfaite (même degré + même chiffrage)
    if (userRoot === correctRoot && userFigure === correctFigure) {
      return {
        level: 1,
        score: 100,
        cadenceBonus: cadenceBonus,
        feedback: cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Parfait !'
      }
    }
  }

  // Si l'utilisateur a sélectionné uniquement une fonction (sans degré spécifique)
  if (selectedFunction && !userRoot) {
    // Vérifier que correctRoot est bien défini (normalisé)
    if (correctRoot) {
      const correctFunctions = getFunctionFromDegree(correctRoot)
      if (correctFunctions.includes(selectedFunction)) {
        return {
          level: 3,
          score: 30,
          cadenceBonus: cadenceBonus,
          feedback: `Bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}) ! Mais essayez de trouver le degré exact.`
        }
      }
    }
    // Si correctRoot n'est pas disponible mais que correctAnswer a une fonction sélectionnée
    // (cas où l'exercice a été créé avec seulement une fonction)
    if (correctAnswer.selectedFunction || correctAnswer.function) {
      const correctFunction = correctAnswer.selectedFunction || correctAnswer.function
      if (correctFunction === selectedFunction) {
        return {
          level: 3,
          score: 30,
          cadenceBonus: cadenceBonus,
          feedback: `Bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}) ! Mais essayez de trouver le degré exact.`
        }
      }
    }
  }

  // Si l'utilisateur a sélectionné une fonction ET un degré
  if (selectedFunction && userRoot) {
    const userFunctions = getFunctionFromDegree(userRoot)
    const correctFunctions = getFunctionFromDegree(correctRoot)
    
    // Vérifier si la fonction sélectionnée correspond à la solution
    if (correctFunctions.includes(selectedFunction)) {
      // Si le degré est aussi correct
      if (userRoot === correctRoot) {
        return {
          level: 1,
          score: 100,
          cadenceBonus: cadenceBonus,
          feedback: cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Parfait !'
        }
      }
      // Si la fonction est correcte mais pas le degré
      if (userFunctions.includes(selectedFunction)) {
        return {
          level: 2,
          score: 65,
          cadenceBonus: cadenceBonus,
          feedback: `Presque ! C'est la bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}), mais pas le bon degré.`
        }
      }
    }
  }

  // Niveau 2 : Même degré mais chiffrage différent (crédit partiel)
  if (userRoot && correctRoot && userRoot === correctRoot) {
    const userFigure = normalizeFigure(userAnswer.figure)
    const correctFigure = normalizeFigure(correctAnswer.figure)
    if (userFigure !== correctFigure) {
      return {
        level: 2,
        score: 80,
        cadenceBonus: cadenceBonus,
        feedback: 'Bon degré ! Mais le chiffrage est différent.'
      }
    }
  }

  // Niveau 2 : Substitution fonctionnelle (même fonction, degré différent)
  // Mais seulement si l'un est le principal et l'autre le parallèle de la même fonction
  if (userRoot && correctRoot && areDegreesInSameFunction(userRoot, correctRoot)) {
    // Vérifier si les degrés sont dans une relation principal/parallèle
    let isPrincipalParallel = false
    
    // Pour chaque fonction partagée, vérifier si l'un est principal et l'autre parallèle
    const userFunctions = getFunctionFromDegree(userRoot)
    const correctFunctions = getFunctionFromDegree(correctRoot)
    
    for (const func of userFunctions) {
      if (correctFunctions.includes(func)) {
        const userIsPrimary = PRIMARY_DEGREES[func]?.includes(userRoot)
        const userIsParallel = PARALLEL_DEGREES[func]?.includes(userRoot)
        const correctIsPrimary = PRIMARY_DEGREES[func]?.includes(correctRoot)
        const correctIsParallel = PARALLEL_DEGREES[func]?.includes(correctRoot)
        
        // Si l'un est principal et l'autre parallèle de la même fonction
        if ((userIsPrimary && correctIsParallel) || (userIsParallel && correctIsPrimary)) {
          isPrincipalParallel = true
          break
        }
      }
    }
    
    // Ne considérer comme partiellement juste que si c'est une relation principal/parallèle
    // Sinon, c'est faux (ex: V vs III où III peut être Tp ou Dp mais pas spécifiquement Dp)
    if (isPrincipalParallel) {
      return {
        level: 2,
        score: 65,
        cadenceBonus: cadenceBonus,
        feedback: 'Bonne fonction, mais essayez de trouver le degré exact.'
      }
    }
  }

  // Niveau 0 : Faux
  return {
    level: 0,
    score: 0,
    cadenceBonus: cadenceBonus,
    feedback: 'Incorrect. Essayez encore !'
  }
}

