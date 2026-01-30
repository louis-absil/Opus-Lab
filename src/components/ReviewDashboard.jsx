import { useEffect, useRef } from 'react'
import './ReviewDashboard.css'

function ReviewDashboard({ 
  perfectCount, 
  partialCount, 
  totalCount, 
  scorePercentage,
  cadenceCorrectCount = 0,
  cadenceTotalCount = 0,
  onReplay, 
  onNext, 
  onBack 
}) {
  const dashboardRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (dashboardRef.current && contentRef.current) {
      const dashboardRect = dashboardRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReviewDashboard.jsx:useEffect',message:'Dimensions dashboard',data:{dashboardHeight:dashboardRect.height,dashboardWidth:dashboardRect.width,contentHeight:contentRect.height,contentWidth:contentRect.width,viewportHeight:window.innerHeight,viewportWidth:window.innerWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
  }, [])
  // Message d'encouragement selon le pourcentage
  const getEncouragementMessage = () => {
    if (scorePercentage >= 90) return "Excellent ! 🎉"
    if (scorePercentage >= 70) return "Bien joué ! 👏"
    if (scorePercentage >= 50) return "Pas mal ! 💪"
    return "Continue tes efforts ! 🔥"
  }

  return (
    <div ref={dashboardRef} className="review-dashboard">
      <div ref={contentRef} className="review-dashboard-content">
        {/* Score et message d'encouragement sur la même ligne */}
        <div className="review-score-row">
          {/* Score */}
          <div className="review-score-display">
            <div className="review-score-fraction">
              <span className="review-score-numerator">{perfectCount + partialCount}</span>
              <span className="review-score-separator">/</span>
              <span className="review-score-denominator">{totalCount}</span>
            </div>
            <div className="review-score-percentage-main">
              {scorePercentage}%
            </div>
          </div>

          {/* Message d'encouragement */}
          <div className="review-encouragement-wrapper">
            <h2 className="review-encouragement">{getEncouragementMessage()}</h2>
          </div>
        </div>

        {/* Stats détaillées */}
        <div className="review-dashboard-info">
          <div className="review-stats">
            <p className="review-stats-text">
              <strong>{perfectCount}</strong> réponse{perfectCount > 1 ? 's' : ''} parfaite{perfectCount > 1 ? 's' : ''}
              {partialCount > 0 && (
                <> et <strong>{partialCount}</strong> réponse{partialCount > 1 ? 's' : ''} partielle{partialCount > 1 ? 's' : ''}</>
              )}
              {' '}sur <strong>{totalCount}</strong>
            </p>
            {cadenceTotalCount > 0 && (
              <p className="review-stats-text review-stats-cadences">
                <strong>{cadenceCorrectCount}</strong> / <strong>{cadenceTotalCount}</strong> cadence{cadenceTotalCount > 1 ? 's' : ''} correcte{cadenceTotalCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="review-dashboard-actions">
          <button 
            className="review-btn review-btn-primary"
            onClick={onReplay}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
            Rejouer le niveau
          </button>
          {onNext && (
            <button 
              className="review-btn review-btn-secondary"
              onClick={onNext}
            >
              Niveau suivant
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}
          <button 
            className="review-btn review-btn-tertiary"
            onClick={onBack}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Retour Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReviewDashboard
