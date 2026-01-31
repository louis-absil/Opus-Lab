import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { formatChordDetailed, FIGURES } from '../utils/chordFormatter'
import { ChordLabelFigure } from './ChordLabel'
import { PRIMARY_DEGREES, DEGREE_TO_FUNCTIONS } from '../utils/riemannFunctions'
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

  // Fonction correcte d'un accord (pour comparaison en mode QCM avec réponse "fonction seule")
  const getCorrectFunction = (chord) => {
    if (!chord) return null
    if (chord.selectedFunction) return chord.selectedFunction
    if (chord.specialRoot) {
      const map = { N: 'SD', It: 'D', Fr: 'D', Gr: 'D' }
      return map[chord.specialRoot] || null
    }
    if (chord.degree) {
      const funcs = DEGREE_TO_FUNCTIONS[chord.degree] || []
      return funcs.length > 0 ? funcs[0] : null
    }
    return null
  }

  // Comparer les accords élément par élément pour la coloration
  const compareChords = (userChord, correctChord) => {
    if (!userChord || !correctChord) return null
    const userFunction = userChord.selectedFunction || userChord.function
    const correctFunction = getCorrectFunction(correctChord)

    return {
      degree: userChord.degree === correctChord.degree,
      accidental: userChord.accidental === correctChord.accidental,
      quality: userChord.quality === correctChord.quality,
      figure: userChord.figure === correctChord.figure,
      isBorrowed: userChord.isBorrowed === correctChord.isBorrowed,
      specialRoot: userChord.specialRoot === correctChord.specialRoot,
      selectedFunction: userFunction != null && correctFunction != null && userFunction === correctFunction,
      cadence: !!(userChord.cadence && correctChord.cadence) && (userChord.cadence === correctChord.cadence || (userChord.cadence === 'demi-cadence' && correctChord.cadence === 'half') || (userChord.cadence === 'half' && correctChord.cadence === 'demi-cadence'))
    }
  }

  const comparison = userAnswer && correctAnswer ? compareChords(userAnswer, correctAnswer) : null
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

        {/* Comparateur Visuel */}
        <div className="review-comparator">
          <div className="review-comparison-item">
            <div className="review-comparison-label">Votre réponse</div>
            <div className={`review-chord-display ${validation?.level === 1 ? 'review-chord-correct' : validation?.level === 0.5 || validation?.level === 2 || validation?.level === 3 ? 'review-chord-partial' : 'review-chord-incorrect'}`}>
              {userAnswer ? (
                <>
                  <ChordDisplayDetailed chord={userAnswer} comparison={comparison} isUserAnswer={true} />
                  {correctAnswer?.cadence && (
                    <div className={`review-cadence ${comparison?.cadence ? 'review-cadence-correct' : 'review-cadence-incorrect'}`}>
                      Cadence : {userAnswer.cadence ? (cadenceLabels[userAnswer.cadence] || userAnswer.cadence) : '—'}
                    </div>
                  )}
                </>
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
                <>
                  <ChordDisplayDetailed chord={correctAnswer} isUserAnswer={false} />
                  {correctAnswer.cadence && (
                    <div className="review-cadence review-cadence-solution">
                      Cadence : {cadenceLabels[correctAnswer.cadence] || correctAnswer.cadence}
                    </div>
                  )}
                </>
              ) : (
                <span className="review-chord-empty">Non défini</span>
              )}
            </div>
          </div>
        </div>

        {/* Message explicite quand la cadence est attendue et fausse */}
        {correctAnswer?.cadence && !comparison?.cadence && (
          <div className="review-cadence-feedback-wrong">
            <span className="review-cadence-feedback-wrong-icon">❌</span>
            <p className="review-cadence-feedback-wrong-text">
              Cadence incorrecte : vous avez indiqué <strong>{userAnswer?.cadence ? (cadenceLabels[userAnswer.cadence] || userAnswer.cadence) : '—'}</strong>, la solution est <strong>{cadenceLabels[correctAnswer.cadence] || correctAnswer.cadence}</strong>.
            </p>
          </div>
        )}

        {/* Explication : message neutre pour les accords non débloqués, sinon feedback de validation */}
        {(isSegmentLocked && !userAnswer) ? (
          <div className="review-explanation review-explanation-neutral">
            <div className="review-explanation-icon">ℹ️</div>
            <div className="review-explanation-content">
              <p className="review-explanation-text">Cet accord n&apos;était pas à remplir dans ce niveau.</p>
            </div>
          </div>
        ) : validation?.feedback ? (
          <div className="review-explanation">
            <div className="review-explanation-icon">
              {validation.level === 1 ? '✅' : validation.level === 0.5 || validation.level === 2 ? '⚠️' : validation.level === 3 ? 'ℹ️' : '❌'}
            </div>
            <div className="review-explanation-content">
              <p className="review-explanation-text">{validation.feedback}</p>
              {(validation.score !== undefined || validation.cadenceBonus !== undefined) && (
                <span className="review-explanation-score">
                  {validation.score ?? 0}% XP
                  {validation.cadenceBonus > 0 && (
                    <span className="review-explanation-cadence-bonus"> + {validation.cadenceBonus}% bonus cadence</span>
                  )}
                </span>
              )}
            </div>
          </div>
        ) : null}
        {codexEntry && (
          <div className="review-codex-link-wrap">
            <button
              type="button"
              className="review-codex-link"
              onClick={() => navigate(`/student-dashboard?tab=codex&fiche=${codexEntry.id}`)}
            >
              Revoir la fiche : {codexEntry.title}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Composant pour afficher un accord avec coloration détaillée
function ChordDisplayDetailed({ chord, comparison, isUserAnswer }) {
  if (!chord) return null

  const { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, function: qcmFunction, qcmAnswer } = chord
  const functionValue = selectedFunction || qcmFunction

  // Réponse QCM avec accord (chaîne type "I6", "II2", "V7") : afficher telle quelle
  if (qcmAnswer && typeof qcmAnswer === 'string' && !degree && !specialRoot) {
    return (
      <span className="review-chord-degree">
        {qcmAnswer}
      </span>
    )
  }

  // Si seule une fonction est sélectionnée (ou réponse QCM fonction seule) : afficher fonction + degré principal en petit (ex. T (I))
  if (functionValue && !degree && !specialRoot) {
    const principalDegree = PRIMARY_DEGREES[functionValue]?.[0]
    return (
      <span className="review-chord-function-with-hint">
        <span className="review-chord-function">{functionValue}</span>
        {principalDegree && <span className="review-chord-function-hint"> ({principalDegree})</span>}
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
        <ChordLabelFigure
          figure={figure}
          className={`review-chord-element review-chord-figure ${isUserAnswer && comparison && !comparison.figure ? 'review-chord-wrong' : 'review-chord-right'}`}
        />
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
