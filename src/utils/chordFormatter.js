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
  } else if (chord.degree) {
    parts.push(chord.degree)
    // Qualité
    if (chord.quality) parts.push(chord.quality)
  } else if (chord.selectedFunction) {
    // Fonction seule
    parts.push(chord.selectedFunction)
  }
  
  // Chiffrage
  if (chord.figure && chord.figure !== '5') {
    const figObj = figures.find(f => f.value === chord.figure)
    parts.push(figObj?.display || chord.figure)
  }
  
  // Fermeture emprunt
  if (chord.isBorrowed) parts.push(')')
  
  return parts.join('') || 'Non répondu'
}

export { FIGURES }
