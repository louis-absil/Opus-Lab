import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getExercisesByAuthor, deleteExercise, duplicateExercise } from '../services/exerciseService'
import { getAuthErrorMessage } from '../utils/errorHandler'
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
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [tagsTooltipId, setTagsTooltipId] = useState(null)
  const menuRefs = useRef({})
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      return
    }
    
    loadExercises()
  }, [user, authLoading])

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Fermer le menu utilisateur
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
      
      // Fermer les menus contextuels des cartes
      Object.keys(menuRefs.current).forEach((id) => {
        if (menuRefs.current[id] && !menuRefs.current[id].contains(event.target)) {
          setOpenMenuId(null)
        }
      })
      
      // Fermer le tooltip des tags si on clique ailleurs
      if (!event.target.closest('.dashboard-card-tags')) {
        setTagsTooltipId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const handleDelete = async (exerciseId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet exercice ?')) {
      return
    }

    try {
      setDeletingId(exerciseId)
      setOpenMenuId(null)
      await deleteExercise(exerciseId)
      await loadExercises()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression de l\'exercice')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (exerciseId) => {
    try {
      setDuplicatingId(exerciseId)
      setOpenMenuId(null)
      const newId = await duplicateExercise(exerciseId, user.uid, user.displayName || user.email)
      await loadExercises()
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
      year: 'numeric'
    }).format(date)
  }

  const getYouTubeThumbnail = (videoId) => {
    if (!videoId) return null
    // Extraire l'ID si c'est une URL complète
    const id = videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] || videoId
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
  }

  const toggleCardMenu = (exerciseId, e) => {
    e.stopPropagation()
    setOpenMenuId(openMenuId === exerciseId ? null : exerciseId)
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
            className="dashboard-signin-btn"
            onClick={async () => {
              try {
                await signInWithGoogle()
              } catch (error) {
                console.error('Erreur lors de la connexion:', error)
                if (error.code !== 'auth/popup-closed-by-user') {
                  alert(getAuthErrorMessage(error))
                }
              }
            }}
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header simplifié et sticky */}
      <header className="dashboard-header">
          <h1 className="dashboard-title">Mes Exercices</h1>
        <div className="dashboard-header-right" ref={userMenuRef}>
          <button
            className="dashboard-user-avatar-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-label="Menu utilisateur"
          >
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Utilisateur'} 
                className="dashboard-user-avatar"
              />
            ) : (
              <div className="dashboard-user-avatar-placeholder">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </button>
          
          {/* Menu dropdown utilisateur */}
          {isUserMenuOpen && (
            <div className="dashboard-user-menu">
              <div className="dashboard-user-menu-header">
                <div className="dashboard-user-menu-name">
                  {userData?.displayName || user?.displayName || 'Utilisateur'}
                </div>
                <div className="dashboard-user-menu-role">
                  {userData?.role === 'teacher' ? 'Professeur' : 'Élève'}
            </div>
          </div>
              <div className="dashboard-user-menu-divider"></div>
              <button 
                className="dashboard-user-menu-item"
                onClick={() => {
                  setIsProfileModalOpen(true)
                  setIsUserMenuOpen(false)
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profil et statistiques</span>
              </button>
              {userData?.role === 'teacher' && (
              <button 
                  className="dashboard-user-menu-item"
                  onClick={() => {
                    navigate('/student-dashboard')
                    setIsUserMenuOpen(false)
                  }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Voir interface élève</span>
              </button>
          )}
              <div className="dashboard-user-menu-divider"></div>
          <button 
                className="dashboard-user-menu-item dashboard-user-menu-item-danger"
            onClick={async () => {
              try {
                await logout()
                navigate('/')
              } catch (error) {
                console.error('Erreur lors de la déconnexion:', error)
              }
                  setIsUserMenuOpen(false)
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
                <span>Déconnexion</span>
          </button>
            </div>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className="dashboard-content">
        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Chargement des exercices...</p>
      </div>
        ) : exercises.length === 0 ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">📚</div>
            <h2>Aucun exercice pour le moment</h2>
            <p>Créez votre premier exercice d'analyse harmonique</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {exercises.map((exercise) => {
              const videoId = exercise.video?.id
              const thumbnailUrl = getYouTubeThumbnail(videoId)
              const isMenuOpen = openMenuId === exercise.id
              
              return (
            <div 
              key={exercise.id} 
              className="dashboard-card"
              onClick={() => navigate(`/editor/${exercise.id}`)}
            >
                  {/* Miniature vidéo ou placeholder */}
                  <div className="dashboard-card-thumbnail">
                    {thumbnailUrl ? (
                      <img 
                        src={thumbnailUrl} 
                        alt={exercise.metadata?.workTitle || exercise.video?.title || 'Vidéo'}
                        className="dashboard-card-thumbnail-img"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextElementSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div 
                      className="dashboard-card-thumbnail-placeholder"
                      style={{ display: thumbnailUrl ? 'none' : 'flex' }}
                    >
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
              </div>

                    {/* Badge de statut */}
                    <div className={`dashboard-card-status-badge ${exercise.status || 'draft'}`}>
                      {exercise.status === 'published' ? 'Publié' : 'Brouillon'}
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="dashboard-card-body">
                    <div className="dashboard-card-header">
                      <h3 className="dashboard-card-title">
                        {exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || exercise.metadata?.title || 'Sans titre'}
                      </h3>
                      <button
                        className="dashboard-card-menu-btn"
                        onClick={(e) => toggleCardMenu(exercise.id, e)}
                        aria-label="Options"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="12" cy="5" r="1"></circle>
                          <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                      </button>
                      
                      {/* Menu contextuel */}
                      {isMenuOpen && (
                        <div 
                          className="dashboard-card-menu"
                          ref={(el) => menuRefs.current[exercise.id] = el}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="dashboard-card-menu-item"
                            onClick={() => navigate(`/editor/${exercise.id}`)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span>Éditer</span>
                          </button>
                          <button
                            className="dashboard-card-menu-item"
                            onClick={() => handleDuplicate(exercise.id)}
                            disabled={duplicatingId === exercise.id}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>{duplicatingId === exercise.id ? 'Duplication...' : 'Dupliquer'}</span>
                          </button>
                          <button
                            className="dashboard-card-menu-item dashboard-card-menu-item-danger"
                            onClick={() => handleDelete(exercise.id)}
                            disabled={deletingId === exercise.id}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>{deletingId === exercise.id ? 'Suppression...' : 'Supprimer'}</span>
                          </button>
                  </div>
                )}
                  </div>

                    {exercise.metadata?.composer && (
                      <p className="dashboard-card-composer">
                        {exercise.metadata.composer}
                      </p>
                )}

                    {/* Tags avec défilement horizontal */}
                {exercise.autoTags && exercise.autoTags.length > 0 && (
                  <div className="dashboard-card-tags">
                        <div 
                          className="dashboard-card-tags-scroll"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTagsTooltipId(tagsTooltipId === exercise.id ? null : exercise.id)
                          }}
                        >
                          {exercise.autoTags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="dashboard-tag">
                        {tag}
                      </span>
                    ))}
                          {exercise.autoTags.length > 2 && (
                      <span className="dashboard-tag-more">
                              +{exercise.autoTags.length - 2}
                      </span>
                    )}
                        </div>
                        
                        {/* Tooltip avec tous les tags au clic */}
                        {tagsTooltipId === exercise.id && (
                          <div 
                            className="dashboard-card-tags-tooltip"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="dashboard-card-tags-tooltip-header">
                              <strong>Tags ({exercise.autoTags.length})</strong>
                              <button
                                className="dashboard-card-tags-tooltip-close"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTagsTooltipId(null)
                                }}
                                aria-label="Fermer"
                              >
                                ×
                              </button>
                            </div>
                            <div className="dashboard-card-tags-tooltip-content">
                              {exercise.autoTags.map((tag, index) => (
                                <span key={index} className="dashboard-tag-tooltip">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                  </div>
                )}

                    {/* Footer avec métadonnées */}
                <div className="dashboard-card-footer">
                      <div className="dashboard-card-meta">
                        <span className="dashboard-card-meta-item">
                          {exercise.markers?.length || 0} marqueur{exercise.markers?.length !== 1 ? 's' : ''}
                        </span>
                        {exercise.metadata?.difficulty && (
                          <span className={`dashboard-card-difficulty ${exercise.metadata.difficulty}`}>
                            {exercise.metadata.difficulty}
                          </span>
                        )}
                      </div>
                  <span className="dashboard-card-date">
                    {formatDate(exercise.createdAt)}
                  </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {userData?.role === 'teacher' && (
        <button
          className="dashboard-fab"
          onClick={() => navigate('/editor')}
          aria-label="Créer un nouvel exercice"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      )}
      
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userRole={userData?.role || 'teacher'}
      />
    </div>
  )
}

export default Dashboard
