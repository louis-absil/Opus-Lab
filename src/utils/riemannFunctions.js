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
 * Compare une réponse utilisateur avec la solution correcte
 * Retourne un objet avec le niveau de précision et le score
 * @param {Object} userAnswer - Réponse de l'utilisateur { degree, root, displayLabel, figure, ... }
 * @param {Object} correctAnswer - Solution correcte { degree, root, displayLabel, figure, ... }
 * @param {string} selectedFunction - Fonction sélectionnée par l'utilisateur (optionnel)
 * @returns {Object} - { level: 1|2|3, score: 0-100, feedback: string }
 */
export function validateAnswerWithFunctions(userAnswer, correctAnswer, selectedFunction = null) {
  if (!userAnswer || !correctAnswer) {
    return {
      level: 0,
      score: 0,
      feedback: 'Réponse manquante'
    }
  }

  // Normaliser les degrés en majuscules pour la comparaison (indépendamment du mode)
  const userRoot = normalizeDegree(userAnswer)
  const correctRoot = normalizeDegree(correctAnswer)

  // Si on a les degrés normalisés, comparer directement
  if (userRoot && correctRoot) {
    // Vérifier aussi le chiffrage (figure) pour une validation complète
    // Normaliser les figures (enlever les espaces, convertir en string)
    const userFigure = (userAnswer.figure || '').toString().trim()
    const correctFigure = (correctAnswer.figure || '').toString().trim()
    
    // Niveau 1 : Réponse parfaite (même degré + même chiffrage)
    if (userRoot === correctRoot && userFigure === correctFigure) {
      return {
        level: 1,
        score: 100,
        feedback: 'Parfait !'
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
          feedback: 'Parfait !'
        }
      }
      // Si la fonction est correcte mais pas le degré
      if (userFunctions.includes(selectedFunction)) {
        return {
          level: 2,
          score: 65,
          feedback: `Presque ! C'est la bonne fonction (${selectedFunction === 'T' ? 'Tonique' : selectedFunction === 'SD' ? 'Sous-Dominante' : 'Dominante'}), mais pas le bon degré.`
        }
      }
    }
  }

  // Niveau 2 : Substitution fonctionnelle (même fonction, degré différent)
  if (userRoot && correctRoot && areDegreesInSameFunction(userRoot, correctRoot)) {
    return {
      level: 2,
      score: 65,
      feedback: 'Bonne fonction, mais essayez de trouver le degré exact.'
    }
  }

  // Niveau 0 : Faux
  return {
    level: 0,
    score: 0,
    feedback: 'Incorrect. Essayez encore !'
  }
}

