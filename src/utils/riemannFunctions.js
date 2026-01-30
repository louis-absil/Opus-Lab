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
    primary: '#8b5cf6',   // Violet
    secondary: '#a78bfa',
    glow: 'rgba(139, 92, 246, 0.4)'
  },
  D: {
    primary: '#ec4899',   // Rose vif (pink-500, distinct du rouge)
    secondary: '#f9a8d4',
    glow: 'rgba(236, 72, 153, 0.4)'
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
 * Fonctions effectives pour un accord (Cad64 = D)
 * @param {Object} chord - Accord avec degree, figure, selectedFunction
 * @returns {string[]} - Fonctions à utiliser pour la validation
 */
function getEffectiveFunctionsForChord(chord) {
  if (!chord) return []
  if (chord.selectedFunction) return [chord.selectedFunction]
  const degree = normalizeDegree(chord)
  const fig = normalizeFigure(chord.figure)
  // I64 dépendant du contexte : V64 (passage) et cad64 (cadence) → D ; I64 (avancé) → T
  if (degree === 'I' && fig === '64') {
    if (chord.sixFourVariant === 'passing' || chord.sixFourVariant === 'cadential') return ['D']
    return ['T'] // I64 harmonies avancées = tonique
  }
  return getFunctionFromDegree(degree)
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
/** Normalise une cadence pour la comparaison ; exporté pour usage dans Player (QCM cadence bonus). */
export function normalizeCadence(cadence) {
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
 * @param {Object} options - Options de validation (optionnel)
 * @param {boolean} options.functionOnlyAvailable - Si true (ex. mode intuition), une bonne fonction seule compte comme entièrement correcte
 * @returns {Object} - { level: 1|2|3, score: 0-100, cadenceBonus: 0-10, feedback: string }
 */
export function validateAnswerWithFunctions(userAnswer, correctAnswer, selectedFunction = null, options = {}) {
  const functionOnlyAvailable = options.functionOnlyAvailable === true
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

  // Suffixe de feedback pour la cadence quand une cadence est attendue
  let cadenceFeedbackSuffix = ''
  if (correctCadence) {
    if (cadenceBonus === 10) cadenceFeedbackSuffix = ' Cadence correcte.'
    else if (userCadence) cadenceFeedbackSuffix = ' Cadence incorrecte.'
    else cadenceFeedbackSuffix = ' Cadence manquante.'
  }

  // Si on a les degrés normalisés, comparer directement
  if (userRoot && correctRoot) {
    // Vérifier aussi le chiffrage (figure) pour une validation complète
    // Normaliser les figures : "5" (état fondamental) = absence de chiffrage
    const userFigure = normalizeFigure(userAnswer.figure)
    const correctFigure = normalizeFigure(correctAnswer.figure)
    
    // Pour I64 : comparer aussi sixFourVariant (passing / cadential / null)
    const isI64User = userRoot === 'I' && userFigure === '64'
    const isI64Correct = correctRoot === 'I' && correctFigure === '64'
    const userVariant = userAnswer.sixFourVariant ?? null
    const correctVariant = correctAnswer.sixFourVariant ?? null
    const same64Variant = !isI64User || !isI64Correct || userVariant === correctVariant

    // Niveau 1 : Réponse parfaite (même degré + même chiffrage + même variante 64 si I64)
    if (userRoot === correctRoot && userFigure === correctFigure && same64Variant) {
      return {
        level: 1,
        score: 100,
        cadenceBonus: cadenceBonus,
        feedback: (cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Parfait !') + cadenceFeedbackSuffix
      }
    }
  }

  // Si l'utilisateur a sélectionné uniquement une fonction (sans degré spécifique)
  if (selectedFunction && !userRoot) {
    const correctFunctions = getEffectiveFunctionsForChord(correctAnswer)
    if (correctFunctions.length > 0 && correctFunctions.includes(selectedFunction)) {
      // Mode intuition / fonction seule disponible : bonne fonction = entièrement correct
      if (functionOnlyAvailable) {
        return {
          level: 1,
          score: 100,
          cadenceBonus: cadenceBonus,
          feedback: (cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Parfait !') + cadenceFeedbackSuffix
        }
      }
      return {
        level: 3,
        score: 30,
        cadenceBonus: cadenceBonus,
        feedback: `Bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}) ! Mais essayez de trouver le degré exact.` + cadenceFeedbackSuffix
      }
    }
    // Si correctAnswer a une fonction sélectionnée
    // (cas où l'exercice a été créé avec seulement une fonction)
    if (correctAnswer.selectedFunction || correctAnswer.function) {
      const correctFunction = correctAnswer.selectedFunction || correctAnswer.function
      if (correctFunction === selectedFunction) {
        if (functionOnlyAvailable) {
          return {
            level: 1,
            score: 100,
            cadenceBonus: cadenceBonus,
            feedback: (cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Parfait !') + cadenceFeedbackSuffix
          }
        }
        return {
          level: 3,
          score: 30,
          cadenceBonus: cadenceBonus,
          feedback: `Bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}) ! Mais essayez de trouver le degré exact.` + cadenceFeedbackSuffix
        }
      }
    }
  }

  // Si l'utilisateur a sélectionné une fonction ET un degré
  if (selectedFunction && userRoot) {
    const userFunctions = getFunctionFromDegree(userRoot)
    const correctFunctions = getEffectiveFunctionsForChord(correctAnswer)
    
    // Vérifier si la fonction sélectionnée correspond à la solution
    if (correctFunctions.includes(selectedFunction)) {
      // Si le degré est aussi correct
      if (userRoot === correctRoot) {
        return {
          level: 1,
          score: 100,
          cadenceBonus: cadenceBonus,
          feedback: (cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Parfait !') + cadenceFeedbackSuffix
        }
      }
      // Si la fonction est correcte mais pas le degré
      if (userFunctions.includes(selectedFunction)) {
        return {
          level: 2,
          score: 65,
          cadenceBonus: cadenceBonus,
          feedback: `Presque ! C'est la bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}), mais pas le bon degré.` + cadenceFeedbackSuffix
        }
      }
    }
  }

  // Niveau 2 : Même degré mais chiffrage ou variante 64 différent (crédit partiel)
  if (userRoot && correctRoot && userRoot === correctRoot) {
    const userFigure = normalizeFigure(userAnswer.figure)
    const correctFigure = normalizeFigure(correctAnswer.figure)
    const isI64Both = userRoot === 'I' && userFigure === '64' && correctFigure === '64'
    const userVariant = userAnswer.sixFourVariant ?? null
    const correctVariant = correctAnswer.sixFourVariant ?? null
    const variantDiff = isI64Both && userVariant !== correctVariant
    if (userFigure !== correctFigure || variantDiff) {
      return {
        level: 2,
        score: variantDiff ? 80 : 80,
        cadenceBonus: cadenceBonus,
        feedback: (variantDiff ? 'Bon degré et chiffrage 6/4, mais le contexte (passage / cadence / I64) est différent.' : 'Bon degré ! Mais le chiffrage est différent.') + cadenceFeedbackSuffix
      }
    }
  }

  // Niveau 2 : Substitution fonctionnelle (même fonction, degré différent)
  if (userRoot && correctRoot) {
    const userFunctions = getFunctionFromDegree(userRoot)
    const correctFunctions = getEffectiveFunctionsForChord(correctAnswer)
    const shareFunction = userFunctions.some((f) => correctFunctions.includes(f))
    let isPrincipalParallel = false
    if (shareFunction) {
      for (const func of userFunctions) {
        if (correctFunctions.includes(func)) {
          const userIsPrimary = PRIMARY_DEGREES[func]?.includes(userRoot)
          const userIsParallel = PARALLEL_DEGREES[func]?.includes(userRoot)
          const correctIsPrimary = PRIMARY_DEGREES[func]?.includes(correctRoot)
          const correctIsParallel = PARALLEL_DEGREES[func]?.includes(correctRoot)
          if ((userIsPrimary && correctIsParallel) || (userIsParallel && correctIsPrimary)) {
            isPrincipalParallel = true
            break
          }
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
        feedback: 'Bonne fonction, mais essayez de trouver le degré exact.' + cadenceFeedbackSuffix
      }
    }
  }

  // Niveau 0 : Faux
  return {
    level: 0,
    score: 0,
    cadenceBonus: cadenceBonus,
    feedback: 'Incorrect. Essayez encore !' + cadenceFeedbackSuffix
  }
}

