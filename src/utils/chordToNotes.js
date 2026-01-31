/**
 * Convertit un accord (degré, tonalité, mode) en noms de notes pour Tone.js et clavier.
 * Aligné sur le modèle d'accord de l'app (degree, accidental, quality, figure).
 */

const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Tonalité (lettre) → pitch class (0-11, C=0) */
const KEY_PC = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
}

/** Degré romain (I-VII) → indice dans la gamme (0-6) */
const DEGREE_INDEX = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 }

/** Gamme majeure : intervalles en demi-tons depuis la tonique */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
/** Gamme mineure naturelle */
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

/**
 * Retourne la pitch class (0-11) de la tonique d'une tonalité.
 * @param {string} tonality - ex. "C", "G", "F"
 * @returns {number}
 */
function keyToPc(tonality) {
  const t = (tonality || 'C').toString().trim()
  return KEY_PC[t] ?? 0
}

/**
 * Retourne les pitch classes des 7 degrés de la gamme.
 * @param {string} tonality
 * @param {'major'|'minor'} mode
 * @returns {number[]} 7 pitch classes
 */
function getScalePcs(tonality, mode = 'major') {
  const root = keyToPc(tonality)
  const scale = mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE
  return scale.map((interval) => (root + interval) % 12)
}

/**
 * Convertit une pitch class (0-11) en nom de note avec octave.
 * @param {number} pc
 * @param {number} octave
 * @returns {string} ex. "C4", "F#4"
 */
function pcToNoteName(pc, octave = 4) {
  const name = ROOT_NAMES[((pc % 12) + 12) % 12]
  return `${name}${octave}`
}

/**
 * Retourne les noms de notes (ex. ['C4','E4','G4']) pour un accord donné.
 * @param {Object} chord - { degree, accidental?, quality?, figure? }
 *   degree: I-VII, accidental: 'b'|'#', quality: 'm'|'°'|'+', figure: '5'|'6'|'64'|'7'|'65'|'43'|'2'
 * @param {string} tonality - ex. "C", "G"
 * @param {'major'|'minor'} mode
 * @param {number} octave - octave de la fondamentale (défaut 4)
 * @returns {string[]} note names
 */
export function chordToNotes(chord, tonality = 'C', mode = 'major', octave = 4) {
  if (!chord || !chord.degree) return []
  const scalePcs = getScalePcs(tonality, mode)
  const deg = (chord.degree || 'I').toString().trim().toUpperCase()
  const index = DEGREE_INDEX[deg]
  if (index === undefined) return []
  let rootPc = scalePcs[index]
  if (chord.accidental === 'b') rootPc = (rootPc - 1 + 12) % 12
  if (chord.accidental === '#') rootPc = (rootPc + 1) % 12
  if (chord.specialRoot === 'N') rootPc = (rootPc - 1 + 12) % 12 // IIb

  const quality = (chord.quality || '').toString().trim()
  const thirdInterval = quality === '°' || quality === 'dim' ? 3 : quality === '+' ? 4 : quality === 'm' ? 3 : 4
  const fifthInterval = quality === '°' || quality === 'dim' ? 6 : 7
  const seventhInterval = 10 // septième mineure (dominante)

  const root = rootPc
  const third = (rootPc + thirdInterval) % 12
  const fifth = (rootPc + fifthInterval) % 12
  const seventh = (rootPc + seventhInterval) % 12

  let notes = []
  const fig = (chord.figure || '5').toString().trim()
  if (fig === '5' || fig === '') {
    notes = [root, third, fifth]
  } else if (fig === '6') {
    notes = [third, fifth, root + 12]
  } else if (fig === '64') {
    notes = [fifth, root + 12, third + 12]
  } else if (fig === '7') {
    notes = [root, third, fifth, seventh]
  } else if (fig === '65') {
    notes = [third, fifth, seventh, root + 12]
  } else if (fig === '43') {
    notes = [fifth, seventh, root + 12, third + 12]
  } else if (fig === '2') {
    notes = [seventh, root + 12, third + 12, fifth + 12]
  } else {
    notes = [root, third, fifth]
  }

  const result = []
  const used = new Set()
  let prevMidi = -1
  for (let i = 0; i < notes.length; i++) {
    let midi = (notes[i] % 12) + (octave + Math.floor(notes[i] / 12)) * 12
    while (midi <= prevMidi) midi += 12
    prevMidi = midi
    const o = Math.min(6, Math.max(2, Math.floor(midi / 12)))
    const pc = midi % 12
    const name = pcToNoteName(pc, o)
    if (!used.has(name)) {
      used.add(name)
      result.push(name)
    }
  }
  return result.sort((a, b) => noteToMidi(a) - noteToMidi(b))
}

/**
 * Retourne un ordre MIDI approximatif pour trier les notes (nom → nombre).
 * @param {string} name - ex. "C4"
 * @returns {number}
 */
function noteToMidi(name) {
  const m = name.match(/^([A-G]#?b?)(\d+)$/i)
  if (!m) return 60
  const pc = KEY_PC[m[1]] ?? 0
  const oct = parseInt(m[2], 10)
  return oct * 12 + pc
}

/**
 * Retourne toutes les notes d'une progression (séquence d'accords).
 * @param {Object[]} chords - tableau d'objets accord
 * @param {string} tonality
 * @param {'major'|'minor'} mode
 * @param {number} octave
 * @returns {string[]} toutes les notes uniques (pour surlignage clavier)
 */
export function progressionToNotes(chords, tonality = 'C', mode = 'major', octave = 4) {
  if (!Array.isArray(chords) || chords.length === 0) return []
  const set = new Set()
  for (const ch of chords) {
    chordToNotes(ch, tonality, mode, octave).forEach((n) => set.add(n))
  }
  return Array.from(set).sort((a, b) => noteToMidi(a) - noteToMidi(b))
}

/**
 * Retourne une séquence pour Tone.js : [ [ time, [notes] ], ... ] (une entrée par accord).
 * @param {Object[]} chords
 * @param {string} tonality
 * @param {'major'|'minor'} mode
 * @param {number} octave
 * @param {string} duration - ex. "2n", "1n"
 * @returns {Array<[string, string[]]>} [ [ "0:0:0", ["C4","E4","G4"] ], [ "0:2:0", ... ] ]
 */
export function progressionToToneSequence(chords, tonality = 'C', mode = 'major', octave = 4, duration = '2n') {
  if (!Array.isArray(chords) || chords.length === 0) return []
  return chords.map((chord, i) => {
    const time = `0:${i * 2}:0`
    const notes = chordToNotes(chord, tonality, mode, octave)
    return [time, notes]
  })
}
