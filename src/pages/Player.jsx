import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal, { CADENCES } from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import { getExerciseById } from '../services/exerciseService'
import { saveAttempt, getAllUserAttempts } from '../services/attemptService'
import { checkAndUnlockBadges } from '../services/badgeService'
import { useAuth } from '../contexts/AuthContext'
import { validateAnswerWithFunctions, DEGREE_TO_FUNCTIONS, normalizeCadence, PRIMARY_DEGREES } from '../utils/riemannFunctions'
import { getUserProgress, updateNodeProgress, calculateNodeScore } from '../services/progressionService'
import { getRelevantChordIndices, getChordFunction as getChordFunctionForLock } from '../utils/nodeCriteria'
import { formatChordDetailed } from '../utils/chordFormatter'
import { formatChordString as formatChordStringQcm } from '../utils/qcmOptions'
import ChordLabel from '../components/ChordLabel'
import { getNodePhase, getEnabledFunctions, getUnlockedChordKeys, getPrecisionFunctions, isCadenceAvailableForNode, getUnlockedCadenceValues, PHASE_INTUITION, PHASE_PRECISION, PHASE_MAITRISE } from '../data/parcoursTree'
import { getCodexEntriesForCorrection } from '../utils/codexHelpers'
import { getExerciseDisplayTitle } from '../utils/exerciseDisplay'
import { Play, Pause, SkipBack, SkipForward, Pencil, RotateCcw, Home } from 'lucide-react'
import './Player.css'

function Player() {
  const { exerciseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo ?? null
  const { user, userData, isGuest } = useAuth()
  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Détecter le mode depuis l'URL
  const exerciseMode = searchParams.get('mode') || 'libre' // 'parcours' | 'libre'
  const nodeId = searchParams.get('node') || null
  
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
  const [segmentTooltipIndex, setSegmentTooltipIndex] = useState(null) // Index du segment dont on affiche le tooltip (accord + feedback)
  
  // États pour le mode parcours
  const [progressionMode, setProgressionMode] = useState('full') // 'functions' | 'qcm' | 'full'
  const [parcoursContext, setParcoursContext] = useState(null)
  const [nodeStatsForQCM, setNodeStatsForQCM] = useState(null) // nodeStats[nodeId] pour QCM adaptatif
  const [relevantChordIndices, setRelevantChordIndices] = useState([])
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState([]) // badges débloqués à l'issue de cet exercice (affichés en bannière)
  
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentTimeRef = useRef(0)
  const timelineRef = useRef(null)
  const videoZoneOverlayRef = useRef(null)

  // Détection mobile pour timeline en bandes égales (breakpoint aligné avec le CSS)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Auto-dismiss bannière badges débloqués après 5 secondes
  useEffect(() => {
    if (newlyUnlockedBadges.length === 0) return
    const t = setTimeout(() => setNewlyUnlockedBadges([]), 5000)
    return () => clearTimeout(t)
  }, [newlyUnlockedBadges.length])

  /** Convertit un accord attendu en clé parcours (ex. I, I6, V7, N6, V64, cad64) pour comparer à unlockedChordKeys */
  const chordToParcoursKey = useCallback((chord) => {
    if (!chord) return null
    if (chord.specialRoot === 'N') return 'N6'
    if (chord.specialRoot === 'It' || chord.specialRoot === 'Fr' || chord.specialRoot === 'Gr') return chord.specialRoot
    const degree = (chord.degree || '').toUpperCase()
    if (!degree) return null
    const fig = chord.figure && chord.figure !== '5' ? chord.figure : ''
    // I64 dépendant du contexte : passage → V64, cadence → cad64, avancé → I64
    if (degree === 'I' && fig === '64') {
      if (chord.sixFourVariant === 'passing') return 'V64'
      if (chord.sixFourVariant === 'cadential') return 'cad64'
      return 'I64'
    }
    return degree + fig
  }, [])

  /** En mode parcours, true si la case à l'index donnée a un accord attendu non débloqué (à griser / non remplissable) */
  const isSegmentLockedByParcours = useCallback((markerIndex) => {
    if (exerciseMode !== 'parcours' || !parcoursContext || !exercise?.markers?.[markerIndex]) {
      return false
    }
    const marker = exercise.markers[markerIndex]
    const expectedChord = typeof marker === 'object' && marker.chord ? marker.chord : null
    if (!expectedChord) {
      return false
    }

    // Phase Intuition (niveau 1, cadence parfaite, etc.) : on verrouille uniquement si la *fonction* (T/SD/D) n'est pas autorisée
    if (parcoursContext.phase === PHASE_INTUITION && parcoursContext.enabledFunctions?.length) {
      const chordFunction = getChordFunctionForLock(expectedChord)
      const locked = chordFunction != null && !parcoursContext.enabledFunctions.includes(chordFunction)
      return locked
    }

    // Phase Précision / Maîtrise : pour les fonctions en "validation simple", on verrouille seulement si la fonction n'est pas autorisée ; pour les autres, on verrouille si la clé précise n'est pas débloquée
    const chordFunction = getChordFunctionForLock(expectedChord)
    const precisionFunctions = parcoursContext.precisionFunctions ?? ['T', 'SD', 'D']
    if (chordFunction != null && !precisionFunctions.includes(chordFunction)) {
      const locked = !parcoursContext.enabledFunctions?.includes(chordFunction)
      return locked
    }
    if (!parcoursContext.unlockedChordKeys?.length) {
      return false
    }
    const key = chordToParcoursKey(expectedChord)
    if (!key) {
      return false
    }
    const locked = !parcoursContext.unlockedChordKeys.includes(key)
    return locked
  }, [exerciseMode, parcoursContext, exercise, chordToParcoursKey])

  // Charger l'exercice
  useEffect(() => {
    loadExercise()
  }, [exerciseId])

  // Charger la progression et déterminer le mode si on est en mode parcours
  useEffect(() => {
    if (exercise && exerciseMode === 'parcours' && nodeId && user && !isGuest) {
      loadProgressionMode()
    } else if (exerciseMode === 'libre') {
      setProgressionMode('full')
      setParcoursContext(null)
      setNodeStatsForQCM(null)
      setRelevantChordIndices([])
    }
  }, [exercise, exerciseMode, nodeId, user, isGuest])

  const loadProgressionMode = async () => {
    try {
      const relevantIndices = getRelevantChordIndices(nodeId, exercise)
      setRelevantChordIndices(relevantIndices)

      const progress = await getUserProgress(user.uid)
      const nodeStats = progress?.nodeStats || {}
      const unlockedNodes = progress?.unlockedNodes || []
      setNodeStatsForQCM(nodeStats[nodeId] || null)
      const phase = getNodePhase(nodeId, nodeStats)
      const enabledFunctions = getEnabledFunctions(nodeId)
      const unlockedChordKeys = getUnlockedChordKeys(nodeId)
      const precisionFunctions = getPrecisionFunctions(nodeId)
      const unlockedCadenceValues = getUnlockedCadenceValues(unlockedNodes, nodeId)
      const cadenceAvailable = isCadenceAvailableForNode(nodeId, unlockedNodes)
      setParcoursContext({ nodeId, phase, enabledFunctions, unlockedChordKeys, precisionFunctions, cadenceAvailable, unlockedCadenceValues })

      // En parcours : seul l'intuition utilise le mode "functions" ; précision et maîtrise = QCM. Le mode "full" (sélecteur complet) est réservé au mode libre.
      if (phase === PHASE_INTUITION) setProgressionMode('functions')
      else setProgressionMode('qcm')
    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error)
      setProgressionMode('functions')
      setParcoursContext(null)
    }
  }

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
    // En mode parcours, ne pas ouvrir la modale pour une case dont l'accord n'est pas encore débloqué
    if (isSegmentLockedByParcours(markerIndex)) return

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
    // En mode QCM, chordData peut être une chaîne (legacy) ou un objet { chord, cadence }
    let finalChordData = chordData
    const isQcmPayload = progressionMode === 'qcm' && typeof chordData === 'object' && chordData !== null && 'chord' in chordData
    const isQcmString = progressionMode === 'qcm' && typeof chordData === 'string'

    if (isQcmPayload) {
      finalChordData = { qcmAnswer: chordData.chord, cadence: chordData.cadence ?? undefined, function: chordData.function ?? undefined }
    } else if (isQcmString) {
      finalChordData = { qcmAnswer: chordData }
    }

    // Enregistrer la réponse de l'élève
    setUserAnswers(prev => ({
      ...prev,
      [currentMarkerIndex]: finalChordData
    }))

    // Valider avec le système de fonctions de Riemann
    if (exercise && exercise.markers && exercise.markers[currentMarkerIndex]) {
      const marker = exercise.markers[currentMarkerIndex]
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null

      if (correctAnswer) {
        // En mode QCM, comparer accord (et bonus cadence si fourni)
        if (progressionMode === 'qcm' && (isQcmString || isQcmPayload)) {
          const chordStr = isQcmPayload ? chordData.chord : chordData
          const key = chordToParcoursKey(correctAnswer)
          const expectFunctionOnly = exerciseMode === 'parcours' && parcoursContext?.unlockedChordKeys?.length && key != null && !parcoursContext.unlockedChordKeys.includes(key)
          const correctStr = expectFunctionOnly ? (getChordFunctionForLock(correctAnswer) || '') : formatChordStringQcm(correctAnswer)
          const isCorrectChord = chordStr === correctStr || (expectFunctionOnly && (chordData.function === correctStr))
          const correctFunction = (() => {
            if (!correctAnswer) return null
            if (correctAnswer.selectedFunction) return correctAnswer.selectedFunction
            if (correctAnswer.specialRoot) {
              const map = { 'N': 'SD', 'It': 'D', 'Fr': 'D', 'Gr': 'D' }
              return map[correctAnswer.specialRoot] || null
            }
            if (correctAnswer.degree) {
              const funcs = DEGREE_TO_FUNCTIONS[correctAnswer.degree] || []
              return funcs.length > 0 ? funcs[0] : null
            }
            return null
          })()
          const userFunction = finalChordData.function ?? null
          const isCorrectFunction = Boolean(userFunction && correctFunction && userFunction === correctFunction)
          const userFunctionFromChord = chordStr ? getFunctionFromQcmAnswer(chordStr) : null
          const isCorrectFunctionFromChord = Boolean(userFunctionFromChord && correctFunction && userFunctionFromChord === correctFunction)
          let cadenceBonus = 0
          const correctCadence = correctAnswer.cadence ? normalizeCadence(correctAnswer.cadence) : null
          const unlocked = parcoursContext?.unlockedCadenceValues
          const effectiveCorrectCadence = (exerciseMode === 'parcours' && Array.isArray(unlocked) && unlocked.length > 0)
            ? (correctCadence && unlocked.includes(correctCadence) ? correctCadence : null)
            : correctCadence
          const userCadence = finalChordData.cadence ? normalizeCadence(finalChordData.cadence) : null
          if (effectiveCorrectCadence && userCadence && userCadence === effectiveCorrectCadence) cadenceBonus = 10
          let cadenceFeedbackSuffix = ''
          if (effectiveCorrectCadence) {
            if (cadenceBonus === 10) cadenceFeedbackSuffix = ' Cadence correcte.'
            else if (userCadence) cadenceFeedbackSuffix = ' Cadence incorrecte.'
            else cadenceFeedbackSuffix = ' Cadence manquante.'
          }
          const score = isCorrectChord ? 100 + cadenceBonus : (isCorrectFunctionFromChord || isCorrectFunction ? 50 : 0)
          let feedback = (isCorrectChord
            ? (cadenceBonus > 0 ? 'Parfait ! + Bonus cadence' : 'Correct !')
            : (isCorrectFunctionFromChord || isCorrectFunction)
              ? 'Partiel : bonne fonction.'
              : 'Incorrect') + cadenceFeedbackSuffix

          if (exerciseMode !== 'parcours') {
            setAnswerValidations(prev => ({
              ...prev,
              [currentMarkerIndex]: {
                level: isCorrectChord ? 1 : (isCorrectFunctionFromChord || isCorrectFunction ? 0.5 : 0),
                score,
                cadenceBonus,
                feedback
              }
            }))
          }
          setIsModalOpen(false)
        } else {
          // Mode normal avec validation fonctionnelle
          const validation = validateAnswerWithFunctions(
            finalChordData,
            correctAnswer,
            finalChordData.selectedFunction || finalChordData.function || null,
            { functionOnlyAvailable: progressionMode === 'functions' }
          )
          // En mode parcours : pas de feedback par accord, uniquement à la fin de la séquence
          if (exerciseMode !== 'parcours') {
            setAnswerValidations(prev => ({
              ...prev,
              [currentMarkerIndex]: validation
            }))
          }
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
      const isLocked = isSegmentLockedByParcours(index)
      let setMissing = false
      
      if (userAnswer && correctAnswer) {
        if (answerValidations[index]) {
          validations[index] = answerValidations[index]
        } else if (progressionMode === 'qcm' && 'qcmAnswer' in userAnswer) {
          const key = chordToParcoursKey(correctAnswer)
          const expectFunctionOnly = exerciseMode === 'parcours' && parcoursContext?.unlockedChordKeys?.length && key != null && !parcoursContext.unlockedChordKeys.includes(key)
          const correctStr = expectFunctionOnly ? (getChordFunctionForLock(correctAnswer) || '') : formatChordStringQcm(correctAnswer)
          const isCorrectChord = userAnswer.qcmAnswer === correctStr || (expectFunctionOnly && (userAnswer.function === correctStr))
          const correctFunction = getChordFunction(correctAnswer)
          const userFunction = userAnswer.function ?? null
          const isCorrectFunction = Boolean(userFunction && correctFunction && userFunction === correctFunction)
          const userFunctionFromChord = userAnswer.qcmAnswer ? getFunctionFromQcmAnswer(userAnswer.qcmAnswer) : null
          const isCorrectFunctionFromChord = Boolean(userFunctionFromChord && correctFunction && userFunctionFromChord === correctFunction)
          let cadenceBonus = 0
          const correctCadence = correctAnswer.cadence ? normalizeCadence(correctAnswer.cadence) : null
          const unlockedBatch = parcoursContext?.unlockedCadenceValues
          const effectiveCorrectCadenceBatch = (exerciseMode === 'parcours' && Array.isArray(unlockedBatch) && unlockedBatch.length > 0)
            ? (correctCadence && unlockedBatch.includes(correctCadence) ? correctCadence : null)
            : correctCadence
          const userCadence = userAnswer.cadence ? normalizeCadence(userAnswer.cadence) : null
          if (effectiveCorrectCadenceBatch && userCadence && userCadence === effectiveCorrectCadenceBatch) cadenceBonus = 10
          const score = isCorrectChord ? 100 + cadenceBonus : (isCorrectFunctionFromChord || isCorrectFunction ? 50 : 0)
          const feedback = (isCorrectChord ? 'Correct !' : (isCorrectFunctionFromChord || isCorrectFunction) ? 'Partiel : bonne fonction.' : 'Incorrect') + (effectiveCorrectCadenceBatch ? (cadenceBonus === 10 ? ' Cadence correcte.' : userCadence ? ' Cadence incorrecte.' : ' Cadence manquante.') : '')
          const level = isCorrectChord ? 1 : (isCorrectFunctionFromChord || isCorrectFunction ? 0.5 : 0)
          validations[index] = { level, score, cadenceBonus, feedback }
        } else {
          validations[index] = validateAnswerWithFunctions(
            userAnswer,
            correctAnswer,
            userAnswer.selectedFunction || userAnswer.function || null,
            { functionOnlyAvailable: progressionMode === 'functions' }
          )
        }
      } else if (correctAnswer && !isLocked) {
        // Réponse manquante uniquement pour les cases remplissables (non grisées)
        setMissing = true
        validations[index] = {
          level: 0,
          score: 0,
          cadenceBonus: 0,
          feedback: 'Réponse manquante'
        }
      }
    })

    return validations
  }, [exercise, userAnswers, answerValidations, progressionMode, isSegmentLockedByParcours, exerciseMode, parcoursContext?.unlockedCadenceValues])

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
        
        let totalScore = 0
        let maxScore = 0
        let totalCadenceBonus = 0
        
        // En mode parcours, calculer le score uniquement sur les accords remplissables (non grisés)
        if (exerciseMode === 'parcours' && nodeId && relevantChordIndices.length > 0) {
          const fillableIndices = relevantChordIndices.filter((i) => !isSegmentLockedByParcours(i))
          const nodeScore = calculateNodeScore(nodeId, answersArray, correctAnswersArray, exercise, {
            functionOnlyAvailable: progressionMode === 'functions',
            fillableIndices
          })
          const relevantCount = fillableIndices.length
          
          // Mettre à jour la progression du nœud (sur le nombre de cases à remplir)
          await updateNodeProgress(user.uid, nodeId, nodeScore, relevantCount)
          
          // Utiliser le score du nœud pour l'affichage
          totalScore = nodeScore * relevantCount
          maxScore = relevantCount * 100
        } else {
          // Mode libre : calculer le score sur tous les accords (accord + cadence si attendue)
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
                  userAnswer.selectedFunction || userAnswer.function || null,
                  { functionOnlyAvailable: progressionMode === 'functions' }
                )
                totalScore += validation.score
                // Ajouter le bonus de cadence si présent
                if (validation.cadenceBonus) {
                  totalCadenceBonus += validation.cadenceBonus
                }
              }
              maxScore += 100
              // La cadence compte pour le score : +10 points possibles si une cadence est attendue (et débloquée en parcours)
              if (correct.cadence) {
                const norm = normalizeCadence(correct.cadence)
                const unlc = parcoursContext?.unlockedCadenceValues
                if (exerciseMode !== 'parcours' || !Array.isArray(unlc) || unlc.length === 0 || (norm && unlc.includes(norm))) maxScore += 10
              }
            } else if (correct) {
              maxScore += 100
              if (correct.cadence) {
                const norm = normalizeCadence(correct.cadence)
                const unlc = parcoursContext?.unlockedCadenceValues
                if (exerciseMode !== 'parcours' || !Array.isArray(unlc) || unlc.length === 0 || (norm && unlc.includes(norm))) maxScore += 10
              }
            }
          })
        }

        // Score final : accord (100) + bonus cadence (10 si attendue et correcte) par marqueur
        const score = maxScore > 0 ? Math.round(((totalScore + totalCadenceBonus) / maxScore) * 100) : 0
        
        // Sauvegarder la tentative (métadonnées pour badges contenu musical)
        const saveResult = await saveAttempt(
          user.uid,
          exercise.id,
          answersArray,
          correctAnswersArray,
          score,
          getExerciseDisplayTitle(exercise, []) || exercise.metadata?.exerciseTitle || exercise.metadata?.workTitle || 'Exercice',
          {
            functionOnlyAvailable: progressionMode === 'functions',
            authorId: exercise.authorId ?? null,
            authorName: exercise.authorName ?? null,
            exerciseMetadata: {
              composer: exercise.metadata?.composer ?? null,
              difficulty: exercise.metadata?.difficulty ?? null,
              autoTags: exercise.autoTags ?? [],
              sourceNodeId: exerciseMode === 'parcours' ? (nodeId ?? parcoursContext?.currentNodeId ?? null) : null,
              ...(exercise.metadata?.section === 'horizons' && {
                section: 'horizons',
                musicCategory: exercise.metadata?.musicCategory ?? null
              })
            }
          }
        )
        // Vérifier et débloquer les badges, puis afficher une notification si nouveaux badges
        try {
          const allAttempts = await getAllUserAttempts(user.uid)
          const sortedAttempts = [...allAttempts].sort((a, b) => {
            const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt || 0)
            const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt || 0)
            return dateB - dateA
          })
          const xpAfterAttempt = (userData?.xp ?? 0) + (saveResult?.xpGained ?? 0)
          const newlyUnlocked = await checkAndUnlockBadges(user.uid, sortedAttempts, { xp: xpAfterAttempt })
          if (newlyUnlocked.length > 0) {
            setNewlyUnlockedBadges(newlyUnlocked)
          }
        } catch (badgeError) {
          console.error('Erreur lors de la vérification des badges:', badgeError)
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la tentative:', error)
        // Continuer quand même pour afficher les résultats
      }
    }
    
    // Le mode review est déjà défini plus haut, pas besoin de setMode('summary')
  }

  const handleReplay = () => {
    setNewlyUnlockedBadges([])
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
      
      navigate(returnTo || '/student-dashboard')
    }
  }

  /** Clic/tap sur la zone vidéo (overlay) : zone quit → handleQuitExercise, sinon play/pause (l’iframe a pointer-events: none) */
  const handleVideoZoneTap = useCallback((e) => {
    const el = videoZoneOverlayRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const quitZoneW = 140
    const quitZoneH = 80
    const inQuitZone = e.clientX >= rect.right - quitZoneW && e.clientY < rect.top + quitZoneH
    if (inQuitZone) {
      handleQuitExercise()
    } else if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo()
        setIsPlaying(false)
      } else {
        playerRef.current.playVideo()
        setIsPlaying(true)
      }
    }
  }, [isPlaying])

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
  
  // En mode parcours : indices remplissables = pertinents et non grisés (débloqués)
  const fillableIndices = useMemo(() => {
    if (exerciseMode !== 'parcours' || relevantChordIndices.length === 0) return []
    return relevantChordIndices.filter(i => !isSegmentLockedByParcours(i))
  }, [exerciseMode, relevantChordIndices, isSegmentLockedByParcours])

  const answeredFillableCount = useMemo(() => {
    if (exerciseMode === 'parcours' && fillableIndices.length > 0) {
      return fillableIndices.filter(index => userAnswers[index] !== null).length
    }
    return Object.values(userAnswers).filter(a => a !== null).length
  }, [exerciseMode, fillableIndices, userAnswers])

  // En mode parcours, calculer le nombre d'accords pertinents remplis (legacy, pour validateAllAnswers etc.)
  const answeredRelevantCount = useMemo(() => {
    if (exerciseMode === 'parcours' && relevantChordIndices.length > 0) {
      return relevantChordIndices.filter(index => userAnswers[index] !== null).length
    }
    return Object.values(userAnswers).filter(a => a !== null).length
  }, [exerciseMode, relevantChordIndices, userAnswers])

  const relevantChordsCount = relevantChordIndices.length

  // Cadence attendue sur le marqueur courant (obligatoire si présente)
  // En parcours : n'exiger la cadence que si la bonne réponse est dans les cadences débloquées
  const expectedCadence = useMemo(() => {
    if (!exercise?.markers?.[currentMarkerIndex]) return false
    const marker = exercise.markers[currentMarkerIndex]
    const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
    const correctCadence = chord?.cadence || null
    if (!correctCadence) return false
    const unlocked = parcoursContext?.unlockedCadenceValues
    const inUnlocked = Array.isArray(unlocked) && unlocked.includes(correctCadence)
    return exerciseMode === 'parcours' ? !!inUnlocked : !!correctCadence
  }, [exercise, currentMarkerIndex, exerciseMode, parcoursContext?.unlockedCadenceValues])

  // Liste des cadences à afficher en QCM (filtrée en Parcours par unlockedCadenceValues)
  const qcmCadencesToShow = useMemo(() => {
    const unlocked = parcoursContext?.unlockedCadenceValues
    if (Array.isArray(unlocked) && unlocked.length > 0) return CADENCES.filter(c => unlocked.includes(c.value))
    return CADENCES
  }, [parcoursContext?.unlockedCadenceValues])

  // Liste d'accords pour le QCM : mémoïsée pour éviter de recréer une nouvelle référence à chaque rendu (ex. pendant la lecture vidéo), ce qui ferait re-mélanger les options en permanence
  const qcmAllChords = useMemo(() => {
    if (!exercise?.markers) return []
    return exercise.markers.map(m => typeof m === 'object' && m.chord ? m.chord : null).filter(Boolean)
  }, [exercise?.markers])

  // En mode parcours : afficher Terminer quand toutes les cases *remplissables* (non grisées) sont remplies.
  // En mode libre : afficher quand tous les marqueurs sont remplis.
  const canShowFinishButton = exerciseMode === 'parcours'
    ? totalMarkers > 0 && (fillableIndices.length === 0 || answeredFillableCount === fillableIndices.length)
    : answeredCount === totalMarkers && totalMarkers > 0

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

  // Position du curseur : en mobile (bandes égales) vitesse variable, sinon proportionnelle au temps
  const playheadPositionPercent = useMemo(() => {
    if (currentTime < startTime || currentTime > endTime) return null
    if (!isMobile || !chordSegments.length) {
      return relativeEndTime > 0 ? (relativeCurrentTime / relativeEndTime) * 100 : 0
    }
    const X = chordSegments.length
    for (let i = 0; i < chordSegments.length; i++) {
      const seg = chordSegments[i]
      const segDuration = seg.endTime - seg.startTime
      if (segDuration <= 0) continue
      if (currentTime >= seg.startTime && currentTime <= seg.endTime) {
        const p = (currentTime - seg.startTime) / segDuration
        return ((i + p) / X) * 100
      }
    }
    if (currentTime < chordSegments[0].startTime) return 0
    if (currentTime > chordSegments[chordSegments.length - 1].endTime) return 100
    return (relativeEndTime > 0 ? (relativeCurrentTime / relativeEndTime) * 100 : 0)
  }, [currentTime, startTime, endTime, relativeCurrentTime, relativeEndTime, isMobile, chordSegments])

  // Trouver les cadences pour l'affichage en mode review (avec statut correct/incorrect)
  const getCadences = useMemo(() => {
    if (mode !== 'review' || !exercise || !exercise.markers) return []
    const unlockedScores = parcoursContext?.unlockedCadenceValues
    const onlyUnlockedCadenceForMax = exerciseMode === 'parcours' && Array.isArray(unlockedScores) && unlockedScores.length > 0

    const cadences = []
    exercise.markers.forEach((marker, index) => {
      // En mode review, afficher la cadence de la solution correcte
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
      const userAnswer = userAnswers[index]
      const validation = answerValidations[index]

      // Cadence attendue (même règle que maxScore +10)
      const normCad = correctAnswer?.cadence ? normalizeCadence(correctAnswer.cadence) : null
      const cadenceExpected = !!(correctAnswer?.cadence && (
        !onlyUnlockedCadenceForMax || (normCad && unlockedScores.includes(normCad))
      ))
      const cadenceCorrect = cadenceExpected
        ? !!(validation?.cadenceBonus > 0)
        : undefined

      // Déterminer quelle cadence afficher :
      // - Si l'élève a mis une cadence correcte, afficher celle de l'élève
      // - Sinon, afficher la cadence de la solution
      let cadenceToDisplay = null
      if (validation && validation.cadenceBonus > 0 && userAnswer?.cadence) {
        cadenceToDisplay = userAnswer.cadence
      } else if (correctAnswer?.cadence) {
        cadenceToDisplay = correctAnswer.cadence
      }

      if (cadenceToDisplay) {
        cadences.push({
          index,
          cadence: cadenceToDisplay,
          startMarker: index > 0 ? index - 1 : null,
          endMarker: index,
          cadenceExpected,
          cadenceCorrect
        })
      }
    })
    return cadences
  }, [mode, exercise, userAnswers, answerValidations, exerciseMode, parcoursContext?.unlockedCadenceValues])

  // Labels des cadences (partagé pour accolade au-dessus de la timeline)
  const cadenceLabelsMap = useMemo(() => ({
    perfect: 'Parfaite',
    imperfect: 'Imparfaite',
    plagal: 'Plagale',
    rompue: 'Rompue',
    évitée: 'Évitée',
    'demi-cadence': 'Demi-cadence',
    half: 'Demi-cadence'
  }), [])

  // Liste des cadences pour l'accolade au-dessus de la timeline (exercice + review)
  // En parcours : n'afficher l'accolade que pour les cadences débloquées
  const getCadencesForBrace = useMemo(() => {
    if (mode === 'review') {
      return getCadences.map(c => ({
        ...c,
        cadenceLabel: cadenceLabelsMap[c.cadence] || c.cadence
      }))
    }
    // Mode exercice : marqueurs qui attendent une cadence (débloquée en parcours)
    const unlocked = parcoursContext?.unlockedCadenceValues
    const onlyUnlocked = exerciseMode === 'parcours' && Array.isArray(unlocked) && unlocked.length > 0
    const list = []
    ;(exercise?.markers ?? []).forEach((marker, index) => {
      const chord = typeof marker === 'object' && marker.chord ? marker.chord : null
      if (!chord?.cadence) return
      if (onlyUnlocked) {
        const normalized = normalizeCadence(chord.cadence)
        if (!normalized || !unlocked.includes(normalized)) return
      }
      const val = userAnswers[index]?.cadence
      list.push({
        startMarker: index > 0 ? index - 1 : null,
        endMarker: index,
        cadence: val,
        cadenceLabel: val ? (cadenceLabelsMap[val] || val) : 'Cadence'
      })
    })
    return list
  }, [mode, getCadences, exercise?.markers, userAnswers, cadenceLabelsMap, exerciseMode, parcoursContext?.unlockedCadenceValues])

  // Trouver l'accord actuel (celui au-dessus du curseur de lecture)
  const findCurrentChordSegment = useMemo(() => {
    if (!chordSegments || chordSegments.length === 0) return null
    
    // Si un marqueur est explicitement sélectionné (via navigation avec flèches), utiliser celui-ci
    if (selectedMarkerId !== null && selectedMarkerId >= 0 && selectedMarkerId < chordSegments.length) {
      return chordSegments[selectedMarkerId]
    }
    
    // Sinon, trouver le segment qui contient le currentTime
    // À la frontière entre deux segments (t = endTime du précédent = startTime du suivant),
    // on préfère le segment qui commence à cet instant (accord « suivant »)
    for (let i = 0; i < chordSegments.length; i++) {
      const segment = chordSegments[i]
      if (currentTime === segment.startTime) return segment
      if (currentTime > segment.startTime && currentTime <= segment.endTime) {
        const next = chordSegments[i + 1]
        if (currentTime === segment.endTime && next && next.startTime === currentTime) return next
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

  // Fonction pour ouvrir la modale pour l'accord actuel (utilise getCurrentTime() au clic pour éviter state stale sur mobile)
  const handleOpenCurrentChordModal = useCallback(() => {
    if (!chordSegments?.length || !playerRef.current) return
    const t = playerRef.current.getCurrentTime()
    if (typeof t !== 'number') return
    let segment = null
    for (let i = 0; i < chordSegments.length; i++) {
      const seg = chordSegments[i]
      if (t === seg.startTime) { segment = seg; break }
      if (t > seg.startTime && t <= seg.endTime) {
        const next = chordSegments[i + 1]
        if (t === seg.endTime && next && next.startTime === t) { segment = next; break }
        segment = seg
        break
      }
    }
    if (!segment && chordSegments.length > 0) {
      if (t < chordSegments[0].startTime) segment = chordSegments[0]
      else if (t > chordSegments[chordSegments.length - 1].endTime) segment = chordSegments[chordSegments.length - 1]
    }
    if (!segment) return
    if (isSegmentLockedByParcours(segment.index)) return
    handleMarkerClick(segment.index)
  }, [chordSegments, handleMarkerClick, isSegmentLockedByParcours])

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
        if (!isSegmentLockedByParcours(findCurrentChordSegment.index)) {
          e.preventDefault()
          handleOpenCurrentChordModal()
        }
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
  }, [isModalOpen, findCurrentChordSegment, currentTime, markers.length, isSegmentLockedByParcours])

  // Calculer les scores pour le dashboard (en mode review)
  // IMPORTANT: Ce hook doit être AVANT tous les returns conditionnels
  const calculateScores = useMemo(() => {
    if (!exercise || !exercise.markers) {
      return { score: 0, perfectCount: 0, partialCount: 0, totalCount: 0, scorePercentage: 0, cadenceCorrectCount: 0, cadenceTotalCount: 0 }
    }

    const results = exercise.markers.map((marker, index) => {
      const userAnswer = userAnswers[index]
      const validation = answerValidations[index]
      const isPerfect = validation && validation.level === 1
      const isPartiallyCorrect = validation && (validation.level === 0.5 || validation.level === 2 || validation.level === 3)
      return { isPerfect, isPartiallyCorrect }
    })

    const perfectCount = results.filter(r => r.isPerfect).length
    const partialCount = results.filter(r => r.isPartiallyCorrect && !r.isPerfect).length
    const totalCount = results.length

    let totalScore = 0
    let maxScore = 0
    let cadenceCorrectCount = 0
    let cadenceTotalCount = 0
    const unlockedScores = parcoursContext?.unlockedCadenceValues
    const onlyUnlockedCadenceForMax = exerciseMode === 'parcours' && Array.isArray(unlockedScores) && unlockedScores.length > 0
    exercise.markers.forEach((marker, index) => {
      const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
      maxScore += 100
      if (correctAnswer?.cadence) {
        const normCad = normalizeCadence(correctAnswer.cadence)
        if (!onlyUnlockedCadenceForMax || (normCad && unlockedScores.includes(normCad))) {
          maxScore += 10
          cadenceTotalCount += 1
        }
      }
      const validation = answerValidations[index]
      if (validation?.cadenceBonus > 0) cadenceCorrectCount += 1
      if (validation) {
        totalScore += validation.score + (validation.cadenceBonus || 0)
      } else {
        const r = results[index]
        totalScore += r?.isPerfect ? 100 : 0
      }
    })
    const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const score = Math.round(scorePercentage / 10)

    return { score, perfectCount, partialCount, totalCount, scorePercentage, cadenceCorrectCount, cadenceTotalCount }
  }, [exercise, userAnswers, answerValidations, exerciseMode, parcoursContext?.unlockedCadenceValues])

  // Sélectionner automatiquement le premier segment en mode review
  // IMPORTANT: Ce hook doit être AVANT tous les returns conditionnels
  useEffect(() => {
    if (mode === 'review' && selectedSegmentIndex === null && chordSegments.length > 0) {
      setSelectedSegmentIndex(0)
    }
  }, [mode, selectedSegmentIndex, chordSegments.length])

  // En mode review intégré (libre) : mettre à jour le segment affiché quand la lecture avance (curseur passe à l'accord suivant)
  useEffect(() => {
    if (mode !== 'review' || exerciseMode !== 'libre' || !isPlaying || !chordSegments?.length) return
    for (let i = 0; i < chordSegments.length; i++) {
      const seg = chordSegments[i]
      if (currentTime >= seg.startTime && currentTime <= seg.endTime) {
        setSelectedSegmentIndex(i)
        return
      }
      if (i === chordSegments.length - 1 && currentTime > seg.endTime) {
        setSelectedSegmentIndex(i)
        return
      }
    }
    if (currentTime < chordSegments[0].startTime) setSelectedSegmentIndex(0)
  }, [mode, exerciseMode, isPlaying, currentTime, chordSegments])

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

  /** Extrait la fonction T/SD/D depuis une chaîne qcmAnswer (ex. "I5", "II♭6", "cad6/4") */
  const getFunctionFromQcmAnswer = (qcmAnswer) => {
    if (!qcmAnswer || typeof qcmAnswer !== 'string') return null
    const s = qcmAnswer.trim()
    if (s.startsWith('It+6') || s.startsWith('Fr+6') || s.startsWith('Gr+6')) return 'D'
    if (s.startsWith('II♭') || s.startsWith('IIb')) return 'SD'
    if (s.startsWith('cad') || s.startsWith('Cad.')) return 'D' // 64 de cadence = fonction dominante
    const degreeMatch = s.match(/^(III|VII|II|IV|VI|I|V)(♭|♯|b|#)?/)
    const degree = degreeMatch ? degreeMatch[1] : null
    if (degree) {
      const functions = DEGREE_TO_FUNCTIONS[degree] || []
      return functions.length > 0 ? functions[0] : null
    }
    return null
  }

  const getChordFunction = (chord) => {
    if (!chord) return null
    
    const { degree, specialRoot, selectedFunction, function: qcmFunction, qcmAnswer } = chord
    
    // 1. Réponse QCM avec fonction seule (T/SD/D)
    if (qcmFunction && ['T', 'SD', 'D'].includes(qcmFunction)) {
      return qcmFunction
    }
    // 2. Si une fonction est explicitement sélectionnée, l'utiliser
    if (selectedFunction) {
      return selectedFunction
    }
    
    // 3. Si c'est une racine spéciale, utiliser le mapping
    if (specialRoot) {
      return SPECIAL_ROOT_TO_FUNCTION[specialRoot] || null
    }
    
    // 4. I64 de passage ou cadence (V64 / cad64) → D
    if (degree === 'I' && chord.figure === '64' && (chord.sixFourVariant === 'passing' || chord.sixFourVariant === 'cadential')) {
      return 'D'
    }
    // 5. Si c'est un degré, utiliser le mapping (prendre la première fonction si plusieurs)
    if (degree) {
      const functions = DEGREE_TO_FUNCTIONS[degree] || []
      return functions.length > 0 ? functions[0] : null
    }
    
    // 6. Réponse QCM avec accord (qcmAnswer) : dériver la fonction depuis la chaîne (ex. "I5" → T, "cad6/4" → D)
    if (qcmAnswer) {
      return getFunctionFromQcmAnswer(qcmAnswer)
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
    const { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, sixFourVariant } = chord
    
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
    
    // I64 dépendant du contexte : V64 (passage), cad64 (cadence), I64 (avancé)
    const isI64 = degree === 'I' && figure === '64'
    const displayDegreeRaw = isI64 && sixFourVariant === 'passing' ? 'V' : isI64 && sixFourVariant === 'cadential' ? 'cad' : degree
    const displayDegree = displayDegreeRaw === 'cad' ? 'Cad.' : getDegreeLabel(displayDegreeRaw, degreeMode)
    const hasDiminished = displayDegree.includes('°')
    const degreeWithoutSymbol = displayDegree.replace('°', '').trim()
    
    let finalQuality = quality
    if (hasDiminished && displayDegreeRaw !== 'cad') {
      if (!quality || quality === '°') {
        finalQuality = '°'
      }
    } else if (!quality) {
      finalQuality = ''
    }
    
    return {
      degree: degreeWithoutSymbol,
      accidental: displayDegreeRaw !== 'cad' ? (accidental === 'b' ? '♭' : accidental === '#' ? '♯' : accidental === 'natural' ? '♮' : '') : '',
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
    navigate(returnTo || '/student-dashboard')
  }

  const handleBackToDashboard = () => {
    navigate(returnTo || '/student-dashboard')
  }

  const handleSegmentClick = (segmentIndex) => {
    if (mode === 'review') {
      setSelectedSegmentIndex(segmentIndex)
      // Positionner la vidéo au début du segment (sécurisé : lecteur peut être indisponible)
      if (playerRef.current && chordSegments[segmentIndex]) {
        const segment = chordSegments[segmentIndex]
        try {
          playerRef.current.seekTo(segment.startTime, true)
          setCurrentTime(segment.startTime)
          currentTimeRef.current = segment.startTime
        } catch (e) {
          console.warn('Player: seekTo indisponible', e?.message)
        }
      }
    }
  }

  // Mode Review : un seul layout pour libre et parcours (vidéo floutée, overlay, carte feedback, timeline)
  if (mode === 'review') {
    const segIdx = selectedSegmentIndex != null && chordSegments[selectedSegmentIndex] ? selectedSegmentIndex : 0
    const validation = answerValidations[segIdx]
    const userAnswer = userAnswers[segIdx]
    const markerSeg = exercise.markers[segIdx]
    const correctAnswer = markerSeg && typeof markerSeg === 'object' && markerSeg.chord ? markerSeg.chord : null
    const codexEntriesSeg = (validation?.level === 0 || validation?.level === 0.5 || validation?.level === 2 || validation?.level === 3) && correctAnswer ? getCodexEntriesForCorrection(correctAnswer, nodeId) : []
    const codexEntrySeg = codexEntriesSeg.length > 0 ? codexEntriesSeg[0] : null
    const isSegLocked = exerciseMode === 'parcours' && isSegmentLockedByParcours(segIdx)

    return (
      <div className="player-immersive player-review-integrated">
        {newlyUnlockedBadges.length > 0 && (
          <div className="player-badge-unlocked-banner" role="alert">
            <div className="player-badge-unlocked-content">
              <span className="player-badge-unlocked-title">
                {newlyUnlockedBadges.length === 1 ? 'Badge débloqué' : `${newlyUnlockedBadges.length} badges débloqués`}
              </span>
              <div className="player-badge-unlocked-list">
                {newlyUnlockedBadges.map((b) => (
                  <span key={b.id} className="player-badge-unlocked-item">
                    <span className="player-badge-unlocked-emoji">{b.emoji}</span>
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
            </div>
            <button type="button" className="player-badge-unlocked-dismiss" onClick={() => setNewlyUnlockedBadges([])} aria-label="Fermer">×</button>
          </div>
        )}
        <div className="player-video-zone player-review-integrated-video-zone">
          <div className="player-video-zone-actions">
            <button className="player-quit-btn" onClick={handleQuitExercise} aria-label="Quitter l'exercice">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Quitter</span>
            </button>
          </div>
          <div className="player-video-wrapper player-review-integrated-video-blur" style={{ pointerEvents: 'none' }}>
            <YouTube videoId={videoId} opts={opts} onReady={handleReady} onStateChange={handleStateChange} className="player-youtube" />
          </div>
          <div className="player-review-integrated-overlay" style={{ pointerEvents: 'auto' }}>
            <div className="player-review-integrated-score">
              {calculateScores.perfectCount + calculateScores.partialCount}/{calculateScores.totalCount} • {calculateScores.scorePercentage}%
            </div>
            {chordSegments[segIdx] && (
              isSegLocked && !userAnswer ? (
                <div className="player-feedback-card player-feedback-card--level-0">
                  <p className="player-feedback-card-message">Cet accord n&apos;était pas à remplir dans ce niveau.</p>
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
                      Cadence : vous avez indiqué <strong>{cadenceLabelsMap[userAnswer.cadence] || userAnswer.cadence}</strong>, la solution est <strong>{cadenceLabelsMap[correctAnswer.cadence] || correctAnswer.cadence}</strong>.
                    </p>
                  )}
                  {(validation?.score != null) && (
                    <p className="player-feedback-card-xp">
                      {validation.score}% XP{validation.cadenceBonus > 0 ? ` + ${validation.cadenceBonus}% bonus cadence` : ''}
                    </p>
                  )}
                  {codexEntrySeg && (
                    <button type="button" className="player-feedback-card-codex" onClick={() => navigate(`/student-dashboard?tab=codex&fiche=${codexEntrySeg.id}`)}>
                      Revoir la fiche : {codexEntrySeg.title}
                    </button>
                  )}
                </div>
              )
            )}
          </div>
          <div className={`player-timeline-overlay player-review-integrated-timeline ${getCadencesForBrace.length > 0 ? 'player-timeline-overlay-has-cadences' : ''}`}>
            {getCadencesForBrace.length > 0 && (
              <div className="player-timeline-cadence-braces player-timeline-cadence-braces-review">
                {getCadencesForBrace.map((cadence, idx) => {
                  if (cadence.startMarker === null || cadence.endMarker === null) return null
                  const startSegment = chordSegments[cadence.startMarker]
                  const endSegment = chordSegments[cadence.endMarker]
                  if (!startSegment || !endSegment) return null
                  const X = chordSegments.length
                  const leftPos = isMobile ? (cadence.startMarker / X) * 100 : startSegment.startPos
                  const width = isMobile ? ((cadence.endMarker - cadence.startMarker + 1) / X) * 100 : (endSegment.endPos - startSegment.startPos)
                  const braceClass = cadence.cadenceExpected && cadence.cadenceCorrect === true ? 'player-timeline-cadence-brace player-cadence-brace-correct' : cadence.cadenceExpected && cadence.cadenceCorrect === false ? 'player-timeline-cadence-brace player-cadence-brace-incorrect' : 'player-timeline-cadence-brace'
                  return (
                    <div key={idx} className={braceClass} style={{ left: `${leftPos}%`, width: `${width}%` }}>
                      <div className="player-timeline-cadence-brace-bar" />
                      <div className="player-timeline-cadence-brace-label">{cadence.cadenceLabel}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <div
              ref={timelineRef}
              className={`player-timeline-with-segments player-review-timeline${isMobile ? ' player-timeline-equal-width' : ''}`}
              style={chordSegments.length && !isMobile ? { minWidth: `max(100%, ${chordSegments.length * 72}px)` } : undefined}
            >
              {currentTime >= startTime && currentTime <= endTime && playheadPositionPercent != null && (
                <div className="player-timeline-playhead" style={{ left: `${playheadPositionPercent}%`, willChange: 'left' }}>
                  <div className="player-timeline-playhead-indicator"></div>
                </div>
              )}
              {chordSegments.map((segment) => {
                const val = answerValidations[segment.index]
                const isCorrect = val && val.level === 1
                const isIncorrect = val && val.level === 0
                const isPartial = val && (val.level === 0.5 || val.level === 2 || val.level === 3)
                const isSelected = selectedSegmentIndex === segment.index
                const segLocked = isSegmentLockedByParcours(segment.index)
                let chordToDisplay = segment.chord
                const m = exercise.markers[segment.index]
                const correct = m && typeof m === 'object' && m.chord ? m.chord : null
                if (isIncorrect || isPartial) { if (correct) chordToDisplay = correct }
                else if (segLocked && correct) chordToDisplay = correct
                const chordLabel = formatChordLabel(chordToDisplay)
                const qcmText = (progressionMode === 'qcm' && chordToDisplay && ('qcmAnswer' in chordToDisplay || 'function' in chordToDisplay)) ? (chordToDisplay.qcmAnswer ?? chordToDisplay.function ?? null) : null
                const showIntuition = progressionMode === 'functions'
                const tlFunc = showIntuition && chordToDisplay ? getChordFunction(chordToDisplay) : null
                const fullText = chordToDisplay ? (chordToDisplay.degree || chordToDisplay.specialRoot ? formatChordDetailed(chordToDisplay) : (chordToDisplay.selectedFunction && PRIMARY_DEGREES[chordToDisplay.selectedFunction] ? (PRIMARY_DEGREES[chordToDisplay.selectedFunction][0] || formatChordDetailed(chordToDisplay)) : formatChordDetailed(chordToDisplay))) : ''
                let validationClass = ''
                if (isCorrect) validationClass = 'player-chord-segment-correct'
                else if (isIncorrect) validationClass = 'player-chord-segment-incorrect'
                else if (isPartial) validationClass = 'player-chord-segment-partial'
                const isLastSeg = segment.index === markers.length - 1
                const givenNotToFill = segLocked && (chordLabel || qcmText)
                const segW = isMobile && chordSegments.length > 0 ? (100 / chordSegments.length) : segment.width
                const segL = isMobile && chordSegments.length > 0 ? (segment.index / chordSegments.length) * 100 : segment.startPos
                return (
                  <div
                    key={segment.index}
                    className={`player-chord-segment player-review-segment ${validationClass} ${isSelected ? 'player-segment-selected' : ''} ${isLastSeg && !isMobile ? 'player-chord-segment-last' : ''} ${givenNotToFill ? 'player-chord-segment-given' : ''} ${showIntuition ? 'player-chord-segment-intuition' : ''}`}
                    style={{ left: `${segL}%`, ...(isLastSeg && !isMobile ? {} : { width: `${segW}%` }) }}
                    onClick={(e) => { e.stopPropagation(); handleSegmentClick(segment.index); setSelectedSegmentIndex(segment.index) }}
                  >
                    <div className="player-chord-segment-content">
                      {showIntuition && tlFunc ? (
                        <>
                          <span className={`player-chord-function ${tlFunc === 'T' ? 'player-chord-function-t' : tlFunc === 'SD' ? 'player-chord-function-sd' : 'player-chord-function-d'}`}>{tlFunc}</span>
                          {fullText && <span className="player-chord-segment-full-hint">{fullText}</span>}
                        </>
                      ) : qcmText ? (
                        ['T', 'SD', 'D'].includes(qcmText) ? (
                          <span className={`player-chord-function ${qcmText === 'T' ? 'player-chord-function-t' : qcmText === 'SD' ? 'player-chord-function-sd' : 'player-chord-function-d'}`}>{qcmText}</span>
                        ) : (
                          <div className="player-chord-label"><span className="player-chord-degree">{qcmText}</span></div>
                        )
                      ) : chordLabel ? (
                        chordLabel.isFunctionOnly ? (
                          <span className={`player-chord-function ${chordLabel.function === 'T' ? 'player-chord-function-t' : chordLabel.function === 'SD' ? 'player-chord-function-sd' : 'player-chord-function-d'}`}>{chordLabel.function}</span>
                        ) : (
                          <div className="player-chord-label"><ChordLabel chord={chordToDisplay} /></div>
                        )
                      ) : (
                        <div className="player-chord-empty"><span className="player-chord-empty-icon">?</span></div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="player-control-zone bg-zinc-900/80 backdrop-blur-xl border-t border-white/5">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { if (playerRef.current && exercise) { playerRef.current.seekTo(startTime, true); setCurrentTime(startTime); currentTimeRef.current = startTime; setSelectedMarkerId(null) } }} className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95" title="Revenir au début de l'extrait">
              <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </button>
            <button onClick={() => { const currentPos = currentTimeRef.current || currentTime; const prevIndex = findPreviousMarker(currentPos); if (prevIndex !== null) { handleSeekToMarker(prevIndex); setSelectedSegmentIndex(prevIndex) } else if (playerRef.current && exercise) { playerRef.current.seekTo(startTime, true); setCurrentTime(startTime); currentTimeRef.current = startTime; setSelectedSegmentIndex(0) } }} className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95" title="Marqueur précédent">
              <SkipBack className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </button>
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10">
                <div className="text-lg md:text-xl font-mono text-white font-bold text-center">{formatRelativeTime(currentTime)}</div>
              </div>
              <button onClick={handlePlayPause} className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-4 border-white/10 shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all duration-200 flex items-center justify-center active:scale-95" title="Play/Pause (Espace)" aria-label={isPlaying ? 'Pause' : 'Lecture'}>
                {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 text-white" /> : <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />}
              </button>
            </div>
            <button onClick={() => { const currentPos = currentTimeRef.current || currentTime; const nextIndex = findNextMarker(currentPos); if (nextIndex !== null) { handleSeekToMarker(nextIndex); setSelectedSegmentIndex(nextIndex) } else if (markers.length > 0) { handleSeekToMarker(0); setSelectedSegmentIndex(0) } else if (playerRef.current && exercise) { playerRef.current.seekTo(endTime, true); setCurrentTime(endTime); currentTimeRef.current = endTime } }} className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95" title="Marqueur suivant">
              <SkipForward className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </button>
            <button onClick={handleReplay} className="player-review-integrated-btn-replay rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all duration-200 active:scale-95 flex items-center justify-center" aria-label="Rejouer l'exercice" title="Rejouer l'exercice">
              {isMobile ? <RotateCcw className="w-6 h-6" /> : 'Rejouer'}
            </button>
            {exerciseMode === 'parcours' && (
              <button onClick={handleNextLevel} className="player-review-integrated-btn-next rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 text-white font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center" aria-label="Niveau suivant" title="Niveau suivant">
                {isMobile ? <SkipForward className="w-6 h-6" /> : 'Niveau suivant'}
              </button>
            )}
            <button onClick={handleBackToDashboard} className="player-review-integrated-btn-back rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 text-white font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center" aria-label="Retour au tableau de bord" title="Retour au tableau de bord">
              {isMobile ? <Home className="w-6 h-6" /> : 'Retour Dashboard'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mode Exercise : Interface normale
  return (
    <div className="player-immersive">
      {/* Zone Vidéo (Haut - 80-85%) avec Timeline superposée */}
      <div className="player-video-zone">
        {/* Bouton Quitter masqué quand la modale accord (QCM/intuition/complet) est ouverte pour ne pas superposer la croix de fermeture */}
        <div className="player-video-zone-actions">
          {!isModalOpen && (
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
          )}
          {showOnboarding && (
            <div className="player-onboarding-overlay" onClick={handleOnboardingClick}>
              <div className="player-onboarding-content">
                <p>Cliquez sur les cases pour identifier les accords</p>
              </div>
            </div>
          )}
        </div>
        <div className="player-video-wrapper">
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={handleReady}
              onStateChange={handleStateChange}
              className="player-youtube"
            />
          </div>
        {/* Overlay qui reçoit tous les clics (iframe en pointer-events: none) : zone quit → quit, reste → play/pause */}
        <div
          ref={videoZoneOverlayRef}
          className="player-video-tap-overlay"
          onClick={handleVideoZoneTap}
          aria-hidden
        />

        {/* Timeline avec cases superposée sur la vidéo */}
        <div className={`player-timeline-overlay ${getCadencesForBrace.length > 0 ? 'player-timeline-overlay-has-cadences' : ''}`}>
          {/* Accolades de cadences au-dessus de la timeline (comme en mode édition prof) */}
          {getCadencesForBrace.length > 0 && (
            <div className="player-timeline-cadence-braces">
              {getCadencesForBrace.map((cadence, idx) => {
                if (cadence.startMarker === null || cadence.endMarker === null) return null
                const startSegment = chordSegments[cadence.startMarker]
                const endSegment = chordSegments[cadence.endMarker]
                if (!startSegment || !endSegment) return null
                const X = chordSegments.length
                const leftPos = isMobile ? (cadence.startMarker / X) * 100 : startSegment.startPos
                const width = isMobile ? ((cadence.endMarker - cadence.startMarker + 1) / X) * 100 : (endSegment.endPos - startSegment.startPos)
                return (
                  <div
                    key={idx}
                    className="player-timeline-cadence-brace"
                    style={{ left: `${leftPos}%`, width: `${width}%` }}
                  >
                    <div className="player-timeline-cadence-brace-bar" />
                    <div className="player-timeline-cadence-brace-label">
                      {cadence.cadenceLabel}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div 
            ref={timelineRef}
            className={`player-timeline-with-segments${isMobile ? ' player-timeline-equal-width' : ''}`}
            style={chordSegments.length && !isMobile ? { minWidth: `max(100%, ${chordSegments.length * 72}px)` } : undefined}
            onClick={(e) => {
              if (!playerRef.current || !exercise) return
              const el = e.currentTarget
              const rect = el.getBoundingClientRect()
              const scrollLeft = el.scrollLeft || 0
              const scrollWidth = el.scrollWidth || rect.width
              const x = e.clientX - rect.left + scrollLeft
              const percentage = Math.max(0, Math.min(100, (x / scrollWidth) * 100))
              let time
              if (isMobile && chordSegments.length > 0) {
                const X = chordSegments.length
                const i = Math.min(X - 1, Math.max(0, Math.floor((percentage / 100) * X)))
                const q = ((percentage / 100) * X) % 1
                const seg = chordSegments[i]
                const segDuration = seg.endTime - seg.startTime
                time = seg.startTime + q * segDuration
              } else {
                time = startTime + (percentage / 100) * (endTime - startTime)
              }
              playerRef.current.seekTo(time, true)
              setCurrentTime(time)
              currentTimeRef.current = time
            }}
          >
            {/* Curseur de lecture */}
            {currentTime >= startTime && currentTime <= endTime && playheadPositionPercent != null && (
              <div
                className="player-timeline-playhead"
                style={{ 
                  left: `${playheadPositionPercent}%`,
                  willChange: 'left'
                }}
              >
                <div className="player-timeline-playhead-indicator"></div>
              </div>
            )}

            {/* Cases d'accords */}
            {chordSegments.map((segment) => {
              const chordLabel = formatChordLabel(segment.chord)
              const qcmAnswerText = (progressionMode === 'qcm' && segment.chord && ('qcmAnswer' in segment.chord || 'function' in segment.chord))
                ? (segment.chord.qcmAnswer ?? segment.chord.function ?? null)
                : null
              const chordFunction = getChordFunction(segment.chord)
              const isNext = nextMarkerIndex === segment.index
              const isLocked = isSegmentLockedByParcours(segment.index)
              
              // Obtenir la validation et la solution correcte si on est en mode validation
              const validation = isValidating || animatedChords.has(segment.index) ? answerValidations[segment.index] : null
              const isCorrect = validation && validation.level === 1
              const isIncorrect = validation && validation.level === 0
              const isAnimated = animatedChords.has(segment.index)
              
              // Obtenir la solution correcte (scope visible pour tout le segment, dont ChordLabel plus bas)
              let correctAnswerLabel = null
              let correctAnswerForDisplay = null
              if (isValidating || isAnimated) {
                const marker = exercise.markers[segment.index]
                const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
                correctAnswerForDisplay = correctAnswer
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
                } else if (validation && (validation.level === 0.5 || validation.level === 2 || validation.level === 3)) {
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
                functionColorClasses = (segment.isAnswered || qcmAnswerText)
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
              
              const segmentWidthPercent = isMobile && chordSegments.length > 0 ? (100 / chordSegments.length) : segment.width
              const segmentLeftPercent = isMobile && chordSegments.length > 0 ? (segment.index / chordSegments.length) * 100 : segment.startPos
              const segmentStyle = isMobile || !isLastSegment
                ? { left: `${segmentLeftPercent}%`, width: `${segmentWidthPercent}%` }
                : { left: `${segmentLeftPercent}%` }
              return (
                <div
                  key={segment.index}
                  className={`player-chord-segment ${functionColorClasses} ${validationClass} ${isNext && !segment.isAnswered && !isValidating ? 'player-chord-segment-next' : ''} ${isLastSegment && !isMobile ? 'player-chord-segment-last' : ''} ${isAnimated ? 'player-chord-segment-animated' : ''} ${isLocked ? 'player-chord-segment-locked' : ''}`}
                  style={segmentStyle}
                  onClick={(e) => {
                    if (!isValidating && !isLocked) {
                      e.stopPropagation()
                      const hasValidation = answerValidations[segment.index]
                      // En mode QCM : toujours ouvrir la modale au clic pour pouvoir remplir ou modifier l'accord (comme en mode intuition)
                      if (progressionMode === 'qcm') {
                        setSegmentTooltipIndex(null)
                        handleMarkerClick(segment.index)
                      } else if (hasValidation) {
                        setSegmentTooltipIndex((prev) => (prev === segment.index ? null : segment.index))
                      } else {
                        setSegmentTooltipIndex(null)
                        handleMarkerClick(segment.index)
                      }
                    }
                  }}
                >
                  <div className="player-chord-segment-body">
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
                          <>
                            <span className={`player-chord-function ${
                              correctAnswerLabel.function === 'T' ? 'player-chord-function-t' :
                              correctAnswerLabel.function === 'SD' ? 'player-chord-function-sd' :
                              'player-chord-function-d'
                            }`}>
                              {correctAnswerLabel.function}
                            </span>
                            {(() => {
                              const marker = exercise.markers[segment.index]
                              const correctAnswer = typeof marker === 'object' && marker.chord ? marker.chord : null
                              const principalDegree = correctAnswer?.selectedFunction && PRIMARY_DEGREES[correctAnswer.selectedFunction] ? PRIMARY_DEGREES[correctAnswer.selectedFunction][0] : null
                              return principalDegree ? <span className="player-chord-segment-full-hint"> ({principalDegree})</span> : null
                            })()}
                          </>
                        ) : (
                          <div className="player-chord-label">
                            <ChordLabel chord={correctAnswerForDisplay} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contenu de l'accord */}
                  <div className="player-chord-segment-content">
                    {qcmAnswerText ? (
                      ['T', 'SD', 'D'].includes(qcmAnswerText) ? (
                        <span className={`player-chord-function ${
                          qcmAnswerText === 'T' ? 'player-chord-function-t' :
                          qcmAnswerText === 'SD' ? 'player-chord-function-sd' :
                          'player-chord-function-d'
                        }`}>
                          {qcmAnswerText}
                        </span>
                      ) : (
                        <div className="player-chord-label">
                          <span className="player-chord-degree">{qcmAnswerText}</span>
                        </div>
                      )
                    ) : chordLabel ? (
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
                            <ChordLabel chord={segment.chord} />
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
                </div>
              )
            })}
          </div>
        </div>
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

          {/* Bouton pour ouvrir la modale de l'accord actuel (désactivé si accord non débloqué en mode parcours) */}
          {findCurrentChordSegment && (
            <button
              onClick={handleOpenCurrentChordModal}
              disabled={isSegmentLockedByParcours(findCurrentChordSegment.index)}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border border-white/10 transition-all duration-200 flex items-center justify-center active:scale-95 ${isSegmentLockedByParcours(findCurrentChordSegment.index) ? 'bg-zinc-700 cursor-not-allowed opacity-60' : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:border-white/20 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'}`}
              title={isSegmentLockedByParcours(findCurrentChordSegment.index) ? "Accord non débloqué dans ce parcours" : "Remplir l'accord actuel (Entrée)"}
              aria-label={isSegmentLockedByParcours(findCurrentChordSegment.index) ? "Accord non débloqué" : "Ouvrir le sélecteur d'accord pour l'accord actuel"}
            >
              <Pencil className={`w-5 h-5 md:w-6 md:h-6 ${isSegmentLockedByParcours(findCurrentChordSegment.index) ? 'text-zinc-400' : 'text-white'}`} />
            </button>
          )}

          {/* Bouton Terminer (toutes les questions débloquées remplies en parcours, ou tous les accords en libre) */}
          {canShowFinishButton && (
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

      {/* Modale Flottante de Saisie d'Accord (ChordSelectorModal : intuition, QCM ou maîtrise) */}
      <ChordSelectorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onValidate={handleChordValidate}
        initialChord={userAnswers[currentMarkerIndex] || null}
        studentMode={true}
        progressionMode={progressionMode}
        parcoursContext={parcoursContext}
        expectedCadence={expectedCadence}
        currentQuestion={currentMarkerIndex + 1}
        totalQuestions={totalMarkers}
        embedded={true}
        qcmCorrectChord={progressionMode === 'qcm' && exercise?.markers?.[currentMarkerIndex] && typeof exercise.markers[currentMarkerIndex] === 'object' && exercise.markers[currentMarkerIndex].chord ? exercise.markers[currentMarkerIndex].chord : null}
        qcmAllChords={progressionMode === 'qcm' ? qcmAllChords : null}
        qcmQuestionId={progressionMode === 'qcm' ? currentMarkerIndex : null}
        nodeProgress={progressionMode === 'qcm' ? nodeStatsForQCM : null}
      />
      
      {/* Tooltip au tap sur un segment : même carte feedback que mode libre (message, comparaison, cadence, XP, codex) */}
      {segmentTooltipIndex !== null && chordSegments[segmentTooltipIndex] && exercise?.markers?.[segmentTooltipIndex] && (() => {
        const validation = answerValidations[segmentTooltipIndex]
        const marker = exercise.markers[segmentTooltipIndex]
        const correctChord = typeof marker === 'object' && marker.chord ? marker.chord : null
        const userAnswerSeg = userAnswers[segmentTooltipIndex]
        if (!validation) return null
        const codexEntriesSeg = (validation.level === 0 || validation.level === 0.5 || validation.level === 2 || validation.level === 3) && correctChord ? getCodexEntriesForCorrection(correctChord, nodeId) : []
        const codexEntrySeg = codexEntriesSeg.length > 0 ? codexEntriesSeg[0] : null
        return (
          <div className="player-segment-tooltip" role="tooltip" aria-live="polite">
            <div className={`player-feedback-card player-feedback-card--level-${validation.level ?? 0}`}>
              <p className="player-feedback-card-message">{validation.feedback ?? '—'}</p>
              <div className="player-feedback-card-comparison">
                <div className="player-feedback-card-row">
                  <span className="player-feedback-card-label">Votre réponse</span>
                  <span className="player-feedback-card-value">
                    {userAnswerSeg ? <ChordLabel chord={userAnswerSeg} /> : 'Non répondu'}
                  </span>
                </div>
                <div className="player-feedback-card-row">
                  <span className="player-feedback-card-label">Solution</span>
                  <span className="player-feedback-card-value">
                    {correctChord ? <ChordLabel chord={correctChord} /> : '—'}
                  </span>
                </div>
              </div>
              {correctChord?.cadence && userAnswerSeg?.cadence && normalizeCadence(userAnswerSeg.cadence) !== normalizeCadence(correctChord.cadence) && (
                <p className="player-feedback-card-cadence">
                  Cadence : vous avez indiqué <strong>{cadenceLabelsMap[userAnswerSeg.cadence] || userAnswerSeg.cadence}</strong>, la solution est <strong>{cadenceLabelsMap[correctChord.cadence] || correctChord.cadence}</strong>.
                </p>
              )}
              {(validation.score != null) && (
                <p className="player-feedback-card-xp">
                  {validation.score}% XP{validation.cadenceBonus > 0 ? ` + ${validation.cadenceBonus}% bonus cadence` : ''}
                </p>
              )}
              {codexEntrySeg && (
                <button type="button" className="player-feedback-card-codex" onClick={() => navigate(`/student-dashboard?tab=codex&fiche=${codexEntrySeg.id}`)}>
                  Revoir la fiche : {codexEntrySeg.title}
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default Player

