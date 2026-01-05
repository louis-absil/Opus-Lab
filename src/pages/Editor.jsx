import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import SaveExerciseModal from '../components/SaveExerciseModal'
import { useAuth } from '../contexts/AuthContext'
import { getExerciseById, createExercise, updateExercise } from '../services/exerciseService'
import '../App.css'

function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, signInWithGoogle } = useAuth()
  const [videoId, setVideoId] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(60)
  const [isPlaying, setIsPlaying] = useState(false)
  const [markers, setMarkers] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [flash, setFlash] = useState(false)
  const [chordData, setChordData] = useState({})
  const [selectedMarkerId, setSelectedMarkerId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTitle, setVideoTitle] = useState('')
  const [isEditingUrl, setIsEditingUrl] = useState(true)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [loading, setLoading] = useState(!!id) // Charger si on édite un exercice existant
  const [exerciseId, setExerciseId] = useState(id || null)
  
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentTimeRef = useRef(0)

  // Charger l'exercice existant si on est en mode édition
  useEffect(() => {
    if (id && user) {
      loadExercise(id)
    } else if (id && !user) {
      // Rediriger vers login si pas connecté
      navigate('/')
    }
  }, [id, user])

  const loadExercise = async (exerciseId) => {
    try {
      setLoading(true)
      const exercise = await getExerciseById(exerciseId)
      
      if (!exercise) {
        setSaveMessage({ type: 'error', text: 'Exercice introuvable' })
        setTimeout(() => navigate('/'), 2000)
        return
      }

      // Charger les données de l'exercice
      if (exercise.video) {
        setVideoId(exercise.video.id)
        setVideoTitle(exercise.video.title || '')
        setVideoDuration(exercise.video.duration || 0)
      }

      if (exercise.settings) {
        setStartTime(exercise.settings.startTime || 0)
        setEndTime(exercise.settings.endTime || 60)
      }

      if (exercise.markers && exercise.markers.length > 0) {
        const loadedMarkers = exercise.markers.map(m => m.time)
        const loadedChordData = {}
        exercise.markers.forEach((marker, index) => {
          if (marker.chord) {
            loadedChordData[index] = marker.chord
          }
        })
        setMarkers(loadedMarkers)
        setChordData(loadedChordData)
      }

      setExerciseId(exerciseId)
      setIsEditingUrl(false)
    } catch (error) {
      console.error('Erreur lors du chargement de l\'exercice:', error)
      setSaveMessage({ type: 'error', text: 'Erreur lors du chargement de l\'exercice' })
      setTimeout(() => navigate('/'), 2000)
    } finally {
      setLoading(false)
    }
  }

  // Extraire l'ID de la vidéo YouTube depuis l'URL
  const extractVideoId = (url) => {
    if (!url) return ''
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    return match ? match[1] : url
  }

  // Gestion du lecteur YouTube
  const handleReady = (event) => {
    playerRef.current = event.target
    
    const initializeSelection = () => {
      try {
        const duration = event.target.getDuration()
        if (duration && duration > 0 && !isNaN(duration)) {
          setVideoDuration(duration)
          if (endTime === 60 && startTime === 0) {
            setStartTime(0)
            setEndTime(duration)
          }
        }
        
        // Récupérer le titre de la vidéo
        try {
          const videoData = event.target.getVideoData()
          if (videoData && videoData.title) {
            setVideoTitle(videoData.title)
          }
        } catch (titleError) {
          console.error('Erreur lors de la récupération du titre:', titleError)
        }
      } catch (error) {
        // La vidéo n'est peut-être pas encore chargée
      }
    }
    
    setTimeout(initializeSelection, 500)
    setTimeout(initializeSelection, 1500)
    setTimeout(initializeSelection, 3000)
  }

  // Récupérer la durée de la vidéo et le titre
  useEffect(() => {
    if (!playerRef?.current) return

    const updateDuration = () => {
      try {
        const duration = playerRef.current.getDuration()
        if (duration && duration > 0 && !isNaN(duration)) {
          setVideoDuration(duration)
          if (endTime === 60 && startTime === 0) {
            setEndTime(duration)
          }
        }
        
        // Récupérer le titre si pas encore défini
        if (!videoTitle || videoTitle === 'Vidéo YouTube') {
          try {
            const videoData = playerRef.current.getVideoData()
            if (videoData && videoData.title) {
              setVideoTitle(videoData.title)
            }
          } catch (titleError) {
            console.error('Erreur lors de la récupération du titre:', titleError)
          }
        }
      } catch (error) {
        // La vidéo n'est peut-être pas encore chargée
      }
    }

    const timeout1 = setTimeout(updateDuration, 500)
    const timeout2 = setTimeout(updateDuration, 1500)
    const timeout3 = setTimeout(updateDuration, 3000)
    const interval = setInterval(updateDuration, 2000)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearInterval(interval)
    }
  }, [playerRef, endTime, startTime, videoTitle])

  // Nettoyer les intervalles de fade si la lecture est arrêtée
  useEffect(() => {
    if (!isPlaying && window.editorFadeIntervals) {
      window.editorFadeIntervals.forEach(({ cleanup }) => {
        if (cleanup) cleanup()
      })
      window.editorFadeIntervals = []
    }
  }, [isPlaying])

  // Suivi du temps pendant la lecture
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      intervalRef.current = setInterval(() => {
        try {
          const time = playerRef.current.getCurrentTime()
          currentTimeRef.current = time
          setCurrentTime(time)

          // Arrêter à endTime (le fade-out est géré dans handlePlaySelection)
          if (time >= endTime) {
            playerRef.current.pauseVideo()
            setIsPlaying(false)
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du temps:', error)
        }
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, endTime])

  // Gestion des raccourcis clavier globaux
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Espace : Play/Pause
      if (e.code === 'Space' && !e.target.matches('input, textarea, [contenteditable]')) {
        e.preventDefault()
        handlePlayPause()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isPlaying])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const lastMarkerTimeRef = useRef(0)
  const createMarker = useCallback(() => {
    if (!playerRef.current) return
    
    const now = Date.now()
    if (now - lastMarkerTimeRef.current < 100) return
    lastMarkerTimeRef.current = now
    
    try {
      const absoluteTime = playerRef.current.getCurrentTime()
      
      if (absoluteTime >= startTime && absoluteTime <= endTime) {
        const isDuplicate = markers.some(m => Math.abs(m - absoluteTime) < 0.1)
        if (!isDuplicate) {
          setMarkers(prev => [...prev, absoluteTime].sort((a, b) => a - b))
          setFlash(true)
          setTimeout(() => setFlash(false), 200)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la capture du timestamp:', error)
    }
  }, [startTime, endTime, markers])

  const handleEnterKey = useCallback((e) => {
    if (e.code === 'Enter' && playerRef.current) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }
      e.preventDefault()
      createMarker()
    }
  }, [createMarker])

  useEffect(() => {
    window.addEventListener('keydown', handleEnterKey)
    return () => window.removeEventListener('keydown', handleEnterKey)
  }, [handleEnterKey])

  const handlePlayPause = () => {
    if (!playerRef.current) return
    
    if (isPlaying) {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    } else {
      const current = currentTimeRef.current || currentTime
      if (current < startTime || current > endTime) {
        playerRef.current.seekTo(startTime, true)
      }
      playerRef.current.playVideo()
      setIsPlaying(true)
    }
  }

  const handlePlaySelection = () => {
    if (!playerRef.current) return
    
    const fadeDuration = 0.5 // 0.5 secondes
    
    // Aller au début et lancer la lecture
    playerRef.current.seekTo(startTime, true)
    playerRef.current.setVolume(0) // Commencer à volume 0 pour le fade-in
    playerRef.current.playVideo()
    setIsPlaying(true)
    
    // Fade-in progressif sur 0.5s
    const fadeInSteps = 10
    const fadeInInterval = (fadeDuration * 1000) / fadeInSteps
    let fadeInStep = 0
    
    const fadeInIntervalId = setInterval(() => {
      fadeInStep++
      const volume = Math.min(100, (fadeInStep / fadeInSteps) * 100)
      if (playerRef.current) {
        playerRef.current.setVolume(volume)
      }
      if (fadeInStep >= fadeInSteps) {
        clearInterval(fadeInIntervalId)
      }
    }, fadeInInterval)
    
    // Surveiller la fin pour le fade-out
    const checkEndInterval = setInterval(() => {
      if (!playerRef.current) {
        clearInterval(checkEndInterval)
        return
      }
      
      try {
        const currentTime = playerRef.current.getCurrentTime()
        const timeUntilEnd = endTime - currentTime
        
        // Démarrer le fade-out 0.5s avant la fin
        if (timeUntilEnd <= fadeDuration && timeUntilEnd > 0) {
          const fadeOutProgress = 1 - (timeUntilEnd / fadeDuration)
          const volume = Math.max(0, 100 - (fadeOutProgress * 100))
          playerRef.current.setVolume(volume)
        }
        
        // Arrêter à la fin
        if (currentTime >= endTime) {
          playerRef.current.pauseVideo()
          playerRef.current.setVolume(100) // Remettre le volume à 100 pour les prochaines lectures
          setIsPlaying(false)
          clearInterval(checkEndInterval)
        }
      } catch (error) {
        console.error('Erreur lors du suivi de la fin:', error)
        clearInterval(checkEndInterval)
      }
    }, 50) // Vérifier toutes les 50ms
    
    // Nettoyer les intervalles si la lecture est arrêtée manuellement
    const cleanup = () => {
      clearInterval(fadeInIntervalId)
      clearInterval(checkEndInterval)
      if (playerRef.current) {
        playerRef.current.setVolume(100) // Remettre le volume à 100
      }
    }
    
    // Stocker les IDs d'intervalle pour nettoyage
    if (!window.editorFadeIntervals) {
      window.editorFadeIntervals = []
    }
    window.editorFadeIntervals.push({ fadeInIntervalId, checkEndInterval, cleanup })
  }

  const handleSeek = (time) => {
    if (!playerRef.current) return
    playerRef.current.seekTo(time, true)
    setCurrentTime(time)
    currentTimeRef.current = time
  }

  const handleStartTimeChange = (newStartTime) => {
    setStartTime(Math.max(0, Math.min(newStartTime, endTime - 0.1)))
    if (playerRef.current) {
      playerRef.current.seekTo(newStartTime, true)
    }
  }

  const handleEndTimeChange = (newEndTime) => {
    setEndTime(Math.max(startTime + 0.1, Math.min(newEndTime, videoDuration || 60)))
  }

  const handleMarkerClick = (index) => {
    setSelectedMarkerId(index)
    setIsModalOpen(true)
    if (playerRef.current) {
      playerRef.current.seekTo(markers[index], true)
    }
  }

  const handleChordValidate = (chordDataFromModal) => {
    if (selectedMarkerId !== null) {
      setChordData(prev => ({
        ...prev,
        [selectedMarkerId]: chordDataFromModal
      }))
    }
    setIsModalOpen(false)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const getDuration = (index) => {
    if (index === 0) {
      return markers[index] - startTime
    }
    return markers[index] - markers[index - 1]
  }

  const handleDeleteMarker = (e, index) => {
    e.stopPropagation()
    const newMarkers = markers.filter((_, i) => i !== index)
    setMarkers(newMarkers)
    
    // Réindexer chordData
    const newChordData = {}
    newMarkers.forEach((marker, newIndex) => {
      const oldIndex = markers.findIndex(m => m === marker)
      if (oldIndex !== -1 && chordData[oldIndex]) {
        newChordData[newIndex] = chordData[oldIndex]
      }
    })
    setChordData(newChordData)
    
    if (selectedMarkerId === index) {
      setSelectedMarkerId(null)
    }
  }

  const extractedId = extractVideoId(videoId)

  // Gérer la sauvegarde de l'exercice
  const handleSaveExercise = async (metadata) => {
    if (!user) {
      try {
        await signInWithGoogle()
        setIsSaveModalOpen(true)
      } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        setSaveMessage({ type: 'error', text: 'Erreur lors de la connexion' })
        setTimeout(() => setSaveMessage(null), 3000)
      }
      return
    }

    if (!extractedId || markers.length === 0) {
      setSaveMessage({ type: 'error', text: 'Veuillez charger une vidéo et créer au moins un marqueur' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    setIsSaving(true)
    try {
      const markersData = markers.map((markerTime, index) => ({
        time: markerTime,
        chord: chordData[index] || null
      }))

      const exerciseData = {
        authorId: user.uid,
        authorName: user.displayName || user.email,
        status: metadata.privacy === 'public' ? 'published' : 'draft',
        video: {
          id: extractedId,
          title: videoTitle || 'Vidéo YouTube',
          duration: videoDuration
        },
        settings: {
          startTime: startTime,
          endTime: endTime,
          fadeIn: false,
          fadeOut: false
        },
        markers: markersData,
        metadata: {
          composer: metadata.composer,
          workTitle: metadata.workTitle,
          exerciseTitle: metadata.exerciseTitle,
          difficulty: metadata.difficulty || null
        },
        autoTags: metadata.autoTags || []
      }

      let savedId
      if (exerciseId && !metadata.saveAsCopy) {
        // Mise à jour
        await updateExercise(exerciseId, exerciseData)
        savedId = exerciseId
      } else {
        // Création
        savedId = await createExercise(exerciseData)
        setExerciseId(savedId)
        // Mettre à jour l'URL si on était en mode création
        if (!id) {
          navigate(`/editor/${savedId}`, { replace: true })
        }
      }
      
      setSaveMessage({ 
        type: 'success', 
        text: `Exercice ${exerciseId ? 'mis à jour' : 'sauvegardé'} !` 
      })
      setIsSaveModalOpen(false)
      
      setTimeout(() => setSaveMessage(null), 5000)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setSaveMessage({ 
        type: 'error', 
        text: `Erreur lors de la sauvegarde: ${error.message}` 
      })
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = () => {
    if (!user) {
      signInWithGoogle()
        .then(() => setIsSaveModalOpen(true))
        .catch((error) => console.error('Erreur lors de la connexion:', error))
    } else {
      setIsSaveModalOpen(true)
    }
  }

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Chargement de l'exercice...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        {/* Header minimaliste */}
        <div className="app-header">
          <h1 className="app-title">Opus Lab</h1>
          <div className="header-content">
            {extractedId && !isEditingUrl ? (
              <div className="header-video-info">
                <span className="video-title">{videoTitle || 'Vidéo YouTube'}</span>
                <button 
                  className="edit-url-btn"
                  onClick={() => setIsEditingUrl(true)}
                  title="Modifier l'URL"
                >
                  Modifier
                </button>
              </div>
            ) : (
              <div className="header-url-input">
                <input
                  type="text"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  onBlur={() => {
                    if (extractedId) setIsEditingUrl(false)
                  }}
                  placeholder="URL YouTube ou ID de vidéo"
                  className="header-input"
                  autoFocus
                />
              </div>
            )}
            
            <div className="header-actions">
              <button
                className="dashboard-new-btn"
                onClick={() => navigate('/')}
                title="Retour au Dashboard"
              >
                ← Dashboard
              </button>
              {user ? (
                <>
                  <span className="user-info">{user.displayName || user.email}</span>
                  <button
                    className="save-exercise-btn"
                    onClick={handleSaveClick}
                    disabled={!extractedId || markers.length === 0}
                    title={!extractedId || markers.length === 0 ? 'Chargez une vidéo et créez des marqueurs pour sauvegarder' : 'Sauvegarder l\'exercice'}
                  >
                    💾 Sauvegarder
                  </button>
                </>
              ) : (
                <button
                  className="login-btn"
                  onClick={signInWithGoogle}
                  title="Se connecter avec Google"
                >
                  🔐 Se connecter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Écran d'accueil ou lecteur */}
        {!extractedId ? (
          <div className="welcome-screen">
            <h2>Créer un nouvel exercice</h2>
            <p>Collez l'URL d'une vidéo YouTube dans le champ ci-dessus pour commencer</p>
          </div>
        ) : (
          <div className="video-section">
            <div className="video-wrapper">
              <YouTube
                videoId={extractedId}
                opts={opts}
                onReady={handleReady}
                className="youtube-player"
              />
            </div>

            <VideoCockpit
              playerRef={playerRef}
              startTime={startTime}
              endTime={endTime}
              currentTime={currentTime}
              isPlaying={isPlaying}
              videoDuration={videoDuration}
              markers={markers}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
              onSeek={handleSeek}
              onPlayPause={handlePlayPause}
              onPlaySelection={handlePlaySelection}
              onCreateMarker={createMarker}
            />
          </div>
        )}

        {isRecording && (
          <div className="recording-indicator-global">
            <span className="pulse">●</span> Enregistrement actif - <kbd>ESPACE</kbd> Play/Pause | <kbd>ENTRÉE</kbd> Marquer
          </div>
        )}
        
        {flash && <div className="flash-effect">FLASH!</div>}

        {/* Timeline de résultat */}
        {markers.length > 0 && (
          <div className="timeline-section">
            <h3 className="timeline-title">Marqueurs d'accords ({markers.length})</h3>
            <div className="timeline">
              {markers.map((marker, index) => {
                const duration = getDuration(index)
                const isSelected = selectedMarkerId === index
                const chord = chordData[index]
                const chordLabel = chord?.displayLabel || ''
                const absoluteTime = marker
                
                return (
                  <div 
                    key={index} 
                    className={`timeline-block ${isSelected ? 'active' : ''}`}
                    onMouseEnter={() => {
                      if (playerRef.current) {
                        playerRef.current.seekTo(absoluteTime, true)
                      }
                    }}
                  >
                    <div className="block-header">
                      <div className="block-time-controls">
                        <input
                          type="number"
                          className="block-time-input"
                          value={absoluteTime.toFixed(2)}
                          step="0.1"
                          min="0"
                          onChange={(e) => {
                            const newAbsoluteTime = parseFloat(e.target.value)
                            if (!isNaN(newAbsoluteTime) && newAbsoluteTime >= 0) {
                              const newMarkers = [...markers]
                              newMarkers[index] = newAbsoluteTime
                              setMarkers(newMarkers.sort((a, b) => a - b))
                              if (playerRef.current) {
                                playerRef.current.seekTo(newAbsoluteTime, true)
                              }
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          title="Temps absolu (secondes depuis le début de la vidéo)"
                        />
                        <span className="block-time-unit">s</span>
                      </div>
                      {index > 0 && (
                        <span className="block-duration">Durée: {duration.toFixed(2)}s</span>
                      )}
                      {chord?.cadence && (
                        <span className="block-cadence" title={`Cadence: ${chord.cadence}`}>
                          Cad. {chord.cadence === 'perfect' ? 'Parfaite' : chord.cadence === 'imperfect' ? 'Imparfaite' : chord.cadence === 'plagal' ? 'Plagale' : chord.cadence === 'deceptive' ? 'Rompue' : chord.cadence === 'half' ? 'Demi' : chord.cadence}
                        </span>
                      )}
                      <button
                        className="block-delete-btn"
                        onClick={(e) => handleDeleteMarker(e, index)}
                        title="Supprimer ce marqueur"
                      >
                        ×
                      </button>
                    </div>
                    <div className="block-content" onClick={() => handleMarkerClick(index)}>
                      <div className="chord-display">
                        {chordLabel || <span className="chord-placeholder">Cliquez pour définir l'accord</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Modal de sélection d'accord */}
        <ChordSelectorModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onValidate={handleChordValidate}
          initialChord={selectedMarkerId !== null ? chordData[selectedMarkerId] : null}
        />
        
        {/* Modale de sauvegarde */}
        <SaveExerciseModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSaveExercise}
          isSaving={isSaving}
          videoId={extractedId}
          videoTitle={videoTitle}
          markers={markers}
          chordData={chordData}
          isEditMode={!!exerciseId}
        />
        
        {/* Message de notification */}
        {saveMessage && (
          <div className={`save-notification ${saveMessage.type}`}>
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default Editor

