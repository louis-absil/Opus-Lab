import React from 'react'
import './PianoKeyboard.css'

/** Noms de notes avec octave (ex. C4) → position dans 2 octaves (C3–B4). */
const NOTE_ORDER = []
for (let oct = 3; oct <= 4; oct++) {
  for (const name of ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']) {
    NOTE_ORDER.push(`${name}${oct}`)
  }
}

const WHITES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACKS = ['C#', 'D#', 'F#', 'G#', 'A#']

/**
 * Clavier piano SVG (2 octaves) avec surlignage des notes.
 * @param {string[]} highlightedNotes - Noms de notes à surligner (ex. ['C4','E4','G4'])
 * @param {string} [className] - Classe CSS optionnelle
 */
function PianoKeyboard({ highlightedNotes = [], className = '' }) {
  const set = new Set(Array.isArray(highlightedNotes) ? highlightedNotes : [])

  const whiteKeys = []
  const blackKeys = []
  for (let oct = 3; oct <= 4; oct++) {
    for (const name of WHITES) {
      const note = `${name}${oct}`
      whiteKeys.push({ note, highlighted: set.has(note) })
    }
    for (const name of BLACKS) {
      const note = `${name}${oct}`
      blackKeys.push({ note, highlighted: set.has(note) })
    }
  }

  const totalWhites = whiteKeys.length
  const whiteWidth = 100 / totalWhites

  return (
    <div className={`piano-keyboard ${className}`.trim()} role="img" aria-label="Clavier piano">
      <svg
        viewBox="0 0 420 120"
        preserveAspectRatio="xMidYMid meet"
        className="piano-keyboard-svg"
      >
        {/* Touches blanches */}
        <g className="piano-whites">
          {whiteKeys.map(({ note, highlighted }, i) => (
            <rect
              key={note}
              x={(i / totalWhites) * 420}
              y={0}
              width={420 / totalWhites - 1}
              height={120}
              rx={2}
              className={`piano-key piano-white ${highlighted ? 'piano-key--highlighted' : ''}`}
              data-note={note}
            />
          ))}
        </g>
        {/* Touches noires */}
        <g className="piano-blacks">
          {blackKeys.map(({ note, highlighted }, i) => {
            const oct = Math.floor(i / 5)
            const pos = i % 5
            const baseIdx = oct * 7
            const offsets = [0.6, 1.6, 3.6, 4.6, 5.6]
            const x = ((baseIdx + offsets[pos]) / 14) * 420
            return (
              <rect
                key={note}
                x={x}
                y={0}
                width={24}
                height={72}
                rx={1}
                className={`piano-key piano-black ${highlighted ? 'piano-key--highlighted' : ''}`}
                data-note={note}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}

export default PianoKeyboard
