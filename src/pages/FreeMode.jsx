import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPublicExercises } from '../services/exerciseService'
import { formatTagForDisplay } from '../utils/tagFormatter'
import './FreeMode.css'

function FreeMode() {
  const navigate = useNavigate()
  
  // États de recherche et filtres
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [selectedComposer, setSelectedComposer] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('')
  
  // États des données
  const [exercises, setExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [composers, setComposers] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [tagCategories, setTagCategories] = useState({
    renversements: [],
    extensions: [],
    qualites: [],
    accordsSpeciaux: [],
    cadences: [],
    retards: [],
    degres: [],
    structure: [],
    fonctionsHarmoniques: [],
    progressions: [],
    contexteModal: [],
    styles: []
  })
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  
  // Debounce pour la recherche textuelle
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])
  
  // Charger tous les exercices publics au montage
  useEffect(() => {
    loadAllExercises()
  }, [])
  
  // Filtrer les exercices quand les filtres changent
  useEffect(() => {
    filterExercises()
  }, [debouncedSearchText, selectedComposer, selectedDifficulty, selectedTags, selectedGenre, exercises])
  
  const loadAllExercises = async () => {
    try {
      setLoading(true)
      const allExercises = await searchPublicExercises({})
      setExercises(allExercises)
      
      // Extraire les compositeurs uniques
      const uniqueComposers = [...new Set(allExercises
        .map(ex => ex.metadata?.composer)
        .filter(Boolean)
      )].sort()
      setComposers(uniqueComposers)
      
      // Extraire tous les tags uniques
      const allTags = new Set()
      allExercises.forEach(ex => {
        if (ex.autoTags && Array.isArray(ex.autoTags)) {
          ex.autoTags.forEach(tag => allTags.add(tag))
        }
      })
      const sortedTags = [...allTags].sort()
      setAvailableTags(sortedTags)
      
      // Catégoriser les tags
      const categorized = categorizeTags(sortedTags)
      setTagCategories(categorized)
      
      // Extraire les genres depuis workTitle
      const uniqueGenres = extractGenres(allExercises)
      setGenres(uniqueGenres)
    } catch (error) {
      console.error('Erreur lors du chargement des exercices:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Extraire les genres depuis workTitle
  const extractGenres = (exercises) => {
    const genreKeywords = [
      'Symphonie', 'Symphony', 'Quatuor', 'Quartet', 'Sonate', 'Sonata',
      'Concerto', 'Opéra', 'Opera', 'Ouverture', 'Overture', 'Prélude',
      'Prelude', 'Nocturne', 'Ballade', 'Ballad', 'Mazurka', 'Polonaise',
      'Valse', 'Waltz', 'Menuet', 'Minuet', 'Scherzo', 'Rondo', 'Fugue'
    ]
    
    const foundGenres = new Set()
    exercises.forEach(ex => {
      const workTitle = ex.metadata?.workTitle || ''
      if (workTitle) {
        genreKeywords.forEach(keyword => {
          if (workTitle.toLowerCase().includes(keyword.toLowerCase())) {
            foundGenres.add(keyword)
          }
        })
      }
    })
    
    return [...foundGenres].sort()
  }
  
  // Catégoriser les tags selon la théorie musicale
  const categorizeTags = (tags) => {
    const categories = {
      renversements: [],
      extensions: [],
      qualites: [],
      accordsSpeciaux: [],
      cadences: [],
      retards: [],
      degres: [],
      structure: [],
      fonctionsHarmoniques: [],
      progressions: [],
      contexteModal: [],
      styles: []
    }
    
    // Tags à exclure de l'affichage (mais conservés dans les métadonnées)
    // Normaliser pour gérer underscores et casse
    const normalizeTagForExclusion = (tag) => tag.replace(/_/g, '').toLowerCase()
    const excludedTagsNormalized = [
      'renversementsmultiples',
      'multiplescadences',
      'structurecomplexe',
      'structuremoyenne'
    ]
    
    tags.forEach(tag => {
      // Ignorer les tags génériques qui ne sont pas pertinents pour la recherche
      if (excludedTagsNormalized.includes(normalizeTagForExclusion(tag))) {
        return
      }
      
      const tagLower = tag.toLowerCase()
      if (tagLower.includes('renversement')) {
        categories.renversements.push(tag)
      } else if (['septième', 'neuvième', 'onzième', 'treizième'].some(ext => tagLower.includes(ext))) {
        categories.extensions.push(tag)
      } else if (['diminué', 'augmenté'].some(q => tagLower.includes(q))) {
        categories.qualites.push(tag)
      } else if (['allemande', 'française', 'italienne', 'napolitaine', 'sixteaugmentée', 'sixte augmentée'].some(s => tagLower.includes(s))) {
        categories.accordsSpeciaux.push(tag)
      } else if (tagLower.includes('cadence') || tagLower.includes('demi')) {
        categories.cadences.push(tag)
      } else if (tagLower.includes('retard')) {
        categories.retards.push(tag)
      } else if (tag.startsWith('Degré') || tagLower.startsWith('degre')) {
        categories.degres.push(tag)
      } else if (['structure', 'multiples', 'renversementsmultiples'].some(s => tagLower.includes(s))) {
        // Exclure aussi les tags génériques de structure
        if (!excludedTagsNormalized.includes(normalizeTagForExclusion(tag))) {
          categories.structure.push(tag)
        }
      } else if (['tonique', 'dominante', 'sousdominante', 'empruntmodal', 'emprunt modal'].some(f => tagLower.includes(f))) {
        categories.fonctionsHarmoniques.push(tag)
      } else if (tagLower.includes('progression') || tagLower.includes('cycle') || tagLower.includes('chromatique') || tagLower.includes('descendante') || tagLower.includes('ascendante')) {
        categories.progressions.push(tag)
      } else if (['majeur', 'mineur'].some(m => tagLower === m)) {
        categories.contexteModal.push(tag)
      } else if (['baroque', 'classique', 'romantique', 'moderne'].some(s => tagLower === s)) {
        categories.styles.push(tag)
      }
    })
    
    // Trier chaque catégorie
    Object.keys(categories).forEach(key => {
      categories[key].sort()
    })
    
    return categories
  }
  
  const filterExercises = useCallback(() => {
    let filtered = [...exercises]
    
    // Recherche textuelle
    if (debouncedSearchText.trim()) {
      const searchLower = debouncedSearchText.toLowerCase()
      filtered = filtered.filter(ex => {
        const workTitle = ex.metadata?.workTitle || ''
        const exerciseTitle = ex.metadata?.exerciseTitle || ''
        const composer = ex.metadata?.composer || ''
        return (
          workTitle.toLowerCase().includes(searchLower) ||
          exerciseTitle.toLowerCase().includes(searchLower) ||
          composer.toLowerCase().includes(searchLower)
        )
      })
    }
    
    // Filtre compositeur
    if (selectedComposer) {
      filtered = filtered.filter(ex => ex.metadata?.composer === selectedComposer)
    }
    
    // Filtre difficulté
    if (selectedDifficulty) {
      filtered = filtered.filter(ex => ex.metadata?.difficulty === selectedDifficulty)
    }
    
    // Filtre tags (au moins un tag sélectionné doit être présent)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(ex => {
        const exerciseTags = ex.autoTags || []
        return selectedTags.some(tag => exerciseTags.includes(tag))
      })
    }
    
    // Filtre genre
    if (selectedGenre) {
      filtered = filtered.filter(ex => {
        const workTitle = ex.metadata?.workTitle || ''
        return workTitle.toLowerCase().includes(selectedGenre.toLowerCase())
      })
    }
    
    setFilteredExercises(filtered)
  }, [debouncedSearchText, selectedComposer, selectedDifficulty, selectedTags, selectedGenre, exercises])
  
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  const clearAllFilters = () => {
    setSearchText('')
    setSelectedComposer('')
    setSelectedDifficulty('')
    setSelectedTags([])
    setSelectedGenre('')
  }
  
  const getYouTubeThumbnail = (videoId) => {
    if (!videoId) return null
    const id = videoId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] || videoId
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
  }
  
  const handleExerciseClick = (exerciseId) => {
    navigate(`/play/${exerciseId}`)
  }
  
  const difficulties = ['débutant', 'intermédiaire', 'avancé', 'expert']
  
  return (
    <div className="free-mode-container">
      {/* Barre de recherche */}
      <div className="free-mode-search-bar">
        <div className="free-mode-search-input-wrapper">
          <svg className="free-mode-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Rechercher un exercice (nom de l'œuvre, compositeur...)"
            className="free-mode-search-input"
          />
          {searchText && (
            <button
              className="free-mode-search-clear"
              onClick={() => setSearchText('')}
              aria-label="Effacer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        {/* Bouton Filtrer (mobile uniquement) */}
        <button
          className="free-mode-filter-btn"
          onClick={() => setIsFilterDrawerOpen(true)}
          aria-label="Filtrer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          <span>Filtrer</span>
          {(selectedComposer || selectedDifficulty || selectedTags.length > 0 || selectedGenre) && (
            <span className="free-mode-filter-badge">{[selectedComposer, selectedDifficulty, selectedTags.length, selectedGenre].filter(Boolean).length}</span>
          )}
        </button>
      </div>
      
      <div className="free-mode-content">
        {/* Panneau de filtres (desktop) */}
        <aside className="free-mode-filters">
          <div className="free-mode-filters-header">
            <h3>Filtres</h3>
            {(selectedComposer || selectedDifficulty || selectedTags.length > 0 || selectedGenre) && (
              <button className="free-mode-clear-filters" onClick={clearAllFilters}>
                Réinitialiser
              </button>
            )}
          </div>
          
          {/* Filtre Compositeur */}
          <div className="free-mode-filter-group">
            <label className="free-mode-filter-label">Compositeur</label>
            <div className="free-mode-chips-container">
              <button
                className={`free-mode-chip ${selectedComposer === '' ? 'free-mode-chip-active' : ''}`}
                onClick={() => setSelectedComposer('')}
              >
                Tous
              </button>
              {composers.slice(0, 10).map(composer => (
                <button
                  key={composer}
                  className={`free-mode-chip ${selectedComposer === composer ? 'free-mode-chip-active' : ''}`}
                  onClick={() => setSelectedComposer(composer)}
                >
                  {composer}
                </button>
              ))}
            </div>
          </div>
          
          {/* Filtre Difficulté */}
          <div className="free-mode-filter-group">
            <label className="free-mode-filter-label">Difficulté</label>
            <div className="free-mode-difficulty-cards">
              {difficulties.map(diff => (
                <button
                  key={diff}
                  className={`free-mode-difficulty-card ${selectedDifficulty === diff ? 'free-mode-difficulty-card-active' : ''}`}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? '' : diff)}
                >
                  <span className="free-mode-difficulty-icon">
                    {diff === 'débutant' && '🌱'}
                    {diff === 'intermédiaire' && '⭐'}
                    {diff === 'avancé' && '🔥'}
                    {diff === 'expert' && '💎'}
                  </span>
                  <span className="free-mode-difficulty-label">{diff}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Section Harmonie - Structure des accords */}
          {(tagCategories.renversements.length > 0 || tagCategories.extensions.length > 0 || tagCategories.qualites.length > 0) && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Structure des accords</h4>
              
              {/* Renversements */}
              {tagCategories.renversements.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Renversements</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.renversements.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Extensions */}
              {tagCategories.extensions.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Extensions</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.extensions.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Qualités */}
              {tagCategories.qualites.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Qualités</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.qualites.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section Harmonie - Accords spéciaux */}
          {tagCategories.accordsSpeciaux.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Accords spéciaux</h4>
              <div className="free-mode-tags-container">
                {tagCategories.accordsSpeciaux.map(tag => {
                  const formatted = formatTagForDisplay(tag);
                  return (
                    <button
                      key={tag}
                      className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {formatted}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Harmonie - Fonctions et cadences */}
          {(tagCategories.cadences.length > 0 || tagCategories.retards.length > 0) && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Cadences et retards</h4>
              
              {/* Cadences */}
              {tagCategories.cadences.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Cadences</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.cadences.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Retards */}
              {tagCategories.retards.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Retards</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.retards.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section Structure et degrés */}
          {(tagCategories.degres.length > 0 || tagCategories.structure.length > 0) && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Structure et degrés</h4>
              
              {/* Degrés */}
              {tagCategories.degres.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Degrés</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.degres.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Structure */}
              {tagCategories.structure.length > 0 && (
                <div className="free-mode-filter-subsection">
                  <label className="free-mode-filter-subsection-label">Structure</label>
                  <div className="free-mode-tags-container">
                    {tagCategories.structure.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section Fonctions harmoniques */}
          {tagCategories.fonctionsHarmoniques.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Fonctions harmoniques</h4>
              <div className="free-mode-tags-container">
                {tagCategories.fonctionsHarmoniques.map(tag => {
                  const formatted = formatTagForDisplay(tag);
                  return (
                    <button
                      key={tag}
                      className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {formatted}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Progressions */}
          {tagCategories.progressions.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Progressions harmoniques</h4>
              <div className="free-mode-tags-container">
                {tagCategories.progressions.map(tag => {
                  const formatted = formatTagForDisplay(tag);
                  return (
                    <button
                      key={tag}
                      className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {formatted}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Contexte modal */}
          {tagCategories.contexteModal.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Contexte modal</h4>
              <div className="free-mode-tags-container">
                {tagCategories.contexteModal.map(tag => {
                  const formatted = formatTagForDisplay(tag);
                  return (
                    <button
                      key={tag}
                      className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {formatted}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Styles */}
          {tagCategories.styles.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Période stylistique</h4>
              <div className="free-mode-tags-container">
                {tagCategories.styles.map(tag => {
                  const formatted = formatTagForDisplay(tag);
                  return (
                    <button
                      key={tag}
                      className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {formatted}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Filtre Genre */}
          <div className="free-mode-filter-group">
            <label className="free-mode-filter-label">Genre</label>
            <div className="free-mode-chips-container">
              <button
                className={`free-mode-chip ${selectedGenre === '' ? 'free-mode-chip-active' : ''}`}
                onClick={() => setSelectedGenre('')}
              >
                Tous
              </button>
              {genres.map(genre => (
                <button
                  key={genre}
                  className={`free-mode-chip ${selectedGenre === genre ? 'free-mode-chip-active' : ''}`}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </aside>
        
        {/* Zone de résultats */}
        <div className="free-mode-results">
          {loading ? (
            <div className="free-mode-loading">
              <div className="spinner"></div>
              <p>Chargement des exercices...</p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="free-mode-empty">
              <div className="free-mode-empty-icon">🔍</div>
              <h3 className="free-mode-empty-title">Aucun exercice trouvé</h3>
              <p className="free-mode-empty-text">
                Essaye de modifier tes critères de recherche ou tes filtres pour trouver plus d'exercices.
              </p>
              {(selectedComposer || selectedDifficulty || selectedTags.length > 0 || selectedGenre || debouncedSearchText) && (
                <button className="free-mode-empty-cta" onClick={clearAllFilters}>
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="free-mode-results-header">
                <p className="free-mode-results-count">
                  {filteredExercises.length} exercice{filteredExercises.length !== 1 ? 's' : ''} trouvé{filteredExercises.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="free-mode-grid">
                {filteredExercises.map((exercise) => {
                  const videoId = exercise.video?.id
                  const thumbnailUrl = getYouTubeThumbnail(videoId)
                  
                  return (
                    <div
                      key={exercise.id}
                      className="dashboard-card"
                      onClick={() => handleExerciseClick(exercise.id)}
                    >
                      {/* Miniature vidéo */}
                      <div className="dashboard-card-thumbnail">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={exercise.metadata?.workTitle || exercise.video?.title || 'Vidéo'}
                            className="dashboard-card-thumbnail-img"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              if (e.target.nextElementSibling) {
                                e.target.nextElementSibling.style.display = 'flex'
                              }
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
                      </div>
                      
                      {/* Contenu de la carte */}
                      <div className="dashboard-card-body">
                        <h3 className="dashboard-card-title">
                          {exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || exercise.metadata?.title || 'Sans titre'}
                        </h3>
                        
                        {exercise.metadata?.composer && (
                          <p className="dashboard-card-composer">
                            {exercise.metadata.composer}
                          </p>
                        )}
                        
                        {/* Tags */}
                        {exercise.autoTags && exercise.autoTags.length > 0 && (
                          <div className="dashboard-card-tags">
                            <div className="dashboard-card-tags-scroll">
                              {exercise.autoTags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="dashboard-tag">
                                  {formatTagForDisplay(tag)}
                                </span>
                              ))}
                              {exercise.autoTags.length > 2 && (
                                <span className="dashboard-tag-more">
                                  +{exercise.autoTags.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Footer */}
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
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Drawer de filtres (mobile) */}
      {isFilterDrawerOpen && (
        <>
          <div
            className="free-mode-filter-drawer-overlay"
            onClick={() => setIsFilterDrawerOpen(false)}
          ></div>
          <div className="free-mode-filter-drawer">
            <div className="free-mode-filter-drawer-header">
              <h3>Filtres</h3>
              <button
                className="free-mode-filter-drawer-close"
                onClick={() => setIsFilterDrawerOpen(false)}
                aria-label="Fermer"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="free-mode-filter-drawer-content">
              {/* Même contenu que le panneau desktop */}
              <div className="free-mode-filter-group">
                <label className="free-mode-filter-label">Compositeur</label>
                <div className="free-mode-chips-container">
                  <button
                    className={`free-mode-chip ${selectedComposer === '' ? 'free-mode-chip-active' : ''}`}
                    onClick={() => setSelectedComposer('')}
                  >
                    Tous
                  </button>
                  {composers.slice(0, 10).map(composer => (
                    <button
                      key={composer}
                      className={`free-mode-chip ${selectedComposer === composer ? 'free-mode-chip-active' : ''}`}
                      onClick={() => setSelectedComposer(composer)}
                    >
                      {composer}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="free-mode-filter-group">
                <label className="free-mode-filter-label">Difficulté</label>
                <div className="free-mode-difficulty-cards">
                  {difficulties.map(diff => (
                    <button
                      key={diff}
                      className={`free-mode-difficulty-card ${selectedDifficulty === diff ? 'free-mode-difficulty-card-active' : ''}`}
                      onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? '' : diff)}
                    >
                      <span className="free-mode-difficulty-icon">
                        {diff === 'débutant' && '🌱'}
                        {diff === 'intermédiaire' && '⭐'}
                        {diff === 'avancé' && '🔥'}
                        {diff === 'expert' && '💎'}
                      </span>
                      <span className="free-mode-difficulty-label">{diff}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Section Harmonie - Structure des accords */}
              {(tagCategories.renversements.length > 0 || tagCategories.extensions.length > 0 || tagCategories.qualites.length > 0) && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Structure des accords</h4>
                  
                  {/* Renversements */}
                  {tagCategories.renversements.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Renversements</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.renversements.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Extensions */}
                  {tagCategories.extensions.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Extensions</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.extensions.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Qualités */}
                  {tagCategories.qualites.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Qualités</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.qualites.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section Harmonie - Accords spéciaux */}
              {tagCategories.accordsSpeciaux.length > 0 && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Accords spéciaux</h4>
                  <div className="free-mode-tags-container">
                    {tagCategories.accordsSpeciaux.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Harmonie - Fonctions et cadences */}
              {(tagCategories.cadences.length > 0 || tagCategories.retards.length > 0) && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Cadences et retards</h4>
                  
                  {/* Cadences */}
                  {tagCategories.cadences.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Cadences</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.cadences.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Retards */}
                  {tagCategories.retards.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Retards</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.retards.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section Structure et degrés */}
              {(tagCategories.degres.length > 0 || tagCategories.structure.length > 0) && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Structure et degrés</h4>
                  
                  {/* Degrés */}
                  {tagCategories.degres.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Degrés</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.degres.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Structure */}
                  {tagCategories.structure.length > 0 && (
                    <div className="free-mode-filter-subsection">
                      <label className="free-mode-filter-subsection-label">Structure</label>
                      <div className="free-mode-tags-container">
                        {tagCategories.structure.map(tag => {
                          const formatted = formatTagForDisplay(tag);
                          return (
                            <button
                              key={tag}
                              className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section Fonctions harmoniques */}
              {tagCategories.fonctionsHarmoniques.length > 0 && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Fonctions harmoniques</h4>
                  <div className="free-mode-tags-container">
                    {tagCategories.fonctionsHarmoniques.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Progressions */}
              {tagCategories.progressions.length > 0 && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Progressions harmoniques</h4>
                  <div className="free-mode-tags-container">
                    {tagCategories.progressions.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Contexte modal */}
              {tagCategories.contexteModal.length > 0 && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Contexte modal</h4>
                  <div className="free-mode-tags-container">
                    {tagCategories.contexteModal.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Styles */}
              {tagCategories.styles.length > 0 && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Période stylistique</h4>
                  <div className="free-mode-tags-container">
                    {tagCategories.styles.map(tag => {
                      const formatted = formatTagForDisplay(tag);
                      return (
                        <button
                          key={tag}
                          className={`free-mode-tag-chip ${selectedTags.includes(tag) ? 'free-mode-tag-chip-active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {formatted}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="free-mode-filter-group">
                <label className="free-mode-filter-label">Genre</label>
                <div className="free-mode-chips-container">
                  <button
                    className={`free-mode-chip ${selectedGenre === '' ? 'free-mode-chip-active' : ''}`}
                    onClick={() => setSelectedGenre('')}
                  >
                    Tous
                  </button>
                  {genres.map(genre => (
                    <button
                      key={genre}
                      className={`free-mode-chip ${selectedGenre === genre ? 'free-mode-chip-active' : ''}`}
                      onClick={() => setSelectedGenre(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="free-mode-filter-drawer-footer">
              <button
                className="free-mode-filter-drawer-apply"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default FreeMode
