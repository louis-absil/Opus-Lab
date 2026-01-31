import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getExerciseById, getLatestPublicExercises } from '../services/exerciseService'
import { getUserAttempts, getAllUserAttempts } from '../services/attemptService'
import { getEstablishments, getClasses } from '../services/referenceDataService'
import { updateUserProfile } from '../services/userService'
import { uploadAvatar, validateAvatarFile } from '../services/avatarService'
import { joinTeacherClass, leaveTeacherClass, getTeacherClassById } from '../services/teacherClassService'
import { getAssignmentsByClass } from '../services/assignmentService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import FreeMode from './FreeMode'
import CampaignMap from '../components/CampaignMap'
import SkillsRadar from '../components/SkillsRadar'
import ActivityHeatmap from '../components/ActivityHeatmap'
import PerformanceDetails from '../components/PerformanceDetails'
import WeeklyObjectives from '../components/WeeklyObjectives'
import TrendIndicators from '../components/TrendIndicators'
import MilestoneCelebrations from '../components/MilestoneCelebrations'
import PeriodComparison from '../components/PeriodComparison'
import ExerciseSuggestions from '../components/ExerciseSuggestions'
import WeeklyStats from '../components/WeeklyStats'
import AchievementsDashboard from '../components/AchievementsDashboard'
import AttemptDetailModal from '../components/AttemptDetailModal'
import RequestEstablishmentModal from '../components/RequestEstablishmentModal'
import DailyLearningBlock from '../components/DailyLearningBlock'
import ExerciseCard from '../components/ExerciseCard'
import CodexView from '../components/CodexView'
import HorizonsMap from '../components/HorizonsMap'
import { checkAndUnlockBadges, getUnlockedHorizonsStyles } from '../services/badgeService'
import { PREVIEW_SCENARIOS, getPreviewProgress, getPreviewXP, getPreviewStreak } from '../utils/previewScenarios'
import './StudentDashboard.css'

const PREVIEW_SCENARIO_STORAGE_KEY = 'opus_preview_prof_scenario'
const PREVIEW_HORIZONS_STORAGE_KEY = 'opus_preview_horizons_override'
/** Clé localStorage : l'élève a déjà ouvert la section Nouveaux Horizons → le conseil du jour repasse au tip normal */
const HORIZONS_SEEN_STORAGE_KEY = 'opus_horizons_panel_seen'
/** Nombre max d'entrées affichées dans la liste "Historique" (onglet Progression). */
const PROGRESS_HISTORY_LIST_LIMIT = 10
/** Nombre d'entrées visibles par défaut avant "Voir plus". */
const PROGRESS_HISTORY_LIST_VISIBLE = 5

function StudentDashboard() {
  const { user, userData, logout, isGuest, disableGuestMode, refreshUserData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isHorizonsPage = location.pathname === '/student-dashboard/horizons'
  const [activeTab, setActiveTab] = useState('home')
  // Codex : fiche sélectionnée et contexte d'ouverture (nœud ou fiche depuis Parcours / URL)
  const [codexSelectedFicheId, setCodexSelectedFicheId] = useState(null)
  const [codexInitialNodeId, setCodexInitialNodeId] = useState(null)
  const [codexInitialFicheId, setCodexInitialFicheId] = useState(null)
  /** Mode preview prof : scénario simulé ('' = données réelles du prof). Persisté en sessionStorage pour survivre à la navigation (ex. lancement / sortie d'un exercice). */
  const [previewScenario, setPreviewScenario] = useState(() => {
    try {
      return typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(PREVIEW_SCENARIO_STORAGE_KEY) ?? '') : ''
    } catch {
      return ''
    }
  })
  const [previewHorizonsOverride, setPreviewHorizonsOverride] = useState(() => {
    try {
      return typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(PREVIEW_HORIZONS_STORAGE_KEY) ?? '') : ''
    } catch {
      return ''
    }
  })
  
  // États pour Code Exercice
  const [exerciseCode, setExerciseCode] = useState('')
  const [codeError, setCodeError] = useState('')
  
  // États pour Progression
  const [attempts, setAttempts] = useState([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  
  // États pour Profil (édition inline photo + nom)
  const profileAvatarFileInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [displayNameSaving, setDisplayNameSaving] = useState(false)
  const [displayNameError, setDisplayNameError] = useState(null)
  
  // États pour Profil
  const [profileStats, setProfileStats] = useState(null)
  const [loadingProfileStats, setLoadingProfileStats] = useState(false)
  const [allAttempts, setAllAttempts] = useState([])
  const [establishmentsList, setEstablishmentsList] = useState([])
  const [classesList, setClassesList] = useState([])
  const [loadingEstablishments, setLoadingEstablishments] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [profileEstablishment, setProfileEstablishment] = useState('')
  const [profileClass, setProfileClass] = useState('')
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestModalType, setRequestModalType] = useState('establishment')
  const [teacherClassName, setTeacherClassName] = useState(null)
  const [classCodeInput, setClassCodeInput] = useState('')
  const [joinClassLoading, setJoinClassLoading] = useState(false)
  const [joinClassError, setJoinClassError] = useState('')
  const [assignmentsForClass, setAssignmentsForClass] = useState([])
  const [attemptedExerciseIds, setAttemptedExerciseIds] = useState(new Set())
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  
  // État pour toutes les tentatives (pour le calcul du streak)
  const [allAttemptsForStreak, setAllAttemptsForStreak] = useState([])

  // Onglet précédent (pour retour depuis la page Profil, ouverte via avatar)
  const [previousTab, setPreviousTab] = useState('home')

  // Objectifs de la semaine tous atteints (pour mise en avant suggestion prioritaire)
  const [allObjectivesCompleted, setAllObjectivesCompleted] = useState(false)

  // Derniers exercices ajoutés (accueil)
  const [latestExercises, setLatestExercises] = useState([])
  const [loadingLatestExercises, setLoadingLatestExercises] = useState(false)

  // Filtre initial pour le Mode Libre (clic sur une pastille → ouvrir Mode Libre avec ce filtre)
  const [freeModeInitialFilter, setFreeModeInitialFilter] = useState(null)

  // Panneau Nouveaux Horizons (ouvert depuis le bouton Mode Libre ou depuis Progression, pas d’onglet dédié)
  const [hasSeenHorizonsPanel, setHasSeenHorizonsPanel] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(HORIZONS_SEEN_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [highlightHorizonsInFreeMode, setHighlightHorizonsInFreeMode] = useState(false)
  /**
   * Navigation sur la page Nouveaux Horizons : pile de vues pour que "Retour" aille toujours au bon endroit.
   * Niveau 0 = accueil Horizons (cartes) ; niveau 1+ = style ouvert, ou futur détail exercice, etc.
   * Retour = dépiler ; si plus qu’un seul niveau, quitter la page vers le dashboard.
   */
  const [horizonsViewStack, setHorizonsViewStack] = useState(() => ['cards'])

  useEffect(() => {
    if (isHorizonsPage) {
      try {
        window.localStorage.setItem(HORIZONS_SEEN_STORAGE_KEY, '1')
      } catch {}
      setHasSeenHorizonsPanel(true)
    }
  }, [isHorizonsPage])

  // IDs des exercices déjà faits (pour filtre Mode Libre)
  const doneExerciseIds = useMemo(
    () => [...new Set((allAttemptsForStreak || []).map((a) => a.exerciseId).filter(Boolean))],
    [allAttemptsForStreak]
  )

  // Ref pour scroll vers le parcours (onglet dédié)
  const campaignMapSectionRef = useRef(null)

  // Petit écran (≤768px) pour limiter le graphique de progression
  const [isSmallScreen, setIsSmallScreen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = () => setIsSmallScreen(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Retour depuis la page Horizons : ouvrir l’onglet demandé (ex. free-mode)
  // Réinitialiser la pile Horizons à l'arrivée sur la page (toujours afficher l'accueil Horizons)
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    if (location.pathname === '/student-dashboard/horizons' && prevPathRef.current !== '/student-dashboard/horizons') {
      setHorizonsViewStack(['cards'])
    }
    prevPathRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname === '/student-dashboard' && location.state?.tab) {
      setActiveTab(location.state.tab)
    }
  }, [location.pathname, location.state?.tab])

  // URL : tab=codex, fiche=id, node=nodeId (pour deep link et retour depuis Player)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const fiche = params.get('fiche')
    const node = params.get('node')
    if (tab === 'codex') {
      setActiveTab('codex')
      if (fiche) setCodexInitialFicheId(fiche)
      if (node) setCodexInitialNodeId(node)
    }
  }, [location.search])

  // Réinitialiser le contexte d'ouverture Codex quand on quitte l'onglet
  useEffect(() => {
    if (activeTab !== 'codex') {
      setCodexInitialNodeId(null)
      setCodexInitialFicheId(null)
    }
  }, [activeTab])

  // Charger l'historique des tentatives (uniquement si connecté, pas en mode invité)
  useEffect(() => {
    if (user && !isGuest) {
      loadAttempts()
      loadAllAttemptsForStreak()
    } else {
      setLoadingAttempts(false)
    }
  }, [user, isGuest])
  
  // Recharger les tentatives quand on revient au dashboard (pour mettre à jour le streak)
  useEffect(() => {
    if (user && !isGuest && location.pathname === '/student-dashboard') {
      loadAttempts()
      loadAllAttemptsForStreak()
    }
  }, [location.pathname, user, isGuest])
  
  // Fonction pour charger toutes les tentatives pour le calcul du streak
  const loadAllAttemptsForStreak = async () => {
    if (!user || isGuest) return
    try {
      const data = await getAllUserAttempts(user.uid)
      setAllAttemptsForStreak(data)
    } catch (error) {
      console.error('Erreur lors du chargement de toutes les tentatives:', error)
    }
  }

  // Charger toutes les tentatives pour les stats du profil
  useEffect(() => {
    if (user && !isGuest && activeTab === 'profile') {
      loadProfileStats()
    }
  }, [user, isGuest, activeTab])

  // Charger listes établissements / classes quand on ouvre le profil
  useEffect(() => {
    if (activeTab !== 'profile') return
    setLoadingEstablishments(true)
    setLoadingClasses(true)
    getEstablishments()
      .then((list) => setEstablishmentsList(list))
      .catch(() => setEstablishmentsList([]))
      .finally(() => setLoadingEstablishments(false))
    getClasses()
      .then((list) => setClassesList(list))
      .catch(() => setClassesList([]))
      .finally(() => setLoadingClasses(false))
  }, [activeTab])

  // Synchroniser établissement/classe depuis userData à l'ouverture du profil
  useEffect(() => {
    if (activeTab === 'profile' && userData) {
      setProfileEstablishment(userData.establishment ?? '')
      setProfileClass(userData.class ?? '')
    }
  }, [activeTab, userData?.establishment, userData?.class])

  // Charger le nom de la classe prof quand l'élève a rejoint une classe
  useEffect(() => {
    if (!userData?.teacherClassId) {
      setTeacherClassName(null)
      return
    }
    getTeacherClassById(userData.teacherClassId)
      .then((tc) => setTeacherClassName(tc?.name ?? null))
      .catch(() => setTeacherClassName(null))
  }, [userData?.teacherClassId])

  // Charger les devoirs de la classe + tentatives (pour Fait/À faire) — 2 requêtes, limitées
  useEffect(() => {
    if (!user?.uid || !userData?.teacherClassId || isGuest) {
      setAssignmentsForClass([])
      setAttemptedExerciseIds(new Set())
      return
    }
    setLoadingAssignments(true)
    Promise.all([
      getAssignmentsByClass(userData.teacherClassId, 30),
      getAllUserAttempts(user.uid)
    ])
      .then(([assignments, attempts]) => {
        setAssignmentsForClass(assignments || [])
        const ids = new Set((attempts || []).map((a) => a.exerciseId))
        setAttemptedExerciseIds(ids)
      })
      .catch(() => {
        setAssignmentsForClass([])
        setAttemptedExerciseIds(new Set())
      })
      .finally(() => setLoadingAssignments(false))
  }, [user?.uid, userData?.teacherClassId, isGuest])

  // Charger les stats du profil aussi pour l'onglet progression (pour les suggestions)
  useEffect(() => {
    if (user && !isGuest && activeTab === 'progress' && !profileStats) {
      loadProfileStats()
    }
  }, [user, isGuest, activeTab])

  // Charger les derniers exercices sur l'accueil
  useEffect(() => {
    if (activeTab !== 'home') return
    let cancelled = false
    setLoadingLatestExercises(true)
    getLatestPublicExercises(5)
      .then((data) => {
        if (!cancelled) setLatestExercises(data)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement derniers exercices:', err)
          setLatestExercises([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLatestExercises(false)
      })
    return () => { cancelled = true }
  }, [activeTab])

  const loadAttempts = async () => {
    try {
      setLoadingAttempts(true)
      // Charger toutes les tentatives pour le graphique et les stats
      const data = await getAllUserAttempts(user.uid)
      setAttempts(data)
      
      // Vérifier et débloquer les badges
      if (data.length > 0) {
        try {
          const newlyUnlocked = await checkAndUnlockBadges(user.uid, data, { xp: userData?.xp })
          if (newlyUnlocked.length > 0) {
            console.log('Nouveaux badges débloqués:', newlyUnlocked)
          }
        } catch (error) {
          console.error('Erreur lors de la vérification des badges:', error)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tentatives:', error)
    } finally {
      setLoadingAttempts(false)
    }
  }

  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    setCodeError('')
    
    if (!exerciseCode.trim()) {
      setCodeError('Veuillez entrer un code d\'exercice')
      return
    }
    
    try {
      const exercise = await getExerciseById(exerciseCode.trim())
      
      if (!exercise) {
        setCodeError('Exercice introuvable. Vérifiez le code.')
        return
      }
      
      if (exercise.status !== 'published' && exercise.status !== 'draft') {
        setCodeError('Cet exercice n\'est pas accessible')
        return
      }
      
      navigate(`/play/${exercise.id}`)
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
      setCodeError('Erreur lors de la recherche de l\'exercice')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date inconnue'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short'
    }).format(date)
  }

  // Fonction pour nettoyer le titre en enlevant le préfixe "Analyse harmonique - "
  const cleanExerciseTitle = (title) => {
    if (!title) return 'Exercice'
    // Enlever le préfixe "Analyse harmonique - " s'il existe (insensible à la casse)
    const cleaned = title.replace(/^Analyse harmonique\s*-\s*/i, '').trim()
    return cleaned || 'Exercice'
  }

  const getLevel = (xp) => {
    return Math.floor(xp / 100) + 1
  }

  const getXPForNextLevel = (xp) => {
    const currentLevel = getLevel(xp)
    return currentLevel * 100
  }

  // Calculer la série (streak) quotidienne — déclaré avant son premier usage pour éviter la TDZ
  const calculateStreak = (attempts) => {
    if (!attempts || attempts.length === 0) {
      return 0
    }

    // Grouper les tentatives par jour (sans heure) - utiliser l'heure locale pour cohérence
    const daysWithActivity = new Set()
    attempts.forEach(attempt => {
      if (!attempt.completedAt) return
      const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      daysWithActivity.add(dateKey)
    })

    if (daysWithActivity.size === 0) {
      return 0
    }

    const sortedDates = Array.from(daysWithActivity).sort().reverse()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayKey = `${year}-${month}-${day}`

    let streak = 0
    let currentDate = new Date(today)
    if (sortedDates.includes(todayKey)) {
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      currentDate.setDate(currentDate.getDate() - 1)
    }
    while (true) {
      const y = currentDate.getFullYear()
      const m = String(currentDate.getMonth() + 1).padStart(2, '0')
      const d = String(currentDate.getDate()).padStart(2, '0')
      const dateKey = `${y}-${m}-${d}`
      if (sortedDates.includes(dateKey)) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }

  const isPreviewMode = userData?.role === 'teacher'
  const usePreviewValues = isPreviewMode && previewScenario && getPreviewXP(previewScenario) != null
  const xp = usePreviewValues ? getPreviewXP(previewScenario) : (userData?.xp || 0)
  const level = getLevel(xp)
  const xpForNextLevel = getXPForNextLevel(xp)
  const xpProgress = ((xp % 100) / 100) * 100
  const xpInCurrentLevel = xp % 100
  const xpNeededForNextLevel = 100 - xpInCurrentLevel

  // Titre selon niveau (pour header / profil)
  const levelTier = level <= 4 ? 'debutant' : level <= 24 ? 'regulier' : 'assidu'
  const levelTierLabel = level <= 4 ? 'Débutant' : level <= 24 ? 'Régulier' : 'Assidu'

  const userName = userData?.displayName || user?.displayName || 'Élève'
  const firstName = userName.split(' ')[0]
  const profilePhotoURL = userData?.photoURL ?? user?.photoURL
  const streak = usePreviewValues ? getPreviewStreak(previewScenario) : calculateStreak(allAttemptsForStreak)

  const handleProfileAvatarChange = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !user?.uid) return
    e.target.value = ''
    setAvatarError(null)
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setAvatarError(validation.error)
      return
    }
    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(user.uid, file)
      await updateUserProfile(user.uid, { photoURL: url })
      await refreshUserData()
    } catch (err) {
      setAvatarError(err.message || 'Erreur lors du chargement de l\'image.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const startEditingDisplayName = () => {
    setDisplayNameInput(userData?.displayName || user?.displayName || '')
    setDisplayNameError(null)
    setEditingDisplayName(true)
  }

  const cancelEditingDisplayName = () => {
    setEditingDisplayName(false)
    setDisplayNameInput('')
    setDisplayNameError(null)
  }

  const saveDisplayName = async () => {
    const trimmed = displayNameInput?.trim() || ''
    if (!user?.uid) return
    setDisplayNameError(null)
    if (!trimmed) {
      setDisplayNameError('Le nom ne peut pas être vide.')
      return
    }
    setDisplayNameSaving(true)
    try {
      await updateUserProfile(user.uid, { displayName: trimmed })
      await refreshUserData()
      setEditingDisplayName(false)
      setDisplayNameInput('')
    } catch (err) {
      setDisplayNameError(err.message || 'Erreur lors de l\'enregistrement.')
    } finally {
      setDisplayNameSaving(false)
    }
  }

  // Détection montée de niveau pour modal (persisté en session pour afficher au retour d'un exercice)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [levelUpValue, setLevelUpValue] = useState(null)
  const prevLevelRef = useRef(level)
  useEffect(() => {
    if (isGuest || usePreviewValues) return
    if (level > prevLevelRef.current && prevLevelRef.current >= 1) {
      setLevelUpValue(level)
      setShowLevelUpModal(true)
    }
    prevLevelRef.current = level
  }, [level, isGuest, usePreviewValues])

  // Micro-animation série : une seule pulsation au chargement quand streak > 0
  const [streakAnimate, setStreakAnimate] = useState(false)
  const streakAnimateDoneRef = useRef(false)
  useEffect(() => {
    if (isGuest || streak === 0 || streakAnimateDoneRef.current) return
    setStreakAnimate(true)
    const t = setTimeout(() => {
      setStreakAnimate(false)
      streakAnimateDoneRef.current = true
    }, 1300)
    return () => clearTimeout(t)
  }, [streak, isGuest])

  const handleHeaderCtaClick = () => {
    setActiveTab('campaign')
  }

  // Charger les statistiques du profil
  const loadProfileStats = async () => {
    if (!user || isGuest) return
    
    try {
      setLoadingProfileStats(true)
      const attempts = await getAllUserAttempts(user.uid)
      setAllAttempts(attempts)
      
      // Calculer les stats globales
      const totalAttempts = attempts.length
      const totalQuestions = attempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0)
      const totalCorrect = attempts.reduce((sum, a) => sum + (a.correctCount || 0), 0)
      const averageScore = totalAttempts > 0 
        ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts 
        : 0

      // Analyser par degré et cadence
      const degreeStats = {}
      const cadenceStats = {}
      const borrowedStats = { total: 0, correct: 0 }

      attempts.forEach(attempt => {
        if (attempt.correctAnswers && Array.isArray(attempt.correctAnswers)) {
          attempt.correctAnswers.forEach((correct, index) => {
            if (!correct) return
            
            const userAnswer = attempt.userAnswers?.[index]
            // Utiliser validateAnswerWithFunctions pour une validation robuste au lieu de displayLabel
            let validation = null
            if (userAnswer && correct) {
              validation = validateAnswerWithFunctions(
                userAnswer,
                correct,
                userAnswer.selectedFunction || userAnswer.function || null
              )
            }

            // Initialiser la validation avec des valeurs par défaut si pas de réponse
            if (!validation) {
              validation = { level: 0, score: 0, cadenceBonus: 0 }
            }

            const isCorrect = validation.level === 1
            const isPartial = validation.level === 2 || validation.level === 3
            const isIncorrect = validation.level === 0
            const score = validation.score || 0

            // Stats par degré - utiliser degree au lieu de root
            const degree = correct.degree || ''
            if (degree) {
              if (!degreeStats[degree]) {
                degreeStats[degree] = { 
                  total: 0, 
                  correct: 0, 
                  partial: 0, 
                  incorrect: 0,
                  totalScore: 0,
                  averageScore: 0,
                  byFigure: {}
                }
              }
              degreeStats[degree].total++
              if (isCorrect) {
                degreeStats[degree].correct++
              } else if (isPartial) {
                degreeStats[degree].partial++
              } else if (isIncorrect) {
                degreeStats[degree].incorrect++
              }
              degreeStats[degree].totalScore += score
              degreeStats[degree].averageScore = Math.round(degreeStats[degree].totalScore / degreeStats[degree].total)

              // Stats par renversement (figure)
              const figureKey = (correct.figure && correct.figure !== '5') ? correct.figure : ''
              const byFigure = degreeStats[degree].byFigure
              if (!byFigure[figureKey]) {
                byFigure[figureKey] = { total: 0, correct: 0, partial: 0, incorrect: 0, totalScore: 0, averageScore: 0 }
              }
              byFigure[figureKey].total++
              if (isCorrect) byFigure[figureKey].correct++
              else if (isPartial) byFigure[figureKey].partial++
              else if (isIncorrect) byFigure[figureKey].incorrect++
              byFigure[figureKey].totalScore += score
              byFigure[figureKey].averageScore = Math.round(byFigure[figureKey].totalScore / byFigure[figureKey].total)
            }

            // Stats par cadence
            const cadence = correct.cadence || ''
            if (cadence) {
              if (!cadenceStats[cadence]) {
                cadenceStats[cadence] = { 
                  total: 0, 
                  correct: 0, 
                  partial: 0, 
                  incorrect: 0,
                  totalScore: 0,
                  averageScore: 0
                }
              }
              cadenceStats[cadence].total++
              if (isCorrect) {
                cadenceStats[cadence].correct++
              } else if (isPartial) {
                cadenceStats[cadence].partial++
              } else if (isIncorrect) {
                cadenceStats[cadence].incorrect++
              }
              cadenceStats[cadence].totalScore += score
              cadenceStats[cadence].averageScore = Math.round(cadenceStats[cadence].totalScore / cadenceStats[cadence].total)
            }

            // Stats pour les emprunts (isBorrowed === true)
            if (correct.isBorrowed === true) {
              borrowedStats.total++
              if (isCorrect) {
                borrowedStats.correct++
              }
            }
          })
        }
      })

      setProfileStats({
        totalAttempts,
        totalQuestions,
        totalCorrect,
        averageScore,
        degreeStats,
        cadenceStats,
        borrowedStats,
        streak: calculateStreak(attempts)
      })
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error)
    } finally {
      setLoadingProfileStats(false)
    }
  }

  // Calculer les données pour le radar
  const radarData = useMemo(() => {
    if (!profileStats || !allAttempts || allAttempts.length === 0) {
      return []
    }

    // Paramètres configurables
    const MIN_PRACTICE_ATTEMPTS = 10 // Seuil minimum de tentatives pour pratique suffisante
    const HIGH_ACCURACY_THRESHOLD = 90 // Seuil de précision élevée (en %)
    const ACCURACY_WEIGHT = 0.6 // Poids de la précision (60%)
    const PRACTICE_WEIGHT = 0.4 // Poids de la pratique (40%)

    // Fonction pour calculer le score de pratique basé sur le nombre de tentatives
    const calculatePracticeScore = (attemptCount) => {
      if (attemptCount === 0) return 0
      // Fonction sigmoïde : atteint ~95% à MIN_PRACTICE_ATTEMPTS, 100% à 2*MIN_PRACTICE_ATTEMPTS
      const normalized = Math.min(100, (attemptCount / MIN_PRACTICE_ATTEMPTS) * 95)
      return Math.round(normalized)
    }

    // Fonction pour calculer le score de précision avec réponses partielles
    const calculateAccuracyScore = (validations) => {
      if (!validations || validations.length === 0) return 0
      
      // Calculer la moyenne pondérée des scores
      // Les scores sont déjà en pourcentage (0-100)
      const totalScore = validations.reduce((sum, v) => sum + (v.score || 0), 0)
      const averageScore = totalScore / validations.length
      
      return Math.round(averageScore)
    }

    // Fonction pour combiner précision et pratique
    const combineScores = (accuracyScore, practiceScore) => {
      const combined = (accuracyScore * ACCURACY_WEIGHT) + (practiceScore * PRACTICE_WEIGHT)
      return Math.round(Math.min(100, combined))
    }

    // Collecter toutes les validations par catégorie
    const tonicValidations = []
    const subdominantValidations = []
    const dominantValidations = []
    const cadenceValidations = []
    const borrowedValidations = []

    // Compteurs de tentatives par catégorie
    const tonicAttempts = new Set()
    const subdominantAttempts = new Set()
    const dominantAttempts = new Set()
    const cadenceAttempts = new Set()
    const borrowedAttempts = new Set()

    // Parcourir toutes les tentatives pour recalculer les validations
    allAttempts.forEach((attempt) => {
      if (!attempt.correctAnswers || !Array.isArray(attempt.correctAnswers)) return

      attempt.correctAnswers.forEach((correct, index) => {
        if (!correct) return

        const userAnswer = attempt.userAnswers?.[index]
        if (!userAnswer) return

        // Recalculer la validation avec validateAnswerWithFunctions
        const validation = validateAnswerWithFunctions(
          userAnswer,
          correct,
          userAnswer.selectedFunction || userAnswer.function || null
        )

        // Classer par catégorie selon le degré (normaliser en majuscules pour la comparaison)
        const degree = (correct.degree || '').toUpperCase()
        
        // Tonique (T) : I, III, VI
        if (degree === 'I' || degree === 'III' || degree === 'VI') {
          tonicValidations.push(validation)
          tonicAttempts.add(attempt.id)
        }

        // Sous-dominante (SD) : IV, II
        if (degree === 'IV' || degree === 'II') {
          subdominantValidations.push(validation)
          subdominantAttempts.add(attempt.id)
        }

        // Dominante (D) : V, VII°
        if (degree === 'V' || degree === 'VII°' || degree === 'VII') {
          dominantValidations.push(validation)
          dominantAttempts.add(attempt.id)
        }

        // Stats par cadence
        const cadence = correct.cadence || ''
        if (cadence) {
          cadenceValidations.push(validation)
          cadenceAttempts.add(attempt.id)
        }

        // Stats pour les emprunts (isBorrowed === true)
        if (correct.isBorrowed === true) {
          borrowedValidations.push(validation)
          borrowedAttempts.add(attempt.id)
        }
      })
    })

    // Calculer les scores pour chaque catégorie
    const tonicAccuracy = calculateAccuracyScore(tonicValidations)
    const tonicPractice = calculatePracticeScore(tonicAttempts.size)
    const tonicValue = combineScores(tonicAccuracy, tonicPractice)

    const subdominantAccuracy = calculateAccuracyScore(subdominantValidations)
    const subdominantPractice = calculatePracticeScore(subdominantAttempts.size)
    const subdominantValue = combineScores(subdominantAccuracy, subdominantPractice)

    const dominantAccuracy = calculateAccuracyScore(dominantValidations)
    const dominantPractice = calculatePracticeScore(dominantAttempts.size)
    const dominantValue = combineScores(dominantAccuracy, dominantPractice)

    const cadenceAccuracy = calculateAccuracyScore(cadenceValidations)
    const cadencePractice = calculatePracticeScore(cadenceAttempts.size)
    const cadenceValue = combineScores(cadenceAccuracy, cadencePractice)

    const borrowedAccuracy = calculateAccuracyScore(borrowedValidations)
    const borrowedPractice = calculatePracticeScore(borrowedAttempts.size)
    const borrowedValue = combineScores(borrowedAccuracy, borrowedPractice)

    const result = [
      { axis: 'Tonique', value: tonicValue },
      { axis: 'Sous-Dom.', value: subdominantValue },
      { axis: 'Dominante', value: dominantValue },
      { axis: 'Cadences', value: cadenceValue },
      { axis: 'Emprunts', value: borrowedValue }
    ]
    
    return result
  }, [profileStats, allAttempts])

  // Trouver le point fort et le point faible
  const { strongestPoint, weakestPoint } = useMemo(() => {
    if (!profileStats) return { strongestPoint: null, weakestPoint: null }

    const { degreeStats, cadenceStats } = profileStats
    const cadenceLabels = {
      perfect: 'Cadence Parfaite',
      imperfect: 'Cadence Imparfaite',
      plagal: 'Cadence Plagale',
      deceptive: 'Cadence Rompue',
      half: 'Demi-Cadence'
    }

    const allStats = []

    // Ajouter les stats de degrés — utiliser le score moyen (0-100) comme pourcentage de réussite, pas seulement correct/total
    Object.entries(degreeStats).forEach(([degree, stats]) => {
      const percentage = stats.averageScore != null
        ? Math.round(stats.averageScore)
        : (stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0)
      allStats.push({
        name: degree,
        percentage,
        total: stats.total
      })
    })

    // Ajouter les stats de cadences — idem : score moyen = pourcentage de réussite
    Object.entries(cadenceStats).forEach(([cadence, stats]) => {
      const percentage = stats.averageScore != null
        ? Math.round(stats.averageScore)
        : (stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0)
      allStats.push({
        name: cadenceLabels[cadence] || cadence,
        percentage,
        total: stats.total
      })
    })

    // Filtrer ceux qui ont au moins 3 tentatives
    const validStats = allStats.filter(s => s.total >= 3)
    
    if (validStats.length === 0) {
      return { strongestPoint: null, weakestPoint: null }
    }

    const sorted = [...validStats].sort((a, b) => b.percentage - a.percentage)
    const strongest = sorted[0]
    const weakest = sorted[sorted.length - 1]

    return {
      strongestPoint: strongest,
      weakestPoint: weakest
    }
  }, [profileStats])

  const handleHorizonsBack = () => {
    if (horizonsViewStack.length > 1) {
      setHorizonsViewStack((prev) => prev.slice(0, -1))
    } else {
      navigate('/student-dashboard')
    }
  }

  /** Dérivé : style actuellement ouvert (null = on est sur l’accueil Horizons) */
  const selectedHorizonsStyleId =
    horizonsViewStack.length > 1 && horizonsViewStack[horizonsViewStack.length - 1] !== 'cards'
      ? horizonsViewStack[horizonsViewStack.length - 1]
      : null

  const setSelectedHorizonsStyleId = (styleIdOrNull) => {
    if (styleIdOrNull == null) {
      setHorizonsViewStack(['cards'])
    } else {
      setHorizonsViewStack((prev) => [...prev, styleIdOrNull])
    }
  }

  return (
    <div className="student-dashboard">
      {/* Bannière Preview pour les professeurs (y compris sur la page Nouveaux Horizons) */}
      {isPreviewMode && (
        <div className="preview-banner">
          <div className="preview-banner-content">
            <span className="preview-icon">👁️</span>
            <span className="preview-text">Mode Preview - Interface élève</span>
            <label className="preview-scenario-label">
              Scénario :
              <select
                className="preview-scenario-select"
                value={previewScenario}
                onChange={(e) => {
                  const value = e.target.value
                  setPreviewScenario(value)
                  try {
                    if (typeof sessionStorage !== 'undefined') {
                      sessionStorage.setItem(PREVIEW_SCENARIO_STORAGE_KEY, value)
                    }
                  } catch (_) {}
                }}
                title="Choisir un scénario pour simuler le niveau et les déblocages d'un élève"
              >
                <option value="">Réel (données prof)</option>
                {PREVIEW_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id} title={s.description}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="preview-scenario-label">
              Nouveaux Horizons (test) :
              <select
                className="preview-scenario-select"
                value={previewHorizonsOverride}
                onChange={(e) => {
                  const value = e.target.value
                  setPreviewHorizonsOverride(value)
                  try {
                    if (typeof sessionStorage !== 'undefined') {
                      sessionStorage.setItem(PREVIEW_HORIZONS_STORAGE_KEY, value)
                    }
                  } catch (_) {}
                }}
                title="Débloquer des styles Nouveaux Horizons pour tester (Film, JV, Anime, etc.)"
              >
                <option value="">Aucun</option>
                <option value="film">Film</option>
                <option value="film,game">Film + JV</option>
                <option value="film,game,anime">Film + JV + Anime</option>
                <option value="film,game,anime,variety">Film + JV + Anime + Variété</option>
                <option value="film,game,anime,variety,pop">Tous</option>
              </select>
            </label>
          </div>
          <button 
            className="preview-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            Retour
          </button>
        </div>
      )}
      
      {/* Header : sur Nouveaux Horizons = un seul bouton retour + titre ; sinon header enrichi habituel */}
      {isHorizonsPage ? (
        <header className="student-header student-header--horizons">
          <div className="student-header-content">
            <div className="student-header-left">
              <button
                type="button"
                className="student-header-back"
                onClick={handleHorizonsBack}
                aria-label="Retour"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Retour</span>
              </button>
            </div>
            <div className="student-header-center student-header-center--title-only">
              <h1 className="student-header-page-title">Nouveaux Horizons</h1>
            </div>
            <div className="student-header-right">
              <button
                className="student-avatar-btn"
                onClick={() => {
                  if (!isGuest) {
                    navigate('/student-dashboard', { state: { tab: 'profile' } })
                  }
                }}
                aria-label="Profil"
              >
                {!isGuest && user?.photoURL ? (
                  <img src={user.photoURL} alt={userName} className="student-avatar" />
                ) : (
                  <div className="student-avatar-placeholder">{firstName[0]?.toUpperCase() || 'E'}</div>
                )}
              </button>
            </div>
          </div>
        </header>
      ) : (
        <header
          className={`student-header student-header--${activeTab} student-header--${levelTier}`}
          data-level-tier={levelTier}
        >
          <div className="student-header-content">
            <div className="student-header-left">
              <button
                type="button"
                className="student-header-brand"
                onClick={() => {
                  setActiveTab('home')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                aria-label="Retour à l'accueil"
              >
                Opus Lab
              </button>
              {isGuest && (
                <span className="student-header-guest-badge">Mode invité</span>
              )}
            </div>
            <div className="student-header-center">
            {!isGuest && (
              <>
                <span
                  className={`student-header-pill student-header-pill--streak ${streak >= 30 ? 'student-header-pill--streak-high' : streak >= 7 ? 'student-header-pill--streak-mid' : ''} ${streakAnimate ? 'student-header-pill--streak-animate' : ''}`}
                  title={streak > 0 ? `${streak} jour${streak !== 1 ? 's' : ''} d'entraînement consécutifs` : 'Série de jours d\'entraînement'}
                  aria-label={`Série : ${streak} jour${streak !== 1 ? 's' : ''}`}
                >
                  <span className="student-header-pill-icon student-header-pill-icon--flame" aria-hidden="true">🔥</span>
                  <span>{streak} jour{streak !== 1 ? 's' : ''}</span>
                </span>
                <span
                  className="student-header-pill student-header-pill--level"
                  title={`Niveau ${level} — ${xpNeededForNextLevel} XP pour le niveau ${level + 1}`}
                  aria-label={`Niveau ${level}`}
                >
                  <span>Niv. {level}</span>
                  <span className="student-header-xp-bar-wrap" aria-hidden="true">
                    <span className="student-header-xp-bar" style={{ width: `${xpProgress}%` }} />
                  </span>
                </span>
              </>
            )}
            {isGuest && (
              <button
                type="button"
                className="student-header-cta"
                onClick={handleHeaderCtaClick}
                aria-label="Commencer le parcours"
              >
                Commencer une séance
              </button>
            )}
          </div>
          <div className="student-header-right">
            <button
              className="student-avatar-btn"
              onClick={() => {
                if (!isGuest) {
                  if (activeTab !== 'profile') setPreviousTab(activeTab)
                  setActiveTab('profile')
                }
              }}
              aria-label="Profil"
            >
              {!isGuest && user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={userName} 
                  className="student-avatar"
                />
              ) : (
                <div className="student-avatar-placeholder">
                  {firstName[0]?.toUpperCase() || 'E'}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Modal montée de niveau (sobre) */}
      {showLevelUpModal && levelUpValue != null && (
        <div className="level-up-overlay" role="dialog" aria-labelledby="level-up-title" aria-modal="true">
          <div className="level-up-modal">
            <div className="level-up-modal-icon" aria-hidden="true">⭐</div>
            <h2 id="level-up-title" className="level-up-modal-title">Niveau {levelUpValue} !</h2>
            <p className="level-up-modal-text">Tu progresses bien. Continue comme ça.</p>
            <button
              type="button"
              className="level-up-modal-close"
              onClick={() => { setShowLevelUpModal(false); setLevelUpValue(null) }}
              aria-label="Fermer"
            >
              C'est parti
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal : Nouveaux Horizons ou onglets habituels */}
      <main className="student-main">
        {isHorizonsPage ? (
          <div className="student-horizons-main">
            <HorizonsMap
              attempts={allAttemptsForStreak || []}
              userXp={userData?.xp ?? 0}
              onSwitchTab={(tab) => navigate('/student-dashboard', { state: { tab } })}
              onClose={() => navigate('/student-dashboard')}
              previewUnlockedHorizonsStyles={
                isPreviewMode && previewHorizonsOverride
                  ? previewHorizonsOverride.split(',').map((s) => s.trim()).filter(Boolean)
                  : null
              }
              selectedStyleId={selectedHorizonsStyleId}
              setSelectedStyleId={setSelectedHorizonsStyleId}
              hideInternalBack
            />
          </div>
        ) : (
        <>
        {activeTab === 'home' && (
          <div className="student-content">
            {/* Bloc pédagogique : prochaine étape + conseil du jour + CTA */}
            {!isGuest && (
              <DailyLearningBlock
                userId={previewScenario ? undefined : user?.uid}
                attempts={allAttemptsForStreak || []}
                previewProgress={previewScenario ? getPreviewProgress(previewScenario) : null}
                onContinueClick={handleHeaderCtaClick}
                unlockedHorizonsCount={
                  isPreviewMode && previewHorizonsOverride
                    ? previewHorizonsOverride.split(',').map((s) => s.trim()).filter(Boolean).length
                    : getUnlockedHorizonsStyles(allAttemptsForStreak || [], { xp: userData?.xp ?? 0 }).length
                }
                hasSeenHorizonsPanel={hasSeenHorizonsPanel}
                onConseilHorizonsClick={() => {
                  setActiveTab('free-mode')
                  setHighlightHorizonsInFreeMode(true)
                }}
              />
            )}

            {/* Devoirs (classe du prof) — affiché seulement si l'élève a rejoint une classe */}
            {!isGuest && userData?.teacherClassId && (
              <div className="student-devoirs-section">
                <h3 className="student-devoirs-title">Devoirs</h3>
                {loadingAssignments ? (
                  <div className="student-devoirs-loading">
                    <div className="spinner" aria-hidden="true" />
                    <p>Chargement des devoirs…</p>
                  </div>
                ) : assignmentsForClass.length === 0 ? (
                  <p className="student-devoirs-empty">Aucun devoir pour le moment.</p>
                ) : (
                  <ul className="student-devoirs-list">
                    {assignmentsForClass.map((a) => {
                      const done = attemptedExerciseIds.has(a.exerciseId)
                      const dueDate = a.dueDate ? (a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate)) : null
                      const dueStr = dueDate ? dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null
                      return (
                        <li key={a.id} className="student-devoirs-item">
                          <button
                            type="button"
                            className="student-devoirs-card"
                            onClick={() => navigate(`/play/${a.exerciseId}`)}
                          >
                            <span className="student-devoirs-card-title">{a.title || a.exerciseTitle || 'Exercice'}</span>
                            {dueStr && <span className="student-devoirs-card-due">Pour le {dueStr}</span>}
                            <span className={`student-devoirs-card-status ${done ? 'done' : 'todo'}`}>
                              {done ? 'Fait' : 'À faire'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Derniers exercices ajoutés */}
            <div className="latest-exercises-section">
              <h3 className="latest-exercises-title">Derniers exercices ajoutés</h3>
              {loadingLatestExercises ? (
                <div className="latest-exercises-loading">
                  <div className="spinner" aria-hidden="true" />
                  <p>Chargement...</p>
                </div>
              ) : latestExercises.length > 0 ? (
                <>
                  <div className="latest-exercises-grid">
                    {latestExercises.map((exercise) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        onClick={(id) => navigate(`/play/${id}`)}
                        onPillClick={(payload) => {
                          if (payload.type === 'difficulty') setFreeModeInitialFilter({ difficulty: payload.value })
                          else if (payload.type === 'tag') setFreeModeInitialFilter({ tag: payload.value })
                          setActiveTab('free-mode')
                        }}
                      />
                    ))}
                  </div>
                  <div className="latest-exercises-cta-row">
                    <button
                      type="button"
                      className="latest-exercises-cta"
                      onClick={() => setActiveTab('free-mode')}
                    >
                      Voir tout en Mode Libre
                    </button>
                    {!isGuest && doneExerciseIds.length > 0 && (
                      <button
                        type="button"
                        className="latest-exercises-cta latest-exercises-cta-secondary"
                        onClick={() => {
                          setFreeModeInitialFilter({ doneStatus: 'done' })
                          setActiveTab('free-mode')
                        }}
                      >
                        Voir les exercices déjà faits
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Section Code Exercice */}
            <div className="code-section">
              <h3 className="code-title">Code Exercice</h3>
              <p className="code-subtitle">Entre le code donné par ton professeur</p>
          <form onSubmit={handleCodeSubmit} className="code-form">
                <div className="code-input-wrapper">
            <input
              type="text"
              className="code-input"
                    placeholder="Ex: abc123"
              value={exerciseCode}
              onChange={(e) => {
                setExerciseCode(e.target.value)
                setCodeError('')
              }}
            />
                  <button type="submit" className="code-submit-btn" aria-label="Jouer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
            </button>
                </div>
                {codeError && <p className="code-error">{codeError}</p>}
          </form>
        </div>
          </div>
        )}

        {activeTab === 'campaign' && (
          <div className="student-content campaign-tab-content" ref={campaignMapSectionRef}>
            {!isGuest && user ? (
              <div className="campaign-map-wrap">
                <CampaignMap
                  userId={previewScenario ? undefined : user.uid}
                  isPreviewMode={isPreviewMode}
                  previewProgress={previewScenario ? getPreviewProgress(previewScenario) : null}
                  onOpenCodex={(nodeId) => {
                    setCodexInitialNodeId(nodeId)
                    setActiveTab('codex')
                  }}
                />
              </div>
            ) : (
              <div className="campaign-tab-guest">
                <p>Connecte-toi pour accéder au parcours de progression.</p>
                <button
                  type="button"
                  className="latest-exercises-cta"
                  onClick={() => navigate('/')}
                >
                  Se connecter
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="student-content">
            <MilestoneCelebrations 
              attempts={allAttemptsForStreak} 
              level={level}
              streak={usePreviewValues ? getPreviewStreak(previewScenario) : calculateStreak(allAttemptsForStreak)}
            />
            <div className="progression-section">
              <h2 className="section-title">Ma Progression</h2>
            
            {(() => {
              // #region agent log
              if (activeTab === 'progress') {
                fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'StudentDashboard.jsx:progress-branch', message: 'Progress tab branch', data: { loadingAttempts, attemptsLength: attempts.length, allAttemptsForStreakLength: allAttemptsForStreak?.length ?? 0, isGuest }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1-H2' }) }).catch(() => {})
              }
              // #endregion
              return null
            })()}
            {loadingAttempts ? (
              <div className="loading-state">
                <div className="spinner"></div>
                  <p>Chargement...</p>
              </div>
            ) : attempts.length === 0 ? (
              <div className="empty-state">
                  <div className="empty-illustration">🎯</div>
                  <h3 className="empty-title">Aucun exercice complété</h3>
                  <p className="empty-text">
                    Lance ton premier entraînement pour commencer à progresser et gagner de l'XP !
                  </p>
                  <button
                    className="empty-cta"
                    onClick={() => setActiveTab('home')}
                  >
                    Commencer l'entraînement
                  </button>
              </div>
            ) : (
              <>
                {/* Cette semaine (en tête) */}
                <div className="progress-section-card">
                  <WeeklyStats attempts={allAttemptsForStreak} />
                </div>

                {/* Tendances (en deuxième) */}
                <div className="progress-section-card">
                  <TrendIndicators attempts={allAttemptsForStreak} />
                </div>

                {/* Objectifs hebdomadaires */}
                {!isGuest && (
                  <div className="progress-section-card">
                    <WeeklyObjectives
                      userId={user?.uid}
                      attempts={allAttemptsForStreak}
                      onObjectivesComplete={setAllObjectivesCompleted}
                    />
                  </div>
                )}

                {/* Comparaison de périodes */}
                <div className="progress-section-card">
                  <PeriodComparison attempts={allAttemptsForStreak} />
                </div>

                {/* Accomplissements (10 derniers + reste débloqués + non obtenus) */}
                {!isGuest && (
                  <div className="progress-section-card">
                    <AchievementsDashboard userId={user?.uid} attempts={allAttemptsForStreak} userXp={userData?.xp} onOpenHorizons={() => navigate('/student-dashboard/horizons')} />
                  </div>
                )}

                {/* Suggestions d'exercices */}
                {!isGuest && (
                  <div className="progress-section-card">
                    <ExerciseSuggestions
                      profileStats={profileStats}
                      attempts={allAttemptsForStreak}
                      onSwitchTab={setActiveTab}
                      onPillClick={(payload) => {
                        if (payload.type === 'tag') setFreeModeInitialFilter({ tag: payload.value })
                        else if (payload.type === 'difficulty') setFreeModeInitialFilter({ difficulty: payload.value })
                        else if (payload.type === 'doneStatus') setFreeModeInitialFilter({ doneStatus: payload.value })
                        setActiveTab('free-mode')
                      }}
                      allObjectivesCompleted={allObjectivesCompleted}
                    />
                  </div>
                )}

                {/* Historique des exercices (en bas de l'onglet, liste compacte + Voir plus) */}
                <div className="progress-section-card">
                  <h3 className="progress-section-title">Historique</h3>
                  <div className="attempts-list attempts-list--compact">
                    {(() => {
                      // #region agent log
                      const visibleCount = historyExpanded ? PROGRESS_HISTORY_LIST_LIMIT : PROGRESS_HISTORY_LIST_VISIBLE
                      const sliced = attempts.slice(0, visibleCount)
                      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'StudentDashboard.jsx:historique-render', message: 'Historique list render', data: { attemptsLength: attempts.length, visibleCount, slicedLength: sliced.length, historyExpanded }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {})
                      // #endregion
                      return null
                    })()}
                    {attempts
                      .slice(0, historyExpanded ? PROGRESS_HISTORY_LIST_LIMIT : PROGRESS_HISTORY_LIST_VISIBLE)
                      .map((attempt) => (
                        <div
                          key={attempt.id}
                          role="button"
                          tabIndex={0}
                          className="attempt-row attempt-row-clickable"
                          onClick={() => setSelectedAttempt(attempt)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedAttempt(attempt)}
                          aria-label={`Voir le détail : ${cleanExerciseTitle(attempt.exerciseTitle)}`}
                        >
                          <div className="attempt-row-main">
                            <span className="attempt-row-title" title={cleanExerciseTitle(attempt.exerciseTitle)}>
                              {cleanExerciseTitle(attempt.exerciseTitle)}
                            </span>
                            <span className="attempt-row-meta">
                              {formatDate(attempt.completedAt)}
                              {' · '}
                              ✅ {attempt.correctCount}/{attempt.totalQuestions}
                              {attempt.xpGained > 0 && (
                                <span className="attempt-row-xp"> +{attempt.xpGained} XP</span>
                              )}
                            </span>
                          </div>
                          <span className={`attempt-row-score attempt-score-${attempt.score >= 80 ? 'high' : attempt.score >= 60 ? 'medium' : 'low'}`}>
                            {attempt.score}%
                          </span>
                        </div>
                      ))}
                  </div>
                  {!historyExpanded && attempts.length > PROGRESS_HISTORY_LIST_VISIBLE && (
                    <button
                      type="button"
                      className="progress-history-see-more"
                      onClick={() => setHistoryExpanded(true)}
                      aria-label={`Afficher ${Math.min(attempts.length - PROGRESS_HISTORY_LIST_VISIBLE, PROGRESS_HISTORY_LIST_LIMIT - PROGRESS_HISTORY_LIST_VISIBLE)} entrée(s) de plus`}
                    >
                      Voir plus
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          </div>
        )}

        {activeTab === 'codex' && (
          <div className="student-content codex-tab-content">
            <CodexView
              selectedEntryId={codexSelectedFicheId}
              onSelectEntry={setCodexSelectedFicheId}
              initialFicheId={codexInitialFicheId}
              initialNodeId={codexInitialNodeId}
              onOpenParcoursNode={(nodeId) => {
                setActiveTab('campaign')
                setCodexSelectedFicheId(null)
              }}
              onOpenFreeModeWithTag={(tag) => {
                setFreeModeInitialFilter(tag ? { tag } : null)
                setActiveTab('free-mode')
                setCodexSelectedFicheId(null)
              }}
            />
          </div>
        )}

        {activeTab === 'free-mode' && (() => {
          const unlockedCount = isPreviewMode && previewHorizonsOverride
            ? previewHorizonsOverride.split(',').map((s) => s.trim()).filter(Boolean).length
            : getUnlockedHorizonsStyles(allAttemptsForStreak || [], { xp: userData?.xp ?? 0 }).length
          return (
            <FreeMode
              doneExerciseIds={doneExerciseIds}
              initialFilter={freeModeInitialFilter}
              onInitialFilterConsumed={() => setFreeModeInitialFilter(null)}
              onOpenHorizons={unlockedCount > 0 ? () => navigate('/student-dashboard/horizons') : null}
              unlockedHorizonsCount={unlockedCount}
              highlightHorizonsButton={highlightHorizonsInFreeMode}
              onHighlightConsumed={() => setHighlightHorizonsInFreeMode(false)}
            />
          )
        })()}

        {activeTab === 'profile' && (
          <div className="student-content profile-page">
            {isGuest ? (
              <div className="guest-connect-card">
                <div className="guest-illustration">💾</div>
                <h2 className="guest-title">Sauvegarder ta progression</h2>
                <p className="guest-text">
                  Connecte-toi avec Google pour sauvegarder tes scores, gagner de l'XP et suivre ta progression.
                </p>
                <button
                  className="guest-connect-btn"
                  onClick={() => navigate('/')}
                >
                  Se connecter avec Google
                </button>
                <button
                  className="guest-exit-btn"
                  onClick={() => {
                    disableGuestMode()
                    navigate('/')
                  }}
                >
                  Quitter le mode invité
                </button>
              </div>
            ) : loadingProfileStats ? (
              <div className="profile-loading">
                <div className="spinner"></div>
                <p>Chargement des statistiques...</p>
              </div>
            ) : (
              <>
                {/* Barre retour (Profil accessible uniquement via avatar) */}
                <div className="profile-top-bar">
                  <button
                    type="button"
                    className="profile-back-btn"
                    onClick={() => setActiveTab(previousTab || 'home')}
                    aria-label="Retour"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  <h1 className="profile-top-bar-title">Profil</h1>
                </div>

                {/* Section 1: Header & Global (Gamification) — sans grosses stats */}
                <div className="profile-header-section">
                  <div className="profile-header-gamification">
                    <div className="profile-inline-avatar-edit">
                      <div className="profile-avatar-container">
                        {profilePhotoURL ? (
                          <img 
                            src={profilePhotoURL} 
                            alt={userName} 
                            className="profile-page-avatar"
                          />
                        ) : (
                          <div className="profile-page-avatar-placeholder">
                            {firstName[0]?.toUpperCase() || 'E'}
                          </div>
                        )}
                      </div>
                      {!isGuest && user?.uid && (
                        <>
                          <input
                            ref={profileAvatarFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="profile-inline-avatar-input"
                            aria-label="Changer la photo de profil"
                            onChange={handleProfileAvatarChange}
                            disabled={avatarUploading}
                          />
                          <button
                            type="button"
                            className="profile-inline-avatar-btn"
                            onClick={() => profileAvatarFileInputRef.current?.click()}
                            disabled={avatarUploading}
                          >
                            {avatarUploading ? 'Chargement…' : 'Changer la photo'}
                          </button>
                          {avatarError && (
                            <p className="profile-inline-avatar-error" role="alert">{avatarError}</p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="profile-header-info">
                      <div className="profile-inline-name-edit">
                        {editingDisplayName ? (
                          <>
                            <input
                              type="text"
                              className="profile-inline-name-input"
                              value={displayNameInput}
                              onChange={(e) => setDisplayNameInput(e.target.value)}
                              placeholder="Votre nom"
                              disabled={displayNameSaving}
                              aria-label="Nom d'affichage"
                            />
                            <div className="profile-inline-name-actions">
                              <button
                                type="button"
                                className="profile-inline-name-save"
                                onClick={saveDisplayName}
                                disabled={displayNameSaving}
                              >
                                {displayNameSaving ? 'Enregistrement…' : 'Enregistrer'}
                              </button>
                              <button
                                type="button"
                                className="profile-inline-name-cancel"
                                onClick={cancelEditingDisplayName}
                                disabled={displayNameSaving}
                              >
                                Annuler
                              </button>
                            </div>
                            {displayNameError && (
                              <p className="profile-inline-name-error" role="alert">{displayNameError}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <h2 className="profile-page-name">{userName}</h2>
                            {!isGuest && user?.uid && (
                              <button
                                type="button"
                                className="profile-inline-name-edit-btn"
                                onClick={startEditingDisplayName}
                              >
                                Modifier le nom
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="profile-header-stats">
                        <div className="profile-stat-item">
                          <span className="profile-stat-label">Niveau</span>
                          <span className="profile-stat-value">{level}</span>
                        </div>
                        <div className="profile-stat-item">
                          <span className="profile-stat-label">XP</span>
                          <span className="profile-stat-value">{xp}</span>
                        </div>
                        <div className="profile-stat-item">
                          <span className="profile-stat-label streak-label">
                            <span className="streak-icon">🔥</span>
                            Série
                          </span>
                          <span className="profile-stat-value">
                            {profileStats?.streak || 0} jour{profileStats?.streak !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Établissement et classe */}
                <div className="profile-section-card profile-establishment-section">
                  <h3 className="profile-section-title">Établissement et classe</h3>
                  <p className="profile-establishment-hint">Ces informations permettent à ton professeur de filtrer les élèves par niveau.</p>
                  <div className="profile-establishment-fields">
                    <div className="profile-establishment-field">
                      <label htmlFor="profile-establishment-select">Établissement</label>
                      <select
                        id="profile-establishment-select"
                        value={profileEstablishment}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === 'Autre') {
                            setRequestModalType('establishment')
                            setRequestModalOpen(true)
                            setProfileEstablishment(profileEstablishment)
                            return
                          }
                          setProfileEstablishment(v)
                          if (user?.uid) updateUserProfile(user.uid, { establishment: v || null }).catch(console.error)
                        }}
                        disabled={loadingEstablishments}
                      >
                        <option value="">— Choisir —</option>
                        {establishmentsList.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="profile-establishment-field">
                      <label htmlFor="profile-class-select">Classe</label>
                      <select
                        id="profile-class-select"
                        value={profileClass}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === 'Autre') {
                            setRequestModalType('class')
                            setRequestModalOpen(true)
                            setProfileClass(profileClass)
                            return
                          }
                          setProfileClass(v)
                          if (user?.uid) updateUserProfile(user.uid, { class: v || null }).catch(console.error)
                        }}
                        disabled={loadingClasses}
                      >
                        <option value="">— Choisir —</option>
                        {classesList.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Rejoindre une classe (code donné par le professeur) */}
                <div className="profile-section-card profile-teacher-class-section">
                  <h3 className="profile-section-title">Ma classe</h3>
                  {userData?.teacherClassId && teacherClassName ? (
                    <>
                      <p className="profile-teacher-class-joined">
                        Vous êtes dans la classe : <strong>{teacherClassName}</strong>
                      </p>
                      <button
                        type="button"
                        className="profile-teacher-class-leave"
                        onClick={async () => {
                          if (!user?.uid) return
                          setJoinClassLoading(true)
                          setJoinClassError('')
                          try {
                            await leaveTeacherClass(user.uid)
                            await refreshUserData()
                            setTeacherClassName(null)
                          } catch (err) {
                            setJoinClassError(err.message || 'Erreur')
                          } finally {
                            setJoinClassLoading(false)
                          }
                        }}
                        disabled={joinClassLoading}
                      >
                        {joinClassLoading ? '…' : 'Quitter la classe'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="profile-teacher-class-hint">
                        Entre le code donné par ton professeur pour rejoindre sa classe.
                      </p>
                      <div className="profile-teacher-class-join-row">
                        <input
                          type="text"
                          className="profile-teacher-class-code-input"
                          placeholder="Code classe"
                          value={classCodeInput}
                          onChange={(e) => {
                            setClassCodeInput(e.target.value.toUpperCase().trim())
                            setJoinClassError('')
                          }}
                          disabled={joinClassLoading}
                        />
                        <button
                          type="button"
                          className="profile-teacher-class-join-btn"
                          onClick={async () => {
                            const code = classCodeInput.trim()
                            if (!code || !user?.uid) return
                            setJoinClassLoading(true)
                            setJoinClassError('')
                            try {
                              await joinTeacherClass(user.uid, code)
                              await refreshUserData()
                              setClassCodeInput('')
                            } catch (err) {
                              setJoinClassError(err.message || 'Code invalide.')
                            } finally {
                              setJoinClassLoading(false)
                            }
                          }}
                          disabled={joinClassLoading || !classCodeInput.trim()}
                        >
                          {joinClassLoading ? '…' : 'Rejoindre'}
                        </button>
                      </div>
                      {joinClassError && <p className="profile-teacher-class-error">{joinClassError}</p>}
                    </>
                  )}
                </div>

                {/* Section 2: Radar des Compétences */}
                {radarData.length > 0 && (
                  <div className="profile-section-card">
                    <h3 className="profile-section-title">Radar des Compétences</h3>
                    <SkillsRadar data={radarData} />
                  </div>
                )}

                {/* Section 3: Analyse Tactique */}
                {(strongestPoint || weakestPoint) && (
                  <div className="profile-section-card">
                    <h3 className="profile-section-title">Analyse Tactique</h3>
                    <div className="tactical-analysis">
                      {strongestPoint && (
                        <div className="tactical-card tactical-card-strong">
                          <div className="tactical-card-icon">⭐</div>
                          <div className="tactical-card-content">
                            <h4 className="tactical-card-title">Ta Spécialité</h4>
                            <p className="tactical-card-item">{strongestPoint.name}</p>
                            <p className="tactical-card-percentage">{strongestPoint.percentage}% de réussite</p>
                          </div>
                        </div>
                      )}
                      {weakestPoint && (
                        <div className="tactical-card tactical-card-weak">
                          <div className="tactical-card-icon">🎯</div>
                          <div className="tactical-card-content">
                            <h4 className="tactical-card-title">Ta Némésis</h4>
                            <p className="tactical-card-item">{weakestPoint.name}</p>
                            <p className="tactical-card-percentage">{weakestPoint.percentage}% de réussite</p>
                            <button 
                              type="button"
                              className="tactical-card-action"
                              onClick={() => setActiveTab('progress')}
                            >
                              Voir les suggestions
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 4: Historique d'Activité (Heatmap) */}
                {allAttempts.length > 0 && (
                  <div className="profile-section-card">
                    <h3 className="profile-section-title">Historique d'Activité</h3>
                    <ActivityHeatmap attempts={allAttempts} />
                  </div>
                )}

                {/* Section 5: Détails des Performances */}
                {profileStats && (Object.keys(profileStats.degreeStats).length > 0 || Object.keys(profileStats.cadenceStats).length > 0) && (
                  <div className="profile-section-card">
                    <h3 className="profile-section-title">Détails des Performances</h3>
                    <PerformanceDetails 
                      degreeStats={profileStats.degreeStats}
                      cadenceStats={profileStats.cadenceStats}
                    />
                  </div>
                )}

                {/* Bouton Déconnexion */}
                <button
                  className="profile-logout-btn"
                  onClick={async () => {
                    try {
                      await logout()
                      navigate('/')
                    } catch (error) {
                      console.error('Erreur lors de la déconnexion:', error)
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Déconnexion
                </button>
              </>
            )}
          </div>
        )}
        </>
        )}
      </main>

      {/* Bottom Navigation (sur la page Horizons, les clics ramènent au dashboard avec l'onglet choisi) */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${!isHorizonsPage && activeTab === 'home' ? 'nav-item-active' : ''}`}
          onClick={() => isHorizonsPage ? navigate('/student-dashboard', { state: { tab: 'home' } }) : setActiveTab('home')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Accueil</span>
        </button>
        <button
          className={`nav-item ${!isHorizonsPage && activeTab === 'campaign' ? 'nav-item-active' : ''}`}
          onClick={() => isHorizonsPage ? navigate('/student-dashboard', { state: { tab: 'campaign' } }) : setActiveTab('campaign')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Parcours</span>
        </button>
        <button
          className={`nav-item ${!isHorizonsPage && activeTab === 'progress' ? 'nav-item-active' : ''}`}
          onClick={() => isHorizonsPage ? navigate('/student-dashboard', { state: { tab: 'progress' } }) : setActiveTab('progress')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Progression</span>
        </button>
        <button
          className={`nav-item ${!isHorizonsPage && activeTab === 'free-mode' ? 'nav-item-active' : ''}`}
          onClick={() => isHorizonsPage ? navigate('/student-dashboard', { state: { tab: 'free-mode' } }) : setActiveTab('free-mode')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>Mode Libre</span>
        </button>
        <button
          className={`nav-item ${!isHorizonsPage && activeTab === 'codex' ? 'nav-item-active' : ''}`}
          onClick={() => isHorizonsPage ? navigate('/student-dashboard', { state: { tab: 'codex' } }) : setActiveTab('codex')}
          aria-label="Codex"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2"></path>
            <path d="M8 7h8"></path>
            <path d="M8 11h8"></path>
          </svg>
          <span>Codex</span>
        </button>
      </nav>

      {selectedAttempt && (
        <AttemptDetailModal
          attempt={selectedAttempt}
          exerciseTitle={cleanExerciseTitle(selectedAttempt.exerciseTitle)}
          onClose={() => setSelectedAttempt(null)}
        />
      )}

      <RequestEstablishmentModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        type={requestModalType}
        userId={user?.uid}
      />
    </div>
  )
}

export default StudentDashboard
