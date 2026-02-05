import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import EmailLoginModal from '../components/EmailLoginModal'
import { getExercisesByAuthor, getAllExercisesForTeachers, deleteExercise, duplicateExercise } from '../services/exerciseService'
import { getPendingEstablishmentRequests, getPendingClassRequests } from '../services/referenceDataService'
import { getAuthErrorMessage } from '../utils/errorHandler'
import { getExerciseDisplayTitle } from '../utils/exerciseDisplay'
import { formatTagForDisplay } from '../utils/tagFormatter'
import { categorizeTags, TAG_CATEGORY_LABELS } from '../utils/tagCategories'
import { CLASSICAL_FORMATIONS, CLASSICAL_GENRES, inferFormationsFromWorkTitle, inferGenreFromWorkTitle } from '../data/formations'
import ProfileModal from '../components/ProfileModal'
import EditTagsModal from '../components/EditTagsModal'
import AssignToClassModal from '../components/AssignToClassModal'
import { Eye } from 'lucide-react'
import { canAccessParcoursImagesEditor } from '../config/adminAllowlist'
import './Dashboard.css'

const DIFFICULTIES = ['débutant', 'intermédiaire', 'avancé', 'expert']
const TAG_CATEGORY_KEYS = Object.keys(TAG_CATEGORY_LABELS)

function Dashboard() {
  const { user, userData, loading: authLoading, signInWithGoogle, logout } = useAuth()
  const [showEmailLoginModal, setShowEmailLoginModal] = useState(false)
  const navigate = useNavigate()
  const [exercises, setExercises] = useState([])
  const [exerciseFilter, setExerciseFilter] = useState('mine') // 'mine' | 'all'
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [tagsTooltipId, setTagsTooltipId] = useState(null)
  const [editTagsExercise, setEditTagsExercise] = useState(null)
  const [assignExercise, setAssignExercise] = useState(null)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const menuRefs = useRef({})
  const userMenuRef = useRef(null)

  // Filtres
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedComposer, setSelectedComposer] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedFormations, setSelectedFormations] = useState([])
  const [selectedAuthorId, setSelectedAuthorId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all') // 'all' | 'draft' | 'published'
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [expandedTagSections, setExpandedTagSections] = useState(() => new Set())

  useEffect(() => {
    if (authLoading) return
    if (!user) return
    loadExercises()
  }, [user, authLoading, exerciseFilter])

  // Réinitialiser les filtres "prof" quand on change d'onglet
  useEffect(() => {
    setSelectedAuthorId('')
  }, [exerciseFilter])

  // Debounce recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchText(searchText), 300)
    return () => clearTimeout(t)
  }, [searchText])

  useEffect(() => {
    if (!user || userData?.role !== 'teacher') return
    Promise.all([getPendingEstablishmentRequests(), getPendingClassRequests()])
      .then(([est, cls]) => setPendingRequestsCount((est?.length ?? 0) + (cls?.length ?? 0)))
      .catch(() => setPendingRequestsCount(0))
  }, [user, userData?.role])

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
    if (!user) return
    try {
      setLoading(true)
      const data = exerciseFilter === 'mine'
        ? await getExercisesByAuthor(user.uid)
        : await getAllExercisesForTeachers()
      setExercises(data)
    } catch (error) {
      console.error('Erreur lors du chargement des exercices:', error)
    } finally {
      setLoading(false)
    }
  }

  // Dérivés pour les filtres
  const availableTags = useMemo(() => {
    const set = new Set()
    exercises.forEach((ex) => {
      (ex.autoTags || []).forEach((tag) => set.add(tag))
    })
    return [...set].sort()
  }, [exercises])

  const tagCategories = useMemo(() => categorizeTags(availableTags), [availableTags])

  const composers = useMemo(() => {
    const set = new Set()
    exercises.forEach((ex) => {
      const c = ex.metadata?.composer
      if (c) set.add(c)
    })
    return [...set].sort()
  }, [exercises])

  const authors = useMemo(() => {
    if (exerciseFilter !== 'all') return []
    const byId = new Map()
    exercises.forEach((ex) => {
      const id = ex.authorId || ''
      if (!id) return
      const name = ex.authorId === user?.uid ? 'Vous' : (ex.authorName || 'Professeur')
      if (!byId.has(id)) byId.set(id, { authorId: id, displayName: name })
    })
    return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [exercises, exerciseFilter, user?.uid])

  const formationIds = useMemo(() => {
    const set = new Set()
    exercises.forEach((ex) => {
      if (ex.metadata?.section === 'horizons') return
      const raw = ex.metadata?.formation
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : inferFormationsFromWorkTitle(ex.metadata?.workTitle || '', null)
      arr.forEach((id) => set.add(id))
    })
    return set
  }, [exercises])

  const genreIds = useMemo(() => {
    const set = new Set()
    exercises.forEach((ex) => {
      if (ex.metadata?.section === 'horizons') return
      const id = ex.metadata?.genre || inferGenreFromWorkTitle(ex.metadata?.workTitle || '')
      if (id) set.add(id)
    })
    return set
  }, [exercises])

  const genreOptions = useMemo(() => CLASSICAL_GENRES.filter((g) => genreIds.has(g.id)), [genreIds])
  const formationOptions = useMemo(() => CLASSICAL_FORMATIONS.filter((f) => formationIds.has(f.id)), [formationIds])

  const filteredExercises = useMemo(() => {
    let list = [...exercises]
    if (debouncedSearchText.trim()) {
      const q = debouncedSearchText.toLowerCase().trim()
      list = list.filter(
        (ex) =>
          (ex.metadata?.workTitle || '').toLowerCase().includes(q) ||
          (ex.metadata?.exerciseTitle || '').toLowerCase().includes(q) ||
          (ex.metadata?.composer || '').toLowerCase().includes(q)
      )
    }
    if (selectedDifficulty) list = list.filter((ex) => ex.metadata?.difficulty === selectedDifficulty)
    if (selectedComposer) list = list.filter((ex) => ex.metadata?.composer === selectedComposer)
    if (selectedGenre) {
      list = list.filter((ex) => {
        const g = ex.metadata?.genre || inferGenreFromWorkTitle(ex.metadata?.workTitle || '')
        return g === selectedGenre
      })
    }
    if (selectedFormations.length > 0) {
      list = list.filter((ex) => {
        const raw = ex.metadata?.formation
        const exFormations = Array.isArray(raw) ? raw : raw ? [raw] : inferFormationsFromWorkTitle(ex.metadata?.workTitle || '', null)
        return selectedFormations.every((s) => exFormations.includes(s))
      })
    }
    if (selectedTags.length > 0) {
      list = list.filter((ex) => {
        const tags = ex.autoTags || []
        return selectedTags.some((tag) => tags.includes(tag))
      })
    }
    if (selectedAuthorId) list = list.filter((ex) => ex.authorId === selectedAuthorId)
    if (selectedStatus !== 'all') list = list.filter((ex) => (ex.status || 'draft') === selectedStatus)
    return list
  }, [
    exercises,
    debouncedSearchText,
    selectedDifficulty,
    selectedComposer,
    selectedGenre,
    selectedFormations,
    selectedTags,
    selectedAuthorId,
    selectedStatus
  ])

  const hasActiveFilters =
    searchText ||
    selectedDifficulty ||
    selectedComposer ||
    selectedTags.length > 0 ||
    selectedGenre ||
    selectedFormations.length > 0 ||
    selectedAuthorId ||
    selectedStatus !== 'all'

  const clearAllFilters = useCallback(() => {
    setSearchText('')
    setSelectedDifficulty('')
    setSelectedComposer('')
    setSelectedTags([])
    setSelectedGenre('')
    setSelectedFormations([])
    setSelectedAuthorId('')
    setSelectedStatus('all')
  }, [])

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const toggleFormation = useCallback((formationId) => {
    setSelectedFormations((prev) => (prev.includes(formationId) ? prev.filter((id) => id !== formationId) : [...prev, formationId]))
  }, [])

  const toggleTagSection = useCallback((key) => {
    setExpandedTagSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleDelete = async (exerciseId, authorId, authorName) => {
    const isOwn = authorId === user.uid
    const msg = isOwn
      ? 'Êtes-vous sûr de vouloir supprimer cet exercice ?'
      : `Cet exercice appartient à ${authorName || 'un autre professeur'}. Supprimer quand même ?`
    if (!window.confirm(msg)) {
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
          <button
            type="button"
            className="dashboard-signin-email-link"
            onClick={() => setShowEmailLoginModal(true)}
          >
            Se connecter avec email
          </button>
        </div>
        <EmailLoginModal isOpen={showEmailLoginModal} onClose={() => setShowEmailLoginModal(false)} />
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header simplifié et sticky */}
      <header className="dashboard-header">
          <h1 className="dashboard-title">Mes Exercices</h1>
        <div className="dashboard-header-right" ref={userMenuRef}>
          {userData?.role === 'teacher' && (
            <button
              type="button"
              className="dashboard-header-student-btn"
              onClick={() => navigate('/student-dashboard')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>Voir interface élève</span>
            </button>
          )}
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
              <>
              <button 
                  className="dashboard-user-menu-item"
                  onClick={() => {
                    navigate('/dashboard/students')
                    setIsUserMenuOpen(false)
                  }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Catalogue élèves</span>
                {pendingRequestsCount > 0 && (
                  <span className="dashboard-user-menu-badge">{pendingRequestsCount}</span>
                )}
              </button>
              <button 
                  className="dashboard-user-menu-item"
                  onClick={() => {
                    navigate('/dashboard/classes')
                    setIsUserMenuOpen(false)
                  }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  <line x1="8" y1="6" x2="16" y2="6"></line>
                  <line x1="8" y1="10" x2="16" y2="10"></line>
                </svg>
                <span>Mes classes</span>
              </button>
              <button 
                  className="dashboard-user-menu-item"
                  onClick={() => {
                    navigate('/dashboard/assignments')
                    setIsUserMenuOpen(false)
                  }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Devoirs</span>
              </button>
              <button 
                  className="dashboard-user-menu-item"
                  onClick={() => {
                    navigate('/dashboard/teachers')
                    setIsUserMenuOpen(false)
                  }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 14l9-5-9-5-9 5 9 5z"></path>
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                </svg>
                <span>Annuaire des professeurs</span>
              </button>
              {canAccessParcoursImagesEditor(user?.email) && (
              <button
                  className="dashboard-user-menu-item"
                  onClick={() => {
                    navigate('/dashboard/parcours-images')
                    setIsUserMenuOpen(false)
                  }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Images parcours</span>
              </button>
              )}
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
              </>
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

      {/* Filtre Mes exercices / Tous les exercices */}
      <div className="dashboard-filter-tabs">
        <button
          type="button"
          className={`dashboard-filter-tab ${exerciseFilter === 'mine' ? 'active' : ''}`}
          onClick={() => setExerciseFilter('mine')}
        >
          Mes exercices
        </button>
        <button
          type="button"
          className={`dashboard-filter-tab ${exerciseFilter === 'all' ? 'active' : ''}`}
          onClick={() => setExerciseFilter('all')}
        >
          Tous les exercices
        </button>
      </div>

      {/* Barre de recherche + bouton Filtres (mobile) */}
      <div className="dashboard-search-row">
        <div className="dashboard-search-input-wrapper">
          <svg className="dashboard-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="dashboard-search-input"
            placeholder="Rechercher (titre, compositeur, œuvre…)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button type="button" className="dashboard-search-clear" onClick={() => setSearchText('')} aria-label="Effacer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          className="dashboard-filter-btn"
          onClick={() => setIsFilterDrawerOpen(true)}
          aria-label="Filtrer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          <span>Filtrer</span>
          {hasActiveFilters && (
            <span className="dashboard-filter-badge">
              {(searchText ? 1 : 0) +
                (selectedDifficulty ? 1 : 0) +
                (selectedComposer ? 1 : 0) +
                (selectedTags.length ? 1 : 0) +
                (selectedGenre ? 1 : 0) +
                (selectedFormations.length ? 1 : 0) +
                (selectedAuthorId ? 1 : 0) +
                (selectedStatus !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Contenu principal : sidebar filtres + grille */}
      <main className="dashboard-content dashboard-content-with-filters">
        {/* Panneau filtres (desktop) */}
        <aside className="dashboard-filters">
          <div className="dashboard-filters-header">
            <h3>Filtres</h3>
            {hasActiveFilters && (
              <button type="button" className="dashboard-clear-filters" onClick={clearAllFilters}>
                Réinitialiser
              </button>
            )}
          </div>

          {/* Statut publication (prof) */}
          <div className="dashboard-filter-block">
            <h4 className="dashboard-filter-block-title">Statut</h4>
            <div className="dashboard-statut-chips">
              <button
                type="button"
                className={`dashboard-statut-chip ${selectedStatus === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('all')}
              >
                Tous
              </button>
              <button
                type="button"
                className={`dashboard-statut-chip ${selectedStatus === 'published' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('published')}
              >
                Publié
              </button>
              <button
                type="button"
                className={`dashboard-statut-chip ${selectedStatus === 'draft' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('draft')}
              >
                Brouillon
              </button>
            </div>
          </div>

          {/* Créateur (uniquement pour "Tous les exercices") */}
          {exerciseFilter === 'all' && authors.length > 0 && (
            <div className="dashboard-filter-block">
              <h4 className="dashboard-filter-block-title">Créateur</h4>
              <div className="dashboard-chips-container">
                <button
                  type="button"
                  className={`dashboard-chip ${selectedAuthorId === '' ? 'active' : ''}`}
                  onClick={() => setSelectedAuthorId('')}
                >
                  Tous
                </button>
                {authors.map((a) => (
                  <button
                    key={a.authorId}
                    type="button"
                    className={`dashboard-chip ${selectedAuthorId === a.authorId ? 'active' : ''}`}
                    onClick={() => setSelectedAuthorId(selectedAuthorId === a.authorId ? '' : a.authorId)}
                  >
                    {a.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Niveau */}
          <div className="dashboard-filter-block">
            <h4 className="dashboard-filter-block-title">Niveau</h4>
            <div className="dashboard-difficulty-cards">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`dashboard-difficulty-card ${selectedDifficulty === d ? 'active' : ''}`}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === d ? '' : d)}
                >
                  <span className="dashboard-difficulty-icon">
                    {d === 'débutant' && '🌱'}
                    {d === 'intermédiaire' && '⭐'}
                    {d === 'avancé' && '🔥'}
                    {d === 'expert' && '💎'}
                  </span>
                  <span className="dashboard-difficulty-label">{d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compositeur */}
          {composers.length > 0 && (
            <div className="dashboard-filter-block">
              <h4 className="dashboard-filter-block-title">Compositeur</h4>
              <div className="dashboard-chips-container">
                <button type="button" className={`dashboard-chip ${selectedComposer === '' ? 'active' : ''}`} onClick={() => setSelectedComposer('')}>
                  Tous
                </button>
                {composers.slice(0, 12).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`dashboard-chip ${selectedComposer === c ? 'active' : ''}`}
                    onClick={() => setSelectedComposer(selectedComposer === c ? '' : c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Genre */}
          {genreOptions.length > 0 && (
            <div className="dashboard-filter-block">
              <h4 className="dashboard-filter-block-title">Genre (type d&apos;œuvre)</h4>
              <div className="dashboard-chips-container">
                <button type="button" className={`dashboard-chip ${selectedGenre === '' ? 'active' : ''}`} onClick={() => setSelectedGenre('')}>
                  Tous
                </button>
                {genreOptions.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`dashboard-chip ${selectedGenre === g.id ? 'active' : ''}`}
                    onClick={() => setSelectedGenre(selectedGenre === g.id ? '' : g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formation */}
          {formationOptions.length > 0 && (
            <div className="dashboard-filter-block">
              <h4 className="dashboard-filter-block-title">Formation (instrumentation)</h4>
              <div className="dashboard-chips-container">
                <button type="button" className={`dashboard-chip ${selectedFormations.length === 0 ? 'active' : ''}`} onClick={() => setSelectedFormations([])}>
                  Toutes
                </button>
                {formationOptions.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`dashboard-chip ${selectedFormations.includes(f.id) ? 'active' : ''}`}
                    onClick={() => toggleFormation(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags : accordéon avec cases à cocher */}
          {TAG_CATEGORY_KEYS.map((key) => {
            const tagsInCategory = tagCategories[key] || []
            if (tagsInCategory.length === 0) return null
            const isExpanded = expandedTagSections.has(key)
            const label = TAG_CATEGORY_LABELS[key]
            return (
              <div key={key} className="dashboard-filter-block dashboard-filter-block-tags">
                <button
                  type="button"
                  className="dashboard-filter-accordion-header"
                  onClick={() => toggleTagSection(key)}
                  aria-expanded={isExpanded}
                >
                  <span>{label}</span>
                  <span className="dashboard-filter-accordion-icon">{isExpanded ? '▼' : '▶'}</span>
                </button>
                {isExpanded && (
                  <div className="dashboard-filter-tag-checkboxes">
                    {tagsInCategory.map((tag) => (
                      <label key={tag} className="dashboard-filter-tag-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                        />
                        <span>{formatTagForDisplay(tag)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </aside>

        {/* Zone résultats */}
        <div className="dashboard-results">
          {loading ? (
            <div className="dashboard-loading">
              <div className="spinner"></div>
              <p>Chargement des exercices...</p>
            </div>
          ) : exercises.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">📚</div>
              <h2>{exerciseFilter === 'mine' ? 'Aucun exercice pour le moment' : 'Aucun exercice'}</h2>
              <p>{exerciseFilter === 'mine' ? "Créez votre premier exercice d'analyse harmonique" : 'Aucun exercice créé par les professeurs.'}</p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">🔍</div>
              <h2>Aucun exercice trouvé</h2>
              <p>Modifiez les critères de recherche ou réinitialisez les filtres.</p>
              {hasActiveFilters && (
                <button type="button" className="dashboard-empty-cta" onClick={clearAllFilters}>
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="dashboard-results-count">
                {filteredExercises.length} exercice{filteredExercises.length !== 1 ? 's' : ''} trouvé{filteredExercises.length !== 1 ? 's' : ''}
              </p>
              <div className="dashboard-grid">
                {filteredExercises.map((exercise) => {
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
                        alt={getExerciseDisplayTitle(exercise, exercises) || exercise.video?.title || 'Vidéo'}
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

                    {/* Actions overlay : prévisualisation (œil) à gauche, badge statut à droite */}
                    <div className="dashboard-card-thumbnail-actions">
                      <button
                        type="button"
                        className="dashboard-card-preview-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/play/${exercise.id}`, { state: { returnTo: '/dashboard' } })
                        }}
                        aria-label="Voir en mode élève"
                        title="Voir en mode élève"
                      >
                        <Eye className="dashboard-card-preview-icon" size={18} strokeWidth={2} />
                      </button>
                      <div className={`dashboard-card-status-badge ${exercise.status || 'draft'}`}>
                        {exercise.status === 'published' ? 'Publié' : 'Brouillon'}
                      </div>
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="dashboard-card-body">
                    <div className="dashboard-card-header">
                      <h3 className="dashboard-card-title">
                        {getExerciseDisplayTitle(exercise, exercises)}
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
                            onClick={() => {
                              setOpenMenuId(null)
                              setEditTagsExercise(exercise)
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                              <line x1="7" y1="7" x2="7.01" y2="7"></line>
                            </svg>
                            <span>Éditer les tags</span>
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
                            className="dashboard-card-menu-item"
                            onClick={() => {
                              setAssignExercise(exercise)
                              setOpenMenuId(null)
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                              <line x1="8" y1="6" x2="16" y2="6"></line>
                              <line x1="8" y1="10" x2="16" y2="10"></line>
                            </svg>
                            <span>Assigner à une classe</span>
                          </button>
                          <button
                            className="dashboard-card-menu-item dashboard-card-menu-item-danger"
                            onClick={() => handleDelete(exercise.id, exercise.authorId, exercise.authorName)}
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
                    {(exerciseFilter === 'all' && (exercise.authorName || exercise.authorId)) && (
                      <p className="dashboard-card-author">
                        Par {exercise.authorId === user.uid ? 'vous' : (exercise.authorName || 'Professeur')}
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
            </>
          )}
        </div>
      </main>

      {/* Drawer filtres (mobile) */}
      {isFilterDrawerOpen && (
        <>
          <div className="dashboard-filter-drawer-overlay" onClick={() => setIsFilterDrawerOpen(false)} aria-hidden />
          <div className="dashboard-filter-drawer">
            <div className="dashboard-filter-drawer-header">
              <h3>Filtres</h3>
              <button type="button" className="dashboard-filter-drawer-close" onClick={() => setIsFilterDrawerOpen(false)} aria-label="Fermer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="dashboard-filter-drawer-content">
              <div className="dashboard-filter-block">
                <h4 className="dashboard-filter-block-title">Statut</h4>
                <div className="dashboard-statut-chips">
                  <button type="button" className={`dashboard-statut-chip ${selectedStatus === 'all' ? 'active' : ''}`} onClick={() => setSelectedStatus('all')}>Tous</button>
                  <button type="button" className={`dashboard-statut-chip ${selectedStatus === 'published' ? 'active' : ''}`} onClick={() => setSelectedStatus('published')}>Publié</button>
                  <button type="button" className={`dashboard-statut-chip ${selectedStatus === 'draft' ? 'active' : ''}`} onClick={() => setSelectedStatus('draft')}>Brouillon</button>
                </div>
              </div>
              {exerciseFilter === 'all' && authors.length > 0 && (
                <div className="dashboard-filter-block">
                  <h4 className="dashboard-filter-block-title">Créateur</h4>
                  <div className="dashboard-chips-container">
                    <button type="button" className={`dashboard-chip ${selectedAuthorId === '' ? 'active' : ''}`} onClick={() => setSelectedAuthorId('')}>Tous</button>
                    {authors.map((a) => (
                      <button key={a.authorId} type="button" className={`dashboard-chip ${selectedAuthorId === a.authorId ? 'active' : ''}`} onClick={() => setSelectedAuthorId(selectedAuthorId === a.authorId ? '' : a.authorId)}>{a.displayName}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="dashboard-filter-block">
                <h4 className="dashboard-filter-block-title">Niveau</h4>
                <div className="dashboard-difficulty-cards">
                  {DIFFICULTIES.map((d) => (
                    <button key={d} type="button" className={`dashboard-difficulty-card ${selectedDifficulty === d ? 'active' : ''}`} onClick={() => setSelectedDifficulty(selectedDifficulty === d ? '' : d)}>
                      <span className="dashboard-difficulty-icon">{d === 'débutant' && '🌱'}{d === 'intermédiaire' && '⭐'}{d === 'avancé' && '🔥'}{d === 'expert' && '💎'}</span>
                      <span className="dashboard-difficulty-label">{d}</span>
                    </button>
                  ))}
                </div>
              </div>
              {composers.length > 0 && (
                <div className="dashboard-filter-block">
                  <h4 className="dashboard-filter-block-title">Compositeur</h4>
                  <div className="dashboard-chips-container">
                    <button type="button" className={`dashboard-chip ${selectedComposer === '' ? 'active' : ''}`} onClick={() => setSelectedComposer('')}>Tous</button>
                    {composers.slice(0, 12).map((c) => (
                      <button key={c} type="button" className={`dashboard-chip ${selectedComposer === c ? 'active' : ''}`} onClick={() => setSelectedComposer(selectedComposer === c ? '' : c)}>{c}</button>
                    ))}
                  </div>
                </div>
              )}
              {genreOptions.length > 0 && (
                <div className="dashboard-filter-block">
                  <h4 className="dashboard-filter-block-title">Genre</h4>
                  <div className="dashboard-chips-container">
                    <button type="button" className={`dashboard-chip ${selectedGenre === '' ? 'active' : ''}`} onClick={() => setSelectedGenre('')}>Tous</button>
                    {genreOptions.map((g) => (
                      <button key={g.id} type="button" className={`dashboard-chip ${selectedGenre === g.id ? 'active' : ''}`} onClick={() => setSelectedGenre(selectedGenre === g.id ? '' : g.id)}>{g.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {formationOptions.length > 0 && (
                <div className="dashboard-filter-block">
                  <h4 className="dashboard-filter-block-title">Formation</h4>
                  <div className="dashboard-chips-container">
                    <button type="button" className={`dashboard-chip ${selectedFormations.length === 0 ? 'active' : ''}`} onClick={() => setSelectedFormations([])}>Toutes</button>
                    {formationOptions.map((f) => (
                      <button key={f.id} type="button" className={`dashboard-chip ${selectedFormations.includes(f.id) ? 'active' : ''}`} onClick={() => toggleFormation(f.id)}>{f.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {TAG_CATEGORY_KEYS.map((key) => {
                const tagsInCategory = tagCategories[key] || []
                if (tagsInCategory.length === 0) return null
                const isExpanded = expandedTagSections.has(key)
                const label = TAG_CATEGORY_LABELS[key]
                return (
                  <div key={key} className="dashboard-filter-block dashboard-filter-block-tags">
                    <button type="button" className="dashboard-filter-accordion-header" onClick={() => toggleTagSection(key)} aria-expanded={isExpanded}>
                      <span>{label}</span>
                      <span className="dashboard-filter-accordion-icon">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="dashboard-filter-tag-checkboxes">
                        {tagsInCategory.map((tag) => (
                          <label key={tag} className="dashboard-filter-tag-checkbox">
                            <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />
                            <span>{formatTagForDisplay(tag)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {hasActiveFilters && (
              <div className="dashboard-filter-drawer-footer">
                <button type="button" className="dashboard-clear-filters" onClick={() => { clearAllFilters(); setIsFilterDrawerOpen(false) }}>
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </>
      )}

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
        onNavigate={(path) => {
          navigate(path)
          setIsProfileModalOpen(false)
        }}
      />

      <EditTagsModal
        isOpen={!!editTagsExercise}
        exercise={editTagsExercise}
        onClose={() => setEditTagsExercise(null)}
        onSave={loadExercises}
      />

      <AssignToClassModal
        isOpen={!!assignExercise}
        onClose={() => setAssignExercise(null)}
        exercise={assignExercise}
        teacherId={user?.uid}
        onSuccess={() => {}}
      />
    </div>
  )
}

export default Dashboard
