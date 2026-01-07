import { useState, useRef, useEffect, useCallback } from 'react'
import YouTube from 'react-youtube'
import ChordSelectorModal from './ChordSelectorModal'
import VideoCockpit from './VideoCockpit'
import SaveExerciseModal from './components/SaveExerciseModal'
import { useAuth } from './contexts/AuthContext'
import { db, serverTimestamp } from './firebase'
import { collection, addDoc } from 'firebase/firestore'
import './App.css'

function App() {
  const { user, signInWithGoogle } = useAuth()
  const [videoId, setVideoId] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(60)
  const [isPlaying, setIsPlaying] = useState(false)
  // STOCKAGE : Les marqueurs sont stockés en TEMPS ABSOLU (secondes depuis le début de la vidéo 0:00)
  // Règle d'or : Ne jamais modifier le timestamp d'un marqueur quand on change startTime/endTime
  // Le marqueur est ancré dans la vidéo, pas dans la sélection
  // NOTE POUR MODE "EXERCICE" (Élève) : Lors de la lecture en mode exercice, appliquer un offset pour l'affichage :
  // displayTime = currentTime - startTime (pour afficher le temps relatif à la sélection)
  const [markers, setMarkers] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [flash, setFlash] = useState(false)
  const [chordData, setChordData] = useState({}) // Stocke les données d'accords complètes par index
  const [selectedMarkerId, setSelectedMarkerId] = useState(null) // Index du marqueur sélectionné
  const [isModalOpen, setIsModalOpen] = useState(false) // État du modal de sélection
  const [videoDuration, setVideoDuration] = useState(0) // Durée totale de la vidéo
  const [videoTitle, setVideoTitle] = useState('') // Titre de la vidéo
  const [isEditingUrl, setIsEditingUrl] = useState(true) // État d'édition de l'URL
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false) // État du modal de sauvegarde
  const [isSaving, setIsSaving] = useState(false) // État de sauvegarde en cours
  const [saveMessage, setSaveMessage] = useState(null) // Message de succès/erreur
  
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentTimeRef = useRef(0) // Ref pour éviter les stale closures

  // Extraire l'ID de la vidéo YouTube depuis l'URL
  const extractVideoId = (url) => {
    if (!url) return ''
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    return match ? match[1] : url
  }

  // Gestion du lecteur YouTube
  const handleReady = (event) => {
    playerRef.current = event.target
    
    // Initialiser la sélection sur toute la vidéo
    const initializeSelection = () => {
      try {
        const duration = event.target.getDuration()
        if (duration && duration > 0 && !isNaN(duration)) {
          setVideoDuration(duration)
          setStartTime(0)
          setEndTime(duration)
        }
      } catch (error) {
        // La vidéo n'est peut-être pas encore chargée
      }
    }
    
    // Tentatives d'initialisation
    setTimeout(initializeSelection, 500)
    setTimeout(initializeSelection, 1500)
    setTimeout(initializeSelection, 3000)
  }

  // Récupérer la durée de la vidéo et initialiser la sélection
  useEffect(() => {
    if (!playerRef?.current) return

    const updateDuration = () => {
      try {
        const duration = playerRef.current.getDuration()
        if (duration && duration > 0 && !isNaN(duration)) {
          setVideoDuration(duration)
          // Initialiser la sélection sur toute la vidéo si c'est la première fois
          if (endTime === 60 && startTime === 0) {
            setEndTime(duration)
          }
        }
      } catch (error) {
        // La vidéo n'est peut-être pas encore chargée
      }
    }

    // Tentatives de récupération de la durée
    const timeout1 = setTimeout(updateDuration, 500)
    const timeout2 = setTimeout(updateDuration, 1500)
    const timeout3 = setTimeout(updateDuration, 3000)

    // Mise à jour périodique
    const interval = setInterval(updateDuration, 2000)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearInterval(interval)
    }
  }, [playerRef?.current, endTime, startTime])

  const handleStateChange = (event) => {
    const state = event.data
    if (state === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true)
    } else if (state === YouTube.PlayerState.PAUSED || state === YouTube.PlayerState.ENDED) {
      setIsPlaying(false)
      if (state === YouTube.PlayerState.ENDED) {
        handleVideoEnd()
      }
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    setIsRecording(false)
  }

  // Gérer le changement de startTime depuis la timeline
  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime)
  }

  // Gérer le changement de endTime depuis la timeline
  const handleEndTimeChange = (newEndTime) => {
    setEndTime(newEndTime)
  }

  // Navigation (seek) depuis la timeline
  const handleSeek = (time) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true)
      setCurrentTime(time)
      currentTimeRef.current = time
    }
  }

  // Lire la sélection (de startTime à endTime) avec fade in/out
  const handlePlaySelection = useCallback(() => {
    if (!playerRef.current) return
    
    // Aller au début de la sélection
    playerRef.current.seekTo(startTime, true)
    setCurrentTime(startTime)
    currentTimeRef.current = startTime
    
    // Fade in : démarrer à volume 0
    playerRef.current.setVolume(0)
    
    // Lancer la lecture
    playerRef.current.playVideo()
    setIsPlaying(true)
    setIsRecording(true)
    
    // Fade in sur 0.5s
    const fadeInDuration = 0.5 // secondes
    const fadeInSteps = 20
    const fadeInInterval = (fadeInDuration * 1000) / fadeInSteps
    let fadeInStep = 0
    
    const fadeInIntervalId = setInterval(() => {
      fadeInStep++
      const volume = Math.min(100, (fadeInStep / fadeInSteps) * 100)
      if (playerRef.current) {
        playerRef.current.setVolume(volume)
      }
      if (fadeInStep >= fadeInSteps) {
        clearInterval(fadeInIntervalId)
        if (playerRef.current) {
          playerRef.current.setVolume(100)
        }
      }
    }, fadeInInterval)
  }, [startTime])

  // Contrôle de la lecture
  const handlePlayPause = () => {
    if (!playerRef.current || !videoId) return
    
    if (isPlaying) {
      playerRef.current.pauseVideo()
      setIsRecording(false)
    } else {
      // Partir de la position actuelle du curseur (currentTime est en temps absolu)
      // Si on est en dehors de la sélection, aller au début
      const playFromTime = (currentTime >= startTime && currentTime < endTime) 
        ? currentTime 
        : startTime
      
      playerRef.current.seekTo(playFromTime, true)
      setCurrentTime(playFromTime)
      currentTimeRef.current = playFromTime
      playerRef.current.playVideo()
      setIsRecording(true)
      
      // NOTE POUR MODE "EXERCICE" (Élève) :
      // Lors de la lecture en mode exercice, appliquer un offset pour l'affichage :
      // displayTime = currentTime - startTime
      // Cela permet d'afficher le temps relatif à la sélection pour l'élève
    }
  }

  // Formater le temps en MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Créer un marqueur à la position actuelle (avec debounce)
  // STOCKAGE : Les marqueurs sont stockés en TEMPS ABSOLU (secondes depuis le début de la vidéo 0:00)
  // Règle d'or : Ne jamais modifier le timestamp d'un marqueur quand on change startTime/endTime
  // Le marqueur est ancré dans la vidéo, pas dans la sélection
  const lastMarkerTimeRef = useRef(0)
  const createMarker = useCallback(() => {
    if (!playerRef.current) return
    
    const now = Date.now()
    // Debounce : bloquer les appuis multiples en moins de 100ms
    if (now - lastMarkerTimeRef.current < 100) return
    lastMarkerTimeRef.current = now
    
    try {
      const absoluteTime = playerRef.current.getCurrentTime() // Temps absolu depuis le début de la vidéo
      
      // Vérifier qu'on est dans la sélection
      if (absoluteTime >= startTime && absoluteTime <= endTime) {
        // Vérifier qu'on ne crée pas un doublon (trop proche d'un marqueur existant)
        // Les marqueurs sont stockés en temps absolu, donc on compare directement
        const isDuplicate = markers.some(m => Math.abs(m - absoluteTime) < 0.1)
        if (!isDuplicate) {
          // Stocker en temps absolu
          setMarkers(prev => [...prev, absoluteTime].sort((a, b) => a - b))
          // Flash visuel
          setFlash(true)
          setTimeout(() => setFlash(false), 200)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la capture du timestamp:', error)
    }
  }, [startTime, endTime, markers])

  // Enregistrer un marqueur avec la touche ENTRÉE
  const handleEnterKey = useCallback((e) => {
    if (e.code === 'Enter' && playerRef.current) {
      // Ne pas déclencher si l'utilisateur tape dans un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }
      e.preventDefault()
      createMarker()
    }
  }, [createMarker])

  // Boucle de temps avec polling (s'active quand isPlaying est true)
  useEffect(() => {
    if (!isPlaying) {
      // Nettoyer l'intervalle si on n'est pas en train de jouer
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Démarrer le polling du temps toutes les 500ms
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        // Utiliser getCurrentTime() qui retourne directement le temps (synchrone)
        try {
          const time = playerRef.current.getCurrentTime();
          // Mettre à jour la ref (pour éviter les stale closures)
          currentTimeRef.current = time
          
          // Mettre à jour le state (pour l'affichage)
          setCurrentTime(time)
          
          // Fade out avant la fin (0.5s avant endTime)
          const fadeOutDuration = 0.5
          const fadeOutStart = endTime - fadeOutDuration
          
          if (time >= fadeOutStart && time < endTime) {
            // Calculer le volume pour le fade out
            const fadeOutProgress = (time - fadeOutStart) / fadeOutDuration
            const volume = Math.max(0, 100 * (1 - fadeOutProgress))
            playerRef.current.setVolume(volume)
          } else if (time >= endTime) {
            // Arrêter la vidéo et remettre le volume à 100
            playerRef.current.pauseVideo()
            playerRef.current.setVolume(100)
            setIsPlaying(false)
            setIsRecording(false)
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du temps:', error)
        }
      }
    }, 100) // Polling toutes les 100ms pour un fade plus fluide

    // Nettoyage à la destruction ou quand isPlaying change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, endTime])

  // Action IN : Fixer le début à la position actuelle
  const handleSetIn = useCallback(() => {
    if (!playerRef.current) return
    try {
      const time = playerRef.current.getCurrentTime()
      const newStartTime = Math.max(0, Math.min(time, endTime - 0.1))
      setStartTime(newStartTime)
      handleSeek(newStartTime)
    } catch (error) {
      console.error('Erreur lors de la définition du point IN:', error)
    }
  }, [endTime, handleSeek])

  // Action OUT : Fixer la fin à la position actuelle
  const handleSetOut = useCallback(() => {
    if (!playerRef.current) return
    try {
      const time = playerRef.current.getCurrentTime()
      const maxTime = videoDuration > 0 ? videoDuration : Math.max(endTime, 60)
      const newEndTime = Math.max(startTime + 0.1, Math.min(time, maxTime))
      setEndTime(newEndTime)
      handleSeek(newEndTime)
    } catch (error) {
      console.error('Erreur lors de la définition du point OUT:', error)
    }
  }, [startTime, endTime, videoDuration, handleSeek])

  // Écoute des événements clavier (ESPACE pour play/pause, ENTRÉE pour marquer, I pour IN, O pour OUT)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ne pas déclencher si l'utilisateur tape dans un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayPause()
      } else if (e.code === 'KeyI') {
        e.preventDefault()
        handleSetIn()
      } else if (e.code === 'KeyO') {
        e.preventDefault()
        handleSetOut()
      }
    }

    window.addEventListener('keydown', handleEnterKey)
    window.addEventListener('keydown', handleGlobalKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleEnterKey)
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [handleEnterKey, handleSetIn, handleSetOut, handlePlayPause])

  // Sélectionner un marqueur et ouvrir le modal
  // Les marqueurs sont stockés en temps absolu, donc on peut les utiliser directement
  const handleMarkerClick = (index) => {
    setSelectedMarkerId(index)
    setIsModalOpen(true)
    if (playerRef.current && markers[index] !== undefined) {
      const absoluteTime = markers[index] // Déjà en temps absolu
      playerRef.current.seekTo(absoluteTime, true)
      setCurrentTime(absoluteTime)
      currentTimeRef.current = absoluteTime
    }
  }

  // Valider la sélection d'accord depuis le modal
  const handleChordValidate = (chordDataFromModal) => {
    if (selectedMarkerId !== null) {
      setChordData(prev => ({
        ...prev,
        [selectedMarkerId]: chordDataFromModal
      }))
    }
    setIsModalOpen(false)
  }

  // Fermer le modal
  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  // Gérer la sauvegarde de l'exercice
  const handleSaveExercise = async (metadata) => {
    if (!user) {
      // Si pas connecté, déclencher la connexion
      try {
        await signInWithGoogle()
        // Après connexion, rouvrir la modale
        setIsSaveModalOpen(true)
      } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        // Ne pas afficher de message si l'utilisateur a fermé la popup
        if (error.code !== 'auth/popup-closed-by-user') {
          const { getAuthErrorMessage } = await import('../utils/errorHandler')
          setSaveMessage({ type: 'error', text: getAuthErrorMessage(error) })
          setTimeout(() => setSaveMessage(null), 5000)
        }
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
      // Préparer les données des marqueurs avec leurs accords
      const markersData = markers.map((markerTime, index) => ({
        time: markerTime, // Temps absolu
        chord: chordData[index] || null
      }))

      // Créer le document Firestore
      const exerciseData = {
        authorId: user.uid,
        authorName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        status: 'draft',
        video: {
          id: extractedId,
          title: videoTitle || 'Vidéo YouTube',
          duration: videoDuration
        },
        settings: {
          startTime: startTime,
          endTime: endTime,
          fadeIn: false, // Futur
          fadeOut: false // Futur
        },
        markers: markersData,
        metadata: {
          title: metadata.title,
          composer: metadata.composer || null,
          difficulty: metadata.difficulty || null
        }
      }

      // Sauvegarder dans Firestore
      const docRef = await addDoc(collection(db, 'exercises'), exerciseData)
      
      setSaveMessage({ 
        type: 'success', 
        text: `Exercice sauvegardé ! ID: ${docRef.id}` 
      })
      setIsSaveModalOpen(false)
      
      // Effacer le message après 5 secondes
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

  // Gérer le clic sur le bouton de sauvegarde
  const handleSaveClick = () => {
    const extractedId = extractVideoId(videoId)
    
    if (!user) {
      // Si pas connecté, déclencher la connexion
      signInWithGoogle()
        .then(() => {
          // Après connexion, ouvrir la modale
          setIsSaveModalOpen(true)
        })
        .catch((error) => {
          console.error('Erreur lors de la connexion:', error)
          // Ne pas afficher de message si l'utilisateur a fermé la popup
          if (error.code !== 'auth/popup-closed-by-user') {
            import('../utils/errorHandler').then(({ getAuthErrorMessage }) => {
              alert(getAuthErrorMessage(error))
            })
          }
        })
    } else {
      // Si connecté, ouvrir la modale
      setIsSaveModalOpen(true)
    }
  }

  // Calculer la durée entre deux marqueurs
  // Les marqueurs sont en temps absolu, donc la durée est la différence entre deux temps absolus
  const getDuration = (index) => {
    if (index === 0) {
      // Pour le premier marqueur, la durée est relative au début de la sélection
      // Note : En mode "Exercice" (élève), on utilisera : displayTime = currentTime - startTime
      return markers[index] - startTime
    }
    return markers[index] - markers[index - 1]
  }

  const extractedId = extractVideoId(videoId)
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0,
    },
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
            
            {/* Bouton de connexion/sauvegarde */}
            <div className="header-actions">
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

        {/* Écran d'accueil professionnel */}
        {!extractedId && (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.75 4.66L13.5 5.66L11.5 4.16L10.25 5.16L8.25 3.66L7 4.66V19.34L8.25 20.34L10.25 18.84L11.5 19.84L13.5 18.34L14.75 19.34L16.75 17.84L18 18.84V4.66L16.75 3.66L14.75 5.16V4.66Z" fill="url(#gradient)" stroke="url(#gradient)" strokeWidth="1.5"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="welcome-title">Bienvenue sur Opus Lab</h2>
              <p className="welcome-subtitle">Votre outil d'entraînement harmonique professionnel</p>
              
              <div className="welcome-features">
                <div className="feature-item">
                  <div className="feature-icon">🎵</div>
                  <div className="feature-text">
                    <h3>Analyse harmonique</h3>
                    <p>Identifiez et analysez les accords avec précision</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">⏱️</div>
                  <div className="feature-text">
                    <h3>Marquage temporel</h3>
                    <p>Marquez les changements d'accords en temps réel</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🎹</div>
                  <div className="feature-text">
                    <h3>Notation académique</h3>
                    <p>Utilisez la notation professionnelle des conservatoires</p>
                  </div>
                </div>
              </div>

              <div className="welcome-instructions">
                <h3 className="instructions-title">Pour commencer :</h3>
                <ol className="instructions-list">
                  <li>Collez l'URL d'une vidéo YouTube dans le champ ci-dessus</li>
                  <li>Définissez votre zone de travail avec les boutons IN/OUT</li>
                  <li>Lancez la lecture et appuyez sur ENTRÉE ou cliquez sur TAP pour marquer les accords</li>
                  <li>Cliquez sur un marqueur pour définir l'accord correspondant</li>
                </ol>
              </div>

              <div className="welcome-shortcuts">
                <h3 className="shortcuts-title">Raccourcis clavier :</h3>
                <div className="shortcuts-grid">
                  <div className="shortcut-item">
                    <kbd>ESPACE</kbd>
                    <span>Play/Pause</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>I</kbd>
                    <span>Point IN</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>O</kbd>
                    <span>Point OUT</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>ENTRÉE</kbd>
                    <span>Marquer un accord</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lecteur YouTube */}
        {extractedId && (
          <div className="player-section">
            <div className="player-wrapper">
              <YouTube
                videoId={extractedId}
                opts={opts}
                onReady={handleReady}
                onStateChange={handleStateChange}
                className="youtube-player"
              />
            </div>
            
            {/* Cockpit de contrôle */}
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

        {/* Indicateur d'enregistrement */}
        {isRecording && (
          <div className="recording-indicator-global">
            <span className="pulse">●</span> Enregistrement actif - <kbd>ESPACE</kbd> Play/Pause | <kbd>ENTRÉE</kbd> Marquer
          </div>
        )}
        
        {flash && <div className="flash-effect">FLASH!</div>}

        {/* Timeline de résultat */}
        {markers.length > 0 && (
          <div className="timeline-section">
            <h2 className="timeline-title">Timeline des marqueurs</h2>
            <div className="timeline">
              {markers.map((marker, index) => {
                const duration = getDuration(index)
                const isSelected = selectedMarkerId === index
                const chord = chordData[index]
                const chordLabel = chord?.displayLabel || ''
                // marker est déjà en temps absolu
                const absoluteTime = marker
                
                return (
                  <div 
                    key={index} 
                    className={`timeline-block ${isSelected ? 'active' : ''}`}
                    onMouseEnter={() => {
                      // Surbrillance du marqueur sur la timeline au survol
                      if (playerRef.current) {
                        // marker est déjà en temps absolu
                        playerRef.current.seekTo(absoluteTime, true)
                      }
                    }}
                  >
                    <div className="block-header">
                      <div className="block-time-controls">
                        {/* ÉDITION : Les inputs affichent le TEMPS ABSOLU pour correspondre au lecteur YouTube */}
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
                              // Mettre à jour la position si nécessaire
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
                          {chord.cadence === 'perfect' && 'Cad. Parfaite'}
                          {chord.cadence === 'imperfect' && 'Cad. Imparfaite'}
                          {chord.cadence === 'plagal' && 'Cad. Plagale'}
                          {chord.cadence === 'deceptive' && 'Cad. Rompue'}
                          {chord.cadence === 'half' && 'Cad. Demi'}
                        </span>
                      )}
                      <button
                        className="block-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          const newMarkers = markers.filter((_, i) => i !== index)
                          setMarkers(newMarkers)
                          // Supprimer aussi les données d'accord associées
                          const newChordData = { ...chordData }
                          delete newChordData[index]
                          // Réindexer les accords en fonction des nouveaux indices
                          // Les marqueurs sont en temps absolu, donc on compare les valeurs directement
                          const reindexedChordData = {}
                          newMarkers.forEach((marker, newIndex) => {
                            // Trouver l'ancien index en comparant les temps absolus
                            const oldIndex = markers.findIndex(m => m === marker)
                            if (oldIndex >= 0 && chordData[oldIndex]) {
                              reindexedChordData[newIndex] = chordData[oldIndex]
                            }
                          })
                          setChordData(reindexedChordData)
                          if (selectedMarkerId === index) {
                            setSelectedMarkerId(null)
                            setIsModalOpen(false)
                          }
                        }}
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
            
            <button
              className="clear-btn"
              onClick={() => {
                setMarkers([])
                setChordData({})
                setSelectedMarkerId(null)
              }}
            >
              Effacer tous les marqueurs
        </button>
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

export default App
