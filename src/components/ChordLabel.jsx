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
  const { degree, accidental, quality, figure, isBorrowed, specialRoot, sixFourVariant, degreeMode, pedalDegree } = chord

  if (specialRoot) {
    if (specialRoot === 'N') return { leading: 'II', figure: { stacked: false, value: '♭6' }, pedalDegree: pedalDegree || null }
    const labels = { It: 'It+6', Fr: 'Fr+6', Gr: 'Gr+6' }
    return { leading: labels[specialRoot] || specialRoot, figure: null, pedalDegree: pedalDegree || null }
  }

  const isI64 = degree === 'I' && figure === '64'
  const degreePartRaw = (degree === 'cad' || degree === 'Cad.') ? 'Cad.'
    : isI64 && sixFourVariant === 'passing' ? 'V'
    : isI64 && sixFourVariant === 'cadential' ? 'Cad.'
    : degree
  // Appliquer la casse majeur/mineur selon degreeMode (comme ChordDisplay mode élève)
  const degreePart = degreePartRaw === 'Cad.' ? 'Cad.' : (degreePartRaw && degreeMode)
    ? getDegreeDisplayLabel(degreePartRaw, degreeMode)
    : degreePartRaw

  let leading = ''
  if (isBorrowed) leading += '('
  if (accidental && degreePart !== 'Cad.') {
    leading += accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '♮'
  }
  leading += degreePart || ''
  if (quality && degreePart !== 'Cad.') leading += quality
  if (isBorrowed) leading += ')'

  if (!figure || figure === '5') return { leading, figure: null, pedalDegree: pedalDegree || null }
  const figObj = FIGURES.find(f => f.value === figure)
  const fig = figObj?.isStacked && figObj?.displayArray
    ? { stacked: true, digits: figObj.displayArray }
    : { stacked: false, value: figObj?.display ?? figure }
  return { leading, figure: fig, pedalDegree: pedalDegree || null }
}

/**
 * ChordLabel : affichage degré + chiffrage baroque (chiffres superposés si 6/5, 6/4, 4/3, 5/4).
 * Accepte soit un objet chord soit une chaîne displayString (ex. pour le QCM).
 */
export default function ChordLabel({ chord, displayString, className = '', ariaLabel }) {
  let leading = ''
  let figure = null

  let pedalDegree = null
  if (displayString != null && displayString !== '') {
    const parsed = parseChordDisplayString(displayString)
    leading = parsed.leading
    figure = parsed.figure
    pedalDegree = parsed.pedalDegree ?? null
  } else if (chord) {
    const built = buildLeadingFromChord(chord)
    leading = built.leading
    figure = built.figure
    pedalDegree = built.pedalDegree ?? null
  }

  if (!leading && !figure && !pedalDegree) return null

  const title = ariaLabel ?? (typeof displayString === 'string' ? displayString : undefined)
  const chordPart = (
    <>
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
    </>
  )

  return (
    <span
      className={`baroque-chord-label ${className}`.trim()}
      title={title}
      aria-label={title}
      role={title ? 'text' : undefined}
    >
      {pedalDegree ? (
        <span className="chord-label-pedal">
          <span className="chord-label-pedal-top">{chordPart}</span>
          <span className="chord-label-pedal-bar" aria-hidden="true" />
          <span className="chord-label-pedal-bottom">{pedalDegree}</span>
        </span>
      ) : (
        chordPart
      )}
    </span>
  )
}
