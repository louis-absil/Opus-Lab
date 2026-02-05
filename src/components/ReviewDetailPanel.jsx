import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, RotateCcw } from 'lucide-react'
import ChordLabel from './ChordLabel'
import { normalizeCadence } from '../utils/riemannFunctions'
import './ReviewDetailPanel.css'

function ReviewDetailPanel({ 
  segmentIndex,
  userAnswer, 
  correctAnswer, 
  validation,
  isSegmentLocked = false,
  segmentStartTime,
  segmentEndTime,
  playerRef,
  exerciseStartTime,
  exerciseEndTime,
  codexEntry = null
}) {
  const navigate = useNavigate()
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

  // Appels sécurisés au lecteur YouTube (évite crash si iframe bloquée / non prête)
  const safePause = () => {
    try {
      if (playerRef?.current) playerRef.current.pauseVideo()
    } catch (e) {
      console.warn('ReviewDetailPanel: lecteur indisponible (pause)', e?.message)
    }
  }
  const safeSeekTo = (t, s) => {
    try {
      if (playerRef?.current) playerRef.current.seekTo(t, s)
    } catch (e) {
      console.warn('ReviewDetailPanel: lecteur indisponible (seekTo)', e?.message)
    }
  }
  const safePlayVideo = () => {
    try {
      if (playerRef?.current) playerRef.current.playVideo()
    } catch (e) {
      console.warn('ReviewDetailPanel: lecteur indisponible (playVideo)', e?.message)
    }
  }
  const safeGetCurrentTime = () => {
    try {
      return playerRef?.current ? playerRef.current.getCurrentTime() : 0
    } catch (e) {
      console.warn('ReviewDetailPanel: lecteur indisponible (getCurrentTime)', e?.message)
      return 0
    }
  }

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
    safePause()
  }, [segmentIndex, playerRef])

  // Fonction pour jouer uniquement le segment
  const playSegment = (loop = false) => {
    if (!playerRef?.current || !segmentStartTime || !segmentEndTime) return

    setIsLooping(loop)
    setIsPlayingSegment(true)

    safeSeekTo(segmentStartTime, true)
    safePlayVideo()

    // Surveiller le temps et arrêter à la fin du segment
    segmentIntervalRef.current = setInterval(() => {
      if (!playerRef?.current) {
        clearInterval(segmentIntervalRef.current)
        segmentIntervalRef.current = null
        setIsPlayingSegment(false)
        return
      }

      const currentTime = safeGetCurrentTime()
      if (currentTime >= segmentEndTime) {
        safePause()
        clearInterval(segmentIntervalRef.current)
        segmentIntervalRef.current = null

        if (loop) {
          setTimeout(() => playSegment(true), 500)
        } else {
          setIsPlayingSegment(false)
        }
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
    safePause()
  }

  // Revenir au début de l'extrait et lancer la lecture
  const goToStart = () => {
    stopSegment()
    if (playerRef?.current && exerciseStartTime !== undefined && exerciseEndTime !== undefined) {
      safeSeekTo(exerciseStartTime, true)
      safePlayVideo()

      fullExtractIntervalRef.current = setInterval(() => {
        if (!playerRef?.current) {
          clearInterval(fullExtractIntervalRef.current)
          fullExtractIntervalRef.current = null
          return
        }
        const currentTime = safeGetCurrentTime()
        if (currentTime >= exerciseEndTime) {
          safePause()
          clearInterval(fullExtractIntervalRef.current)
          fullExtractIntervalRef.current = null
        }
      }, 100)
    }
  }

  const cadenceLabels = {
    perfect: 'Parfaite',
    imperfect: 'Imparfaite',
    plagal: 'Plagale',
    rompue: 'Rompue',
    évitée: 'Évitée',
    'demi-cadence': 'Demi-cadence',
    half: 'Demi-cadence'
  }

  const panelRef = useRef(null)
  const contentRef = useRef(null)

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

        {/* Carte feedback (même structure que mode libre) */}
        {(isSegmentLocked && !userAnswer) ? (
          <div className="review-explanation review-explanation-neutral">
            <div className="review-explanation-icon">ℹ️</div>
            <div className="review-explanation-content">
              <p className="review-explanation-text">Cet accord n&apos;était pas à remplir dans ce niveau.</p>
            </div>
          </div>
        ) : (
          <div className={`player-feedback-card player-feedback-card--level-${validation?.level ?? 0}`}>
            <p className="player-feedback-card-message">{validation?.feedback ?? '—'}</p>
            <div className="player-feedback-card-comparison">
              <div className="player-feedback-card-row">
                <span className="player-feedback-card-label">Votre réponse</span>
                <span className="player-feedback-card-value">
                  {userAnswer ? <ChordLabel chord={userAnswer} /> : 'Non répondu'}
                </span>
              </div>
              <div className="player-feedback-card-row">
                <span className="player-feedback-card-label">Solution</span>
                <span className="player-feedback-card-value">
                  {correctAnswer ? <ChordLabel chord={correctAnswer} /> : '—'}
                </span>
              </div>
            </div>
            {correctAnswer?.cadence && userAnswer?.cadence && normalizeCadence(userAnswer.cadence) !== normalizeCadence(correctAnswer.cadence) && (
              <p className="player-feedback-card-cadence">
                Cadence : vous avez indiqué <strong>{cadenceLabels[userAnswer.cadence] || userAnswer.cadence}</strong>, la solution est <strong>{cadenceLabels[correctAnswer.cadence] || correctAnswer.cadence}</strong>.
              </p>
            )}
            {(validation?.score != null) && (
              <p className="player-feedback-card-xp">
                {validation.score}% XP{validation.cadenceBonus > 0 ? ` + ${validation.cadenceBonus}% bonus cadence` : ''}
              </p>
            )}
            {codexEntry && (
              <button type="button" className="player-feedback-card-codex" onClick={() => navigate(`/student-dashboard?tab=codex&fiche=${codexEntry.id}`)}>
                Revoir la fiche : {codexEntry.title}
              </button>
            )}
          </div>
        )}
      </div>
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
