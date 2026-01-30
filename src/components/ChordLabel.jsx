import React from 'react'
import { FIGURES, parseChordDisplayString, getDegreeDisplayLabel } from '../utils/chordFormatter'
import './ChordLabel.css'

/**
 * Affiche la partie chiffrage seule (baroque : superposé si 6/5, 6/4, 4/3, 5/4).
 * Utilisable avec une classe supplémentaire (ex. review-chord-wrong / review-chord-right).
 */
export function ChordLabelFigure({ figure, className = '' }) {
  if (!figure || figure === '5') return null
  const figObj = FIGURES.find(f => f.value === figure)
  const isStacked = figObj?.isStacked && figObj?.displayArray

  return (
    <span className={`chord-label-figure ${className}`.trim()}>
      {isStacked ? (
        <span className="chord-label-figure-stacked">
          {figObj.displayArray.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </span>
      ) : (
        <span>{figObj?.display ?? figure}</span>
      )}
    </span>
  )
}

/**
 * Construit la partie "leading" (degré + altération + qualité) à partir d'un objet chord.
 * Respecte chord.degreeMode (generic/major/minor) pour la casse majeur/mineur comme le visualiseur élève.
 */
function buildLeadingFromChord(chord) {
  const { degree, accidental, quality, figure, isBorrowed, specialRoot, sixFourVariant, degreeMode } = chord

  if (specialRoot) {
    if (specialRoot === 'N') return { leading: 'II♭', figure: { stacked: false, value: '6' } }
    const labels = { It: 'It+6', Fr: 'Fr+6', Gr: 'Gr+6' }
    return { leading: labels[specialRoot] || specialRoot, figure: null }
  }

  const isI64 = degree === 'I' && figure === '64'
  const degreePartRaw = isI64 && sixFourVariant === 'passing' ? 'V'
    : isI64 && sixFourVariant === 'cadential' ? 'cad'
    : degree
  // Appliquer la casse majeur/mineur selon degreeMode (comme ChordDisplay mode élève)
  const degreePart = degreePartRaw === 'cad' ? 'cad' : (degreePartRaw && degreeMode)
    ? getDegreeDisplayLabel(degreePartRaw, degreeMode)
    : degreePartRaw

  let leading = ''
  if (isBorrowed) leading += '('
  if (accidental && degreePart !== 'cad') {
    leading += accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '♮'
  }
  leading += degreePart || ''
  if (quality && degreePart !== 'cad') leading += quality
  if (isBorrowed) leading += ')'

  if (!figure || figure === '5') return { leading, figure: null }
  const figObj = FIGURES.find(f => f.value === figure)
  const fig = figObj?.isStacked && figObj?.displayArray
    ? { stacked: true, digits: figObj.displayArray }
    : { stacked: false, value: figObj?.display ?? figure }
  return { leading, figure: fig }
}

/**
 * ChordLabel : affichage degré + chiffrage baroque (chiffres superposés si 6/5, 6/4, 4/3, 5/4).
 * Accepte soit un objet chord soit une chaîne displayString (ex. pour le QCM).
 */
export default function ChordLabel({ chord, displayString, className = '', ariaLabel }) {
  let leading = ''
  let figure = null

  if (displayString != null && displayString !== '') {
    const parsed = parseChordDisplayString(displayString)
    leading = parsed.leading
    figure = parsed.figure
  } else if (chord) {
    const built = buildLeadingFromChord(chord)
    leading = built.leading
    figure = built.figure
  }

  if (!leading && !figure) return null

  const title = ariaLabel ?? (typeof displayString === 'string' ? displayString : undefined)

  return (
    <span
      className={`baroque-chord-label ${className}`.trim()}
      title={title}
      aria-label={title}
      role={title ? 'text' : undefined}
    >
      {leading && <span className="chord-label-degree">{leading}</span>}
      {figure && (
        <span className="chord-label-figure">
          {figure.stacked ? (
            <span className="chord-label-figure-stacked">
              {figure.digits.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </span>
          ) : (
            <span>{figure.value}</span>
          )}
        </span>
      )}
    </span>
  )
}
