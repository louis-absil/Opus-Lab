// Constantes pour les chiffrages
const FIGURES = [
  { value: '5', label: 'Quinte', display: '5' },
  { value: '6', label: 'Sixte', display: '6' },
  { value: '64', label: 'Quarte-sixte', display: '6/4', isStacked: true, displayArray: ['6', '4'] },
  { value: '7', label: 'Septième', display: '7' },
  { value: '65', label: 'Sixte-quinte', display: '6/5', isStacked: true, displayArray: ['6', '5'] },
  { value: '43', label: 'Quarte-tierce', display: '4/3', isStacked: true, displayArray: ['4', '3'] },
  { value: '2', label: 'Seconde', display: '2' },
  { value: '9', label: 'Neuvième', display: '9' },
  { value: '11', label: 'Onzième', display: '11' },
  { value: '13', label: 'Treizième', display: '13' },
  { value: '54', label: 'Quinte-quarte', display: '5/4', isStacked: true, displayArray: ['5', '4'] }
]

/**
 * Formate un accord avec tous les détails pour l'affichage
 * @param {Object} chord - Objet accord avec degree, accidental, quality, figure, etc.
 * @param {Array} figures - Tableau des chiffrages (optionnel, utilise FIGURES par défaut)
 * @returns {string} - Accord formaté (ex: "♭II6", "V7", "(IV)6/4")
 */
export function formatChordDetailed(chord, figures = FIGURES) {
  if (!chord) return 'Non répondu'
  
  const parts = []
  
  // Emprunt
  if (chord.isBorrowed) parts.push('(')
  
  // Altération
  if (chord.accidental) {
    parts.push(chord.accidental === 'b' ? '♭' : chord.accidental === '#' ? '♯' : '♮')
  }
  
  // Racine spéciale ou degré
  if (chord.specialRoot) {
    const special = { 'N': 'II♭6', 'It': 'It+6', 'Fr': 'Fr+6', 'Gr': 'Gr+6' }[chord.specialRoot]
    parts.push(special || chord.specialRoot)
  } else if (chord.degree && chord.figure === '64' && chord.sixFourVariant === 'cadential') {
    // 64 de cadence : chiffrage baroque "cad" + 6/4 superposés
    parts.push('cad')
    parts.push('6/4')
  } else if (chord.degree && chord.figure === '64' && chord.sixFourVariant === 'passing') {
    // 64 de passage entre I et I6 : on note V64
    parts.push('V')
    parts.push('6/4')
  } else if (chord.degree) {
    parts.push(chord.degree)
    // Qualité
    if (chord.quality) parts.push(chord.quality)
  } else if (chord.selectedFunction) {
    // Fonction seule
    parts.push(chord.selectedFunction)
  }
  
  // Chiffrage (sauf si déjà ajouté pour cad64 / V64)
  if (chord.figure && chord.figure !== '5') {
    if (chord.degree && chord.figure === '64' && (chord.sixFourVariant === 'cadential' || chord.sixFourVariant === 'passing')) {
      // Déjà ajouté ci-dessus
    } else {
      const figObj = figures.find(f => f.value === chord.figure)
      parts.push(figObj?.display || chord.figure)
    }
  }
  
  // Fermeture emprunt
  if (chord.isBorrowed) parts.push(')')
  
  return parts.join('') || 'Non répondu'
}

/**
 * Parse une chaîne d'affichage d'accord (ex. "V6/5", "I6/4", "cad6/4", "II♭6", "V7")
 * pour permettre un rendu baroque (chiffres superposés).
 * @param {string} str - Chaîne formatée (sortie de formatChordString / équivalent)
 * @returns {{ leading: string, figure: null | { stacked: true, digits: string[] } | { stacked: false, value: string } }}
 */
export function parseChordDisplayString(str) {
  if (!str || typeof str !== 'string') return { leading: '', figure: null }
  const s = str.trim()
  if (!s) return { leading: '', figure: null }

  // Racines spéciales : toute la chaîne est le préfixe (pas de figure séparée)
  if (s === 'It+6' || s === 'Fr+6' || s === 'Gr+6') return { leading: s, figure: null }

  // Chiffrage empilé en fin (6/4, 6/5, 4/3, 5/4)
  const stackedMatch = s.match(/(6\/4|6\/5|4\/3|5\/4)$/)
  if (stackedMatch) {
    const frac = stackedMatch[1]
    const leading = s.slice(0, -frac.length)
    const digits = frac.split('/')
    return { leading, figure: { stacked: true, digits } }
  }

  // Chiffrage simple en fin (1 ou 2 chiffres : 2, 6, 7, 9, 11, 13)
  const singleMatch = s.match(/^(.+?)(\d{1,2})$/)
  if (singleMatch) {
    const leading = singleMatch[1]
    const value = singleMatch[2]
    return { leading, figure: { stacked: false, value } }
  }

  return { leading: s, figure: null }
}

/**
 * Retourne le libellé d'affichage d'un degré selon le mode (generic / major / minor).
 * Aligné sur ChordDisplay (visualiseur mode élève) : majuscule = majeur, minuscule = mineur.
 * @param {string} degree - Degré romain (I, II, III, …)
 * @param {string} degreeMode - 'generic' | 'major' | 'minor'
 * @returns {string}
 */
export function getDegreeDisplayLabel(degree, degreeMode = 'generic') {
  const degreeMap = {
    I: { generic: 'I', major: 'I', minor: 'i' },
    II: { generic: 'II', major: 'ii', minor: 'ii°' },
    III: { generic: 'III', major: 'iii', minor: 'III' },
    IV: { generic: 'IV', major: 'IV', minor: 'iv' },
    V: { generic: 'V', major: 'V', minor: 'V' },
    VI: { generic: 'VI', major: 'vi', minor: 'VI' },
    VII: { generic: 'VII', major: 'vii°', minor: 'vii°' }
  }
  return degreeMap[degree]?.[degreeMode] ?? degree
}

export { FIGURES }
