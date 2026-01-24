import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { searchPublicExercises, getRandomPublicExercise, getExerciseById } from '../services/exerciseService'
import { getUserAttempts, getAllUserAttempts } from '../services/attemptService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import ProfileModal from '../components/ProfileModal'
import FreeMode from './FreeMode'
import SkillsRadar from '../components/SkillsRadar'
import ActivityHeatmap from '../components/ActivityHeatmap'
import PerformanceDetails from '../components/PerformanceDetails'
import './StudentDashboard.css'

function StudentDashboard() {
  const { user, userData, logout, isGuest, disableGuestMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('home')
  
  // États pour Quick Play
  const [composers, setComposers] = useState([])
  const [selectedComposer, setSelectedComposer] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedChordType, setSelectedChordType] = useState('')
  const [isLoadingExercise, setIsLoadingExercise] = useState(false)
  
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

  // Charger les compositeurs disponibles
  useEffect(() => {
    loadComposers()
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

  const loadComposers = async () => {
    try {
      const exercises = await searchPublicExercises()
      const uniqueComposers = [...new Set(exercises
        .map(ex => ex.metadata?.composer)
        .filter(Boolean)
      )].sort()
      setComposers(uniqueComposers)
    } catch (error) {
      console.error('Erreur lors du chargement des compositeurs:', error)
    }
  }

  const loadAttempts = async () => {
    try {
      setLoadingAttempts(true)
      const data = await getUserAttempts(user.uid, 10)
      setAttempts(data)
    } catch (error) {
      console.error('Erreur lors du chargement des tentatives:', error)
    } finally {
      setLoadingAttempts(false)
    }
  }

  const handleQuickPlay = async () => {
    try {
      setIsLoadingExercise(true)
      
      const filters = {}
      if (selectedComposer) filters.composer = selectedComposer
      if (selectedDifficulty) filters.difficulty = selectedDifficulty
      if (selectedChordType) filters.chordType = selectedChordType
      
      const exercise = await getRandomPublicExercise(filters)
      
      if (!exercise) {
        alert('Aucun exercice trouvé avec ces critères. Essayez d\'autres filtres.')
        return
      }
      
      navigate(`/play/${exercise.id}`)
    } catch (error) {
      console.error('Erreur lors du lancement de l\'exercice:', error)
      alert('Erreur lors du lancement de l\'exercice')
    } finally {
      setIsLoadingExercise(false)
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

  const getLevel = (xp) => {
    return Math.floor(xp / 100) + 1
  }

  const getXPForNextLevel = (xp) => {
    const currentLevel = getLevel(xp)
    return currentLevel * 100
  }

  const xp = userData?.xp || 0
  const level = getLevel(xp)
  const xpForNextLevel = getXPForNextLevel(xp)
  const xpProgress = ((xp % 100) / 100) * 100
  const xpInCurrentLevel = xp % 100
  const xpNeededForNextLevel = 100 - xpInCurrentLevel

  const difficulties = ['débutant', 'intermédiaire', 'avancé', 'expert']
  const chordTypes = [
    { value: '6te augmentée', label: '6te Augmentée', icon: '🎵' },
    { value: 'napolitaine', label: 'Napolitaine', icon: '🎼' },
    { value: 'cadence', label: 'Cadence', icon: '🎹' },
    { value: 'septième', label: 'Septième', icon: '🎶' }
  ]

  const userName = userData?.displayName || user?.displayName || 'Élève'
  const firstName = userName.split(' ')[0]

  // Calculer la série (streak) quotidienne
  const calculateStreak = (attempts) => {
    if (!attempts || attempts.length === 0) {
      return 0
    }

    // Grouper les tentatives par jour (sans heure) - utiliser l'heure locale pour cohérence
    const daysWithActivity = new Set()
    attempts.forEach(attempt => {
      if (!attempt.completedAt) return
      const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
      // Utiliser l'heure locale pour créer la clé de date (au lieu de UTC)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      daysWithActivity.add(dateKey)
    })

    if (daysWithActivity.size === 0) {
      return 0
    }

    // Trier les dates
    const sortedDates = Array.from(daysWithActivity).sort().reverse()
    
    // Calculer la série consécutive depuis aujourd'hui - utiliser l'heure locale
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayKey = `${year}-${month}-${day}`
    
    let streak = 0
    let currentDate = new Date(today)
    
    // Vérifier si aujourd'hui a une activité
    if (sortedDates.includes(todayKey)) {
      streak = 1
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      // Si pas d'activité aujourd'hui, commencer depuis hier
      currentDate.setDate(currentDate.getDate() - 1)
    }

    // Continuer à compter les jours consécutifs
    while (true) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      if (sortedDates.includes(dateKey)) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
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
            let isCorrect = false
            if (userAnswer && correct) {
              const validation = validateAnswerWithFunctions(
                userAnswer,
                correct,
                userAnswer.selectedFunction || userAnswer.function || null
              )
              // Niveau 1 = réponse parfaite (correcte)
              isCorrect = validation.level === 1
            }

            // Stats par degré - utiliser degree au lieu de root
            const degree = correct.degree || ''
            if (degree) {
              if (!degreeStats[degree]) {
                degreeStats[degree] = { total: 0, correct: 0 }
              }
              degreeStats[degree].total++
              if (isCorrect) {
                degreeStats[degree].correct++
              }
            }

            // Stats par cadence
            const cadence = correct.cadence || ''
            if (cadence) {
              if (!cadenceStats[cadence]) {
                cadenceStats[cadence] = { total: 0, correct: 0 }
              }
              cadenceStats[cadence].total++
              if (isCorrect) {
                cadenceStats[cadence].correct++
              }
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
      {userData?.role === 'teacher' && (
        <div className="preview-banner">
          <div className="preview-banner-content">
            <span className="preview-icon">👁️</span>
            <span className="preview-text">Mode Preview - Interface élève</span>
          </div>
          <button 
            className="preview-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            Retour
          </button>
        </div>
      )}
      
      {/* Header minimaliste */}
      <header className="student-header">
        <div className="student-header-content">
          <div className="student-greeting">
            <h1>Bonjour, {firstName} 👋</h1>
            {isGuest && (
              <p className="guest-badge">Mode invité</p>
            )}
          </div>
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
      </header>

      {/* Contenu principal */}
      <main className="student-main">
        {activeTab === 'home' && (
          <div className="student-content">
            {/* Section Gamification */}
            {!isGuest && (
              <div className="gamification-card">
                <div className="gamification-content">
                  <div className="level-avatar-container">
                    <div className="level-avatar-wrapper">
                      {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                          alt={userName} 
                          className="level-avatar"
                        />
                      ) : (
                        <div className="level-avatar-placeholder">
                          {firstName[0]?.toUpperCase() || 'E'}
                        </div>
                      )}
                      <div className="level-badge">{level}</div>
                    </div>
                    <svg className="level-ring" viewBox="0 0 100 100">
                      <circle
                        className="level-ring-bg"
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        className="level-ring-progress"
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - xpProgress / 100)}`}
                        transform="rotate(-90 50 50)"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#667eea" />
                          <stop offset="100%" stopColor="#764ba2" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="gamification-stats">
                    <div className="gamification-level">
                      <span className="level-label">Niveau</span>
                      <span className="level-value">{level}</span>
                    </div>
                    <div className="gamification-xp">
                      <div className="xp-info">
                        <span className="xp-current">{xpInCurrentLevel}</span>
                        <span className="xp-separator">/</span>
                        <span className="xp-total">100 XP</span>
                      </div>
                      <div className="xp-progress-bar">
                        <div 
                          className="xp-progress-fill"
                          style={{ width: `${xpProgress}%` }}
                        ></div>
                      </div>
                      <p className="xp-next">Il te reste {xpNeededForNextLevel} XP pour le niveau {level + 1}</p>
                    </div>
                    <div className="gamification-streak">
                      <span className="streak-icon">🔥</span>
                      <span className="streak-text">
                        Série: {calculateStreak(allAttemptsForStreak)} jour{calculateStreak(allAttemptsForStreak) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section Entraînement Aléatoire */}
            <div className="training-section">
              <h2 className="section-title">Entraînement Aléatoire</h2>
              <p className="section-subtitle">Choisis tes préférences et lance-toi !</p>

              {/* Filtres avec Chips */}
              <div className="filters-container">
                <div className="filter-group">
                  <label className="filter-label">Compositeur</label>
                  <div className="chips-container">
                <button 
                      className={`chip ${selectedComposer === '' ? 'chip-active' : ''}`}
                      onClick={() => setSelectedComposer('')}
                    >
                      Tous
                </button>
                    {composers.slice(0, 5).map(composer => (
                <button 
                        key={composer}
                        className={`chip ${selectedComposer === composer ? 'chip-active' : ''}`}
                        onClick={() => setSelectedComposer(composer)}
                >
                        {composer}
                </button>
                    ))}
                    {composers.length > 5 && (
              <button 
                        className="chip chip-more"
                        onClick={() => {/* TODO: Ouvrir modal avec tous les compositeurs */}}
                      >
                        +{composers.length - 5}
              </button>
            )}
          </div>
        </div>

                <div className="filter-group">
                  <label className="filter-label">Difficulté</label>
                  <div className="difficulty-cards">
                    {difficulties.map(diff => (
                      <button
                        key={diff}
                        className={`difficulty-card ${selectedDifficulty === diff ? 'difficulty-card-active' : ''}`}
                        onClick={() => setSelectedDifficulty(diff)}
                      >
                        <span className="difficulty-icon">
                          {diff === 'débutant' && '🌱'}
                          {diff === 'intermédiaire' && '⭐'}
                          {diff === 'avancé' && '🔥'}
                          {diff === 'expert' && '💎'}
                        </span>
                        <span className="difficulty-label">{diff}</span>
                      </button>
                    ))}
              </div>
            </div>
            
            <div className="filter-group">
                  <label className="filter-label">Type d'accord</label>
                  <div className="chord-cards">
                    {chordTypes.map(chord => (
                      <button
                        key={chord.value}
                        className={`chord-card ${selectedChordType === chord.value ? 'chord-card-active' : ''}`}
                        onClick={() => setSelectedChordType(chord.value)}
              >
                        <span className="chord-icon">{chord.icon}</span>
                        <span className="chord-label">{chord.label}</span>
                      </button>
                    ))}
            </div>
            </div>
          </div>
          
              {/* CTA Principal */}
          <button
                className="training-cta"
            onClick={handleQuickPlay}
            disabled={isLoadingExercise}
          >
            {isLoadingExercise ? (
              <>
                    <div className="spinner-small"></div>
                    <span>Recherche...</span>
              </>
            ) : (
              <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Lancer l'entraînement</span>
              </>
            )}
          </button>
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

        {activeTab === 'progress' && (
          <div className="student-content">
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
              <div className="attempts-list">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="attempt-card">
                      <div className="attempt-main">
                        <div className="attempt-info">
                          <h4 className="attempt-title">
                          {attempt.exerciseTitle || 'Exercice'}
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
            )}
          </div>
          </div>
        )}

        {activeTab === 'free-mode' && (
          <FreeMode />
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
        userRole={userData?.role === 'teacher' ? 'student' : (userData?.role || 'student')}
        isPreviewMode={userData?.role === 'teacher'}
      />
    </div>
  )
}

export default StudentDashboard
