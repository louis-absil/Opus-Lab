import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import YouTube from 'react-youtube'
import ChordSelectorModal from '../ChordSelectorModal'
import VideoCockpit from '../VideoCockpit'
import SaveExerciseModal from '../components/SaveExerciseModal'
import ConfirmExitModal from '../components/ConfirmExitModal'
import VideoImport from '../components/VideoImport'
import PWAInstallPrompt from '../components/PWAInstallPrompt'
import { useAuth } from '../contexts/AuthContext'
import { getExerciseById, createExercise, updateExercise } from '../services/exerciseService'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Plus,
  X,
  Save,
  LogIn,
  ArrowLeft,
  Flag,
  RotateCcw
} from 'lucide-react'
import { DEGREE_TO_FUNCTIONS } from '../utils/riemannFunctions'
import ChordLabel from '../components/ChordLabel'

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
  const [showVideoSearch, setShowVideoSearch] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [loading, setLoading] = useState(!!id)
  const [exerciseId, setExerciseId] = useState(id || null)
  const [isConfirmExitModalOpen, setIsConfirmExitModalOpen] = useState(false)
  const [lastSavedState, setLastSavedState] = useState(null) // État sauvegardé pour comparaison
  const [isDraggingTime, setIsDraggingTime] = useState(null) // 'in' | 'out' | 'marker-{index}' | null
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [draggingMarkerIndex, setDraggingMarkerIndex] = useState(null)
  const [loadedAutoTags, setLoadedAutoTags] = useState([])
  const [loadedSection, setLoadedSection] = useState(null)
  const [loadedMusicCategory, setLoadedMusicCategory] = useState(null)
  
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const currentTimeRef = useRef(0)
  const timelineRef = useRef(null)
  const chordRibbonRef = useRef(null)
  const inTimerRef = useRef(null)
  const outTimerRef = useRef(null)
  const fadeIntervalRef = useRef(null)

  // Charger l'exercice existant si on est en mode édition
  useEffect(() => {
    if (id && user) {
      loadExercise(id)
    } else if (id && !user) {
      navigate('/')
    }
  }, [id, user])

  // Détecter les partages depuis Web Share Target (Android PWA)
  useEffect(() => {
    // Parser les query params depuis l'URL (HashRouter ne gère pas query params dans hash)
    const urlParams = new URLSearchParams(window.location.search)
    const sharedUrl = urlParams.get('url') || urlParams.get('text')
    
    if (sharedUrl) {
      // Extraire l'ID YouTube de l'URL partagée
      const videoIdFromShare = extractVideoId(sharedUrl)
      
      // Vérifier si c'est une URL YouTube valide (extractVideoId retourne l'ID ou l'URL originale)
      const isValidYouTubeUrl = /(?:youtube\.com|youtu\.be)/.test(sharedUrl)
      
      if (isValidYouTubeUrl && videoIdFromShare && videoIdFromShare.length === 11) {
        // Charger la vidéo automatiquement
        setVideoId(videoIdFromShare)
        setIsEditingUrl(false)
        setShowVideoSearch(false)
        
        // Nettoyer les paramètres d'URL après traitement
        window.history.replaceState({}, '', window.location.pathname + window.location.hash)
        
        // Afficher un message de confirmation
        setSaveMessage({ 
          type: 'success', 
          text: 'Vidéo reçue depuis le partage !' 
        })
        setTimeout(() => setSaveMessage(null), 3000)
      } else if (sharedUrl && !isValidYouTubeUrl) {
        // Si ce n'est pas une URL YouTube valide
        setSaveMessage({ 
          type: 'error', 
          text: 'L\'URL partagée ne semble pas être une vidéo YouTube valide' 
        })
        setTimeout(() => setSaveMessage(null), 3000)
        window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      }
    }
  }, [])

  const loadExercise = async (exerciseId) => {
    try {
      setLoading(true)
      const exercise = await getExerciseById(exerciseId)
      
      if (!exercise) {
        setSaveMessage({ type: 'error', text: 'Exercice introuvable' })
        setTimeout(() => navigate('/'), 2000)
        return
      }

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
      setLoadedAutoTags(exercise.autoTags && Array.isArray(exercise.autoTags) ? [...exercise.autoTags] : [])
      setLoadedSection(exercise.metadata?.section ?? null)
      setLoadedMusicCategory(exercise.metadata?.musicCategory ?? null)
      setIsEditingUrl(false)
      setShowVideoSearch(false)
      
      // Sauvegarder l'état initial comme état sauvegardé
      const loadedMarkers = exercise.markers ? exercise.markers.map(m => m.time) : []
      const loadedChordData = {}
      if (exercise.markers) {
        exercise.markers.forEach((marker, index) => {
          if (marker.chord) {
            loadedChordData[index] = marker.chord
          }
        })
      }
      setLastSavedState({
        markers: loadedMarkers,
        chordData: loadedChordData,
        startTime: exercise.settings?.startTime || 0,
        endTime: exercise.settings?.endTime || 60,
        videoId: exercise.video?.id || ''
      })
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

  // Gestion des changements d'état du lecteur YouTube
  const handleStateChange = (event) => {
    if (!playerRef.current) return
    
    const state = event.data
    // YouTube.PlayerState.PLAYING = 1
    // YouTube.PlayerState.PAUSED = 2
    // YouTube.PlayerState.ENDED = 0
    
    if (state === 1) { // PLAYING
      // Si la lecture démarre depuis le bouton YouTube natif
      if (!isPlaying) {
        setIsPlaying(true)
        
        // Vérifier si on est avant le début de l'extrait ou après la fin
        try {
          const currentTime = playerRef.current.getCurrentTime()
          
          // Si on est avant le début ou après la fin, aller au début de l'extrait
          if (currentTime < startTime || currentTime >= endTime) {
            playerRef.current.seekTo(startTime, true)
            setCurrentTime(startTime)
            currentTimeRef.current = startTime
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du temps:', error)
        }
      }
    } else if (state === 2 || state === 0) { // PAUSED ou ENDED
      // Si la lecture s'arrête, synchroniser l'état React
      if (isPlaying) {
        setIsPlaying(false)
      }
      
      // Si la vidéo est terminée, s'assurer qu'on est à la fin de l'extrait
      if (state === 0) {
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

  useEffect(() => {
    if (!isPlaying && window.editorFadeIntervals) {
      window.editorFadeIntervals.forEach(({ cleanup }) => {
        if (cleanup) cleanup()
      })
      window.editorFadeIntervals = []
    }
  }, [isPlaying])

  // Suivi du temps pendant la lecture avec requestAnimationFrame pour une animation fluide
  useEffect(() => {
    let animationFrameId = null
    let isRunning = true
    const fadeDuration = 0.5 // Durée du fade out en secondes
    
    const updateTime = () => {
      if (!isRunning || !isPlaying || !playerRef.current) {
        return
      }
      
        try {
          const time = playerRef.current.getCurrentTime()
          // Si le temps lu est très différent de ce qu'on attend (après un seek), ignorer cette frame
          // pour éviter de détecter immédiatement la fin après un seek
          const expectedTime = currentTimeRef.current || time
          if (Math.abs(time - expectedTime) > 1 && expectedTime < startTime + 0.5) {
            // Probablement un temps obsolète après un seek, attendre la prochaine frame
            animationFrameId = requestAnimationFrame(updateTime)
            return
          }
          currentTimeRef.current = time
          setCurrentTime(time)

        // Gérer le fade out avant la fin
        const timeUntilEnd = endTime - time
        if (timeUntilEnd <= fadeDuration && timeUntilEnd > 0) {
          // Fade out progressif
          const fadeOutProgress = 1 - (timeUntilEnd / fadeDuration)
          const volume = Math.max(0, 100 - (fadeOutProgress * 100))
          if (playerRef.current) {
            playerRef.current.setVolume(volume)
          }
        } else if (timeUntilEnd > fadeDuration && !fadeIntervalRef.current) {
          // S'assurer que le volume est à 100% pendant la lecture normale (après le fade in)
          // MAIS ne pas écraser un fade in en cours
          if (playerRef.current && !fadeIntervalRef.current) {
            playerRef.current.setVolume(100)
          }
        }

          if (time >= endTime) {
          // Nettoyer les fades en cours
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current)
            fadeIntervalRef.current = null
          }
          // Restaurer le volume à 100% avant de mettre en pause
          playerRef.current.setVolume(100)
            playerRef.current.pauseVideo()
            setIsPlaying(false)
          isRunning = false
        } else {
          animationFrameId = requestAnimationFrame(updateTime)
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du temps:', error)
        if (isRunning && isPlaying) {
          animationFrameId = requestAnimationFrame(updateTime)
        }
      }
    }

    if (isPlaying && playerRef.current) {
      // Nettoyer l'ancien interval si il existe
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isRunning = true
      animationFrameId = requestAnimationFrame(updateTime)
    } else {
      isRunning = false
      // Nettoyer les fades en cours et restaurer le volume
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      if (playerRef.current) {
        playerRef.current.setVolume(100)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      isRunning = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, endTime])

  // Gestion des raccourcis clavier globaux
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
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

  const formatTimeDetailed = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(1)
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`
  }

  // Format du temps relatif (pour le timer général)
  const formatRelativeTime = (seconds) => {
    const relativeTime = Math.max(0, seconds - startTime)
    return formatTimeDetailed(relativeTime)
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
      // Nettoyer les fades en cours
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      // Restaurer le volume à 100% avant de mettre en pause
      playerRef.current.setVolume(100)
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    } else {
      const current = currentTimeRef.current || currentTime
      const fadeDuration = 0.5 // Durée du fade en secondes

      // Si on est en dehors de l'extrait (avant ou après), revenir au début
      if (current < startTime || current >= endTime) {
        // Mettre à jour immédiatement les références de temps AVANT de lancer la lecture
        // pour éviter que updateTime détecte immédiatement la fin
        currentTimeRef.current = startTime
        setCurrentTime(startTime)
        playerRef.current.seekTo(startTime, true)
      }
      
      // Toujours appliquer un fade in au démarrage (comme en mode élève)
      playerRef.current.setVolume(0) // Commencer à volume 0 pour le fade-in
      // Mettre isPlaying à true APRÈS avoir mis à jour le temps pour éviter le conflit
      setIsPlaying(true)
      playerRef.current.playVideo()
      
      // Fade in progressif sur 0.5s (comme en mode élève)
      const fadeInSteps = 10
      const fadeInInterval = (fadeDuration * 1000) / fadeInSteps
      let fadeInStep = 0
      
      fadeIntervalRef.current = setInterval(() => {
        fadeInStep++
        const volume = Math.min(100, (fadeInStep / fadeInSteps) * 100)
        if (playerRef.current) {
          playerRef.current.setVolume(volume)
        }
        if (fadeInStep >= fadeInSteps) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current)
            fadeIntervalRef.current = null
          }
        }
      }, fadeInInterval)
    }
  }

  const handlePlaySelection = () => {
    if (!playerRef.current) return
    
    const fadeDuration = 0.5
    
    playerRef.current.seekTo(startTime, true)
    playerRef.current.setVolume(0)
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
    
    const checkEndInterval = setInterval(() => {
      if (!playerRef.current) {
        clearInterval(checkEndInterval)
        return
      }
      
      try {
        const currentTime = playerRef.current.getCurrentTime()
        const timeUntilEnd = endTime - currentTime
        
        if (timeUntilEnd <= fadeDuration && timeUntilEnd > 0) {
          const fadeOutProgress = 1 - (timeUntilEnd / fadeDuration)
          const volume = Math.max(0, 100 - (fadeOutProgress * 100))
          playerRef.current.setVolume(volume)
        }
        
        if (currentTime >= endTime) {
          playerRef.current.pauseVideo()
          playerRef.current.setVolume(100)
          setIsPlaying(false)
          clearInterval(checkEndInterval)
        }
      } catch (error) {
        console.error('Erreur lors du suivi de la fin:', error)
        clearInterval(checkEndInterval)
      }
    }, 50)
    
    const cleanup = () => {
      clearInterval(fadeInIntervalId)
      clearInterval(checkEndInterval)
      if (playerRef.current) {
        playerRef.current.setVolume(100)
      }
    }
    
    if (!window.editorFadeIntervals) {
      window.editorFadeIntervals = []
    }
    window.editorFadeIntervals.push({ fadeInIntervalId, checkEndInterval, cleanup })
  }

  const handleSeek = (time) => {
    if (!playerRef.current) return
    const wasPlaying = isPlaying
    playerRef.current.seekTo(time, true)
    setCurrentTime(time)
    currentTimeRef.current = time
    // Préserver l'état de lecture : si elle était en lecture, elle continue, sinon elle reste en pause
    if (wasPlaying) {
      // Si elle était en lecture, continuer la lecture après le seek
      playerRef.current.playVideo()
      setIsPlaying(true)
    } else {
      // Si elle était en pause, rester en pause
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    }
  }

  const handleStartTimeChange = (newStartTime) => {
    setStartTime(Math.max(0, Math.min(newStartTime, endTime - 0.1)))
    if (playerRef.current) {
      playerRef.current.seekTo(newStartTime, true)
      // S'assurer que la vidéo reste en pause
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    }
  }

  const handleEndTimeChange = (newEndTime) => {
    setEndTime(Math.max(startTime + 0.1, Math.min(newEndTime, videoDuration || 60)))
    // S'assurer que la vidéo reste en pause
    if (playerRef.current) {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    }
  }

  // Handlers pour le drag sur mobile et desktop
  const handleTimerMouseDown = (e, type, markerIndex = null) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingTime(type)
    setDragStartX(e.clientX || e.touches?.[0]?.clientX || 0)
    if (type === 'in') {
      setDragStartTime(startTime)
    } else if (type === 'out') {
      setDragStartTime(endTime)
    } else if (type.startsWith('marker-') && markerIndex !== null) {
      setDragStartTime(markers[markerIndex])
      setDraggingMarkerIndex(markerIndex)
    }
  }

  const handleTimerMouseMove = useCallback((e) => {
    if (!isDraggingTime) return
    
    const currentX = e.clientX || e.touches?.[0]?.clientX || 0
    const deltaX = currentX - dragStartX
    const sensitivity = 0.1 // secondes par pixel
    const deltaTime = deltaX * sensitivity
    
    if (isDraggingTime === 'in') {
      const newTime = Math.max(0, Math.min(endTime - 0.1, dragStartTime + deltaTime))
      handleStartTimeChange(newTime)
    } else if (isDraggingTime === 'out') {
      const newTime = Math.max(startTime + 0.1, Math.min(videoDuration || 60, dragStartTime + deltaTime))
      handleEndTimeChange(newTime)
    } else if (isDraggingTime.startsWith('marker-') && draggingMarkerIndex !== null) {
      const newTime = Math.max(startTime, Math.min(endTime, dragStartTime + deltaTime))
      const newMarkers = [...markers]
      newMarkers[draggingMarkerIndex] = newTime
      setMarkers(newMarkers.sort((a, b) => a - b))
      if (playerRef.current) {
        playerRef.current.seekTo(newTime, true)
        // S'assurer que la vidéo reste en pause pendant le drag
        playerRef.current.pauseVideo()
        setIsPlaying(false)
      }
    }
  }, [isDraggingTime, dragStartX, dragStartTime, endTime, startTime, videoDuration, draggingMarkerIndex, markers])

  const handleTimerMouseUp = useCallback(() => {
    setIsDraggingTime(null)
    setDraggingMarkerIndex(null)
  }, [])

  useEffect(() => {
    if (isDraggingTime) {
      document.addEventListener('mousemove', handleTimerMouseMove)
      document.addEventListener('mouseup', handleTimerMouseUp)
      document.addEventListener('touchmove', handleTimerMouseMove)
      document.addEventListener('touchend', handleTimerMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleTimerMouseMove)
        document.removeEventListener('mouseup', handleTimerMouseUp)
        document.removeEventListener('touchmove', handleTimerMouseMove)
        document.removeEventListener('touchend', handleTimerMouseUp)
      }
    }
  }, [isDraggingTime, handleTimerMouseMove, handleTimerMouseUp])

  const handleMarkerClick = (index) => {
    setSelectedMarkerId(index)
    setIsModalOpen(true)
    if (playerRef.current) {
      playerRef.current.seekTo(markers[index], true)
      // S'assurer que la vidéo reste en pause
      playerRef.current.pauseVideo()
      setIsPlaying(false)
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

  const handleVideoSelect = (videoData) => {
    setVideoId(videoData.id)
    setVideoTitle(videoData.title)
    const durationParts = videoData.duration.split(':').map(Number)
    const durationSeconds = durationParts.length === 3
      ? durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
      : durationParts.length === 2
      ? durationParts[0] * 60 + durationParts[1]
      : durationParts[0]
    setVideoDuration(durationSeconds || 0)
    setIsEditingUrl(false)
    setShowVideoSearch(false)
  }

  const handleSaveExercise = async (metadata) => {
    if (!user) {
      try {
        await signInWithGoogle()
        setIsSaveModalOpen(true)
      } catch (error) {
        console.error('Erreur lors de la connexion:', error)
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
          difficulty: metadata.difficulty || null,
          ...(metadata.section != null && { section: metadata.section }),
          ...(metadata.musicCategory != null && { musicCategory: metadata.musicCategory })
        },
        autoTags: metadata.autoTags || []
      }

      let savedId
      if (exerciseId && !metadata.saveAsCopy) {
        await updateExercise(exerciseId, exerciseData)
        savedId = exerciseId
      } else {
        savedId = await createExercise(exerciseData)
        setExerciseId(savedId)
        if (!id) {
          navigate(`/editor/${savedId}`, { replace: true })
        }
      }
      
      // Sauvegarder l'état actuel comme état sauvegardé
      setLastSavedState({
        markers: [...markers],
        chordData: { ...chordData },
        startTime,
        endTime,
        videoId: extractedId
      })
      
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
        .catch((error) => {
          console.error('Erreur lors de la connexion:', error)
          if (error.code !== 'auth/popup-closed-by-user') {
            import('../utils/errorHandler').then(({ getAuthErrorMessage }) => {
              alert(getAuthErrorMessage(error))
            })
          }
        })
    } else {
      setIsSaveModalOpen(true)
    }
  }

  // Vérifier s'il y a des modifications non sauvegardées
  const hasUnsavedChanges = () => {
    // Si pas de marqueurs, pas de modifications
    if (markers.length === 0) {
      return false
    }
    
    // Si pas d'état sauvegardé, il y a des modifications
    if (!lastSavedState) {
      return true
    }
    
    // Comparer les marqueurs
    if (markers.length !== lastSavedState.markers.length) {
      return true
    }
    
    // Comparer les temps des marqueurs
    for (let i = 0; i < markers.length; i++) {
      if (Math.abs(markers[i] - lastSavedState.markers[i]) > 0.01) {
        return true
      }
    }
    
    // Comparer les accords
    const currentChordKeys = Object.keys(chordData).sort()
    const savedChordKeys = Object.keys(lastSavedState.chordData).sort()
    if (currentChordKeys.length !== savedChordKeys.length) {
      return true
    }
    
    for (let i = 0; i < currentChordKeys.length; i++) {
      if (currentChordKeys[i] !== savedChordKeys[i]) {
        return true
      }
      // Comparer les objets d'accord (simplifié)
      const currentChord = JSON.stringify(chordData[currentChordKeys[i]])
      const savedChord = JSON.stringify(lastSavedState.chordData[savedChordKeys[i]])
      if (currentChord !== savedChord) {
        return true
      }
    }
    
    // Comparer startTime et endTime
    if (Math.abs(startTime - lastSavedState.startTime) > 0.01 ||
        Math.abs(endTime - lastSavedState.endTime) > 0.01) {
      return true
    }
    
    // Comparer videoId
    const currentVideoId = extractVideoId(videoId) || videoId
    if (currentVideoId !== lastSavedState.videoId) {
      return true
    }
    
    return false
  }

  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setIsConfirmExitModalOpen(true)
    } else {
      navigate('/')
    }
  }

  const handleConfirmExit = () => {
    setIsConfirmExitModalOpen(false)
    navigate('/')
  }

  // La timeline affiche toujours la sélection IN-OUT sur 100% de la largeur
  const selectionDuration = endTime - startTime

  // Formatage des accords pour l'affichage
  // Mapping des racines spéciales vers les fonctions
  const SPECIAL_ROOT_TO_FUNCTION = {
    'N': 'SD',   // Sixte napolitaine → Sous-Dominante
    'It': 'D',   // Sixte italienne → Dominante
    'Fr': 'D',   // Sixte française → Dominante
    'Gr': 'D'    // Sixte allemande → Dominante
  }

  // Fonction pour déterminer la fonction tonale d'un accord
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

  // Fonction pour obtenir le label d'un degré selon le mode
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
    
    // Extraire le degreeMode, avec 'generic' comme défaut seulement si vraiment absent
    // Si l'accord n'a pas de degreeMode, essayer de le récupérer depuis localStorage
    let degreeMode = chord.degreeMode
    if (!degreeMode) {
      const savedMode = localStorage.getItem('chordSelectorDegreeMode')
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
        // Adapter la napolitaine selon le mode
        const napolitaineLabel = getDegreeLabel('II', degreeMode)
        // Extraire le symbole ° si présent
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

  // Trouver les cadences pour l'affichage
  const getCadences = useMemo(() => {
    const cadences = []
    markers.forEach((marker, index) => {
      const chord = chordData[index]
      if (chord?.cadence) {
        cadences.push({
          index,
          cadence: chord.cadence,
          startMarker: index > 0 ? index - 1 : null,
          endMarker: index
        })
      }
    })
    return cadences
  }, [markers, chordData])

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
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Chargement de l'exercice...</p>
        </div>
      </div>
    )
  }

  const extractedId = extractVideoId(videoId) || videoId

  // Afficher VideoSearch si pas de vidéo ou en mode édition
  if (!extractedId || showVideoSearch || (isEditingUrl && !extractedId)) {
  return (
      <div className="h-screen w-screen bg-zinc-950 text-white overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Opus Lab</h1>
                <button 
                onClick={handleBackClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
                </button>
              </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <VideoImport onVideoSelect={handleVideoSelect} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-white flex flex-col">
      {/* Zone HAUT (30%) - Lecteur Vidéo */}
      <div className="flex-shrink-0 h-[30vh] min-h-[200px] max-h-[300px] bg-zinc-900 border-b border-white/5 relative">
        <div className="absolute inset-0">
          <YouTube
            videoId={extractedId}
            opts={opts}
            onReady={handleReady}
            onStateChange={handleStateChange}
            className="w-full h-full"
                />
              </div>
            
        {/* Overlay avec contrôles et infos — en colonne sur mobile pour que Sauvegarder reste visible */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
              <button
                onClick={handleBackClick}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-md transition-colors flex-shrink-0"
                title="Retour au Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="px-3 py-2 sm:px-4 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 min-w-0 flex-1 sm:flex-initial">
                <p className="text-sm font-medium text-white/90 truncate max-w-[140px] sm:max-w-md">{videoTitle || 'Vidéo YouTube'}</p>
              </div>
              <button
                onClick={() => setShowVideoSearch(true)}
                className="px-3 py-2 sm:px-4 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-sm transition-colors flex-shrink-0"
              >
                Changer
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              {user ? (
                <>
                  <span className="hidden sm:inline px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-md text-sm text-white/70 truncate max-w-[120px] md:max-w-none">
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={handleSaveClick}
                    disabled={!extractedId || markers.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span className="text-sm font-semibold">Sauvegarder</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm">Se connecter</span>
                </button>
              )}
            </div>
            </div>
          </div>
        </div>

      {/* Zone MILIEU (40%) - Timeline + Ruban d'Accords (Pas de scroll vertical) */}
      <div className="flex-1 bg-zinc-950 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0 overflow-visible" style={{ paddingBottom: '0' }}>
          {/* Timeline - Affiche toujours IN-OUT sur 100% de la largeur */}
          <div className="relative flex-shrink-0" style={{ zIndex: 1 }}>
            <div 
              ref={timelineRef}
              className="h-20 bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/5 p-4 relative cursor-pointer w-full"
              onClick={(e) => {
                if (!playerRef.current) return
                const rect = e.currentTarget.getBoundingClientRect()
                // Prendre en compte le padding (p-4 = 16px de chaque côté)
                const padding = 16
                const clickX = e.clientX - rect.left - padding
                const availableWidth = rect.width - (padding * 2)
                const percentage = Math.max(0, Math.min(1, clickX / availableWidth))
                const newTime = startTime + (percentage * (endTime - startTime))
                const clampedTime = Math.max(startTime, Math.min(endTime, newTime))
                handleSeek(clampedTime)
              }}
            >
              {/* Ruler avec marqueurs */}
              <div className="relative h-full min-w-full">
                {/* Ligne de temps */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500/30 transform -translate-y-1/2"></div>
                
                {/* Marqueurs de temps */}
                {markers.map((marker, index) => {
                  const position = ((marker - startTime) / (endTime - startTime)) * 100
                  const isSelected = selectedMarkerId === index
                  
                  return (
                    <div
                      key={index}
                      className="absolute top-1/2 transform -translate-y-1/2 cursor-pointer group"
                      style={{ left: `${position}%` }}
                      onClick={() => handleMarkerClick(index)}
                    >
                      {/* Ligne verticale */}
                      <div className={`w-0.5 h-12 ${isSelected ? 'bg-indigo-500' : 'bg-white/20'} group-hover:bg-indigo-400 transition-colors`}></div>
                      
                      {/* Point de marqueur */}
                      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${isSelected ? 'bg-indigo-500 ring-2 ring-indigo-500/50' : 'bg-white/30'} group-hover:bg-indigo-400 transition-colors`}></div>
                      
                      {/* Label temps */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 rounded bg-zinc-800/90 backdrop-blur-sm border border-white/10 text-xs font-mono text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatTime(marker)}
          </div>
            </div>
                  )
                })}
                
                {/* Curseur de lecture */}
                {currentTime >= startTime && currentTime <= endTime && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                    style={{ 
                      left: `${((currentTime - startTime) / (endTime - startTime)) * 100}%`,
                      willChange: 'left'
                    }}
                  >
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-zinc-950"></div>
          </div>
        )}
          </div>
            </div>

          </div>

          {/* Ruban d'Accords Horizontal - Scrollable horizontalement */}
          <div className="relative flex-1 flex flex-col pt-2 overflow-visible" style={{ minHeight: '200px', paddingBottom: '50px', paddingTop: '16px', zIndex: 10 }}>
            <div 
              ref={chordRibbonRef}
              className="flex gap-3 overflow-x-auto px-2"
              style={{ 
                scrollbarWidth: 'thin', 
                scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                overflowY: 'visible',
                paddingTop: '8px',
                paddingBottom: '40px'
              }}
            >
              {markers.map((marker, index) => {
                const chord = chordData[index]
                const chordLabel = formatChordLabel(chord)
                const isSelected = selectedMarkerId === index
                const chordFunction = getChordFunction(chord)
                
                // Déterminer les classes de couleur selon la fonction
                let functionColorClasses = ''
                if (chordFunction === 'T') {
                  functionColorClasses = isSelected 
                    ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/30' 
                    : 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/15 hover:border-blue-500/60'
                } else if (chordFunction === 'SD') {
                  functionColorClasses = isSelected 
                    ? 'border-violet-500 bg-violet-500/20 shadow-lg shadow-violet-500/30' 
                    : 'border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/15 hover:border-violet-500/60'
                } else if (chordFunction === 'D') {
                  functionColorClasses = isSelected 
                    ? 'border-pink-500 bg-pink-500/20 shadow-lg shadow-pink-500/30' 
                    : 'border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/15 hover:border-pink-500/60'
                } else {
                  // Pas de fonction déterminée
                  functionColorClasses = isSelected 
                    ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/30' 
                    : 'border-white/10 hover:border-white/20'
                }
                
                return (
                  <div 
                    key={index} 
                    className="relative flex-shrink-0"
                  >
                    {/* Tuile d'accord */}
                    <div
                      onClick={() => handleMarkerClick(index)}
                      className={`
                        w-24 h-24 rounded-xl border-2 transition-all duration-200 cursor-pointer
                        backdrop-blur-md
                        flex flex-col items-center justify-center gap-1
                        ${functionColorClasses}
                      `}
                    >
                      {chordLabel ? (
                        <>
                          {chordLabel.isFunctionOnly ? (
                            <span className={`font-chord text-4xl font-bold ${
                              chordLabel.function === 'T' ? 'text-blue-400' :
                              chordLabel.function === 'SD' ? 'text-violet-400' :
                              'text-pink-400'
                            }`}>
                              {chordLabel.function}
                            </span>
                          ) : (
                            <div className={`flex items-center gap-0.5 ${chordLabel.isBorrowed ? 'px-1' : ''}`}>
                              <ChordLabel
                                chord={chord}
                                className="font-chord text-3xl font-bold text-white [&_.chord-label-figure]:text-white/70"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-white/40 animate-pulse" />
                          </div>
                          <span className="text-xs text-white/40 font-medium">Vide</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Bouton supprimer */}
                    <button
                      onClick={(e) => handleDeleteMarker(e, index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center transition-colors shadow-lg z-50"
                      title="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    {/* Label temps sous la tuile - Glissable */}
                    <div 
                      onMouseDown={(e) => handleTimerMouseDown(e, `marker-${index}`, index)}
                      onTouchStart={(e) => handleTimerMouseDown(e, `marker-${index}`, index)}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 rounded bg-zinc-800/90 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 text-xs font-mono text-white/60 whitespace-nowrap cursor-ew-resize active:bg-indigo-500/20 select-none transition-colors"
                      title="Glisser pour ajuster le temps"
                    >
                      {formatTime(marker)}
                    </div>
                  </div>
                )
              })}
              
              {/* Bouton Ajouter - Toujours présent à droite du dernier accord */}
              <div
                onClick={createMarker}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-indigo-500/50 flex-shrink-0"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-indigo-400 font-bold stroke-[3] animate-pulse" />
                  </div>
                  <span className="text-xs text-white/50 font-medium">Ajouter</span>
                </div>
              </div>
            </div>
            
            {/* Crochets de cadences - Collés aux accords */}
            {getCadences.length > 0 && (
              <div className="absolute -top-3 left-0 h-6 pointer-events-none z-10" style={{ width: chordRibbonRef.current?.scrollWidth || '100%' }}>
                {getCadences.map((cadence, idx) => {
                  if (cadence.startMarker === null || cadence.endMarker === null) return null
                  
                  const startIndex = cadence.startMarker
                  const endIndex = cadence.endMarker
                  const tileWidth = 96 // w-24 = 96px
                  const gap = 12 // gap-3 = 12px
                  const leftOffset = startIndex * (tileWidth + gap) + 8 // +8 pour le padding px-2
                  const width = (endIndex - startIndex + 1) * (tileWidth + gap) - gap
                  
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
                        left: `${leftOffset}px`,
                        width: `${width}px`
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
          </div>
        </div>
      </div>

      {/* Zone BAS (30%) - Control Dock */}
      <div className="flex-shrink-0 h-[30vh] min-h-[180px] max-h-[250px] bg-zinc-900/80 backdrop-blur-xl border-t border-white/5 p-4 md:p-6">
        {/* Layout Mobile : IN/OUT sur une seule ligne */}
        <div className="md:hidden flex flex-col h-full gap-3">
          {/* Ligne 1 : IN et OUT compacts sur une ligne */}
          <div className="flex items-center justify-between gap-2">
            {/* Groupe IN - Tout sur une ligne */}
            <div className="flex-1 flex items-center gap-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">IN</label>
              <button
                onClick={() => {
                  const current = currentTimeRef.current || currentTime
                  handleStartTimeChange(current)
                }}
                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors flex-shrink-0"
                title="Définir IN au temps actuel"
              >
                <Flag className="w-4 h-4 text-indigo-400" />
              </button>
              <div 
                ref={inTimerRef}
                onMouseDown={(e) => handleTimerMouseDown(e, 'in')}
                onTouchStart={(e) => handleTimerMouseDown(e, 'in')}
                className="flex-1 px-2 py-1.5 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 transition-colors cursor-ew-resize active:bg-indigo-500/20 select-none"
                title="Glisser pour ajuster"
              >
                <div className="text-xs font-mono text-white font-bold text-center">
                  {formatTimeDetailed(startTime)}
                </div>
              </div>
            </div>

            {/* Groupe OUT - Tout sur une ligne */}
            <div className="flex-1 flex items-center gap-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap">OUT</label>
              <button
                onClick={() => {
                  const current = currentTimeRef.current || currentTime
                  handleEndTimeChange(current)
                }}
                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors flex-shrink-0"
                title="Définir OUT au temps actuel"
              >
                <Flag className="w-4 h-4 text-indigo-400" />
              </button>
              <div 
                ref={outTimerRef}
                onMouseDown={(e) => handleTimerMouseDown(e, 'out')}
                onTouchStart={(e) => handleTimerMouseDown(e, 'out')}
                className="flex-1 px-2 py-1.5 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 transition-colors cursor-ew-resize active:bg-indigo-500/20 select-none"
                title="Glisser pour ajuster"
              >
                <div className="text-xs font-mono text-white font-bold text-center">
                  {formatTimeDetailed(endTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Ligne 2 : Transport + TAP */}
          <div className="flex items-center justify-center gap-3">
            {/* Bouton Revenir au début */}
            <button
              onClick={() => {
                handleSeek(startTime)
                setSelectedMarkerId(null)
              }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
              title="Revenir au début de l'extrait"
            >
              <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </button>

            {/* Bouton Prev */}
            <button
              onClick={() => {
                if (markers.length > 0 && selectedMarkerId !== null && selectedMarkerId > 0) {
                  const prevIndex = selectedMarkerId - 1
                  handleSeek(markers[prevIndex])
                  setSelectedMarkerId(prevIndex)
                } else {
                  // Si pas d'accord précédent, revenir au début de l'extrait (comme un marqueur fictif à 00:00)
                  handleSeek(startTime)
                  setSelectedMarkerId(null)
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
                if (markers.length > 0 && selectedMarkerId !== null && selectedMarkerId < markers.length - 1) {
                  const nextIndex = selectedMarkerId + 1
                  handleSeek(markers[nextIndex])
                  setSelectedMarkerId(nextIndex)
                } else if (markers.length > 0) {
                  handleSeek(markers[0])
                  setSelectedMarkerId(0)
                } else {
                  handleSeek(endTime)
                }
              }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
              title="Marqueur suivant"
            >
              <SkipForward className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
            </button>

            {/* Bouton TAP */}
            <div className="relative">
              <button
                onClick={createMarker}
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-zinc-800 border-2 border-white/10 hover:border-indigo-500/50 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                title="TAP - Créer un marqueur (Entrée)"
              >
                <Plus className="w-6 h-6 md:w-7 md:h-7 text-indigo-400 font-bold stroke-[3]" />
              </button>
              <span className="hidden md:block text-xs text-white/50 font-mono absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                Entrée
                        </span>
            </div>
          </div>
        </div>

        {/* Layout Desktop : Une seule ligne symétrique */}
        <div className="hidden md:flex h-full items-center justify-between gap-4">
          {/* Groupe IN (Gauche) */}
          <div className="flex-shrink-0 flex flex-col gap-1 min-w-[100px]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">IN</label>
              <button
                onClick={() => {
                  const current = currentTimeRef.current || currentTime
                  handleStartTimeChange(current)
                }}
                className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
                title="Définir IN au temps actuel"
              >
                <Flag className="w-5 h-5 text-indigo-400" />
              </button>
            </div>
            <div 
              onMouseDown={(e) => handleTimerMouseDown(e, 'in')}
              onTouchStart={(e) => handleTimerMouseDown(e, 'in')}
              className="px-4 py-3 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 transition-colors cursor-ew-resize active:bg-indigo-500/20 select-none"
              title="Glisser pour ajuster"
            >
              <div className="text-lg font-mono text-white font-bold text-center">
                {formatTimeDetailed(startTime)}
              </div>
            </div>
          </div>

          {/* Cluster Centre - Transport Controls */}
          <div className="flex-1 flex items-center justify-center gap-4">
            {/* Bouton Revenir au début */}
            <button
              onClick={() => {
                handleSeek(startTime)
                setSelectedMarkerId(null)
              }}
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
              title="Revenir au début de l'extrait"
            >
              <RotateCcw className="w-6 h-6 text-white/70" />
            </button>

            {/* Bouton Prev */}
            <button
              onClick={() => {
                if (markers.length > 0 && selectedMarkerId !== null && selectedMarkerId > 0) {
                  const prevIndex = selectedMarkerId - 1
                  handleSeek(markers[prevIndex])
                  setSelectedMarkerId(prevIndex)
                } else {
                  // Si pas d'accord précédent, revenir au début de l'extrait (comme un marqueur fictif à 00:00)
                  handleSeek(startTime)
                  setSelectedMarkerId(null)
                }
              }}
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
              title="Marqueur précédent"
            >
              <SkipBack className="w-6 h-6 text-white/70" />
            </button>

            {/* Timer général + Bouton PLAY Héros */}
            <div className="flex flex-col items-center gap-2">
              {/* Timer général */}
              <div className="px-4 py-2 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10">
                <div className="text-xl font-mono text-white font-bold text-center">
                  {formatRelativeTime(currentTime)}
                </div>
              </div>
              {/* Bouton PLAY Héros */}
              <button
                onClick={handlePlayPause}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-4 border-white/10 shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all duration-200 flex items-center justify-center active:scale-95"
                title="Play/Pause (Espace)"
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </button>
            </div>

            {/* Bouton Next */}
                      <button
              onClick={() => {
                if (markers.length > 0 && selectedMarkerId !== null && selectedMarkerId < markers.length - 1) {
                  const nextIndex = selectedMarkerId + 1
                  handleSeek(markers[nextIndex])
                  setSelectedMarkerId(nextIndex)
                } else if (markers.length > 0) {
                  handleSeek(markers[0])
                  setSelectedMarkerId(0)
                } else {
                  handleSeek(endTime)
                }
              }}
              className="w-14 h-14 rounded-xl bg-zinc-800 border border-white/10 hover:border-white/20 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95"
              title="Marqueur suivant"
            >
              <SkipForward className="w-6 h-6 text-white/70" />
                      </button>
                    </div>

          {/* Bouton TAP (Intégré discrètement) */}
          <div className="flex-shrink-0 relative">
            <button
              onClick={createMarker}
              className="w-16 h-16 rounded-xl bg-zinc-800 border-2 border-white/10 hover:border-indigo-500/50 hover:bg-zinc-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 active:scale-95"
              title="TAP - Créer un marqueur (Entrée)"
            >
              <Plus className="w-7 h-7 text-indigo-400 font-bold stroke-[3]" />
            </button>
            <span className="text-xs text-white/50 font-mono absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              Entrée
            </span>
                      </div>

          {/* Groupe OUT (Droite) */}
          <div className="flex-shrink-0 flex flex-col gap-1 min-w-[100px]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">OUT</label>
                <button
                  onClick={() => {
                    const current = currentTimeRef.current || currentTime
                    handleEndTimeChange(current)
                  }}
                  className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
                  title="Définir OUT au temps actuel"
                >
                  <Flag className="w-5 h-5 text-indigo-400" />
                </button>
                    </div>
            <div 
              onMouseDown={(e) => handleTimerMouseDown(e, 'out')}
              onTouchStart={(e) => handleTimerMouseDown(e, 'out')}
              className="px-4 py-3 rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-white/10 hover:border-indigo-500/50 transition-colors cursor-ew-resize active:bg-indigo-500/20 select-none"
              title="Glisser pour ajuster"
            >
              <div className="text-lg font-mono text-white font-bold text-center">
                {formatTimeDetailed(endTime)}
                  </div>
            </div>
          </div>
            </div>
          </div>

      {/* Flash effect */}
      {flash && (
        <div className="fixed inset-0 bg-white/20 pointer-events-none animate-pulse z-50"></div>
        )}

        {/* Modal de sélection d'accord */}
        <ChordSelectorModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onValidate={handleChordValidate}
          initialChord={selectedMarkerId !== null ? chordData[selectedMarkerId] : null}
        embedded={true}
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
          initialAutoTags={exerciseId ? loadedAutoTags : undefined}
          initialSection={exerciseId ? loadedSection : undefined}
          initialMusicCategory={exerciseId ? loadedMusicCategory : undefined}
        />
        
        {/* Modale de confirmation de sortie */}
        <ConfirmExitModal
          isOpen={isConfirmExitModalOpen}
          onClose={() => setIsConfirmExitModalOpen(false)}
          onConfirm={handleConfirmExit}
        />
        
        {/* Message de notification */}
        {saveMessage && (
        <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl backdrop-blur-md border shadow-2xl z-50 ${
          saveMessage.type === 'success' 
            ? 'bg-green-500/20 border-green-500/50 text-green-300' 
            : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
        }`}>
            {saveMessage.text}
          </div>
        )}

      {/* PWA Install Prompt (Android uniquement) */}
      <PWAInstallPrompt />
    </div>
  )
}

export default Editor
