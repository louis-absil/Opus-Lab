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
    // 64 de cadence : chiffrage baroque "Cad." + 6/4 superposés
    parts.push('Cad.')
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
  
  // Note pédale (accord/basse, ex. II/I)
  if (chord.pedalDegree) {
    parts.push(' / ')
    parts.push(chord.pedalDegree)
  }
  
  return parts.join('') || 'Non répondu'
}

/**
 * Parse une chaîne d'affichage d'accord (ex. "V6/5", "I6/4", "cad6/4", "II♭6", "V7")
 * pour permettre un rendu baroque (chiffres superposés).
 * @param {string} str - Chaîne formatée (sortie de formatChordString / équivalent)
 * @returns {{ leading: string, figure: null | { stacked: true, digits: string[] } | { stacked: false, value: string } }}
 */
export function parseChordDisplayString(str) {
  if (!str || typeof str !== 'string') return { leading: '', figure: null, pedalDegree: null }
  const s = str.trim()
  if (!s) return { leading: '', figure: null, pedalDegree: null }

  // Note pédale : "accord / basse" (ex. II2/I, II/I)
  const pedalMatch = s.match(/^(.+?)\s*\/\s*(I|II|III|IV|V|VI|VII)$/)
  const baseStr = pedalMatch ? pedalMatch[1].trim() : s
  const pedalDegree = pedalMatch ? pedalMatch[2] : null

  // Racines spéciales : toute la chaîne est le préfixe (pas de figure séparée)
  if (baseStr === 'It+6' || baseStr === 'Fr+6' || baseStr === 'Gr+6') return { leading: baseStr, figure: null, pedalDegree }

  // Sixte napolitaine : II puis ♭6 (b devant 6, pas au-dessus ; pas II♭ puis 6)
  if (baseStr === 'II♭6' || baseStr === 'IIb6') return { leading: 'II', figure: { stacked: false, value: '♭6' }, pedalDegree }

  // Chiffrage empilé en fin (6/4, 6/5, 4/3, 5/4)
  const stackedMatch = baseStr.match(/(6\/4|6\/5|4\/3|5\/4)$/)
  if (stackedMatch) {
    const frac = stackedMatch[1]
    let leading = baseStr.slice(0, -frac.length).trim()
    // Normaliser préfixe cad64 : "cad", "Cad.", "Cad. " (avec espace) → "Cad." pour cohérence affichage
    if (frac === '6/4') {
      const n = leading.trim()
      if (n === 'cad' || n === 'Cad.' || /^Cad\.\s*$/i.test(n)) leading = 'Cad.'
    }
    const digits = frac.split('/')
    return { leading, figure: { stacked: true, digits }, pedalDegree }
  }

  // Chiffrage simple en fin (1 ou 2 chiffres : 2, 6, 7, 9, 11, 13)
  const singleMatch = baseStr.match(/^(.+?)(\d{1,2})$/)
  if (singleMatch) {
    const leading = singleMatch[1]
    const value = singleMatch[2]
    return { leading, figure: { stacked: false, value }, pedalDegree }
  }

  return { leading: baseStr, figure: null, pedalDegree }
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
