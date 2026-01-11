import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import './ExerciseSummary.css'

function ExerciseSummary({ exercise, userAnswers, answerValidations = {}, onReplay, isGuest = false }) {
  const navigate = useNavigate()
  const { disableGuestMode } = useAuth()
  
  // Comparer les réponses de l'élève avec les solutions
  const compareAnswers = () => {
    if (!exercise.markers) return []
    
    return exercise.markers.map((marker, index) => {
      const userAnswer = userAnswers[index]
      // Les marqueurs peuvent être des objets {time, chord} ou juste des timestamps
      const markerTime = typeof marker === 'number' ? marker : (marker.time || marker.absoluteTime)
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
      
      // Utiliser la validation fonctionnelle si disponible, sinon validation binaire
      let validation = answerValidations[index]
      if (!validation && userAnswer && correctAnswer) {
        validation = validateAnswerWithFunctions(
          userAnswer,
          correctAnswer,
          userAnswer.selectedFunction || userAnswer.function || null
        )
      }
      
      // Déterminer si la réponse est correcte (niveau 1 = parfait)
      const isPerfect = validation && validation.level === 1
      const isPartiallyCorrect = validation && validation.level >= 2
      
      return {
        index,
        time: markerTime,
        userAnswer: userAnswer?.displayLabel || 'Non répondu',
        correctAnswer: correctAnswer?.displayLabel || 'Non défini',
        isCorrect: isPerfect,
        isPartiallyCorrect,
        validation: validation || null
      }
    })
  }

  const results = compareAnswers()
  const perfectCount = results.filter(r => r.isCorrect).length
  const partialCount = results.filter(r => r.isPartiallyCorrect && !r.isCorrect).length
  const totalCount = results.length
  
  // Calculer le score pondéré
  const totalScore = results.reduce((sum, r) => {
    if (r.validation) {
      return sum + r.validation.score
    }
    return sum + (r.isCorrect ? 100 : 0)
  }, 0)
  const maxScore = totalCount * 100
  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const score = Math.round(scorePercentage / 10) // Score sur 10

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="exercise-summary">
      <div className="summary-container">
        <div className="summary-header">
          <h1>Résultats de l'exercice</h1>
          <h2>{exercise.metadata?.exerciseTitle || 'Exercice d\'analyse harmonique'}</h2>
          {exercise.metadata?.composer && exercise.metadata?.workTitle && (
            <p className="summary-meta">
              {exercise.metadata.composer} - {exercise.metadata.workTitle}
            </p>
          )}
        </div>

        {isGuest && (
          <div className="guest-notice">
            <div className="guest-notice-content">
              <span className="guest-notice-icon">ℹ️</span>
              <div>
                <strong>Mode invité</strong>
                <p>Votre score n'a pas été sauvegardé. Connectez-vous pour enregistrer votre progression et gagner de l'XP.</p>
              </div>
            </div>
            <div className="guest-actions-summary">
              <button 
                className="guest-exit-btn-summary"
                onClick={() => {
                  disableGuestMode()
                  navigate('/')
                }}
              >
                Quitter le mode invité
              </button>
              <button 
                className="guest-connect-btn-summary"
                onClick={async () => {
                  disableGuestMode()
                  navigate('/')
                }}
              >
                Se connecter
              </button>
            </div>
          </div>
        )}

        <div className="summary-score">
          <div className="score-circle">
            <div className="score-value">{score}/10</div>
            <div className="score-label">Note</div>
          </div>
          <div className="score-details">
            <p className="score-text">
              <strong>{perfectCount}</strong> réponse{perfectCount > 1 ? 's' : ''} parfaite{perfectCount > 1 ? 's' : ''}
              {partialCount > 0 && (
                <> et <strong>{partialCount}</strong> réponse{partialCount > 1 ? 's' : ''} partielle{partialCount > 1 ? 's' : ''}</>
              )}
              {' '}sur <strong>{totalCount}</strong>
            </p>
            <div className="score-percentage">
              {scorePercentage}% de réussite
            </div>
          </div>
        </div>

        <div className="summary-results">
          <h3>Détail des réponses</h3>
          <div className="results-list">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`result-item ${result.isCorrect ? 'correct' : result.isPartiallyCorrect ? 'partial' : 'incorrect'}`}
              >
                <div className="result-header">
                  <span className="result-question">Question {index + 1}</span>
                  <span className="result-time">à {formatTime(result.time)}</span>
                  {result.isCorrect ? (
                    <span className="result-icon correct-icon">✅</span>
                  ) : result.isPartiallyCorrect ? (
                    <span className="result-icon partial-icon">⚠️</span>
                  ) : (
                    <span className="result-icon incorrect-icon">❌</span>
                  )}
                </div>
                <div className="result-content">
                  <div className="result-answer">
                    <span className="result-label">Votre réponse :</span>
                    <span className={`result-value ${result.isCorrect ? 'correct' : result.isPartiallyCorrect ? 'partial' : 'incorrect'}`}>
                      {result.userAnswer}
                    </span>
                  </div>
                  {result.validation && result.validation.feedback && (
                    <div className="result-feedback">
                      <span className="result-feedback-text">{result.validation.feedback}</span>
                      <span className="result-feedback-score">({result.validation.score}% XP)</span>
                    </div>
                  )}
                  {!result.isCorrect && (
                    <div className="result-answer">
                      <span className="result-label">Solution :</span>
                      <span className="result-value correct">
                        {result.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-actions">
          <button 
            className="summary-btn replay-btn"
            onClick={onReplay}
          >
            🔄 Rejouer l'exercice
          </button>
          <button 
            className="summary-btn back-btn"
            onClick={() => window.location.hash = '/student-dashboard'}
          >
            ← Retour au Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExerciseSummary

