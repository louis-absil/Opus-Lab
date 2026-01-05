import { useState, useEffect, useRef, useCallback } from 'react'
import './VideoTimeline.css'

function VideoTimeline({ 
  playerRef, 
  startTime, 
  endTime, 
  currentTime,
  onStartTimeChange, 
  onEndTimeChange,
  onSeek,
  onPlaySelection 
}) {
  const [videoDuration, setVideoDuration] = useState(0)
  const [isDraggingStart, setIsDraggingStart] = useState(false)
  const [isDraggingEnd, setIsDraggingEnd] = useState(false)
  const timelineRef = useRef(null)
  const startHandleRef = useRef(null)
  const endHandleRef = useRef(null)

  // Récupérer la durée de la vidéo
  useEffect(() => {
    if (!playerRef?.current) {
      setVideoDuration(0)
      return
    }

    const updateDuration = () => {
      try {
        // getDuration() peut retourner undefined ou NaN si la vidéo n'est pas chargée
        const duration = playerRef.current.getDuration()
        if (duration && typeof duration === 'number' && duration > 0 && !isNaN(duration) && isFinite(duration)) {
          setVideoDuration(duration)
        }
      } catch (error) {
        // La vidéo n'est peut-être pas encore chargée, on ignore l'erreur
        console.log('Durée non disponible encore:', error)
      }
    }

    // Mise à jour initiale avec un petit délai pour laisser le temps au player de se charger
    const timeout1 = setTimeout(updateDuration, 500)
    const timeout2 = setTimeout(updateDuration, 1500)
    const timeout3 = setTimeout(updateDuration, 3000)

    // Mise à jour périodique (au cas où la vidéo se charge)
    const interval = setInterval(updateDuration, 2000)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearInterval(interval)
    }
  }, [playerRef])

  // Calculer la durée effective (fallback si pas encore chargée)
  const effectiveDuration = videoDuration > 0 ? videoDuration : Math.max(endTime, 60)
  const showLoading = videoDuration === 0 && playerRef?.current

  // Formater le temps en MM:SS.ms
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '00:00.0'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  // Calculer les positions en pourcentage
  const getStartPosition = () => {
    if (effectiveDuration === 0) return 0
    return (startTime / effectiveDuration) * 100
  }

  const getEndPosition = () => {
    if (effectiveDuration === 0) return 100
    return (endTime / effectiveDuration) * 100
  }

  // Convertir une position X en temps
  const getTimeFromPosition = useCallback((clientX) => {
    if (!timelineRef.current || effectiveDuration === 0) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    return (percentage / 100) * effectiveDuration
  }, [effectiveDuration])

  // Gérer le clic sur la timeline (navigation)
  const handleTimelineClick = (e) => {
    // Ne pas naviguer si on clique sur une poignée
    if (e.target === startHandleRef.current || e.target === endHandleRef.current) {
      return
    }
    
    const time = getTimeFromPosition(e.clientX)
    onSeek(time)
  }

  // Gérer le début du drag
  const handleStartDrag = (e, handleType) => {
    e.preventDefault()
    e.stopPropagation()
    if (handleType === 'start') {
      setIsDraggingStart(true)
    } else {
      setIsDraggingEnd(true)
    }
  }

  // Gérer le drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingStart && !isDraggingEnd) return

      const time = getTimeFromPosition(e.clientX)

      if (isDraggingStart) {
        const newStartTime = Math.max(0, Math.min(time, endTime - 0.1))
        onStartTimeChange(newStartTime)
        onSeek(newStartTime)
      } else if (isDraggingEnd) {
        const maxTime = videoDuration > 0 ? videoDuration : effectiveDuration
        const newEndTime = Math.max(startTime + 0.1, Math.min(time, maxTime))
        onEndTimeChange(newEndTime)
        onSeek(newEndTime)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingStart(false)
      setIsDraggingEnd(false)
    }

    if (isDraggingStart || isDraggingEnd) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingStart, isDraggingEnd, getTimeFromPosition, startTime, endTime, videoDuration, onStartTimeChange, onEndTimeChange, onSeek])

  // Ajuster le temps avec les boutons de précision
  const handleNudge = (handleType, delta) => {
    if (handleType === 'start') {
      const newStartTime = Math.max(0, Math.min(startTime + delta, endTime - 0.1))
      onStartTimeChange(newStartTime)
      onSeek(newStartTime)
    } else {
      const maxTime = videoDuration > 0 ? videoDuration : effectiveDuration
      const newEndTime = Math.max(startTime + 0.1, Math.min(endTime + delta, maxTime))
      onEndTimeChange(newEndTime)
      onSeek(newEndTime)
    }
  }

  const startPos = getStartPosition()
  const endPos = getEndPosition()
  const rangeWidth = endPos - startPos

  return (
    <div className="video-timeline-container">
      <div className="timeline-wrapper">
        {/* Timeline principale */}
        <div 
          ref={timelineRef}
          className="timeline-track"
          onClick={handleTimelineClick}
        >
          {/* Zone inactive avant */}
          <div 
            className="timeline-inactive"
            style={{ width: `${startPos}%` }}
          />

          {/* Zone active (sélection) */}
          <div 
            className="timeline-active"
            style={{ 
              width: `${rangeWidth}%`,
              left: `${startPos}%`
            }}
          >
            {/* Poignée de début */}
            <div
              ref={startHandleRef}
              className="timeline-handle timeline-handle-start"
              style={{ left: 0 }}
              onMouseDown={(e) => handleStartDrag(e, 'start')}
            >
              <div className="handle-indicator" />
              <div className="handle-time-label">
                {formatTime(startTime)}
              </div>
            </div>

            {/* Poignée de fin */}
            <div
              ref={endHandleRef}
              className="timeline-handle timeline-handle-end"
              style={{ right: 0 }}
              onMouseDown={(e) => handleStartDrag(e, 'end')}
            >
              <div className="handle-indicator" />
              <div className="handle-time-label">
                {formatTime(endTime)}
              </div>
            </div>
          </div>

          {/* Zone inactive après */}
          <div 
            className="timeline-inactive"
            style={{ 
              width: `${100 - endPos}%`,
              left: `${endPos}%`
            }}
          />
        </div>
      </div>

      {/* Contrôles de précision */}
      <div className="nudge-controls">
        {/* Contrôles pour le début */}
        <div className="nudge-group">
          <div className="nudge-label">Début</div>
          <div className="nudge-buttons">
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('start', -1)}
              title="Reculer de 1 seconde"
            >
              -1s
            </button>
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('start', -0.1)}
              title="Reculer de 0.1 seconde"
            >
              -0.1s
            </button>
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('start', 0.1)}
              title="Avancer de 0.1 seconde"
            >
              +0.1s
            </button>
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('start', 1)}
              title="Avancer de 1 seconde"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Bouton de lecture de sélection */}
        <div className="play-selection-container">
          <button 
            className="play-selection-btn"
            onClick={onPlaySelection}
            title="Lire la sélection (de début à fin)"
          >
            ▶ Lire la sélection
          </button>
        </div>

        {/* Contrôles pour la fin */}
        <div className="nudge-group">
          <div className="nudge-label">Fin</div>
          <div className="nudge-buttons">
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('end', -1)}
              title="Reculer de 1 seconde"
            >
              -1s
            </button>
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('end', -0.1)}
              title="Reculer de 0.1 seconde"
            >
              -0.1s
            </button>
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('end', 0.1)}
              title="Avancer de 0.1 seconde"
            >
              +0.1s
            </button>
            <button 
              className="nudge-btn"
              onClick={() => handleNudge('end', 1)}
              title="Avancer de 1 seconde"
            >
              +1s
            </button>
          </div>
        </div>
      </div>

      {/* Affichage de la durée totale */}
      <div className="duration-display">
        {showLoading ? (
          <span style={{ color: '#fa709a' }}>Chargement de la durée...</span>
        ) : (
          <>Durée totale: {formatTime(videoDuration)}</>
        )}
      </div>
    </div>
  )
}

export default VideoTimeline

