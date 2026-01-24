import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import ReviewDashboard from '../components/ReviewDashboard'
import ReviewDetailPanel from '../components/ReviewDetailPanel'
import { getExerciseById } from '../services/exerciseService'
import { saveAttempt } from '../services/attemptService'
import { useAuth } from '../contexts/AuthContext'
import { validateAnswerWithFunctions, DEGREE_TO_FUNCTIONS } from '../utils/riemannFunctions'
import { Play, Pause, SkipBack, SkipForward, Pencil, RotateCcw } from 'lucide-react'
import './Player.css'

// Constantes pour les chiffrages (identique à ChordSelectorModal et Editor)
const FIGURES = [
  { value: '5', label: 'Quinte', display: '5' },
  { value: '6', label: 'Sixte', display: '6' },
  { value: '64', label: 'Quarte-sixte', display: '6/4', isStacked: true, displayArray: ['6', '4'] },
  { value: '7', label: 'Septième', display: '7' },
  { value: '65', label: 'Sixte-quinte', display: '6/5', isStacked: true, displayArray: ['6', '5'] },
  { value: '43', label: 'Quarte-tierce', display: '4/3', isStacked: true, displayArray: ['4', '3'] },
  { value: '2', label: 'Seconde', display: '2' },
  { value: '9', label: 'Neuvième', display: '9' },
  { value: '11', label: 'Onzième', display: '11' },
  { value: '13', label: 'Treizième', display: '13' },
  { value: '54', label: 'Quinte-quarte', display: '5/4', isStacked: true, displayArray: ['5', '4'] }
]

function Player() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // États de l'exercice
  const [mode, setMode] = useState('exercise') // 'exercise' | 'review'
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState(0)
  const [selectedMarkerId, setSelectedMarkerId] = useState(null) // Marqueur actuellement sélectionné pour navigation
  const [userAnswers, setUserAnswers] = useState({}) // { markerIndex: chordData }
  const [answerValidations, setAnswerValidations] = useState({}) // { markerIndex: { level, score, feedback } }
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [isValidating, setIsValidating] = useState(false) // État pour l'animation de validation
  const [animatedChords, setAnimatedChords] = useState(new Set()) // Accords déjà animés
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(null) // Segment sélectionné en mode review
  
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
      // Si la lecture démarre depuis le bouton YouTube natif
      if (!isPlaying) {
        setIsPlaying(true)
        
        // Vérifier si on est avant le début de l'extrait ou après la fin
        const startTime = exercise.settings.startTime
        const endTime = exercise.settings.endTime
        
        try {
          const currentTime = playerRef.current.getCurrentTime()
          
          // Si on est avant le début ou après la fin, aller au début de l'extrait
          if (currentTime < startTime || currentTime >= endTime) {
            playerRef.current.seekTo(startTime, true)
            setCurrentTime(startTime)
            currentTimeRef.current = startTime
          } else {
            // Sinon, mettre à jour le temps actuel
            setCurrentTime(currentTime)
            currentTimeRef.current = currentTime
          }
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
    // EN MODE REVIEW : Mettre à jour le temps pour que le curseur avance
    if (isPlaying && playerRef.current && exercise) {
      intervalRef.current = setInterval(() => {
        try {
          const time = playerRef.current.getCurrentTime()
          currentTimeRef.current = time
          setCurrentTime(time)

          // Vérifier si on a atteint la fin (sans pause automatique aux marqueurs en mode exercise)
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
    // Ne gérer le scroll que si l'exercice est chargé
    if (!loading && exercise) {
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
          chordData.selectedFunction || chordData.function || null
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

  // Fonction pour valider toutes les réponses et préparer les validations
  const validateAllAnswers = useCallback(() => {
    if (!exercise || !exercise.markers) return {}
    
    const validations = {}
    exercise.markers.forEach((marker, index) => {
      const userAnswer = userAnswers[index]
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
      
      if (userAnswer && correctAnswer) {
        // Utiliser la validation existante ou en créer une nouvelle
        if (answerValidations[index]) {
          validations[index] = answerValidations[index]
        } else {
          validations[index] = validateAnswerWithFunctions(
            userAnswer,
            correctAnswer,
            userAnswer.selectedFunction || userAnswer.function || null
          )
        }
      } else if (correctAnswer) {
        // Réponse manquante
        validations[index] = {
          level: 0,
          score: 0,
          feedback: 'Réponse manquante'
        }
      }
    })
    
    return validations
  }, [exercise, userAnswers, answerValidations])

  // Fonction pour animer les accords séquentiellement
  const animateChordValidation = useCallback(async (validations) => {
    if (!exercise || !exercise.markers) return
    
    setIsValidating(true)
    setAnimatedChords(new Set())
    
    // Trier les marqueurs par ordre chronologique
    const sortedMarkers = exercise.markers
      .map((marker, index) => ({
        index,
        time: typeof marker === 'number' ? marker : (marker.time || marker.absoluteTime)
      }))
      .sort((a, b) => a.time - b.time)
    
    // Animer chaque accord avec un délai
    for (let i = 0; i < sortedMarkers.length; i++) {
      const marker = sortedMarkers[i]
      await new Promise(resolve => {
        setTimeout(() => {
          setAnimatedChords(prev => new Set([...prev, marker.index]))
          resolve()
        }, i === 0 ? 300 : 400) // Premier accord après 300ms, les suivants après 400ms
      })
    }
    
    // Attendre un peu avant de passer au mode review
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsValidating(false)
  }, [exercise])

  const handleFinishExercise = async () => {
    // Arrêter la lecture si elle est en cours
    if (playerRef.current && isPlaying) {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    }
    
    // Valider toutes les réponses d'abord pour avoir les validations à jour
    const allValidations = validateAllAnswers()
    setAnswerValidations(allValidations)
    
    // Lancer l'animation de validation
    await animateChordValidation(allValidations)
    
    // Passer en mode review après l'animation
    setMode('review')
    // Sélectionner automatiquement le premier segment
    if (chordSegments.length > 0) {
      setSelectedSegmentIndex(0)
    }
    
    // Sauvegarder la tentative si l'utilisateur est connecté et n'est pas en mode invité
    if (user && exercise && !isGuest) {
      try {
        
        // Préparer les réponses et les solutions
        const answersArray = exercise.markers.map((_, index) => userAnswers[index] || null)
        const correctAnswersArray = exercise.markers.map(marker => 
          typeof marker === 'object' && marker.chord ? marker.chord : null
        )
        
        // Calculer le score avec le système pondéré de fonctions de Riemann + bonus cadences
        let totalScore = 0
        let maxScore = 0
        let totalCadenceBonus = 0
        
        correctAnswersArray.forEach((correct, index) => {
          const userAnswer = answersArray[index]
          if (userAnswer && correct) {
            const validation = allValidations[index] || answerValidations[index]
            if (validation) {
              totalScore += validation.score
              // Ajouter le bonus de cadence si présent
              if (validation.cadenceBonus) {
                totalCadenceBonus += validation.cadenceBonus
              }
            } else {
              // Fallback : validation binaire si pas de validation fonctionnelle
              const validation = validateAnswerWithFunctions(
                userAnswer,
                correct,
                userAnswer.selectedFunction || userAnswer.function || null
              )
              totalScore += validation.score
              // Ajouter le bonus de cadence si présent
              if (validation.cadenceBonus) {
                totalCadenceBonus += validation.cadenceBonus
              }
            }
            maxScore += 100
          } else if (correct) {
            maxScore += 100
          }
        })
        
        // Le score final peut dépasser 100% grâce aux bonus de cadence
        const score = maxScore > 0 ? Math.round(((totalScore + totalCadenceBonus) / maxScore) * 100) : 0
        
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
    
    // Le mode review est déjà défini plus haut, pas besoin de setMode('summary')
  }

  const handleReplay = () => {
    // Réinitialiser l'exercice
    setMode('exercise')
    setCurrentMarkerIndex(0)
    setSelectedSegmentIndex(null) // Réinitialiser la sélection de segment
    const answers = {}
    if (exercise && exercise.markers) {
      exercise.markers.forEach((_, index) => {
        answers[index] = null
      })
    }
    setUserAnswers(answers)
    setAnswerValidations({}) // Réinitialiser les validations
    setAnimatedChords(new Set()) // Réinitialiser les accords animés
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


  // Calculer les valeurs nécessaires AVANT les returns conditionnels
  // Utiliser des valeurs par défaut si exercise n'existe pas encore
  const videoId = exercise?.video?.id || ''
  const startTime = exercise?.settings?.startTime || 0
  const endTime = exercise?.settings?.endTime || 60
  const videoDuration = exercise?.video?.duration || 0
  // Les marqueurs peuvent être un tableau de timestamps ou d'objets avec {time, chord}
  const markers = exercise?.markers 
    ? exercise.markers.map(m => typeof m === 'number' ? m : m.time || m.absoluteTime)
    : []
  const totalMarkers = markers.length
  const answeredCount = Object.values(userAnswers).filter(a => a !== null).length

  // Calculer le temps relatif pour l'affichage
  const relativeCurrentTime = currentTime - startTime
  const relativeEndTime = endTime - startTime
  
  // Liste des marqueurs déjà répondues
  const answeredMarkers = Object.keys(userAnswers).filter(i => userAnswers[i] !== null).map(Number)

  // Calculer les positions et largeurs des cases pour la timeline
  // IMPORTANT: Ce useMemo doit être AVANT tous les returns conditionnels
  const chordSegments = useMemo(() => {
    if (!markers || markers.length === 0 || !exercise) return []
    
    return markers.map((marker, index) => {
      const segmentStart = marker - startTime
      const segmentEnd = index < markers.length - 1 
        ? markers[index + 1] - startTime 
        : relativeEndTime
      
      const startPos = relativeEndTime > 0 ? (segmentStart / relativeEndTime) * 100 : 0
      const endPos = relativeEndTime > 0 ? (segmentEnd / relativeEndTime) * 100 : 100
      const width = endPos - startPos
      
      return {
        index,
        startTime: marker,
        endTime: index < markers.length - 1 ? markers[index + 1] : endTime,
        startPos,
        endPos,
        width,
        isAnswered: answeredMarkers.includes(index),
        chord: userAnswers[index] || null
      }
    })
  }, [markers, startTime, endTime, relativeEndTime, answeredMarkers, userAnswers, exercise])

  // Trouver les cadences pour l'affichage en mode review
  const getCadences = useMemo(() => {
    if (mode !== 'review' || !exercise || !exercise.markers) return []
    
    const cadences = []
    exercise.markers.forEach((marker, index) => {
      // En mode review, afficher la cadence de la solution correcte
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
      const userAnswer = userAnswers[index]
      const validation = answerValidations[index]
      
      // Déterminer quelle cadence afficher :
      // - Si l'élève a mis une cadence correcte, afficher celle de l'élève
      // - Sinon, afficher la cadence de la solution
      let cadenceToDisplay = null
      if (validation && validation.cadenceBonus > 0 && userAnswer?.cadence) {
        // L'élève a mis une cadence correcte
        cadenceToDisplay = userAnswer.cadence
      } else if (correctAnswer?.cadence) {
        // Afficher la cadence de la solution
        cadenceToDisplay = correctAnswer.cadence
      }
      
      if (cadenceToDisplay) {
        cadences.push({
          index,
          cadence: cadenceToDisplay,
          startMarker: index > 0 ? index - 1 : null,
          endMarker: index
        })
      }
    })
    return cadences
  }, [mode, exercise, userAnswers, answerValidations])

  // Trouver l'accord actuel (celui au-dessus du curseur de lecture)
  const findCurrentChordSegment = useMemo(() => {
    if (!chordSegments || chordSegments.length === 0) return null
    
    // Si un marqueur est explicitement sélectionné (via navigation avec flèches), utiliser celui-ci
    if (selectedMarkerId !== null && selectedMarkerId >= 0 && selectedMarkerId < chordSegments.length) {
      return chordSegments[selectedMarkerId]
    }
    
    // Sinon, trouver le segment qui contient le currentTime
    // Important : si on est exactement au début d'un segment (currentTime === segment.startTime),
    // on doit retourner ce segment, pas le précédent
    for (let i = 0; i < chordSegments.length; i++) {
      const segment = chordSegments[i]
      // Si on est exactement au début de ce segment, le retourner
      if (currentTime === segment.startTime) {
        return segment
      }
      // Si on est dans le segment (mais pas au début), le retourner
      if (currentTime > segment.startTime && currentTime <= segment.endTime) {
        return segment
      }
    }
    
    // Si on est avant le premier marqueur, retourner le premier segment
    if (chordSegments.length > 0 && currentTime < chordSegments[0].startTime) {
      return chordSegments[0]
    }
    
    // Si on est après le dernier marqueur, retourner le dernier segment
    if (chordSegments.length > 0 && currentTime > chordSegments[chordSegments.length - 1].endTime) {
      return chordSegments[chordSegments.length - 1]
    }
    
    return null
  }, [chordSegments, currentTime, selectedMarkerId])

  // Fonction pour ouvrir la modale pour l'accord actuel
  const handleOpenCurrentChordModal = useCallback(() => {
    if (!findCurrentChordSegment) return
    handleMarkerClick(findCurrentChordSegment.index)
  }, [findCurrentChordSegment, handleMarkerClick])

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ne pas intercepter si on est dans un input ou textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      // Espace : Play/Pause (déjà géré par YouTube, mais on peut le forcer)
      if (e.key === ' ' && !isModalOpen) {
        e.preventDefault()
        handlePlayPause()
      }

      // Entrée : Ouvrir la modale pour l'accord actuel
      if (e.key === 'Enter' && !isModalOpen && findCurrentChordSegment) {
        e.preventDefault()
        handleOpenCurrentChordModal()
      }

      // Échap : Fermer la modale
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault()
        setIsModalOpen(false)
      }

      // Flèche gauche : Marqueur précédent
      if (e.key === 'ArrowLeft' && !isModalOpen) {
        e.preventDefault()
        const currentPos = currentTimeRef.current || currentTime
        const prevIndex = findPreviousMarker(currentPos)
        if (prevIndex !== null) {
          handleSeekToMarker(prevIndex)
        }
      }

      // Flèche droite : Marqueur suivant
      if (e.key === 'ArrowRight' && !isModalOpen) {
        e.preventDefault()
        const currentPos = currentTimeRef.current || currentTime
        const nextIndex = findNextMarker(currentPos)
        if (nextIndex !== null) {
          handleSeekToMarker(nextIndex)
        } else if (markers.length > 0) {
          handleSeekToMarker(0)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, findCurrentChordSegment, currentTime, markers.length])

  // Calculer les scores pour le dashboard (en mode review)
  // IMPORTANT: Ce hook doit être AVANT tous les returns conditionnels
  const calculateScores = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Player.jsx:930',message:'calculateScores useMemo called',data:{mode,hasExercise:!!exercise,markersCount:exercise?.markers?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'fix-attempt-1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!exercise || !exercise.markers) {
      return { score: 0, perfectCount: 0, partialCount: 0, totalCount: 0, scorePercentage: 0 }
    }

    const results = exercise.markers.map((marker, index) => {
      const userAnswer = userAnswers[index]
      const validation = answerValidations[index]
      const isPerfect = validation && validation.level === 1
      const isPartiallyCorrect = validation && (validation.level === 2 || validation.level === 3)
      return { isPerfect, isPartiallyCorrect }
    })

    const perfectCount = results.filter(r => r.isPerfect).length
    const partialCount = results.filter(r => r.isPartiallyCorrect && !r.isPerfect).length
    const totalCount = results.length

    const totalScore = results.reduce((sum, r, index) => {
      const validation = answerValidations[index]
      if (validation) {
        return sum + validation.score
      }
      return sum + (r.isPerfect ? 100 : 0)
    }, 0)

    const maxScore = totalCount * 100
    const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const score = Math.round(scorePercentage / 10)

    return { score, perfectCount, partialCount, totalCount, scorePercentage }
  }, [exercise, userAnswers, answerValidations])

  // Sélectionner automatiquement le premier segment en mode review
  // IMPORTANT: Ce hook doit être AVANT tous les returns conditionnels
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Player.jsx:970',message:'useEffect for segment selection called',data:{mode,selectedSegmentIndex,chordSegmentsLength:chordSegments.length},timestamp:Date.now(),sessionId:'debug-session',runId:'fix-attempt-1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (mode === 'review' && selectedSegmentIndex === null && chordSegments.length > 0) {
      setSelectedSegmentIndex(0)
    }
  }, [mode, selectedSegmentIndex, chordSegments.length])

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

  // Format du temps relatif (pour le timer général)
  const formatRelativeTime = (seconds) => {
    if (!exercise) return '00:00.0'
    const relativeTime = Math.max(0, seconds - startTime)
    return formatTimeDetailed(relativeTime)
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

  // Fonctions de formatage d'accords (inspirées de Editor.jsx)
  const SPECIAL_ROOT_TO_FUNCTION = {
    'N': 'SD',   // Sixte napolitaine → Sous-Dominante
    'It': 'D',   // Sixte italienne → Dominante
    'Fr': 'D',   // Sixte française → Dominante
    'Gr': 'D'    // Sixte allemande → Dominante
  }

  const getChordFunction = (chord) => {
    if (!chord) return null
    
    const { degree, specialRoot, selectedFunction } = chord
    
    // 1. Si une fonction est explicitement sélectionnée, l'utiliser
    if (selectedFunction) {
      return selectedFunction
    }
    
    // 2. Si c'est une racine spéciale, utiliser le mapping
    if (specialRoot) {
      return SPECIAL_ROOT_TO_FUNCTION[specialRoot] || null
    }
    
    // 3. Si c'est un degré, utiliser le mapping (prendre la première fonction si plusieurs)
    if (degree) {
      const functions = DEGREE_TO_FUNCTIONS[degree] || []
      return functions.length > 0 ? functions[0] : null
    }
    
    return null
  }

  const getDegreeLabel = (deg, mode = 'generic') => {
    const degreeMap = {
      'I': {
        generic: 'I',
        major: 'I',
        minor: 'i'
      },
      'II': {
        generic: 'II',
        major: 'ii',
        minor: 'ii°'
      },
      'III': {
        generic: 'III',
        major: 'iii',
        minor: 'III'
      },
      'IV': {
        generic: 'IV',
        major: 'IV',
        minor: 'iv'
      },
      'V': {
        generic: 'V',
        major: 'V',
        minor: 'V'
      },
      'VI': {
        generic: 'VI',
        major: 'vi',
        minor: 'VI'
      },
      'VII': {
        generic: 'VII',
        major: 'vii°',
        minor: 'vii°'
      }
    }
    return degreeMap[deg]?.[mode] || deg
  }

  const formatChordLabel = (chord) => {
    if (!chord) return null
    
    // En mode élève, utiliser le mode depuis localStorage élève
    let degreeMode = chord.degreeMode
    if (!degreeMode) {
      const savedMode = localStorage.getItem('chordSelectorDegreeModeStudent')
      degreeMode = savedMode || 'generic'
    }
    const { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction } = chord
    
    // Si seule une fonction est sélectionnée (sans degré)
    if (selectedFunction && !degree && !specialRoot) {
      return { 
        function: selectedFunction,
        isFunctionOnly: true
      }
    }
    
    if (specialRoot) {
      if (specialRoot === 'N') {
        const napolitaineLabel = getDegreeLabel('II', degreeMode)
        const hasDiminished = napolitaineLabel.includes('°')
        const degreeWithoutSymbol = napolitaineLabel.replace('°', '')
        return { 
          degree: degreeWithoutSymbol, 
          accidental: '♭', 
          figure: '6',
          quality: hasDiminished ? '°' : ''
        }
      } else {
        const special = { 'It': 'It', 'Fr': 'Fr', 'Gr': 'Gr' }[specialRoot]
        return { degree: special, figure: '+6' }
      }
    }
    
    if (!degree) return null
    
    const displayDegree = getDegreeLabel(degree, degreeMode)
    const hasDiminished = displayDegree.includes('°')
    const degreeWithoutSymbol = displayDegree.replace('°', '').trim()
    
    let finalQuality = quality
    if (hasDiminished) {
      if (!quality || quality === '°') {
        finalQuality = '°'
      }
    } else if (!quality) {
      finalQuality = ''
    }
    
    return {
      degree: degreeWithoutSymbol,
      accidental: accidental === 'b' ? '♭' : accidental === '#' ? '♯' : accidental === 'natural' ? '♮' : '',
      quality: finalQuality,
      figure: figure && figure !== '5' ? figure : '',
      isBorrowed
    }
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

  // Handlers pour le mode review
  const handleNextLevel = () => {
    // TODO: Implémenter la navigation vers le niveau suivant
    navigate('/student-dashboard')
  }

  const handleBackToDashboard = () => {
    navigate('/student-dashboard')
  }

  const handleSegmentClick = (segmentIndex) => {
    if (mode === 'review') {
      setSelectedSegmentIndex(segmentIndex)
      // Positionner la vidéo au début du segment
      if (playerRef.current && chordSegments[segmentIndex]) {
        const segment = chordSegments[segmentIndex]
        playerRef.current.seekTo(segment.startTime, true)
        setCurrentTime(segment.startTime)
        currentTimeRef.current = segment.startTime
      }
    }
  }

  // Mode Review : Interface de correction contextuelle
  if (mode === 'review') {
    return (
      <div className="player-immersive player-review-mode">
        {/* Zone Supérieure : Dashboard de Scores */}
        <div 
          className="player-review-upper-zone"
          ref={(el) => {
            // Dimensions tracking removed
          }}
        >
          <div className="player-video-wrapper player-video-blurred">
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={handleReady}
              onStateChange={handleStateChange}
              className="player-youtube"
            />
          </div>
          <ReviewDashboard
            perfectCount={calculateScores.perfectCount}
            partialCount={calculateScores.partialCount}
            totalCount={calculateScores.totalCount}
            scorePercentage={calculateScores.scorePercentage}
            onReplay={handleReplay}
            onNext={handleNextLevel}
            onBack={handleBackToDashboard}
          />
        </div>

              {/* Zone Milieu : Timeline Interactive */}
              <div 
                className="player-review-timeline-zone"
                ref={(el) => {
                  // Dimensions tracking removed
                }}
              >
          <div className="player-review-timeline-container">
            <div 
              ref={timelineRef}
              className="player-timeline-with-segments player-review-timeline"
            >
              {/* Affichage des cadences au-dessus de la timeline */}
              {getCadences.length > 0 && (
                <div className="absolute -top-6 left-0 w-full h-6 pointer-events-none z-10">
                  {getCadences.map((cadence, idx) => {
                    if (cadence.startMarker === null || cadence.endMarker === null) return null
                    
                    const startSegment = chordSegments[cadence.startMarker]
                    const endSegment = chordSegments[cadence.endMarker]
                    if (!startSegment || !endSegment) return null
                    
                    const leftPos = startSegment.startPos
                    const width = endSegment.endPos - startSegment.startPos
                    
                    const cadenceLabels = {
                      perfect: 'Parfaite',
                      imperfect: 'Imparfaite',
                      plagal: 'Plagale',
                      rompue: 'Rompue',
                      évitée: 'Évitée',
                      'demi-cadence': 'Demi-cadence'
                    }
                    
                    return (
                      <div
                        key={idx}
                        className="absolute"
                        style={{
                          left: `${leftPos}%`,
                          width: `${width}%`
                        }}
                      >
                        {/* Crochet supérieur */}
                        <div className="absolute top-0 left-0 w-full h-4 border-t-2 border-l-2 border-r-2 border-amber-500/50 rounded-t-lg"></div>
                        
                        {/* Label cadence */}
                        <div className="absolute top-0.5 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 text-xs font-semibold text-amber-300 whitespace-nowrap z-10">
                          {cadenceLabels[cadence.cadence] || cadence.cadence}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Curseur de lecture */}
              {currentTime >= startTime && currentTime <= endTime && (
                <div
                  className="player-timeline-playhead"
                  style={{ 
                    left: `${relativeEndTime > 0 ? (relativeCurrentTime / relativeEndTime) * 100 : 0}%`,
                    willChange: 'left'
                  }}
                >
                  <div className="player-timeline-playhead-indicator"></div>
                </div>
              )}

              {chordSegments.map((segment) => {
                const validation = answerValidations[segment.index]
                const isCorrect = validation && validation.level === 1
                const isIncorrect = validation && validation.level === 0
                const isPartial = validation && (validation.level === 2 || validation.level === 3)
                const isSelected = selectedSegmentIndex === segment.index
                
                // En mode review, afficher la correction (solution) au lieu de la mauvaise réponse
                let chordToDisplay = segment.chord
                if (isIncorrect || isPartial) {
                  const marker = exercise.markers[segment.index]
                  const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
                  if (correctAnswer) {
                    chordToDisplay = correctAnswer
                  }
                }
                const chordLabel = formatChordLabel(chordToDisplay)
                
                // Classes de validation
                let validationClass = ''
                if (isCorrect) {
                  validationClass = 'player-chord-segment-correct'
                } else if (isIncorrect) {
                  validationClass = 'player-chord-segment-incorrect'
                } else if (isPartial) {
                  validationClass = 'player-chord-segment-partial'
                }

                const isLastSegment = segment.index === markers.length - 1
                
                return (
                  <div
                    key={segment.index}
                    className={`player-chord-segment player-review-segment ${validationClass} ${isSelected ? 'player-segment-selected' : ''} ${isLastSegment ? 'player-chord-segment-last' : ''}`}
                    style={{
                      left: `${segment.startPos}%`,
                      ...(isLastSegment 
                        ? {} 
                        : { width: `${segment.width}%` }
                      )
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSegmentClick(segment.index)
                    }}
                  >
                    <div className="player-chord-segment-content">
                      {chordLabel ? (
                        <>
                          {chordLabel.isFunctionOnly ? (
                            <span className={`player-chord-function ${
                              chordLabel.function === 'T' ? 'player-chord-function-t' :
                              chordLabel.function === 'SD' ? 'player-chord-function-sd' :
                              'player-chord-function-d'
                            }`}>
                              {chordLabel.function}
                            </span>
                          ) : (
                            <div className="player-chord-label">
                              {chordLabel.isBorrowed && <span className="player-chord-borrowed">(</span>}
                              {chordLabel.accidental && <span className="player-chord-accidental">{chordLabel.accidental}</span>}
                              <span className="player-chord-degree">
                                {chordLabel.degree}
                                {chordLabel.quality && <span className="player-chord-quality">{chordLabel.quality}</span>}
                                {chordLabel.figure && (() => {
                                  const figObj = FIGURES.find(f => f.value === chordLabel.figure)
                                  const isStacked = figObj?.isStacked || false
                                  return (
                                    <span className="player-chord-figure">
                                      {isStacked && figObj?.displayArray ? (
                                        <span className="player-chord-figure-stacked">
                                          {figObj.displayArray.map((f, i) => (
                                            <span key={i}>{f}</span>
                                          ))}
                                        </span>
                                      ) : (
                                        <span>{chordLabel.figure}</span>
                                      )}
                                    </span>
                                  )
                                })()}
                              </span>
                              {chordLabel.isBorrowed && <span className="player-chord-borrowed">)</span>}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="player-chord-empty">
                          <span className="player-chord-empty-icon">?</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Zone Inférieure : Panneau de Correction Détaillée */}
        {selectedSegmentIndex !== null && chordSegments[selectedSegmentIndex] && (
          <div
            ref={(el) => {
              // Dimensions tracking removed
            }}
            style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}
          >
          <ReviewDetailPanel
            segmentIndex={selectedSegmentIndex}
            userAnswer={userAnswers[selectedSegmentIndex]}
            correctAnswer={(() => {
              const marker = exercise.markers[selectedSegmentIndex]
              return typeof marker === 'object' && marker.chord ? marker.chord : null
            })()}
            validation={answerValidations[selectedSegmentIndex]}
            segmentStartTime={chordSegments[selectedSegmentIndex].startTime}
            segmentEndTime={chordSegments[selectedSegmentIndex].endTime}
            playerRef={playerRef}
            exerciseStartTime={startTime}
            exerciseEndTime={endTime}
          />
          </div>
        )}
      </div>
    )
  }

  // Mode Exercise : Interface normale
  return (
    <div className="player-immersive">
      {/* Zone Vidéo (Haut - 80-85%) avec Timeline superposée */}
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

        {/* Timeline avec cases superposée sur la vidéo */}
        <div className="player-timeline-overlay">
          <div 
            ref={timelineRef}
            className="player-timeline-with-segments"
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
            {/* Curseur de lecture */}
            {currentTime >= startTime && currentTime <= endTime && (
              <div
                className="player-timeline-playhead"
                style={{ 
                  left: `${relativeEndTime > 0 ? (relativeCurrentTime / relativeEndTime) * 100 : 0}%`,
                  willChange: 'left'
                }}
              >
                <div className="player-timeline-playhead-indicator"></div>
              </div>
            )}

            {/* Cases d'accords */}
            {chordSegments.map((segment) => {
              const chordLabel = formatChordLabel(segment.chord)
              const chordFunction = getChordFunction(segment.chord)
              const isNext = nextMarkerIndex === segment.index
              
              // Obtenir la validation et la solution correcte si on est en mode validation
              const validation = isValidating || animatedChords.has(segment.index) ? answerValidations[segment.index] : null
              const isCorrect = validation && validation.level === 1
              const isIncorrect = validation && validation.level === 0
              const isAnimated = animatedChords.has(segment.index)
              
              // Obtenir la solution correcte
              let correctAnswerLabel = null
              if (isValidating || isAnimated) {
                const marker = exercise.markers[segment.index]
                const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
                if (correctAnswer) {
                  correctAnswerLabel = formatChordLabel(correctAnswer)
                }
              }
              
              // Déterminer les classes de couleur selon la fonction et le résultat
              let functionColorClasses = ''
              let validationClass = ''
              
              if (isAnimated) {
                if (isCorrect) {
                  validationClass = 'player-chord-segment-correct'
                } else if (isIncorrect) {
                  validationClass = 'player-chord-segment-incorrect'
                } else if (validation && (validation.level === 2 || validation.level === 3)) {
                  validationClass = 'player-chord-segment-partial'
                }
              }
              
              if (chordFunction === 'T') {
                functionColorClasses = segment.isAnswered 
                  ? 'player-chord-segment-answered player-chord-segment-t' 
                  : 'player-chord-segment-t'
              } else if (chordFunction === 'SD') {
                functionColorClasses = segment.isAnswered 
                  ? 'player-chord-segment-answered player-chord-segment-sd' 
                  : 'player-chord-segment-sd'
              } else if (chordFunction === 'D') {
                functionColorClasses = segment.isAnswered 
                  ? 'player-chord-segment-answered player-chord-segment-d' 
                  : 'player-chord-segment-d'
              } else {
                functionColorClasses = segment.isAnswered 
                  ? 'player-chord-segment-answered' 
                  : 'player-chord-segment-empty'
              }

              // Calculer la progression dans cette case
              const segmentRelativeStart = segment.startTime - startTime
              const segmentRelativeEnd = segment.endTime - startTime
              const segmentDuration = segmentRelativeEnd - segmentRelativeStart
              const progressInSegment = currentTime >= segment.startTime && currentTime <= segment.endTime
                ? ((currentTime - segment.startTime) / segmentDuration) * 100
                : currentTime > segment.endTime
                ? 100
                : 0

              // Pour la dernière case, utiliser une classe CSS pour l'alignement
              const isLastSegment = segment.index === markers.length - 1
              
              return (
                <div
                  key={segment.index}
                  className={`player-chord-segment ${functionColorClasses} ${validationClass} ${isNext && !segment.isAnswered && !isValidating ? 'player-chord-segment-next' : ''} ${isLastSegment ? 'player-chord-segment-last' : ''} ${isAnimated ? 'player-chord-segment-animated' : ''}`}
                  style={{
                    left: `${segment.startPos}%`,
                    ...(isLastSegment 
                      ? { 
                          // Pour la dernière case, utiliser right au lieu de width
                          // La largeur sera calculée automatiquement par le navigateur
                          // Le CSS gérera les valeurs de right selon la taille d'écran
                        } 
                      : { width: `${segment.width}%` }
                    )
                  }}
                  onClick={(e) => {
                    if (!isValidating) {
                      e.stopPropagation()
                      handleMarkerClick(segment.index)
                    }
                  }}
                >
                  {/* Jauge de progression à l'intérieur de la case */}
                  {isPlaying && progressInSegment > 0 && !isValidating && (
                    <div 
                      className="player-chord-segment-progress"
                      style={{ width: `${progressInSegment}%` }}
                    />
                  )}

                  {/* Solution correcte au-dessus (si incorrect) */}
                  {isAnimated && isIncorrect && correctAnswerLabel && (
                    <div className="player-chord-solution-overlay">
                      <div className="player-chord-solution-label">
                        {correctAnswerLabel.isFunctionOnly ? (
                          <span className={`player-chord-function ${
                            correctAnswerLabel.function === 'T' ? 'player-chord-function-t' :
                            correctAnswerLabel.function === 'SD' ? 'player-chord-function-sd' :
                            'player-chord-function-d'
                          }`}>
                            {correctAnswerLabel.function}
                          </span>
                        ) : (
                          <div className="player-chord-label">
                            {correctAnswerLabel.isBorrowed && <span className="player-chord-borrowed">(</span>}
                            {correctAnswerLabel.accidental && <span className="player-chord-accidental">{correctAnswerLabel.accidental}</span>}
                            <span className="player-chord-degree">
                              {correctAnswerLabel.degree}
                              {correctAnswerLabel.quality && <span className="player-chord-quality">{correctAnswerLabel.quality}</span>}
                              {correctAnswerLabel.figure && (() => {
                                const figObj = FIGURES.find(f => f.value === correctAnswerLabel.figure)
                                const isStacked = figObj?.isStacked || false
                                return (
                                  <span className="player-chord-figure">
                                    {isStacked && figObj?.displayArray ? (
                                      <span className="player-chord-figure-stacked">
                                        {figObj.displayArray.map((f, i) => (
                                          <span key={i}>{f}</span>
                                        ))}
                                      </span>
                                    ) : (
                                      <span>{correctAnswerLabel.figure}</span>
                                    )}
                                  </span>
                                )
                              })()}
                            </span>
                            {correctAnswerLabel.isBorrowed && <span className="player-chord-borrowed">)</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contenu de l'accord */}
                  <div className="player-chord-segment-content">
                    {chordLabel ? (
                      <>
                        {chordLabel.isFunctionOnly ? (
                          <span className={`player-chord-function ${
                            chordLabel.function === 'T' ? 'player-chord-function-t' :
                            chordLabel.function === 'SD' ? 'player-chord-function-sd' :
                            'player-chord-function-d'
                          }`}>
                            {chordLabel.function}
                          </span>
                        ) : (
                          <div className="player-chord-label">
                            {chordLabel.isBorrowed && <span className="player-chord-borrowed">(</span>}
                            {chordLabel.accidental && <span className="player-chord-accidental">{chordLabel.accidental}</span>}
                            <span className="player-chord-degree">
                              {chordLabel.degree}
                              {chordLabel.quality && <span className="player-chord-quality">{chordLabel.quality}</span>}
                              {chordLabel.figure && (() => {
                                const figObj = FIGURES.find(f => f.value === chordLabel.figure)
                                const isStacked = figObj?.isStacked || false
                                return (
                                  <span className="player-chord-figure">
                                    {isStacked && figObj?.displayArray ? (
                                      <span className="player-chord-figure-stacked">
                                        {figObj.displayArray.map((f, i) => (
                                          <span key={i}>{f}</span>
                                        ))}
                                      </span>
                                    ) : (
                                      <span>{chordLabel.figure}</span>
                                    )}
                                  </span>
                                )
                              })()}
                            </span>
                            {chordLabel.isBorrowed && <span className="player-chord-borrowed">)</span>}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="player-chord-empty">
                        <span className="player-chord-empty-icon">?</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
              <p>Cliquez sur les cases pour identifier les accords</p>
            </div>
          </div>
        )}
      </div>

      {/* Zone de Contrôle (Bas - 15-20%) */}
      <div className="player-control-zone bg-zinc-900/80 backdrop-blur-xl border-t border-white/5">

        {/* Contrôles de lecture regroupés - Style unifié avec Editor */}
        <div className="flex items-center justify-center gap-4">
          {/* Bouton Revenir au début */}
          <button
            onClick={() => {
              if (playerRef.current && exercise) {
                playerRef.current.seekTo(startTime, true)
                setCurrentTime(startTime)
                currentTimeRef.current = startTime
                setSelectedMarkerId(null)
              }
            }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
            title="Revenir au début de l'extrait"
          >
            <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
          </button>

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

          {/* Bouton pour ouvrir la modale de l'accord actuel */}
          {findCurrentChordSegment && (
            <button
              onClick={handleOpenCurrentChordModal}
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-white/10 hover:border-white/20 transition-all duration-200 flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95"
              title="Remplir l'accord actuel (Entrée)"
              aria-label="Ouvrir le sélecteur d'accord pour l'accord actuel"
            >
              <Pencil className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          )}

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

