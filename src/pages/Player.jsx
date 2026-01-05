import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import ExerciseSummary from '../components/ExerciseSummary'
import { getExerciseById } from '../services/exerciseService'
import { saveAttempt } from '../services/attemptService'
import { useAuth } from '../contexts/AuthContext'
import '../App.css'
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
  
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentTimeRef = useRef(0)

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
      // Mode exercise : reprendre depuis currentTime ou startTime si on est avant
      const current = currentTimeRef.current || currentTime
      const startTime = exercise.settings.startTime
      const endTime = exercise.settings.endTime
      const fadeDuration = 0.5 // 0.5 secondes
      
      // Si on est avant le début de l'extrait, aller au début
      if (current < startTime) {
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

  return (
    <div className="app">
      <div className="container">
        {/* Header minimaliste pour l'élève */}
        <div className="app-header">
          <h1 className="app-title">Opus Lab</h1>
          <div className="header-content">
            <div className="header-video-info">
              <span className="video-title">
                {exercise.metadata?.exerciseTitle || exercise.metadata?.workTitle || 'Exercice'}
              </span>
              {exercise.metadata?.composer && (
                <span className="video-composer">{exercise.metadata.composer}</span>
              )}
            </div>
          </div>
        </div>

        {/* Lecteur vidéo */}
        <div className="video-section">
          <div className="video-wrapper">
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={handleReady}
              className="youtube-player"
            />
          </div>

          {/* Cockpit adapté pour l'élève */}
          <VideoCockpit
            playerRef={playerRef}
            startTime={startTime}
            endTime={endTime}
            currentTime={currentTime}
            isPlaying={isPlaying}
            videoDuration={videoDuration}
            markers={markers}
            onStartTimeChange={() => {}} // Désactivé en mode élève
            onEndTimeChange={() => {}} // Désactivé en mode élève
            onSeek={(time) => {
              if (playerRef.current) {
                playerRef.current.seekTo(time, true)
                setCurrentTime(time)
                currentTimeRef.current = time
              }
            }}
            onPlayPause={handlePlayPause}
            onPlaySelection={handleStartExercise}
            onCreateMarker={() => {}} // Désactivé en mode élève
            studentMode={true} // Mode élève : masquer les marqueurs
            answeredMarkers={Object.keys(userAnswers).filter(i => userAnswers[i] !== null).map(Number)}
            onMarkerClick={handleMarkerClick} // Permettre de cliquer sur un marqueur pour modifier la réponse
            onQuit={handleQuitExercise} // Bouton quitter dans la toolbar
            answeredCount={answeredCount} // Nombre de questions répondues
            totalMarkers={totalMarkers} // Nombre total de questions
            onFinish={handleFinishExercise} // Bouton terminer dans la toolbar
          />
        </div>

        {/* Zone de contrôle pour l'exercice - Simplifiée, tout est dans le VideoCockpit */}

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
    </div>
  )
}

export default Player

