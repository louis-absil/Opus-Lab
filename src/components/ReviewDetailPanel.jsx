import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { formatChordDetailed, FIGURES } from '../utils/chordFormatter'
import './ReviewDetailPanel.css'

function ReviewDetailPanel({ 
  segmentIndex,
  userAnswer, 
  correctAnswer, 
  validation,
  segmentStartTime,
  segmentEndTime,
  playerRef,
  exerciseStartTime,
  exerciseEndTime
}) {
  const [isPlayingSegment, setIsPlayingSegment] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const segmentIntervalRef = useRef(null)
  const fullExtractIntervalRef = useRef(null)

  // Nettoyer les intervalles quand le composant se démonte ou change de segment
  useEffect(() => {
    return () => {
      if (segmentIntervalRef.current) {
        clearInterval(segmentIntervalRef.current)
        segmentIntervalRef.current = null
      }
      if (fullExtractIntervalRef.current) {
        clearInterval(fullExtractIntervalRef.current)
        fullExtractIntervalRef.current = null
      }
    }
  }, [segmentIndex])

  // Arrêter la lecture si on change de segment
  useEffect(() => {
    if (segmentIntervalRef.current) {
      clearInterval(segmentIntervalRef.current)
      segmentIntervalRef.current = null
    }
    if (fullExtractIntervalRef.current) {
      clearInterval(fullExtractIntervalRef.current)
      fullExtractIntervalRef.current = null
    }
    setIsPlayingSegment(false)
    if (playerRef?.current) {
      playerRef.current.pauseVideo()
    }
  }, [segmentIndex, playerRef])

  // Fonction pour jouer uniquement le segment
  const playSegment = (loop = false) => {
    if (!playerRef?.current || !segmentStartTime || !segmentEndTime) return

    setIsLooping(loop)
    setIsPlayingSegment(true)

    // Positionner au début du segment
    playerRef.current.seekTo(segmentStartTime, true)
    
    // Lancer la lecture
    playerRef.current.playVideo()

    // Surveiller le temps et arrêter à la fin du segment
    segmentIntervalRef.current = setInterval(() => {
      if (!playerRef?.current) {
        clearInterval(segmentIntervalRef.current)
        segmentIntervalRef.current = null
        setIsPlayingSegment(false)
        return
      }

      try {
        const currentTime = playerRef.current.getCurrentTime()
        
        if (currentTime >= segmentEndTime) {
          playerRef.current.pauseVideo()
          clearInterval(segmentIntervalRef.current)
          segmentIntervalRef.current = null
          
          if (loop) {
            // Relancer après un court délai
            setTimeout(() => {
              playSegment(true)
            }, 500)
          } else {
            setIsPlayingSegment(false)
          }
        }
      } catch (error) {
        console.error('Erreur lors de la lecture du segment:', error)
        clearInterval(segmentIntervalRef.current)
        segmentIntervalRef.current = null
        setIsPlayingSegment(false)
      }
    }, 100)
  }

  // Arrêter la lecture
  const stopSegment = () => {
    if (segmentIntervalRef.current) {
      clearInterval(segmentIntervalRef.current)
      segmentIntervalRef.current = null
    }
    if (fullExtractIntervalRef.current) {
      clearInterval(fullExtractIntervalRef.current)
      fullExtractIntervalRef.current = null
    }
    setIsPlayingSegment(false)
    setIsLooping(false)
    if (playerRef?.current) {
      playerRef.current.pauseVideo()
    }
  }

  // Revenir au début de l'extrait et lancer la lecture
  const goToStart = () => {
    stopSegment()
    if (playerRef?.current && exerciseStartTime !== undefined && exerciseEndTime !== undefined) {
      playerRef.current.seekTo(exerciseStartTime, true)
      // Lancer la lecture de l'extrait complet
      playerRef.current.playVideo()
      
      // Surveiller la fin de l'extrait et arrêter automatiquement
      fullExtractIntervalRef.current = setInterval(() => {
        if (!playerRef?.current) {
          clearInterval(fullExtractIntervalRef.current)
          fullExtractIntervalRef.current = null
          return
        }

        try {
          const currentTime = playerRef.current.getCurrentTime()
          
          if (currentTime >= exerciseEndTime) {
            playerRef.current.pauseVideo()
            clearInterval(fullExtractIntervalRef.current)
            fullExtractIntervalRef.current = null
          }
        } catch (error) {
          console.error('Erreur lors de la lecture de l\'extrait complet:', error)
          clearInterval(fullExtractIntervalRef.current)
          fullExtractIntervalRef.current = null
        }
      }, 100)
    }
  }

  // Comparer les accords élément par élément pour la coloration
  const compareChords = (userChord, correctChord) => {
    if (!userChord || !correctChord) return null

    return {
      degree: userChord.degree === correctChord.degree,
      accidental: userChord.accidental === correctChord.accidental,
      quality: userChord.quality === correctChord.quality,
      figure: userChord.figure === correctChord.figure,
      isBorrowed: userChord.isBorrowed === correctChord.isBorrowed,
      specialRoot: userChord.specialRoot === correctChord.specialRoot,
      selectedFunction: userChord.selectedFunction === correctChord.selectedFunction
    }
  }

  const comparison = userAnswer && correctAnswer ? compareChords(userAnswer, correctAnswer) : null
  const panelRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (panelRef.current && contentRef.current) {
      const panelRect = panelRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReviewDetailPanel.jsx:useEffect',message:'Dimensions panneau détail',data:{panelHeight:panelRect.height,panelWidth:panelRect.width,contentHeight:contentRect.height,contentWidth:contentRect.width,viewportHeight:window.innerHeight,viewportWidth:window.innerWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
  }, [segmentIndex])

  return (
    <div ref={panelRef} className="review-detail-panel">
      <div ref={contentRef} className="review-detail-content">
        {/* Mini-Player */}
        <div className="review-mini-player">
          <div className="review-player-controls">
            <button
              className="review-player-btn review-player-btn-primary"
              onClick={() => isPlayingSegment ? stopSegment() : playSegment(false)}
              title="Jouer le segment"
            >
              {isPlayingSegment ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isPlayingSegment ? 'Pause' : 'Jouer'}
            </button>
            <button
              className="review-player-btn review-player-btn-secondary"
              onClick={() => playSegment(true)}
              disabled={isPlayingSegment}
              title="Jouer en boucle"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              Boucle
            </button>
            <button
              className="review-player-btn review-player-btn-tertiary"
              onClick={goToStart}
              title="Revenir au début de l'extrait"
            >
              <RotateCcw className="w-5 h-5" />
              Début
            </button>
          </div>
          <div className="review-segment-time">
            Segment : {formatTime(segmentStartTime)} - {formatTime(segmentEndTime)}
          </div>
        </div>

        {/* Comparateur Visuel */}
        <div className="review-comparator">
          <div className="review-comparison-item">
            <div className="review-comparison-label">Votre réponse</div>
            <div className={`review-chord-display ${validation?.level === 1 ? 'review-chord-correct' : validation?.level === 2 || validation?.level === 3 ? 'review-chord-partial' : 'review-chord-incorrect'}`}>
              {userAnswer ? (
                <ChordDisplayDetailed chord={userAnswer} comparison={comparison} isUserAnswer={true} />
              ) : (
                <span className="review-chord-empty">Non répondu</span>
              )}
            </div>
          </div>
          <div className="review-comparison-separator">→</div>
          <div className="review-comparison-item">
            <div className="review-comparison-label">Solution</div>
            <div className="review-chord-display review-chord-correct">
              {correctAnswer ? (
                <ChordDisplayDetailed chord={correctAnswer} isUserAnswer={false} />
              ) : (
                <span className="review-chord-empty">Non défini</span>
              )}
            </div>
          </div>
        </div>

        {/* Explication */}
        {validation?.feedback && (
          <div className="review-explanation">
            <div className="review-explanation-icon">
              {validation.level === 1 ? '✅' : validation.level === 2 ? '⚠️' : validation.level === 3 ? 'ℹ️' : '❌'}
            </div>
            <div className="review-explanation-content">
              <p className="review-explanation-text">{validation.feedback}</p>
              {validation.score !== undefined && (
                <span className="review-explanation-score">{validation.score}% XP</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Composant pour afficher un accord avec coloration détaillée
function ChordDisplayDetailed({ chord, comparison, isUserAnswer }) {
  if (!chord) return null

  const { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction } = chord

  // Si seule une fonction est sélectionnée
  if (selectedFunction && !degree && !specialRoot) {
    return (
      <span className="review-chord-function">
        {selectedFunction}
      </span>
    )
  }

  // Racine spéciale
  if (specialRoot) {
    const special = { 'N': 'II♭6', 'It': 'It+6', 'Fr': 'Fr+6', 'Gr': 'Gr+6' }[specialRoot]
    return (
      <span className={`review-chord-element ${isUserAnswer && comparison && !comparison.specialRoot ? 'review-chord-wrong' : 'review-chord-right'}`}>
        {special || specialRoot}
      </span>
    )
  }

  // Accord normal
  return (
    <div className="review-chord-parts">
      {isBorrowed && (
        <span className={`review-chord-element ${isUserAnswer && comparison && !comparison.isBorrowed ? 'review-chord-wrong' : 'review-chord-right'}`}>
          (
        </span>
      )}
      {accidental && (
        <span className={`review-chord-element ${isUserAnswer && comparison && !comparison.accidental ? 'review-chord-wrong' : 'review-chord-right'}`}>
          {accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '♮'}
        </span>
      )}
      {degree && (
        <span className={`review-chord-element review-chord-degree ${isUserAnswer && comparison && !comparison.degree ? 'review-chord-wrong' : 'review-chord-right'}`}>
          {degree}
        </span>
      )}
      {quality && (
        <span className={`review-chord-element ${isUserAnswer && comparison && !comparison.quality ? 'review-chord-wrong' : 'review-chord-right'}`}>
          {quality}
        </span>
      )}
      {figure && figure !== '5' && (
        <span className={`review-chord-element review-chord-figure ${isUserAnswer && comparison && !comparison.figure ? 'review-chord-wrong' : 'review-chord-right'}`}>
          {(() => {
            const figObj = FIGURES.find(f => f.value === figure)
            return figObj?.display || figure
          })()}
        </span>
      )}
      {isBorrowed && (
        <span className={`review-chord-element ${isUserAnswer && comparison && !comparison.isBorrowed ? 'review-chord-wrong' : 'review-chord-right'}`}>
          )
        </span>
      )}
    </div>
  )
}

// Fonction utilitaire pour formater le temps
function formatTime(seconds) {
  if (!seconds || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default ReviewDetailPanel
