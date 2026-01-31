import React, { useMemo } from 'react'
import { X } from 'lucide-react'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import './AttemptDetailModal.css'

/**
 * Formate un accord (réponse) pour affichage : degré + chiffrage + cadence si pertinent.
 * Gère displayLabel, degree+figure, root, qcmAnswer (réponses QCM) et selectedFunction.
 */
function formatChordLabel(chord) {
  if (!chord) return '—'
  const parts = []
  if (chord.displayLabel) parts.push(chord.displayLabel)
  else if (chord.qcmAnswer) parts.push(chord.qcmAnswer)
  else if (chord.degree) {
    parts.push(chord.degree)
    if (chord.figure && chord.figure !== '5') parts.push(chord.figure)
  } else if (chord.root) parts.push(chord.root)
  else if (chord.selectedFunction) parts.push(chord.selectedFunction)
  if (chord.cadence) parts.push(`(${chord.cadence})`)
  return parts.length ? parts.join(' ') : '—'
}

/**
 * Calcule les validations par question pour une tentative
 */
export function getAttemptValidations(attempt) {
  const correctAnswers = attempt?.correctAnswers || []
  const userAnswers = attempt?.userAnswers || []
  const validations = []
  let correct = 0
  let partial = 0
  let incorrect = 0

  correctAnswers.forEach((correctAnswer, index) => {
    const userAnswer = userAnswers[index]
    const validation = validateAnswerWithFunctions(
      userAnswer,
      correctAnswer,
      userAnswer?.selectedFunction || userAnswer?.function || null,
      {}
    )
    validations.push({
      index: index + 1,
      userAnswer,
      correctAnswer,
      ...validation
    })
    if (validation.level === 1) correct++
    else if (validation.level === 2 || validation.level === 3) partial++
    else incorrect++
  })

  return {
    validations,
    summary: { correct, partial, incorrect, total: correctAnswers.length }
  }
}

function AttemptDetailModal({ attempt, exerciseTitle, onClose }) {
  const { validations, summary } = useMemo(
    () => (attempt ? getAttemptValidations(attempt) : { validations: [], summary: { correct: 0, partial: 0, incorrect: 0, total: 0 } }),
    [attempt]
  )

  if (!attempt) return null

  const statusLabel = (level) => {
    if (level === 1) return { text: 'Correct', className: 'attempt-detail-status-correct' }
    if (level === 2 || level === 3) return { text: 'Partiel', className: 'attempt-detail-status-partial' }
    return { text: 'Incorrect', className: 'attempt-detail-status-incorrect' }
  }

  return (
    <div className="attempt-detail-overlay" onClick={onClose} role="presentation">
      <div
        className="attempt-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attempt-detail-title"
      >
        <button
          type="button"
          className="attempt-detail-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
        <h3 id="attempt-detail-title" className="attempt-detail-title">
          Détail de la tentative
        </h3>
        <p className="attempt-detail-exercise">{exerciseTitle}</p>
        <div className="attempt-detail-summary">
          <span className="attempt-detail-score">Score : {attempt.score}%</span>
          <span className="attempt-detail-counts">
            <span className="attempt-detail-correct">✓ {summary.correct}</span>
            <span className="attempt-detail-partial">~ {summary.partial}</span>
            <span className="attempt-detail-incorrect">✗ {summary.incorrect}</span>
            <span className="attempt-detail-total">/ {summary.total}</span>
          </span>
        </div>
        <div className="attempt-detail-list">
          {validations.map((v) => {
            const status = statusLabel(v.level)
            return (
              <div key={v.index} className={`attempt-detail-row attempt-detail-row-${v.level === 1 ? 'correct' : v.level === 2 || v.level === 3 ? 'partial' : 'incorrect'}`}>
                <span className="attempt-detail-num">Q{v.index}</span>
                <span className="attempt-detail-user" title="Ta réponse">
                  {formatChordLabel(v.userAnswer)}
                </span>
                <span className="attempt-detail-arrow">→</span>
                <span className="attempt-detail-correct-answer" title="Réponse attendue">
                  {formatChordLabel(v.correctAnswer)}
                </span>
                <span className={`attempt-detail-status ${status.className}`}>{status.text}</span>
                <p className="attempt-detail-feedback">{v.feedback || ''}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AttemptDetailModal
