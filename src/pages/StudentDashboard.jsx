import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getExerciseById, getLatestPublicExercises } from '../services/exerciseService'
import { getUserAttempts, getAllUserAttempts } from '../services/attemptService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import ProfileModal from '../components/ProfileModal'
import FreeMode from './FreeMode'
import CampaignMap from '../components/CampaignMap'
import SkillsRadar from '../components/SkillsRadar'
import ActivityHeatmap from '../components/ActivityHeatmap'
import PerformanceDetails from '../components/PerformanceDetails'
import ProgressChart from '../components/ProgressChart'
import BadgeSystem from '../components/BadgeSystem'
import WeeklyObjectives from '../components/WeeklyObjectives'
import TrendIndicators from '../components/TrendIndicators'
import MilestoneCelebrations from '../components/MilestoneCelebrations'
import PeriodComparison from '../components/PeriodComparison'
import ExerciseSuggestions from '../components/ExerciseSuggestions'
import WeeklyStats from '../components/WeeklyStats'
import AchievementsDashboard from '../components/AchievementsDashboard'
import DailyLearningBlock from '../components/DailyLearningBlock'
import ExerciseCard from '../components/ExerciseCard'
import { checkAndUnlockBadges } from '../services/badgeService'
import { PREVIEW_SCENARIOS, getPreviewProgress, getPreviewXP, getPreviewStreak } from '../utils/previewScenarios'
import './StudentDashboard.css'

const PREVIEW_SCENARIO_STORAGE_KEY = 'opus_preview_prof_scenario'
/** Nombre max d'entrées affichées dans la liste "Historique" (onglet Progression). */
const PROGRESS_HISTORY_LIST_LIMIT = 10
/** Nombre max de points affichés dans le graphique de progression (derniers exercices). */
const PROGRESS_CHART_LIMIT = 50
/** Même chose sur petit écran (≤768px) pour garder l'axe X lisible. */
const PROGRESS_CHART_LIMIT_MOBILE = 30

function StudentDashboard() {
  const { user, userData, logout, isGuest, disableGuestMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('home')
  /** Mode preview prof : scénario simulé ('' = données réelles du prof). Persisté en sessionStorage pour survivre à la navigation (ex. lancement / sortie d'un exercice). */
  const [previewScenario, setPreviewScenario] = useState(() => {
    try {
      return typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(PREVIEW_SCENARIO_STORAGE_KEY) ?? '') : ''
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  
  // États pour Profil
  const [profileStats, setProfileStats] = useState(null)
  const [loadingProfileStats, setLoadingProfileStats] = useState(false)
  const [allAttempts, setAllAttempts] = useState([])
  
  // État pour toutes les tentatives (pour le calcul du streak)
  const [allAttemptsForStreak, setAllAttemptsForStreak] = useState([])

  // Derniers exercices ajoutés (accueil)
  const [latestExercises, setLatestExercises] = useState([])
  const [loadingLatestExercises, setLoadingLatestExercises] = useState(false)

  // Filtre initial pour le Mode Libre (clic sur une pastille → ouvrir Mode Libre avec ce filtre)
  const [freeModeInitialFilter, setFreeModeInitialFilter] = useState(null)

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
  const streak = usePreviewValues ? getPreviewStreak(previewScenario) : calculateStreak(allAttemptsForStreak)

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

    // Ajouter les stats de degrés
    Object.entries(degreeStats).forEach(([degree, stats]) => {
      const percentage = stats.total > 0 
        ? Math.round((stats.correct / stats.total) * 100) 
        : 0
      allStats.push({
        name: degree,
        percentage,
        total: stats.total
      })
    })

    // Ajouter les stats de cadences
    Object.entries(cadenceStats).forEach(([cadence, stats]) => {
      const percentage = stats.total > 0 
        ? Math.round((stats.correct / stats.total) * 100) 
        : 0
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

  return (
    <div className="student-dashboard">
      {/* Bannière Preview pour les professeurs */}
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
          </div>
          <button 
            className="preview-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            Retour
          </button>
        </div>
      )}
      
      {/* Header enrichi : branding, indicateurs, CTA ; différenciation par onglet et niveau */}
      <header
        className={`student-header student-header--${activeTab} student-header--${levelTier}`}
        data-level-tier={levelTier}
      >
        <div className="student-header-content">
          <div className="student-header-left">
            <span className="student-header-brand" aria-hidden="true">Opus Lab</span>
            <div className="student-greeting">
              <h1>Bonjour, {firstName} 👋</h1>
              {isGuest && (
                <p className="guest-badge">Mode invité</p>
              )}
              {!isGuest && (
                <>
                  <p className="student-header-subtitle student-header-tier-label">{levelTierLabel}</p>
                  {streak > 0 && (
                    <p className="student-header-subtitle">Continue ta série</p>
                  )}
                </>
              )}
            </div>
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
              onClick={() => !isGuest && setActiveTab('profile')}
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

      {/* Contenu principal */}
      <main className="student-main">
        {activeTab === 'home' && (
          <div className="student-content">
            {/* Bloc pédagogique : prochaine étape + conseil du jour + CTA */}
            {!isGuest && (
              <DailyLearningBlock
                userId={previewScenario ? undefined : user?.uid}
                previewProgress={previewScenario ? getPreviewProgress(previewScenario) : null}
                onContinueClick={handleHeaderCtaClick}
              />
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
                  <button
                    type="button"
                    className="latest-exercises-cta"
                    onClick={() => setActiveTab('free-mode')}
                  >
                    Voir tout en Mode Libre
                  </button>
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
                {/* Graphique de progression (N derniers exercices pour lisibilité) */}
                {attempts.length >= 2 && (
                  <div className="progress-chart-section">
                    <ProgressChart 
                      data={[...attempts]
                        .sort((a, b) => {
                          const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
                          const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0)
                          return dateA - dateB
                        })
                        .slice(-(isSmallScreen ? PROGRESS_CHART_LIMIT_MOBILE : PROGRESS_CHART_LIMIT))
                        .map((attempt, index) => ({
                          name: `Ex. ${index + 1}`,
                          score: attempt.score,
                          date: formatDate(attempt.completedAt),
                          exerciseTitle: cleanExerciseTitle(attempt.exerciseTitle)
                        }))}
                    />
                  </div>
                )}

                {/* Objectifs hebdomadaires */}
                {!isGuest && (
                  <div className="progress-section-card">
                    <WeeklyObjectives userId={user?.uid} attempts={allAttemptsForStreak} />
                  </div>
                )}

                {/* Statistiques hebdomadaires */}
                <div className="progress-section-card">
                  <WeeklyStats attempts={allAttemptsForStreak} />
                </div>

                {/* Indicateurs de tendance */}
                <div className="progress-section-card">
                  <TrendIndicators attempts={allAttemptsForStreak} />
                </div>

                {/* Comparaison de périodes */}
                <div className="progress-section-card">
                  <PeriodComparison attempts={allAttemptsForStreak} />
                </div>

                {/* Accomplissements */}
                {!isGuest && (
                  <div className="progress-section-card">
                    <AchievementsDashboard userId={user?.uid} attempts={allAttemptsForStreak} userXp={userData?.xp} />
                  </div>
                )}

                {/* Badges récents */}
                {!isGuest && (
                  <div className="progress-section-card">
                    <BadgeSystem userId={user?.uid} attempts={allAttemptsForStreak} userXp={userData?.xp} />
                  </div>
                )}

                {/* Suggestions d'exercices */}
                {!isGuest && profileStats && (
                  <div className="progress-section-card">
                    <ExerciseSuggestions profileStats={profileStats} attempts={allAttemptsForStreak} />
                  </div>
                )}

                {/* Historique des exercices */}
                <div className="progress-section-card">
                  <h3 className="progress-section-title">Historique</h3>
                  <div className="attempts-list">
                    {attempts.slice(0, PROGRESS_HISTORY_LIST_LIMIT).map((attempt) => (
                      <div key={attempt.id} className="attempt-card">
                        <div className="attempt-main">
                          <div className="attempt-info">
                            <h4 className="attempt-title">
                              {cleanExerciseTitle(attempt.exerciseTitle)}
                            </h4>
                            <p className="attempt-date">{formatDate(attempt.completedAt)}</p>
                          </div>
                          <div className={`attempt-score attempt-score-${attempt.score >= 80 ? 'high' : attempt.score >= 60 ? 'medium' : 'low'}`}>
                            {attempt.score}%
                          </div>
                        </div>
                        <div className="attempt-footer">
                          <span className="attempt-stats">
                            ✅ {attempt.correctCount}/{attempt.totalQuestions}
                          </span>
                          {attempt.xpGained > 0 && (
                            <span className="attempt-xp">+{attempt.xpGained} XP</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        )}

        {activeTab === 'free-mode' && (
          <FreeMode
            initialFilter={freeModeInitialFilter}
            onInitialFilterConsumed={() => setFreeModeInitialFilter(null)}
          />
        )}

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
                {/* Section 1: Header & Global (Gamification) */}
                <div className="profile-header-section">
                  <div className="profile-header-gamification">
                    <div className="profile-avatar-container">
                      {user?.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={userName} 
                          className="profile-page-avatar"
                        />
                      ) : (
                        <div className="profile-page-avatar-placeholder">
                          {firstName[0]?.toUpperCase() || 'E'}
                        </div>
                      )}
                    </div>
                    <div className="profile-header-info">
                      <h2 className="profile-page-name">{userName}</h2>
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

                  {/* Bloc 3 Grosses Stats */}
                  {profileStats && (
                    <div className="profile-big-stats">
                      <div className="big-stat-card">
                        <div className="big-stat-value">{profileStats.totalAttempts}</div>
                        <div className="big-stat-label">Exercices complétés</div>
                      </div>
                      <div className="big-stat-card">
                        <div className="big-stat-value">{Math.round(profileStats.averageScore)}%</div>
                        <div className="big-stat-label">Score moyen</div>
                      </div>
                      <div className="big-stat-card">
                        <div className="big-stat-value">{profileStats.totalCorrect}</div>
                        <div className="big-stat-label">Réponses correctes</div>
                      </div>
                    </div>
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
                              className="tactical-card-action"
                              onClick={() => {
                                // TODO: Implémenter la fonctionnalité d'entraînement ciblé
                                alert('Fonctionnalité à venir : entraînement ciblé sur ce point faible')
                              }}
                            >
                              Travailler ce point faible
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
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Accueil</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'campaign' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('campaign')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Parcours</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'progress' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Progression</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'free-mode' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('free-mode')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>Mode Libre</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'profile' ? 'nav-item-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profil</span>
        </button>
      </nav>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userRole={isPreviewMode ? 'student' : (userData?.role || 'student')}
        isPreviewMode={isPreviewMode}
      />
    </div>
  )
}

export default StudentDashboard
