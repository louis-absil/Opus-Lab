import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import ExerciseSummary from '../components/ExerciseSummary'
import { getExerciseById } from '../services/exerciseService'
import { saveAttempt } from '../services/attemptService'
import { useAuth } from '../contexts/AuthContext'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
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
  const [selectedMarkerId, setSelectedMarkerId] = useState(null) // Marqueur actuellement sélectionné pour navigation
  const [userAnswers, setUserAnswers] = useState({}) // { markerIndex: chordData }
  const [answerValidations, setAnswerValidations] = useState({}) // { markerIndex: { level, score, feedback } }
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

  // Synchroniser l'état React avec l'état réel du lecteur YouTube
  const handleStateChange = (event) => {
    if (!playerRef.current || !exercise) return
    
    const state = event.data
    // YouTube.PlayerState.PLAYING = 1
    // YouTube.PlayerState.PAUSED = 2
    // YouTube.PlayerState.ENDED = 0
    
    if (state === 1) { // PLAYING
      // Si la lecture démarre, synchroniser l'état React et mettre à jour le temps
      if (!isPlaying) {
        setIsPlaying(true)
        // Mettre à jour le temps actuel immédiatement pour que le compteur soit correct
        try {
          const time = playerRef.current.getCurrentTime()
          setCurrentTime(time)
          currentTimeRef.current = time
        } catch (error) {
          console.error('Erreur lors de la mise à jour du temps:', error)
        }
      }
    } else if (state === 2 || state === 0) { // PAUSED ou ENDED
      // Si la lecture s'arrête, synchroniser l'état React
      if (isPlaying) {
        setIsPlaying(false)
      }
      
      // Si la vidéo est terminée, s'assurer qu'on est à la fin de l'extrait
      if (state === 0) {
        const endTime = exercise.settings.endTime
        if (playerRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime()
            // Si on est après la fin de l'extrait, revenir à la fin
            if (currentTime > endTime) {
              playerRef.current.seekTo(endTime, true)
              setCurrentTime(endTime)
              currentTimeRef.current = endTime
            }
          } catch (error) {
            console.error('Erreur lors de la vérification de fin:', error)
          }
        }
      }
    }
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
      
      // Toujours forcer la pause après seekTo pour éviter une reprise automatique
      // Utiliser setTimeout pour s'assurer que le seekTo est terminé
      setTimeout(() => {
        if (playerRef.current) {
          try {
            const playerState = playerRef.current.getPlayerState()
            // YouTube.PlayerState.PLAYING = 1
            if (playerState === 1) {
              playerRef.current.pauseVideo()
            }
          } catch (error) {
            // Si on ne peut pas vérifier l'état, forcer la pause quand même
        playerRef.current.pauseVideo()
          }
        }
      }, 100)
      
      // Mettre à jour l'état React immédiatement
        setIsPlaying(false)
      
      // Mettre à jour le marqueur sélectionné pour la navigation
      setSelectedMarkerId(markerIndex)
      
      // Ouvrir la modale pour ce marqueur
      setCurrentMarkerIndex(markerIndex)
      setIsModalOpen(true)
    }
  }

  // Fonction pour naviguer vers un marqueur (sans ouvrir la modale)
  const handleSeekToMarker = (markerIndex) => {
    if (!playerRef.current || !exercise) return
    
    const markers = exercise.markers.map(m => typeof m === 'number' ? m : m.time || m.absoluteTime)
    const markerTime = markers[markerIndex]
    
    if (markerTime !== undefined) {
      playerRef.current.seekTo(markerTime, true)
      setCurrentTime(markerTime)
      currentTimeRef.current = markerTime
      setSelectedMarkerId(markerIndex)
      
      // Forcer la pause
      setTimeout(() => {
        if (playerRef.current) {
          try {
            const playerState = playerRef.current.getPlayerState()
            if (playerState === 1) {
              playerRef.current.pauseVideo()
            }
          } catch (error) {
            playerRef.current.pauseVideo()
          }
        }
      }, 100)
      setIsPlaying(false)
    }
  }

  const handleChordValidate = (chordData) => {
    // Enregistrer la réponse de l'élève
    setUserAnswers(prev => ({
      ...prev,
      [currentMarkerIndex]: chordData
    }))
    
    // Valider avec le système de fonctions de Riemann
    if (exercise && exercise.markers && exercise.markers[currentMarkerIndex]) {
      const marker = exercise.markers[currentMarkerIndex]
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
      
      if (correctAnswer) {
        const validation = validateAnswerWithFunctions(
          chordData,
          correctAnswer,
          chordData.function || null
        )
        
        setAnswerValidations(prev => ({
          ...prev,
          [currentMarkerIndex]: validation
        }))
        
        // Afficher un feedback temporaire (optionnel)
        if (validation.feedback && validation.level > 0) {
          // Le feedback sera affiché dans l'interface si nécessaire
        }
      }
    }
    
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
        
        // Calculer le score avec le système pondéré de fonctions de Riemann
        let totalScore = 0
        let maxScore = 0
        
        correctAnswersArray.forEach((correct, index) => {
          const userAnswer = answersArray[index]
          if (userAnswer && correct) {
            const validation = answerValidations[index]
            if (validation) {
              totalScore += validation.score
            } else {
              // Fallback : validation binaire si pas de validation fonctionnelle
              const validation = validateAnswerWithFunctions(
                userAnswer,
                correct,
                userAnswer.function || null
              )
              totalScore += validation.score
            }
            maxScore += 100
          } else if (correct) {
            maxScore += 100
          }
        })
        
        const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
        
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

  // Format du temps relatif (pour le timer général)
  const formatRelativeTime = (seconds) => {
    if (!exercise) return '00:00.0'
    const relativeTime = Math.max(0, seconds - startTime)
    return formatTimeDetailed(relativeTime)
  }

  // Trouver le marqueur précédent par rapport à la position actuelle
  const findPreviousMarker = (currentTimePos) => {
    if (!markers || markers.length === 0) return null
    // Trouver le dernier marqueur qui est avant la position actuelle
    for (let i = markers.length - 1; i >= 0; i--) {
      if (markers[i] < currentTimePos) {
        return i
      }
    }
    return null // Aucun marqueur avant la position actuelle
  }

  // Trouver le marqueur suivant par rapport à la position actuelle
  const findNextMarker = (currentTimePos) => {
    if (!markers || markers.length === 0) return null
    // Trouver le premier marqueur qui est après la position actuelle
    for (let i = 0; i < markers.length; i++) {
      if (markers[i] > currentTimePos) {
        return i
      }
    }
    return null // Aucun marqueur après la position actuelle
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

  // Mode Summary : Afficher les résultats
  if (mode === 'summary') {
    return (
      <ExerciseSummary
        exercise={exercise}
        userAnswers={userAnswers}
          answerValidations={answerValidations}
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

  const formatTimeDetailed = (seconds) => {
    if (!seconds || seconds < 0) return '00:00.0'
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`
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
              onStateChange={handleStateChange}
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
      <div className="player-control-zone bg-zinc-900/80 backdrop-blur-xl border-t border-white/5">
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

        {/* Contrôles de lecture regroupés - Style unifié avec Editor */}
        <div className="flex items-center justify-center gap-4">
          {/* Bouton Prev */}
          <button
            onClick={() => {
              const currentPos = currentTimeRef.current || currentTime
              const prevIndex = findPreviousMarker(currentPos)
              
              if (prevIndex !== null) {
                // Aller au marqueur précédent
                handleSeekToMarker(prevIndex)
              } else {
                // Si pas de marqueur précédent, revenir au début de l'extrait
                if (playerRef.current && exercise) {
                  playerRef.current.seekTo(startTime, true)
                  setCurrentTime(startTime)
                  currentTimeRef.current = startTime
                  setSelectedMarkerId(null)
                }
              }
            }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
            title="Marqueur précédent"
          >
            <SkipBack className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
          </button>

          {/* Timer général + Bouton PLAY Héros */}
          <div className="flex flex-col items-center gap-2">
            {/* Timer général */}
            <div className="px-4 py-2 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10">
              <div className="text-lg md:text-xl font-mono text-white font-bold text-center">
                {formatRelativeTime(currentTime)}
              </div>
            </div>
            {/* Bouton PLAY Héros */}
            <button
              onClick={handlePlayPause}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-4 border-white/10 shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all duration-200 flex items-center justify-center active:scale-95"
              title="Play/Pause (Espace)"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 md:w-10 md:h-10 text-white" />
              ) : (
                <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Bouton Next */}
          <button
            onClick={() => {
              const currentPos = currentTimeRef.current || currentTime
              const nextIndex = findNextMarker(currentPos)
              
              if (nextIndex !== null) {
                // Aller au marqueur suivant
                handleSeekToMarker(nextIndex)
              } else if (markers.length > 0) {
                // Si pas de marqueur suivant mais qu'il y a des marqueurs, aller au premier
                handleSeekToMarker(0)
              } else {
                // Si pas de marqueurs, aller à la fin
                if (playerRef.current && exercise) {
                  playerRef.current.seekTo(endTime, true)
                  setCurrentTime(endTime)
                  currentTimeRef.current = endTime
                }
              }
            }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
            title="Marqueur suivant"
          >
            <SkipForward className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
          </button>

          {/* Bouton Terminer (si toutes les questions sont répondues) */}
          {answeredCount === totalMarkers && totalMarkers > 0 && (
            <button
              className="px-4 py-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all duration-200 active:scale-95"
              onClick={handleFinishExercise}
              aria-label="Terminer l'exercice"
            >
              Terminer
            </button>
          )}
        </div>
      </div>

      {/* Modale Flottante de Saisie d'Accord (HUD Glassmorphism) */}
        <ChordSelectorModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onValidate={handleChordValidate}
          initialChord={userAnswers[currentMarkerIndex] || null}
          studentMode={true}
          currentQuestion={currentMarkerIndex + 1}
          totalQuestions={totalMarkers}
        embedded={true}
        />
      
      {/* Affichage du feedback de validation (optionnel, peut être intégré dans l'UI) */}
      {answerValidations[currentMarkerIndex] && (
        <div className="player-validation-feedback" style={{ display: 'none' }}>
          {answerValidations[currentMarkerIndex].feedback}
      </div>
      )}
    </div>
  )
}

export default Player

