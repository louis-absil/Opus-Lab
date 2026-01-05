import { useState, useEffect, useRef, useCallback } from 'react'
import './VideoCockpit.css'

function VideoCockpit({
  playerRef,
  startTime,
  endTime,
  currentTime,
  isPlaying,
  videoDuration,
  markers = [], // Liste des marqueurs (timestamps relatifs)
  onStartTimeChange,
  onEndTimeChange,
  onSeek,
  onPlayPause,
  onPlaySelection,
  onCreateMarker, // Callback pour créer un marqueur
  studentMode = false, // Mode élève : masquer les marqueurs
  answeredMarkers = [], // Liste des indices de marqueurs déjà répondues
  onMarkerClick = null, // Callback pour cliquer sur un marqueur (mode élève)
  onQuit = null, // Callback pour quitter l'exercice (mode élève)
  answeredCount = 0, // Nombre de questions répondues (mode élève)
  totalMarkers = 0, // Nombre total de questions (mode élève)
  onFinish = null // Callback pour terminer l'exercice (mode élève)
}) {
  const [isEditingStartTime, setIsEditingStartTime] = useState(false)
  const [isEditingEndTime, setIsEditingEndTime] = useState(false)
  const [startTimeInput, setStartTimeInput] = useState('')
  const [endTimeInput, setEndTimeInput] = useState('')
  const [isDraggingStart, setIsDraggingStart] = useState(false)
  const [isDraggingEnd, setIsDraggingEnd] = useState(false)
  const timelineRef = useRef(null)
  const startHandleRef = useRef(null)
  const endHandleRef = useRef(null)

  // Formater le temps en MM:SS.ms
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '00:00.0'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  // Parser le temps depuis le format MM:SS.ms
  const parseTime = (timeString) => {
    const parts = timeString.split(':')
    if (parts.length !== 2) return null
    const mins = parseInt(parts[0], 10)
    const secsParts = parts[1].split('.')
    const secs = parseInt(secsParts[0], 10)
    const ms = secsParts[1] ? parseInt(secsParts[1], 10) : 0
    if (isNaN(mins) || isNaN(secs)) return null
    return mins * 60 + secs + ms / 10
  }

  // Calculer les positions en pourcentage
  // EN MODE ÉLÈVE : Utiliser la durée de l'extrait au lieu de la durée totale
  const effectiveDuration = studentMode 
    ? (endTime - startTime) // Durée de l'extrait uniquement
    : (videoDuration > 0 ? videoDuration : Math.max(endTime, 60))
  
  const getStartPosition = () => {
    if (effectiveDuration === 0) return 0
    if (studentMode) return 0 // En mode élève, le début est toujours à 0%
    return (startTime / effectiveDuration) * 100
  }

  const getEndPosition = () => {
    if (effectiveDuration === 0) return 100
    if (studentMode) return 100 // En mode élève, la fin est toujours à 100%
    return (endTime / effectiveDuration) * 100
  }

  const getCurrentPosition = () => {
    if (effectiveDuration === 0) return 0
    if (studentMode) {
      // En mode élève, calculer la position relative à l'extrait
      const relativeTime = currentTime - startTime
      return Math.max(0, Math.min(100, (relativeTime / effectiveDuration) * 100))
    }
    return (currentTime / effectiveDuration) * 100
  }

  // Convertir une position X en temps
  const getTimeFromPosition = useCallback((clientX) => {
    if (!timelineRef.current || effectiveDuration === 0) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    if (studentMode) {
      // En mode élève, convertir en temps relatif à l'extrait
      return startTime + (percentage / 100) * effectiveDuration
    }
    return (percentage / 100) * effectiveDuration
  }, [effectiveDuration, studentMode, startTime])

  // Gérer le clic sur la timeline (navigation, pas sur les poignées)
  const handleTimelineClick = (e) => {
    // Ne pas naviguer si on clique sur une poignée
    if (e.target === startHandleRef.current || 
        e.target === endHandleRef.current ||
        startHandleRef.current?.contains(e.target) ||
        endHandleRef.current?.contains(e.target)) {
      return
    }
    const time = getTimeFromPosition(e.clientX)
    onSeek(time)
  }

  // Gérer le début du drag des poignées (souris et tactile)
  const handleHandleStart = (e, handleType) => {
    e.preventDefault()
    e.stopPropagation()
    if (handleType === 'start') {
      setIsDraggingStart(true)
    } else {
      setIsDraggingEnd(true)
    }
  }
  
  // Handler pour souris
  const handleHandleMouseDown = (e, handleType) => {
    handleHandleStart(e, handleType)
  }
  
  // Handler pour tactile
  const handleHandleTouchStart = (e, handleType) => {
    handleHandleStart(e, handleType)
  }

  // Gérer le drag des poignées (souris et tactile)
  useEffect(() => {
    if (!isDraggingStart && !isDraggingEnd) return

    const getClientX = (e) => {
      // Support souris et tactile
      return e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0)
    }

    const handleMove = (e) => {
      const clientX = getClientX(e)
      const time = getTimeFromPosition(clientX)

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

    const handleEnd = () => {
      setIsDraggingStart(false)
      setIsDraggingEnd(false)
    }

    // Événements souris
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    
    // Événements tactiles
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDraggingStart, isDraggingEnd, startTime, endTime, videoDuration, effectiveDuration, onStartTimeChange, onEndTimeChange, onSeek, getTimeFromPosition])

  // Action IN : Fixer le début à la position actuelle
  const handleSetIn = () => {
    const newStartTime = Math.max(0, Math.min(currentTime, endTime - 0.1))
    onStartTimeChange(newStartTime)
    onSeek(newStartTime)
  }

  // Action OUT : Fixer la fin à la position actuelle
  const handleSetOut = () => {
    const newEndTime = Math.max(startTime + 0.1, Math.min(currentTime, effectiveDuration))
    onEndTimeChange(newEndTime)
    onSeek(newEndTime)
  }

  // Nudge start time
  const handleNudgeStart = (delta) => {
    const newStartTime = Math.max(0, Math.min(startTime + delta, endTime - 0.1))
    onStartTimeChange(newStartTime)
    onSeek(newStartTime)
  }

  // Nudge end time
  const handleNudgeEnd = (delta) => {
    const newEndTime = Math.max(startTime + 0.1, Math.min(endTime + delta, effectiveDuration))
    onEndTimeChange(newEndTime)
    onSeek(newEndTime)
  }

  // Gérer l'édition du startTime
  const handleStartTimeFocus = () => {
    setIsEditingStartTime(true)
    setStartTimeInput(formatTime(startTime))
  }

  const handleStartTimeBlur = () => {
    setIsEditingStartTime(false)
    const parsed = parseTime(startTimeInput)
    if (parsed !== null && parsed >= 0 && parsed < endTime) {
      onStartTimeChange(parsed)
      onSeek(parsed)
    }
  }

  const handleStartTimeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  // Gérer l'édition du endTime
  const handleEndTimeFocus = () => {
    setIsEditingEndTime(true)
    setEndTimeInput(formatTime(endTime))
  }

  const handleEndTimeBlur = () => {
    setIsEditingEndTime(false)
    const parsed = parseTime(endTimeInput)
    if (parsed !== null && parsed > startTime && parsed <= effectiveDuration) {
      onEndTimeChange(parsed)
      onSeek(parsed)
    }
  }

  const handleEndTimeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  // Calculer la durée de la sélection
  const selectionDuration = endTime - startTime

  const startPos = getStartPosition()
  const endPos = getEndPosition()
  const currentPos = getCurrentPosition()
  const rangeWidth = endPos - startPos

  return (
    <div className={`video-cockpit ${studentMode ? 'student-mode' : ''}`}>
      {/* ÉTAGE A : Timeline Visuelle */}
      <div className="cockpit-timeline-wrapper">
        {videoDuration === 0 ? (
          <div className="timeline-loading-state">
            <div className="loading-spinner"></div>
            <span>Chargement de la durée de la vidéo...</span>
          </div>
        ) : (
          <div 
            ref={timelineRef}
            className="cockpit-timeline"
            onClick={handleTimelineClick}
          >
            {/* EN MODE ÉLÈVE : Afficher uniquement la zone active (pas de zones inactives) */}
            {studentMode ? (
              /* Zone active uniquement (toute la timeline) */
              <div 
                className="timeline-active"
                style={{ 
                  width: '100%',
                  left: '0%'
                }}
              >
                {/* Pas de poignées en mode élève */}
              </div>
            ) : (
              <>
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
                  {/* Poignée de début (glissable) */}
                  <div
                    ref={startHandleRef}
                    className="timeline-handle timeline-handle-start"
                    style={{ left: 0 }}
                    onMouseDown={(e) => handleHandleMouseDown(e, 'start')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'start')}
                  >
                    <div className="handle-indicator" />
                    <div className="handle-grip" />
                  </div>

                  {/* Poignée de fin (glissable) */}
                  <div
                    ref={endHandleRef}
                    className="timeline-handle timeline-handle-end"
                    style={{ right: 0 }}
                    onMouseDown={(e) => handleHandleMouseDown(e, 'end')}
                    onTouchStart={(e) => handleHandleTouchStart(e, 'end')}
                  >
                    <div className="handle-indicator" />
                    <div className="handle-grip" />
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
              </>
            )}

            {/* Playhead (tête de lecture) */}
            <div
              className="playhead"
              style={{ left: `${currentPos}%` }}
            />

            {/* Marqueurs d'accords */}
            {/* RÈGLE D'OR : Tous les éléments (barre violette ET marqueurs) utilisent le même référentiel */}
            {/* EN MODE ÉLÈVE : Position% = ((TempsAbsolu - startTime) / (endTime - startTime)) * 100 */}
            {/* EN MODE PROF : Position% = (TempsAbsolu / DuréeTotaleVideo) * 100 */}
            {markers.map((marker, index) => {
                // marker est déjà en temps absolu (secondes depuis le début de la vidéo)
                const markerAbsoluteTime = marker
                
                // Déterminer si le marqueur est dans la zone de sélection pour le style visuel
                const isInSelection = markerAbsoluteTime >= startTime && markerAbsoluteTime <= endTime
                
                // EN MODE ÉLÈVE : Ne pas afficher les marqueurs hors de l'extrait
                if (studentMode && (markerAbsoluteTime < startTime || markerAbsoluteTime > endTime)) {
                  return null
                }
                
                // Calcul de la position
                let markerPos
                if (studentMode) {
                  // En mode élève, calculer la position relative à l'extrait
                  const relativeTime = markerAbsoluteTime - startTime
                  markerPos = effectiveDuration > 0 
                    ? (relativeTime / effectiveDuration) * 100 
                    : 0
                } else {
                  // En mode prof, utiliser la durée totale
                  markerPos = effectiveDuration > 0 
                    ? (markerAbsoluteTime / effectiveDuration) * 100 
                    : 0
                }
                
                // En mode élève : masquer les marqueurs non répondues (afficher "?")
                if (studentMode) {
                  const isAnswered = answeredMarkers.includes(index)
                  return (
                    <div
                      key={index}
                      className={`timeline-marker ${!isInSelection ? 'timeline-marker-outside' : ''} ${isAnswered ? 'timeline-marker-answered' : 'timeline-marker-question'} ${onMarkerClick ? 'timeline-marker-clickable' : ''}`}
                      style={{ left: `${markerPos}%` }}
                      title={isAnswered ? `Question ${index + 1} (répondu - cliquer pour modifier)` : `Question ${index + 1} (à répondre)`}
                      onClick={(e) => {
                        e.stopPropagation() // Empêcher le clic sur la timeline
                        if (onMarkerClick) {
                          onMarkerClick(index)
                        }
                      }}
                    >
                      {isAnswered ? (
                        <span className="marker-checkmark">✓</span>
                      ) : (
                        <span className="marker-question">?</span>
                      )}
                    </div>
                  )
                }
                
                return (
                  <div
                    key={index}
                    className={`timeline-marker ${!isInSelection ? 'timeline-marker-outside' : ''}`}
                    style={{ left: `${markerPos}%` }}
                    title={`Marqueur ${index + 1}: ${formatTime(markerAbsoluteTime)} (absolu)`}
                  />
                )
              })}
          </div>
        )}
      </div>

      {/* ÉTAGE B : Barre d'Actions */}
      <div className={`cockpit-toolbar ${studentMode ? 'student-mode-toolbar' : ''}`}>
        {studentMode ? (
          /* Mode élève : Interface simplifiée */
          <>
            <div className="toolbar-group toolbar-group-center student-toolbar">
              <button 
                className="action-btn play-pause-btn"
                onClick={onPlayPause}
                title="Play/Pause"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="duration-info-student">
                {formatTime(currentTime)} / {formatTime(endTime)}
              </div>
              {onQuit && (
                <button 
                  className="action-btn quit-btn-student"
                  onClick={onQuit}
                  title="Quitter l'exercice"
                >
                  ❌ Quitter
                </button>
              )}
            </div>
            {/* Barre de progression et bouton terminer */}
            <div className="student-progress-section">
              <div className="student-progress-bar-wrapper">
                <div className="student-progress-text">
                  Répondues : {answeredCount} / {totalMarkers}
                </div>
                <div className="student-progress-bar">
                  <div 
                    className="student-progress-fill"
                    style={{ width: `${totalMarkers > 0 ? (answeredCount / totalMarkers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {answeredCount === totalMarkers && totalMarkers > 0 && onFinish && (
                <button 
                  className="action-btn finish-btn-student"
                  onClick={onFinish}
                  title="Terminer l'exercice"
                >
                  ✅ Terminer
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* GROUPE GAUCHE : Contrôle du Début (IN) */}
            <div className="toolbar-group toolbar-group-left">
              <button 
                className="action-btn in-btn"
                onClick={handleSetIn}
                title="Définir le point IN (Raccourci: I)"
              >
                IN
              </button>
              <div className="time-display-group">
                <input
                  type="text"
                  className="time-input"
                  value={isEditingStartTime ? startTimeInput : formatTime(startTime)}
                  onChange={(e) => setStartTimeInput(e.target.value)}
                  onFocus={handleStartTimeFocus}
                  onBlur={handleStartTimeBlur}
                  onKeyDown={handleStartTimeKeyDown}
                  readOnly={!isEditingStartTime}
                />
                <div className="nudge-buttons-small">
                  <button 
                    className="nudge-btn-small"
                    onClick={() => handleNudgeStart(-0.1)}
                    title="Reculer de 0.1s"
                  >
                    ‹
                  </button>
                  <button 
                    className="nudge-btn-small"
                    onClick={() => handleNudgeStart(0.1)}
                    title="Avancer de 0.1s"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            {/* GROUPE CENTRE : Transport & Lecture */}
            <div className="toolbar-group toolbar-group-center">
              <button 
                className="action-btn play-pause-btn"
                onClick={onPlayPause}
                title="Play/Pause (Raccourci: Espace)"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button 
                className="action-btn tap-btn"
                onClick={onCreateMarker}
                title="Marquer un accord (Raccourci: Entrée)"
              >
                <span className="tap-icon">+</span>
                <span className="tap-label">TAP</span>
              </button>
              <button 
                className="action-btn play-selection-btn"
                onClick={onPlaySelection}
                title="Lire la sélection depuis le début"
              >
                ⏮▶
              </button>
              <div className="duration-info">
                Sec: {selectionDuration.toFixed(1)}s
              </div>
            </div>

            {/* GROUPE DROITE : Contrôle de Fin (OUT) */}
            <div className="toolbar-group toolbar-group-right">
              <div className="time-display-group">
                <div className="nudge-buttons-small">
                  <button 
                    className="nudge-btn-small"
                    onClick={() => handleNudgeEnd(-0.1)}
                    title="Reculer de 0.1s"
                  >
                    ‹
                  </button>
                  <button 
                    className="nudge-btn-small"
                    onClick={() => handleNudgeEnd(0.1)}
                    title="Avancer de 0.1s"
                  >
                    ›
                  </button>
                </div>
                <input
                  type="text"
                  className="time-input"
                  value={isEditingEndTime ? endTimeInput : formatTime(endTime)}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  onFocus={handleEndTimeFocus}
                  onBlur={handleEndTimeBlur}
                  onKeyDown={handleEndTimeKeyDown}
                  readOnly={!isEditingEndTime}
                />
              </div>
              <button 
                className="action-btn out-btn"
                onClick={handleSetOut}
                title="Définir le point OUT (Raccourci: O)"
              >
                OUT
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default VideoCockpit

