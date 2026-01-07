import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import ExerciseSummary from '../components/ExerciseSummary'
import { getExerciseById } from '../services/exerciseService'
import { saveAttempt } from '../services/attemptService'
import { useAuth } from '../contexts/AuthContext'
import './Player.css'

function Player() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // États de l'exercice
  const [mode, setMode] = useState('exercise') // 'exercise' | 'summary' (suppression du mode preview)
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) // { markerIndex: chordData }
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentTimeRef = useRef(0)
  const timelineRef = useRef(null)

  // Charger l'exercice
  useEffect(() => {
    loadExercise()
  }, [exerciseId])

  const loadExercise = async () => {
    try {
      setLoading(true)
      const data = await getExerciseById(exerciseId)
      
      if (!data) {
        setError('Exercice introuvable')
        return
      }

      // Vérifier que l'exercice est publié ou accessible
      if (data.status !== 'published' && data.status !== 'draft') {
        setError('Cet exercice n\'est pas accessible')
        return
      }

      setExercise(data)
      
      // Initialiser les réponses vides
      const answers = {}
      if (data.markers) {
        data.markers.forEach((_, index) => {
          answers[index] = null
        })
      }
      setUserAnswers(answers)
    } catch (err) {
      console.error('Erreur lors du chargement de l\'exercice:', err)
      setError('Erreur lors du chargement de l\'exercice')
    } finally {
      setLoading(false)
    }
  }

  // Gestion du lecteur YouTube
  const handleReady = (event) => {
    playerRef.current = event.target
  }

  // Nettoyer les intervalles de fade si la lecture est arrêtée
  useEffect(() => {
    if (!isPlaying && window.playerFadeIntervals) {
      window.playerFadeIntervals.forEach(({ cleanup }) => {
        if (cleanup) cleanup()
      })
      window.playerFadeIntervals = []
    }
  }, [isPlaying])

  // Suivi du temps pendant la lecture
  useEffect(() => {
    // EN MODE ÉLÈVE : Ne pas faire de pause automatique aux marqueurs
    // L'élève écoute l'extrait en entier et clique manuellement sur les marqueurs
    if (isPlaying && playerRef.current && mode === 'exercise' && exercise) {
      intervalRef.current = setInterval(() => {
        try {
          const time = playerRef.current.getCurrentTime()
          currentTimeRef.current = time
          setCurrentTime(time)

          // Vérifier si on a atteint la fin (sans pause automatique aux marqueurs)
          if (time >= exercise.settings.endTime) {
            playerRef.current.pauseVideo()
            setIsPlaying(false)
            // Mettre à jour la référence du temps pour qu'elle reflète la position à la fin
            currentTimeRef.current = exercise.settings.endTime
            setCurrentTime(exercise.settings.endTime)
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
  }, [isPlaying, mode, exercise])

  // Gérer le scroll du body pour le mode plein écran (doit être avant tous les returns)
  useEffect(() => {
    // Ne gérer le scroll que si on n'est pas en mode summary et que l'exercice est chargé
    if (mode !== 'summary' && !loading && exercise) {
      document.body.classList.add('player-active')
      return () => {
        document.body.classList.remove('player-active')
      }
    }
  }, [mode, loading, exercise])

  // Masquer l'onboarding après 5 secondes ou au premier clic (doit être avant tous les returns)
  useEffect(() => {
    if (showOnboarding) {
      const timer = setTimeout(() => {
        setShowOnboarding(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [showOnboarding])
  
  // Masquer l'onboarding au premier clic sur un marqueur (doit être avant tous les returns)
  useEffect(() => {
    if (showOnboarding && exercise && Object.values(userAnswers).some(answer => answer !== null)) {
      setShowOnboarding(false)
    }
  }, [userAnswers, showOnboarding, exercise])

  // Fonction pour jouer l'extrait complet avec fondus
  const handlePlayFullExtract = () => {
    if (!playerRef.current || !exercise) return
    
    const startTime = exercise.settings.startTime
    const endTime = exercise.settings.endTime
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
    if (!window.playerFadeIntervals) {
      window.playerFadeIntervals = []
    }
    window.playerFadeIntervals.push({ fadeInIntervalId, checkEndInterval, cleanup })
  }

  const handlePlayPause = () => {
    if (!playerRef.current || !exercise) return
    
    if (isPlaying) {
      // Nettoyer les fondus si on pause
      if (window.playerFadeIntervals) {
        window.playerFadeIntervals.forEach(({ cleanup }) => {
          if (cleanup) cleanup()
        })
        window.playerFadeIntervals = []
      }
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    } else {
      // Mode exercise : reprendre depuis currentTime ou startTime si on est avant/après
      const current = currentTimeRef.current || currentTime
      const startTime = exercise.settings.startTime
      const endTime = exercise.settings.endTime
      const fadeDuration = 0.5 // 0.5 secondes
      
      // Si on est avant le début ou après la fin de l'extrait, aller au début
      if (current < startTime || current >= endTime) {
        playerRef.current.seekTo(startTime, true)
        setCurrentTime(startTime)
        currentTimeRef.current = startTime
      }
      
      // Toujours appliquer les fondus au début et à la fin
      // Fade-in progressif sur 0.5s
      playerRef.current.setVolume(0) // Commencer à volume 0 pour le fade-in
      playerRef.current.playVideo()
      setIsPlaying(true)
      
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
            // Mettre à jour la référence du temps pour qu'elle reflète la position à la fin
            currentTimeRef.current = endTime
            setCurrentTime(endTime)
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
      if (!window.playerFadeIntervals) {
        window.playerFadeIntervals = []
      }
      window.playerFadeIntervals.push({ fadeInIntervalId, checkEndInterval, cleanup })
    }
  }

  const handleStartExercise = () => {
    if (!playerRef.current || !exercise) return
    
    const startTime = exercise.settings.startTime
    const endTime = exercise.settings.endTime
    const fadeDuration = 0.5 // 0.5 secondes
    
    setMode('exercise')
    setCurrentMarkerIndex(0)
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
    if (!window.playerFadeIntervals) {
      window.playerFadeIntervals = []
    }
    window.playerFadeIntervals.push({ fadeInIntervalId, checkEndInterval, cleanup })
  }

  // Fonction pour ouvrir la modale pour un marqueur spécifique (permet de modifier une réponse)
  const handleMarkerClick = (markerIndex) => {
    if (!playerRef.current || !exercise) return
    
    const markers = exercise.markers.map(m => typeof m === 'number' ? m : m.time || m.absoluteTime)
    const markerTime = markers[markerIndex]
    
    if (markerTime !== undefined) {
      // Aller au timestamp du marqueur (sans lancer la lecture)
      playerRef.current.seekTo(markerTime, true)
      setCurrentTime(markerTime)
      currentTimeRef.current = markerTime
      
      // S'assurer que la vidéo est en pause
      if (isPlaying) {
        playerRef.current.pauseVideo()
        setIsPlaying(false)
      }
      
      // Ouvrir la modale pour ce marqueur
      setCurrentMarkerIndex(markerIndex)
      setIsModalOpen(true)
    }
  }

  const handleChordValidate = (chordData) => {
    // Enregistrer la réponse de l'élève
    setUserAnswers(prev => ({
      ...prev,
      [currentMarkerIndex]: chordData
    }))
    
    setIsModalOpen(false)
    
    // Ne pas reprendre la lecture automatiquement - l'élève contrôle la lecture manuellement
  }

  const handleModalClose = () => {
    // Permettre de fermer la modale sans enregistrer (en cliquant dehors)
    setIsModalOpen(false)
  }

  const handleFinishExercise = async () => {
    // Arrêter la lecture si elle est en cours
    if (playerRef.current && isPlaying) {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    }
    
    // Sauvegarder la tentative si l'utilisateur est connecté et n'est pas en mode invité
    if (user && exercise && !isGuest) {
      try {
        
        // Préparer les réponses et les solutions
        const answersArray = exercise.markers.map((_, index) => userAnswers[index] || null)
        const correctAnswersArray = exercise.markers.map(marker => 
          typeof marker === 'object' && marker.chord ? marker.chord : null
        )
        
        // Calculer le score
        const correctCount = correctAnswersArray.filter((correct, index) => {
          const userAnswer = answersArray[index]
          return userAnswer && correct && 
                 userAnswer.displayLabel === correct.displayLabel
        }).length
        
        const totalQuestions = correctAnswersArray.length
        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
        
        // Sauvegarder la tentative
        await saveAttempt(
          user.uid, 
          exercise.id, 
          answersArray, 
          correctAnswersArray, 
          score,
          exercise.metadata?.exerciseTitle || exercise.metadata?.workTitle || 'Exercice'
        )
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la tentative:', error)
        // Continuer quand même pour afficher les résultats
      }
    }
    
    setMode('summary')
  }

  const handleReplay = () => {
    // Réinitialiser l'exercice
    setMode('exercise')
    setCurrentMarkerIndex(0)
    const answers = {}
    if (exercise && exercise.markers) {
      exercise.markers.forEach((_, index) => {
        answers[index] = null
      })
    }
    setUserAnswers(answers)
    setIsPlaying(false)
    if (playerRef.current) {
      playerRef.current.seekTo(exercise.settings.startTime, true)
    }
  }

  const handleQuitExercise = () => {
    // Demander confirmation avant de quitter
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir quitter l\'exercice ? Votre progression ne sera pas sauvegardée.'
    )
    
    if (confirmed) {
      // Arrêter la lecture si elle est en cours
      if (playerRef.current && isPlaying) {
        playerRef.current.pauseVideo()
        setIsPlaying(false)
      }
      
      // Rediriger vers le dashboard élève
      navigate('/student-dashboard')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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

  if (error || !exercise) {
    return (
      <div className="app">
        <div className="container">
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">⚠️</div>
            <h2>{error || 'Exercice introuvable'}</h2>
            <p>L'exercice demandé n'existe pas ou n'est pas accessible.</p>
          </div>
        </div>
      </div>
    )
  }

  const videoId = exercise.video.id
  const startTime = exercise.settings.startTime
  const endTime = exercise.settings.endTime
  const videoDuration = exercise.video.duration || 0
  // Les marqueurs peuvent être un tableau de timestamps ou d'objets avec {time, chord}
  const markers = exercise.markers 
    ? exercise.markers.map(m => typeof m === 'number' ? m : m.time || m.absoluteTime)
    : []
  const totalMarkers = markers.length
  const answeredCount = Object.values(userAnswers).filter(a => a !== null).length

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

  // Mode Summary : Afficher les résultats
  if (mode === 'summary') {
    return (
      <ExerciseSummary
        exercise={exercise}
        userAnswers={userAnswers}
        onReplay={handleReplay}
        isGuest={isGuest}
      />
    )
  }

  const formatTimeDisplay = (seconds) => {
    if (!seconds || seconds < 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculer le temps relatif pour l'affichage
  const relativeCurrentTime = currentTime - startTime
  const relativeEndTime = endTime - startTime
  
  // Liste des marqueurs déjà répondues
  const answeredMarkers = Object.keys(userAnswers).filter(i => userAnswers[i] !== null).map(Number)
  
  // Trouver le prochain marqueur à répondre (pour l'effet visuel)
  const getNextMarkerIndex = () => {
    for (let i = 0; i < markers.length; i++) {
      if (!answeredMarkers.includes(i)) {
        return i
      }
    }
    return null
  }
  const nextMarkerIndex = getNextMarkerIndex()
  
  const handleOnboardingClick = () => {
    setShowOnboarding(false)
  }

  return (
    <div className="player-immersive">
      {/* Zone Vidéo (Haut - 80-85%) */}
      <div className="player-video-zone">
        <div className="player-video-wrapper">
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={handleReady}
            className="player-youtube"
          />
        </div>

        {/* Bouton Quitter (Haut à droite) */}
        <button
          className="player-quit-btn"
          onClick={handleQuitExercise}
          aria-label="Quitter l'exercice"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Quitter</span>
        </button>

        {/* Overlay d'onboarding temporaire */}
        {showOnboarding && (
          <div className="player-onboarding-overlay" onClick={handleOnboardingClick}>
            <div className="player-onboarding-content">
              <p>Cliquez sur les marqueurs 🟡 au moment du changement d'accord</p>
            </div>
          </div>
        )}
      </div>

      {/* Zone de Contrôle (Bas - 15-20%) */}
      <div className="player-control-zone">
        {/* Timeline gamifiée */}
        <div className="player-timeline-container">
          <div 
            ref={timelineRef}
            className="player-timeline-rail"
            onClick={(e) => {
              if (!playerRef.current || !exercise) return
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
              const time = startTime + (percentage / 100) * (endTime - startTime)
              playerRef.current.seekTo(time, true)
              setCurrentTime(time)
              currentTimeRef.current = time
            }}
          >
            {/* Barre de progression */}
            <div 
              className="player-timeline-progress"
              style={{ width: `${relativeEndTime > 0 ? (relativeCurrentTime / relativeEndTime) * 100 : 0}%` }}
            ></div>
            
            {/* Marqueurs comme cibles cliquables */}
            {markers.map((marker, index) => {
              const markerAbsoluteTime = marker
              if (markerAbsoluteTime < startTime || markerAbsoluteTime > endTime) return null
              
              const relativeTime = markerAbsoluteTime - startTime
              const markerPos = relativeEndTime > 0 
                ? (relativeTime / relativeEndTime) * 100 
                : 0
              
              const isAnswered = answeredMarkers.includes(index)
              const isNext = nextMarkerIndex === index
              
              return (
                <button
                  key={index}
                  className={`player-timeline-target ${isAnswered ? 'player-timeline-target-answered' : ''} ${isNext ? 'player-timeline-target-next' : ''}`}
                  style={{ left: `${markerPos}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMarkerClick(index)
                  }}
                  aria-label={isAnswered ? `Question ${index + 1} (répondu)` : `Question ${index + 1}`}
                >
                  <span className="player-timeline-target-inner"></span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Contrôles de lecture regroupés */}
        <div className="player-controls-group">
          <div className="player-time-display">
            {formatTimeDisplay(relativeCurrentTime)} / {formatTimeDisplay(relativeEndTime)}
          </div>
          
          <button
            className="player-play-btn"
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>

          {answeredCount === totalMarkers && totalMarkers > 0 && (
            <button
              className="player-finish-btn"
              onClick={handleFinishExercise}
              aria-label="Terminer l'exercice"
            >
              Terminer
            </button>
          )}
        </div>
      </div>

      {/* Modale de saisie d'accord (mode élève) */}
      <ChordSelectorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onValidate={handleChordValidate}
        initialChord={userAnswers[currentMarkerIndex] || null}
        studentMode={true}
        currentQuestion={currentMarkerIndex + 1}
        totalQuestions={totalMarkers}
      />
    </div>
  )
}

export default Player

