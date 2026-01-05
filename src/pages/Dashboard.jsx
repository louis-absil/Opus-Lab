import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getExercisesByAuthor, deleteExercise, duplicateExercise } from '../services/exerciseService'
import ProfileModal from '../components/ProfileModal'
import './Dashboard.css'

function Dashboard() {
  const { user, userData, loading: authLoading, signInWithGoogle, logout } = useAuth()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      // Si pas connecté, proposer la connexion
      return
    }
    
    loadExercises()
  }, [user, authLoading])

  const loadExercises = async () => {
    try {
      setLoading(true)
      const data = await getExercisesByAuthor(user.uid)
      setExercises(data)
    } catch (error) {
      console.error('Erreur lors du chargement des exercices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (exerciseId, e) => {
    e.stopPropagation()
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet exercice ?')) {
      return
    }

    try {
      setDeletingId(exerciseId)
      await deleteExercise(exerciseId)
      await loadExercises()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression de l\'exercice')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (exerciseId, e) => {
    e.stopPropagation()
    try {
      setDuplicatingId(exerciseId)
      const newId = await duplicateExercise(exerciseId, user.uid, user.displayName || user.email)
      await loadExercises()
      // Optionnel : naviguer vers le nouvel exercice
      // navigate(`/editor/${newId}`)
    } catch (error) {
      console.error('Erreur lors de la duplication:', error)
      alert('Erreur lors de la duplication de l\'exercice')
    } finally {
      setDuplicatingId(null)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date inconnue'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (authLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-empty">
          <div className="dashboard-empty-icon">🔐</div>
          <h2>Connexion requise</h2>
          <p>Connectez-vous pour accéder à vos exercices</p>
          <button 
            className="dashboard-new-btn"
            onClick={signInWithGoogle}
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header moderne avec logout */}
      <div className="dashboard-top-bar">
        <div className="dashboard-top-left">
          <h1 className="dashboard-title">Mes Exercices</h1>
        </div>
        <div className="dashboard-top-right">
          <div 
            className="user-profile clickable-profile"
            onClick={() => setIsProfileModalOpen(true)}
            title="Voir le profil et les statistiques"
          >
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Utilisateur'} 
                className="user-avatar"
              />
            )}
            <div className="user-info">
              <span className="user-name">{userData?.displayName || user?.displayName || 'Utilisateur'}</span>
              <span className="user-role">{userData?.role === 'teacher' ? 'Professeur' : 'Élève'}</span>
            </div>
          </div>
          {userData?.role === 'teacher' && (
            <>
              <button 
                className="dashboard-new-btn"
                onClick={() => navigate('/editor')}
              >
                <span className="btn-icon">+</span>
                Nouvel Exercice
              </button>
              <button 
                className="dashboard-preview-btn"
                onClick={() => navigate('/student-dashboard')}
                title="Voir l'interface élève"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Voir interface élève</span>
              </button>
            </>
          )}
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
        </div>
      </div>

      <div className="dashboard-content">
        {exercises.length === 0 ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">📚</div>
            <h2>Aucun exercice pour le moment</h2>
            <p>Créez votre premier exercice d'analyse harmonique</p>
            {userData?.role === 'teacher' && (
              <button 
                className="dashboard-new-btn"
                onClick={() => navigate('/editor')}
              >
                <span className="btn-icon">+</span>
                Créer un exercice
              </button>
            )}
          </div>
        ) : (
          <div className="dashboard-grid">
          {exercises.map((exercise) => (
            <div 
              key={exercise.id} 
              className="dashboard-card"
              onClick={() => navigate(`/editor/${exercise.id}`)}
            >
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  {exercise.metadata?.exerciseTitle || exercise.metadata?.title || 'Sans titre'}
                </h3>
                <span className={`dashboard-card-status ${exercise.status || 'draft'}`}>
                  {exercise.status === 'published' ? 'Publié' : 'Brouillon'}
                </span>
              </div>

              <div className="dashboard-card-content">
                {exercise.metadata?.composer && (
                  <div className="dashboard-card-info">
                    <span className="dashboard-card-label">Compositeur:</span>
                    <span>{exercise.metadata.composer}</span>
                  </div>
                )}
                
                {exercise.metadata?.workTitle && (
                  <div className="dashboard-card-info">
                    <span className="dashboard-card-label">Œuvre:</span>
                    <span>{exercise.metadata.workTitle}</span>
                  </div>
                )}

                {exercise.video && (
                  <div className="dashboard-card-info">
                    <span className="dashboard-card-label">Vidéo:</span>
                    <span className="dashboard-card-video">{exercise.video.title || exercise.video.id}</span>
                  </div>
                )}

                {exercise.metadata?.difficulty && (
                  <div className="dashboard-card-info">
                    <span className="dashboard-card-label">Niveau:</span>
                    <span className={`dashboard-card-difficulty ${exercise.metadata.difficulty}`}>
                      {exercise.metadata.difficulty}
                    </span>
                  </div>
                )}

                {exercise.autoTags && exercise.autoTags.length > 0 && (
                  <div className="dashboard-card-tags">
                    {exercise.autoTags.slice(0, 5).map((tag, index) => (
                      <span key={index} className="dashboard-tag">
                        {tag}
                      </span>
                    ))}
                    {exercise.autoTags.length > 5 && (
                      <span className="dashboard-tag-more">
                        +{exercise.autoTags.length - 5}
                      </span>
                    )}
                  </div>
                )}

                <div className="dashboard-card-footer">
                  <span className="dashboard-card-date">
                    {formatDate(exercise.createdAt)}
                  </span>
                  <span className="dashboard-card-markers">
                    {exercise.markers?.length || 0} marqueur{exercise.markers?.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="dashboard-card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="dashboard-action-btn edit-btn"
                  onClick={() => navigate(`/editor/${exercise.id}`)}
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  className="dashboard-action-btn duplicate-btn"
                  onClick={(e) => handleDuplicate(exercise.id, e)}
                  disabled={duplicatingId === exercise.id}
                  title="Dupliquer"
                >
                  {duplicatingId === exercise.id ? '⏳' : '📋'}
                </button>
                <button
                  className="dashboard-action-btn delete-btn"
                  onClick={(e) => handleDelete(exercise.id, e)}
                  disabled={deletingId === exercise.id}
                  title="Supprimer"
                >
                  {deletingId === exercise.id ? '⏳' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
      
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userRole={userData?.role || 'teacher'}
      />
    </div>
  )
}

export default Dashboard

