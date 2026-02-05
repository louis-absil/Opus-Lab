/**
 * Logique partagée pour le QCM d'accords (génération d'options, formatage).
 * Utilisé par ChordSelectorModal (mode QCM) et Player (comparaison de réponses).
 */
import { DEGREE_TO_FUNCTIONS } from './riemannFunctions'

/**
 * Convertit un accord en clé parcours (ex. I, I6, V7, N6, V64, cad64).
 * Cohérent avec difficultyFromContent et Player (verrou parcours, options génériques).
 */
export function chordToParcoursKey(chord) {
  if (!chord) return null
  if (chord.specialRoot === 'N') return 'N6'
  if (chord.specialRoot === 'It' || chord.specialRoot === 'Fr' || chord.specialRoot === 'Gr') return chord.specialRoot
  const degree = (chord.degree || '').toUpperCase()
  if (!degree) return null
  const fig = chord.figure && chord.figure !== '5' ? chord.figure : ''
  if (degree === 'I' && fig === '64') {
    if (chord.sixFourVariant === 'passing') return 'V64'
    if (chord.sixFourVariant === 'cadential') return 'cad64'
    return 'I64'
  }
  return degree + fig
}

const SPECIAL_ROOT_TO_FUNCTION = {
  N: 'SD',
  It: 'D',
  Fr: 'D',
  Gr: 'D'
}

/**
 * Obtient la fonction tonale d'un accord (T, SD, D).
 */
export function getChordFunction(chord) {
  if (!chord) return null
  if (chord.selectedFunction) return chord.selectedFunction
  if (chord.specialRoot) return SPECIAL_ROOT_TO_FUNCTION[chord.specialRoot] || null
  // I64 de passage ou cadence (V64 / cad64) → fonction D
  if (chord.degree === 'I' && chord.figure === '64' && (chord.sixFourVariant === 'passing' || chord.sixFourVariant === 'cadential')) {
    return 'D'
  }
  if (chord.degree) {
    const functions = DEGREE_TO_FUNCTIONS[chord.degree] || []
    return functions.length > 0 ? functions[0] : null
  }
  return null
}

/**
 * Formate un accord (objet) en chaîne affichée (degré + chiffrage).
 * Doit rester identique à celle utilisée dans Player pour la comparaison.
 */
export function formatChordString(chord) {
  if (!chord) return ''
  let result = ''
  if (chord.specialRoot) {
    const specialLabels = { N: 'II♭6', It: 'It+6', Fr: 'Fr+6', Gr: 'Gr+6' }
    return specialLabels[chord.specialRoot] || chord.specialRoot
  }
  const isI64 = chord.degree === 'I' && chord.figure === '64'
  const degreePart = isI64 && chord.sixFourVariant === 'passing' ? 'V' : isI64 && chord.sixFourVariant === 'cadential' ? 'Cad.' : chord.degree
  if (degreePart) {
    result += degreePart
    if (degreePart !== 'Cad.' && chord.accidental) {
      if (chord.accidental === 'b') result += '♭'
      else if (chord.accidental === '#') result += '♯'
    }
  }
  if (chord.figure) {
    if (chord.figure === '64') result += '6/4'
    else if (chord.figure === '65') result += '6/5'
    else if (chord.figure === '43') result += '4/3'
    else if (chord.figure === '54') result += '5/4'
    else result += chord.figure
  }
  if (chord.pedalDegree) result += ' / ' + chord.pedalDegree
  return result
}

/**
 * Dérive la fonction (T, SD, D) pour une option affichée (coloration des pads).
 */
export function getFunctionForOptionLabel(optionStr, correctChord, correctStr) {
  if (!optionStr) return 'T'
  if (correctChord && optionStr === correctStr) {
    const fn = getChordFunction(correctChord)
    return fn || 'T'
  }
  if (optionStr.startsWith('cad') || optionStr.startsWith('Cad.')) return 'D'
  if (optionStr.startsWith('It+6') || optionStr.startsWith('Fr+6') || optionStr.startsWith('Gr+6')) return 'D'
  if (optionStr.startsWith('II♭') || optionStr === 'II♭6') return 'SD'
  const m = optionStr.match(/^([♭#])?(VII|VI|IV|III|II|I|V)/)
  if (m) {
    const functions = DEGREE_TO_FUNCTIONS[m[2]] || []
    return functions.length > 0 ? functions[0] : 'T'
  }
  return 'T'
}

function createSeededRng(seed) {
  let s = seed
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function seededShuffle(array, seed) {
  const rng = createSeededRng(seed)
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Génère des distracteurs pour un accord correct (déterministe selon seed).
 */
function generateDistractors(correctChord, allChords, useCloseLures = false, seed = 0) {
  const rng = createSeededRng(seed)
  const closeChords = []
  const farChords = []
  const correctFunction = getChordFunction(correctChord)
  const correctDegree = correctChord.degree
  const correctFigure = correctChord.figure

  if (allChords && allChords.length > 0) {
    allChords.forEach((chord) => {
      if (!chord) return
      const chordStr = formatChordString(chord)
      const correctStr = formatChordString(correctChord)
      if (chordStr === correctStr) return
      const chordFunction = getChordFunction(chord)
      const chordDegree = chord.degree
      const isClose =
        chordFunction === correctFunction ||
        chordDegree === correctDegree ||
        (chordDegree &&
          correctDegree &&
          ((chordDegree === 'III' && (correctDegree === 'I' || correctDegree === 'VI')) ||
            (chordDegree === 'VI' && (correctDegree === 'I' || correctDegree === 'III')) ||
            (chordDegree === 'II' && correctDegree === 'IV') ||
            (chordDegree === 'VII' && correctDegree === 'V')))
      if (isClose) closeChords.push(chord)
      else farChords.push(chord)
    })
  }

  const correctStr = formatChordString(correctChord)
  const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  const FIGURES = ['5', '6', '64', '7', '65', '43', '2']

  while (closeChords.length < 2 && correctDegree) {
    const otherFigures = FIGURES.filter((f) => f !== correctFigure)
    const randomFigure = otherFigures[Math.floor(rng() * otherFigures.length)]
    const closeChord = { degree: correctDegree, figure: randomFigure }
    const closeStr = formatChordString(closeChord)
    if (closeStr !== correctStr && !closeChords.some((c) => formatChordString(c) === closeStr)) closeChords.push(closeChord)
  }

  while (farChords.length < 2) {
    const randomDegree = DEGREES[Math.floor(rng() * DEGREES.length)]
    if (randomDegree !== correctDegree) {
      const randomFigure = FIGURES[Math.floor(rng() * FIGURES.length)]
      const farChord = { degree: randomDegree, figure: randomFigure }
      const farStr = formatChordString(farChord)
      if (
        farStr !== correctStr &&
        !farChords.some((c) => formatChordString(c) === farStr) &&
        !closeChords.some((c) => formatChordString(c) === farStr)
      )
        farChords.push(farChord)
    }
  }

  const selectedClose = closeChords.slice(0, 3)
  const selectedFar = farChords.slice(0, 3)
  const allDistractors = useCloseLures
    ? [...selectedClose.slice(0, 3), ...selectedFar.slice(0, 1)]
    : [...selectedClose.slice(0, 1), ...selectedFar.slice(0, 3)]
  const shuffled = seededShuffle(allDistractors, seed + 1)
  return shuffled.slice(0, 4).map(formatChordString)
}

/**
 * Retourne la liste des options QCM pour une question (correct + distracteurs, mélangées).
 * @param {Object} correctChord - Accord attendu
 * @param {Array} allChords - Tous les accords de l'exercice
 * @param {boolean} useCloseLures - true = maîtrise (leurres proches)
 * @param {number} questionId - Index de la question (seed)
 * @returns {string[]}
 */
export function getQcmOptions(correctChord, allChords, useCloseLures = false, questionId = 0) {
  if (!correctChord) return []
  const correctStr = formatChordString(correctChord)
  const seed =
    questionId !== undefined && questionId !== null
      ? Number(questionId)
      : correctStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const distractors = generateDistractors(correctChord, allChords, useCloseLures, seed)
  const uniqueDistractors = [...new Set(distractors)].filter((s) => s !== correctStr).slice(0, 4)
  const allOptions = [correctStr, ...uniqueDistractors]
  return seededShuffle(allOptions, seed + 2)
}
