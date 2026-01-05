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
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLevel = (xp) => {
    // Niveau basé sur l'XP : 100 XP par niveau
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

  return (
    <div className="student-dashboard">
      {/* Bannière Preview pour les professeurs */}
      {userData?.role === 'teacher' && (
        <div className="preview-banner">
          <div className="preview-banner-content">
            <span className="preview-icon">👁️</span>
            <span className="preview-text">Mode Preview - Vous visualisez l'interface élève</span>
          </div>
          <button 
            className="preview-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            Retour au Dashboard Professeur
          </button>
        </div>
      )}
      
      <div className="dashboard-container">
        {/* Header moderne avec logout */}
        <div className="dashboard-top-bar">
          <div className="dashboard-top-left">
            <h1 className="dashboard-title">
              Bienvenue{isGuest ? '' : `, ${userData?.displayName || user?.displayName || 'Élève'}`} !
            </h1>
            {isGuest && (
              <p className="guest-mode-indicator">Mode invité • Les scores ne seront pas sauvegardés</p>
            )}
          </div>
          <div className="dashboard-top-right">
            {!isGuest && (
              <div 
                className="user-profile clickable-profile"
                onClick={() => setIsProfileModalOpen(true)}
                title="Voir le profil et les statistiques"
              >
                {user?.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Élève'} 
                    className="user-avatar"
                  />
                )}
                <div className="user-info">
                  <span className="user-name">{userData?.displayName || user?.displayName || 'Élève'}</span>
                  <span className="user-role">Élève</span>
                </div>
              </div>
            )}
            {isGuest ? (
              <>
                <button 
                  className="guest-exit-btn"
                  onClick={() => {
                    disableGuestMode()
                    navigate('/')
                  }}
                  title="Quitter le mode invité"
                >
                  Quitter le mode invité
                </button>
                <button 
                  className="guest-connect-btn"
                  onClick={async () => {
                    disableGuestMode()
                    navigate('/')
                    // La connexion se fera sur la landing page
                  }}
                  title="Se connecter"
                >
                  Se connecter
                </button>
              </>
            ) : (
              <button 
                className="logout-btn"
                onClick={async () => {
                  try {
                    await logout()
                    navigate('/')
                  } catch (error) {
                    console.error('Erreur lors de la déconnexion:', error)
                  }
                }}
                title="Déconnexion"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span className="logout-text">Déconnexion</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats - Masqué en mode invité */}
        {!isGuest && (
          <div className="dashboard-header">
            <div className="user-stats">
              <div className="stat-card">
                <div className="stat-label">Niveau</div>
                <div className="stat-value">{level}</div>
              </div>
              <div className="stat-card xp-card">
                <div className="stat-label">XP Total</div>
                <div className="stat-value">{xp}</div>
                <div className="xp-progress">
                  <div className="xp-progress-bar" style={{ width: `${xpProgress}%` }}></div>
                </div>
                <div className="stat-hint">Prochain niveau : {xpForNextLevel} XP</div>
              </div>
            </div>
          </div>
        )}

        {/* Zone A : Quick Play */}
        <div className="dashboard-section quick-play-section">
          <h2>🎯 Entraînement Aléatoire</h2>
          <p className="section-description">
            Lancez un exercice aléatoire basé sur vos critères
          </p>
          
          <div className="quick-play-filters">
            <div className="filter-group">
              <label htmlFor="composer-filter">Compositeur</label>
              <select
                id="composer-filter"
                value={selectedComposer}
                onChange={(e) => setSelectedComposer(e.target.value)}
              >
                <option value="">Tous</option>
                {composers.map(composer => (
                  <option key={composer} value={composer}>{composer}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="difficulty-filter">Difficulté</label>
              <select
                id="difficulty-filter"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="">Toutes</option>
                <option value="débutant">Débutant</option>
                <option value="intermédiaire">Intermédiaire</option>
                <option value="avancé">Avancé</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="chord-type-filter">Type d'accord</label>
              <select
                id="chord-type-filter"
                value={selectedChordType}
                onChange={(e) => setSelectedChordType(e.target.value)}
              >
                <option value="">Tous</option>
                <option value="6te augmentée">Contient des 6tes Augmentées</option>
                <option value="napolitaine">Contient des Napolitaines</option>
                <option value="cadence">Contient des Cadences</option>
                <option value="septième">Contient des Septièmes</option>
              </select>
            </div>
          </div>
          
          <button
            className="quick-play-btn"
            onClick={handleQuickPlay}
            disabled={isLoadingExercise}
          >
            {isLoadingExercise ? (
              <>
                <span className="spinner-small"></span>
                Recherche...
              </>
            ) : (
              <>
                🎲 Lancer l'Entraînement
              </>
            )}
          </button>
        </div>

        {/* Zone B : Code Exercice */}
        <div className="dashboard-section code-section">
          <h2>🔑 Code Exercice</h2>
          <p className="section-description">
            Entrez le code d'un exercice spécifique donné par votre professeur
          </p>
          
          <form onSubmit={handleCodeSubmit} className="code-form">
            <input
              type="text"
              className="code-input"
              placeholder="Ex: abc123xyz"
              value={exerciseCode}
              onChange={(e) => {
                setExerciseCode(e.target.value)
                setCodeError('')
              }}
            />
            {codeError && <div className="code-error">{codeError}</div>}
            <button type="submit" className="code-submit-btn">
              Jouer l'exercice
            </button>
          </form>
        </div>

        {/* Zone C : Ma Progression - Masquée en mode invité */}
        {!isGuest ? (
          <div className="dashboard-section progression-section">
            <h2>📊 Ma Progression</h2>
            
            {loadingAttempts ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement de l'historique...</p>
              </div>
            ) : attempts.length === 0 ? (
              <div className="empty-state">
                <p>Vous n'avez pas encore complété d'exercices.</p>
                <p>Lancez votre premier entraînement ci-dessus !</p>
              </div>
            ) : (
              <div className="attempts-list">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="attempt-card">
                    <div className="attempt-header">
                      <div>
                        <div className="attempt-title">
                          {attempt.exerciseTitle || 'Exercice'}
                        </div>
                        <span className="attempt-date">{formatDate(attempt.completedAt)}</span>
                      </div>
                      <span className={`attempt-score ${attempt.score >= 80 ? 'high' : attempt.score >= 60 ? 'medium' : 'low'}`}>
                        {attempt.score}%
                      </span>
                    </div>
                    <div className="attempt-details">
                      <div className="attempt-stats">
                        <span>✅ {attempt.correctCount}/{attempt.totalQuestions}</span>
                        {attempt.xpGained > 0 && (
                          <span className="xp-gained">+{attempt.xpGained} XP</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="dashboard-section guest-connect-section">
            <h2>💾 Sauvegarder votre progression</h2>
            <p className="section-description">
              Connectez-vous avec Google pour sauvegarder vos scores, gagner de l'XP et suivre votre progression.
            </p>
            <button
              className="guest-connect-action-btn"
              onClick={() => navigate('/')}
            >
              Se connecter avec Google
            </button>
          </div>
        )}
      </div>

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

