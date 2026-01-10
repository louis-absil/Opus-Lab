import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { searchPublicExercises, getRandomPublicExercise, getExerciseById } from '../services/exerciseService'
import { getUserAttempts } from '../services/attemptService'
import ProfileModal from '../components/ProfileModal'
import './StudentDashboard.css'

function StudentDashboard() {
  const { user, userData, logout, isGuest, disableGuestMode } = useAuth()
  const navigate = useNavigate()
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

  // Charger les compositeurs disponibles
  useEffect(() => {
    loadComposers()
  }, [])

  // Charger l'historique des tentatives (uniquement si connecté, pas en mode invité)
  useEffect(() => {
    if (user && !isGuest) {
      loadAttempts()
    } else {
      setLoadingAttempts(false)
    }
  }, [user, isGuest])

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
            onClick={() => !isGuest && setIsProfileModalOpen(true)}
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
                      <span className="streak-text">Série: 0 jours</span>
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

        {activeTab === 'profile' && (
          <div className="student-content">
            <div className="profile-section">
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
              ) : (
                <div className="profile-content">
                  <div className="profile-header">
                    {user?.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={userName} 
                        className="profile-avatar"
                      />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {firstName[0]?.toUpperCase() || 'E'}
                      </div>
                    )}
                    <h2 className="profile-name">{userName}</h2>
                    <p className="profile-role">Élève • Niveau {level}</p>
                  </div>
                  <button
                    className="profile-stats-btn"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    Voir mes statistiques détaillées
                  </button>
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
                </div>
              )}
            </div>
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
