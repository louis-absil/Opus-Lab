import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPublicExercises, getLatestPublicExercises } from '../services/exerciseService'
import { formatTagForDisplay } from '../utils/tagFormatter'
import { CLASSICAL_FORMATIONS, CLASSICAL_GENRES, inferFormationsFromWorkTitle, inferGenreFromWorkTitle } from '../data/formations'
import ExerciseCard from '../components/ExerciseCard'
import './FreeMode.css'

function FreeMode({ doneExerciseIds = [], initialFilter = null, onInitialFilterConsumed, onOpenHorizons = null, unlockedHorizonsCount = 0, highlightHorizonsButton = false, onHighlightConsumed = null }) {
  const navigate = useNavigate()
  
  // États de recherche et filtres
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [selectedComposer, setSelectedComposer] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedGenre, setSelectedGenre] = useState('') // genre id (type d'œuvre : concerto, trio, etc.)
  const [selectedFormations, setSelectedFormations] = useState([]) // instrumentation (multi-select)
  const [selectedDoneStatus, setSelectedDoneStatus] = useState('all') // 'all' | 'done' | 'not-done'
  
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
    styles: [],
    formations: [],
    genres: [] // GenreConcerto, etc.
  })
  const [genres, setGenres] = useState([]) // mots-clés workTitle (legacy)
  const [genreOptions, setGenreOptions] = useState([]) // { id, label } type d'œuvre (concerto, trio, etc.)
  const [formations, setFormations] = useState([]) // { id, label } instrumentation pour le filtre
  const [loading, setLoading] = useState(true)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [latestExercises, setLatestExercises] = useState([])

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

  // Charger les derniers exercices ajoutés (section en haut des résultats)
  useEffect(() => {
    let cancelled = false
    getLatestPublicExercises(8)
      .then((data) => {
        if (!cancelled) setLatestExercises(data)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement derniers exercices (Mode Libre):', err)
          setLatestExercises([])
        }
      })
    return () => { cancelled = true }
  }, [])

  // Mise en avant du bouton Horizons (depuis conseil du jour) : annuler après 12 s
  useEffect(() => {
    if (!highlightHorizonsButton || !onHighlightConsumed) return
    const t = setTimeout(() => onHighlightConsumed(), 12000)
    return () => clearTimeout(t)
  }, [highlightHorizonsButton, onHighlightConsumed])

  // doneSet et filterExercises doivent être déclarés AVANT le useEffect qui les utilise (évite ReferenceError "Cannot access before initialization")
  const doneSet = useMemo(() => new Set(doneExerciseIds || []), [doneExerciseIds])

  const filterExercises = useCallback(() => {
    let filtered = [...exercises]
    if (selectedDoneStatus === 'done') {
      filtered = filtered.filter(ex => doneSet.has(ex.id))
    } else if (selectedDoneStatus === 'not-done') {
      filtered = filtered.filter(ex => !doneSet.has(ex.id))
    }
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
    if (selectedComposer) {
      filtered = filtered.filter(ex => ex.metadata?.composer === selectedComposer)
    }
    if (selectedDifficulty) {
      filtered = filtered.filter(ex => ex.metadata?.difficulty === selectedDifficulty)
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(ex => {
        const exerciseTags = ex.autoTags || []
        return selectedTags.some(tag => exerciseTags.includes(tag))
      })
    }
    if (selectedGenre) {
      filtered = filtered.filter(ex => {
        const genreId = ex.metadata?.genre || inferGenreFromWorkTitle(ex.metadata?.workTitle || '')
        return genreId === selectedGenre
      })
    }
    if (selectedFormations.length > 0) {
      filtered = filtered.filter(ex => {
        const formationRaw = ex.metadata?.formation
        const exFormations = Array.isArray(formationRaw) ? formationRaw : (formationRaw ? [formationRaw] : inferFormationsFromWorkTitle(ex.metadata?.workTitle || '', null))
        return selectedFormations.every(s => exFormations.includes(s))
      })
    }
    setFilteredExercises(filtered)
  }, [debouncedSearchText, selectedComposer, selectedDifficulty, selectedTags, selectedGenre, selectedFormations, selectedDoneStatus, exercises, doneSet])

  // Filtrer les exercices quand les filtres changent
  useEffect(() => {
    filterExercises()
  }, [debouncedSearchText, selectedComposer, selectedDifficulty, selectedTags, selectedGenre, selectedFormations, selectedDoneStatus, exercises, doneSet, filterExercises])

  // Appliquer le filtre initial (clic pastille depuis le dashboard élève)
  useEffect(() => {
    if (!initialFilter || !onInitialFilterConsumed) return
    if (initialFilter.difficulty) {
      setSelectedDifficulty(initialFilter.difficulty)
    }
    if (initialFilter.tag) {
      setSelectedTags([initialFilter.tag])
    }
    if (initialFilter.doneStatus === 'done' || initialFilter.doneStatus === 'not-done') {
      setSelectedDoneStatus(initialFilter.doneStatus)
    }
    onInitialFilterConsumed()
  }, [initialFilter, onInitialFilterConsumed])
  
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
      
      // Extraire les formations (instrumentation) et genres (type d'œuvre) — classique uniquement
      const formationIds = new Set()
      const genreIds = new Set()
      allExercises.forEach(ex => {
        if (ex.metadata?.section === 'horizons') return
        const formationRaw = ex.metadata?.formation
        const exFormations = Array.isArray(formationRaw) ? formationRaw : (formationRaw ? [formationRaw] : inferFormationsFromWorkTitle(ex.metadata?.workTitle || '', null))
        exFormations.forEach(id => formationIds.add(id))
        const genreId = ex.metadata?.genre || inferGenreFromWorkTitle(ex.metadata?.workTitle || '')
        if (genreId) genreIds.add(genreId)
      })
      setFormations(CLASSICAL_FORMATIONS.filter(f => formationIds.has(f.id)))
      setGenreOptions(CLASSICAL_GENRES.filter(g => genreIds.has(g.id)))
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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FreeMode.jsx:categorizeTags',message:'categorizeTags entry',data:{tagsLength:tags?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
      styles: [],
      formations: [],
      genres: []
    }
    
    // Tags à exclure de l'affichage (mais conservés dans les métadonnées)
    // Normaliser pour gérer underscores et casse
    const normalizeTagForExclusion = (tag) => tag.replace(/_/g, '').toLowerCase()
    const excludedTagsNormalized = [
      'renversementsmultiples'
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
      } else if (tag.startsWith('Formation')) {
        categories.formations.push(tag)
      } else if (tag.startsWith('Genre')) {
        categories.genres.push(tag)
      }
    })
    
    // Trier chaque catégorie
    Object.keys(categories).forEach(key => {
      categories[key].sort()
    })
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FreeMode.jsx:categorizeTags-return',message:'categorizeTags return keys',data:{keys:Object.keys(categories),hasGenres:'genres' in categories},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return categories
  }
  
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
    setSelectedFormations([])
    setSelectedDoneStatus('all')
  }

  const toggleFormation = (formationId) => {
    setSelectedFormations(prev => prev.includes(formationId) ? prev.filter(id => id !== formationId) : [...prev, formationId])
  }
  
  const handleExerciseClick = (exerciseId) => {
    navigate(`/play/${exerciseId}`)
  }
  
  const difficulties = ['débutant', 'intermédiaire', 'avancé', 'expert']

  // Pastilles "notion" pour accès rapide (alignées sur les cartes exercice)
  const notionQuickFilters = useMemo(() => {
    const items = []
    if (tagCategories.cadences?.[0]) items.push({ label: 'Cadences', tag: tagCategories.cadences[0] })
    if (tagCategories.renversements?.[0]) items.push({ label: 'Renversements', tag: tagCategories.renversements[0] })
    const septieme = tagCategories.extensions?.find((t) => /septième|septieme/i.test(t))
    if (septieme) items.push({ label: '7e', tag: septieme })
    if (tagCategories.qualites?.[0]) items.push({ label: 'Couleurs', tag: tagCategories.qualites[0] })
    if (tagCategories.structure?.[0]) items.push({ label: 'Structure', tag: tagCategories.structure[0] })
    ;['Baroque', 'Classique', 'Romantique', 'Moderne'].forEach((s) => {
      const t = tagCategories.styles?.find((st) => st.toLowerCase() === s.toLowerCase())
      if (t) items.push({ label: s, tag: t })
    })
    return items
  }, [tagCategories])

  const applyNotionQuickFilter = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }
  
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
          {(selectedComposer || selectedDifficulty || selectedTags.length > 0 || selectedGenre || selectedFormations.length > 0 || selectedDoneStatus !== 'all') && (
            <span className="free-mode-filter-badge">{[selectedComposer, selectedDifficulty, selectedTags.length, selectedGenre, selectedFormations.length, selectedDoneStatus !== 'all' ? 1 : 0].filter(Boolean).length}</span>
          )}
        </button>
        {/* Bouton Nouveaux Horizons */}
        {onOpenHorizons && (
          <div className={`free-mode-horizons-wrap ${highlightHorizonsButton ? 'free-mode-horizons-wrap-highlight' : ''}`}>
            {highlightHorizonsButton && (
              <span className="free-mode-horizons-hint" role="status">C'est ici ! Nouveaux Horizons se trouve dans ce bouton.</span>
            )}
            <button
              type="button"
              className={`free-mode-horizons-btn ${highlightHorizonsButton ? 'free-mode-horizons-btn-highlight' : ''}`}
              onClick={() => {
                if (highlightHorizonsButton && onHighlightConsumed) onHighlightConsumed()
                onOpenHorizons()
              }}
              aria-label="Découvrir Nouveaux Horizons"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M2 12h20"></path>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>Nouveaux Horizons</span>
              {unlockedHorizonsCount > 0 && (
                <span className="free-mode-horizons-badge">{unlockedHorizonsCount}</span>
              )}
            </button>
          </div>
        )}
      </div>
      
      <div className="free-mode-content">
        {/* Panneau de filtres (desktop) */}
        <aside className="free-mode-filters">
          <div className="free-mode-filters-header">
            <h3>Filtres</h3>
            {(selectedComposer || selectedDifficulty || selectedTags.length > 0 || selectedGenre || selectedFormations.length > 0 || selectedDoneStatus !== 'all') && (
              <button className="free-mode-clear-filters" onClick={clearAllFilters}>
                Réinitialiser
              </button>
            )}
          </div>

          {/* Bloc Statut : déjà fait / pas encore fait */}
          <div className="free-mode-filter-block free-mode-filter-block-statut">
            <h4 className="free-mode-filter-block-title">Statut</h4>
            <div className="free-mode-filter-group">
              <div className="free-mode-statut-chips">
                <button
                  type="button"
                  className={`free-mode-statut-chip ${selectedDoneStatus === 'all' ? 'free-mode-statut-chip-active' : ''}`}
                  onClick={() => setSelectedDoneStatus('all')}
                >
                  Tous
                </button>
                <button
                  type="button"
                  className={`free-mode-statut-chip ${selectedDoneStatus === 'done' ? 'free-mode-statut-chip-active' : ''}`}
                  onClick={() => setSelectedDoneStatus('done')}
                >
                  Déjà fait
                </button>
                <button
                  type="button"
                  className={`free-mode-statut-chip ${selectedDoneStatus === 'not-done' ? 'free-mode-statut-chip-active' : ''}`}
                  onClick={() => setSelectedDoneStatus('not-done')}
                >
                  Pas encore fait
                </button>
              </div>
            </div>
          </div>

          {/* Bloc Accès rapide : niveau + pastilles (notions) */}
          <div className="free-mode-filter-block free-mode-filter-block-quick">
            <h4 className="free-mode-filter-block-title">Accès rapide</h4>
            <div className="free-mode-filter-group">
              <label className="free-mode-filter-label">Niveau</label>
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
            {notionQuickFilters.length > 0 && (
              <div className="free-mode-filter-group">
                <label className="free-mode-filter-label">Filtrer par notion</label>
                <div className="free-mode-notion-chips">
                  {notionQuickFilters.map(({ label, tag }) => (
                    <button
                      key={tag}
                      type="button"
                      className={`free-mode-notion-chip ${selectedTags.includes(tag) ? 'free-mode-notion-chip-active' : ''}`}
                      onClick={() => applyNotionQuickFilter(tag)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bloc Affiner : compositeur, genre */}
          <div className="free-mode-filter-block">
            <h4 className="free-mode-filter-block-title">Affiner</h4>
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
            {genreOptions.length > 0 && (
              <div className="free-mode-filter-group">
                <label className="free-mode-filter-label">Genre (type d&apos;œuvre)</label>
                <div className="free-mode-chips-container">
                  <button
                    className={`free-mode-chip ${selectedGenre === '' ? 'free-mode-chip-active' : ''}`}
                    onClick={() => setSelectedGenre('')}
                  >
                    Tous
                  </button>
                  {genreOptions.map(g => (
                    <button
                      key={g.id}
                      className={`free-mode-chip ${selectedGenre === g.id ? 'free-mode-chip-active' : ''}`}
                      onClick={() => setSelectedGenre(selectedGenre === g.id ? '' : g.id)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {formations.length > 0 && (
              <div className="free-mode-filter-group">
                <label className="free-mode-filter-label">Formation (instrumentation)</label>
                <div className="free-mode-chips-container">
                  <button
                    className={`free-mode-chip ${selectedFormations.length === 0 ? 'free-mode-chip-active' : ''}`}
                    onClick={() => setSelectedFormations([])}
                  >
                    Toutes
                  </button>
                  {formations.map(f => (
                    <button
                      key={f.id}
                      className={`free-mode-chip ${selectedFormations.includes(f.id) ? 'free-mode-chip-active' : ''}`}
                      onClick={() => toggleFormation(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bloc Détails techniques : tags par catégorie */}
          <div className="free-mode-filter-block free-mode-filter-block-details">
            <h4 className="free-mode-filter-block-title">Détails techniques</h4>
          
          {/* Section Harmonie - Structure des accords */}
          {(tagCategories.renversements?.length > 0 || tagCategories.extensions?.length > 0 || tagCategories.qualites?.length > 0) && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Structure des accords</h4>
              
              {/* Renversements */}
              {tagCategories.renversements?.length > 0 && (
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
              {tagCategories.extensions?.length > 0 && (
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
              {tagCategories.qualites?.length > 0 && (
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
          {tagCategories.accordsSpeciaux?.length > 0 && (
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
          {(tagCategories.cadences?.length > 0 || tagCategories.retards?.length > 0) && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Cadences et retards</h4>
              
              {/* Cadences */}
              {tagCategories.cadences?.length > 0 && (
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
              {tagCategories.retards?.length > 0 && (
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
          {(tagCategories.degres?.length > 0 || tagCategories.structure?.length > 0) && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Structure et degrés</h4>
              
              {/* Degrés */}
              {tagCategories.degres?.length > 0 && (
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
              {tagCategories.structure?.length > 0 && (
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
          {tagCategories.fonctionsHarmoniques?.length > 0 && (
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
          {tagCategories.progressions?.length > 0 && (
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
          {tagCategories.contexteModal?.length > 0 && (
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
          {tagCategories.styles?.length > 0 && (
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

          {/* Section Formations (tags instrumentation) */}
          {tagCategories.formations?.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Formation (instrumentation)</h4>
              <div className="free-mode-tags-container">
                {tagCategories.formations.map(tag => {
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

          {/* Section Genres (tags type d'œuvre) */}
          {/* #region agent log */}
          {(() => { fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FreeMode.jsx:880',message:'before genres.length',data:{tagCategoriesKeys:tagCategories?Object.keys(tagCategories):null,genresType:typeof tagCategories?.genres,genresIsArray:Array.isArray(tagCategories?.genres)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{}); return null; })()}
          {/* #endregion */}
          {tagCategories.genres?.length > 0 && (
            <div className="free-mode-filter-section">
              <h4 className="free-mode-filter-section-title">Genre (type d&apos;œuvre)</h4>
              <div className="free-mode-tags-container">
                {tagCategories.genres.map(tag => {
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
        </aside>
        
        {/* Zone de résultats */}
        <div className="free-mode-results">
          {/* Section Derniers exercices : toujours affichée pour éviter que le layout ne saute au clic sur un filtre */}
          {latestExercises.length > 0 && (
            <div className="free-mode-latest-section">
              <h3 className="free-mode-latest-title">Derniers exercices ajoutés</h3>
              {!selectedComposer && !selectedDifficulty && selectedTags.length === 0 && !selectedGenre && selectedFormations.length === 0 && selectedDoneStatus === 'all' && !debouncedSearchText ? (
                <div className="free-mode-latest-grid">
                  {latestExercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      allExercises={latestExercises}
                      onClick={(id) => handleExerciseClick(id)}
                      onPillClick={(payload) => {
                        if (payload.type === 'difficulty') setSelectedDifficulty((prev) => (prev === payload.value ? '' : payload.value))
                        else if (payload.type === 'tag') setSelectedTags((prev) => (prev.includes(payload.value) ? prev.filter((t) => t !== payload.value) : [...prev, payload.value]))
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="free-mode-latest-placeholder">
                  <p>Les filtres masquent les exercices récents.</p>
                  <button type="button" className="free-mode-latest-placeholder-btn" onClick={clearAllFilters}>
                    Réinitialiser pour les afficher
                  </button>
                </div>
              )}
            </div>
          )}

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
              {(selectedComposer || selectedDifficulty || selectedTags.length > 0 || selectedGenre || selectedFormations.length > 0 || selectedDoneStatus !== 'all' || debouncedSearchText) && (
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
                {filteredExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    allExercises={filteredExercises}
                    onClick={(id) => handleExerciseClick(id)}
                    onPillClick={(payload) => {
                      if (payload.type === 'difficulty') setSelectedDifficulty((prev) => (prev === payload.value ? '' : payload.value))
                      else if (payload.type === 'tag') setSelectedTags((prev) => (prev.includes(payload.value) ? prev.filter((t) => t !== payload.value) : [...prev, payload.value]))
                    }}
                  />
                ))}
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
              {/* Statut */}
              <div className="free-mode-filter-block free-mode-filter-block-statut">
                <h4 className="free-mode-filter-block-title">Statut</h4>
                <div className="free-mode-filter-group">
                  <div className="free-mode-statut-chips">
                    <button
                      type="button"
                      className={`free-mode-statut-chip ${selectedDoneStatus === 'all' ? 'free-mode-statut-chip-active' : ''}`}
                      onClick={() => setSelectedDoneStatus('all')}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      className={`free-mode-statut-chip ${selectedDoneStatus === 'done' ? 'free-mode-statut-chip-active' : ''}`}
                      onClick={() => setSelectedDoneStatus('done')}
                    >
                      Déjà fait
                    </button>
                    <button
                      type="button"
                      className={`free-mode-statut-chip ${selectedDoneStatus === 'not-done' ? 'free-mode-statut-chip-active' : ''}`}
                      onClick={() => setSelectedDoneStatus('not-done')}
                    >
                      Pas encore fait
                    </button>
                  </div>
                </div>
              </div>

              {/* Accès rapide */}
              <div className="free-mode-filter-block free-mode-filter-block-quick">
                <h4 className="free-mode-filter-block-title">Accès rapide</h4>
                <div className="free-mode-filter-group">
                  <label className="free-mode-filter-label">Niveau</label>
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
                {notionQuickFilters.length > 0 && (
                  <div className="free-mode-filter-group">
                    <label className="free-mode-filter-label">Filtrer par notion</label>
                    <div className="free-mode-notion-chips">
                      {notionQuickFilters.map(({ label, tag }) => (
                        <button
                          key={tag}
                          type="button"
                          className={`free-mode-notion-chip ${selectedTags.includes(tag) ? 'free-mode-notion-chip-active' : ''}`}
                          onClick={() => applyNotionQuickFilter(tag)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Affiner */}
              <div className="free-mode-filter-block">
                <h4 className="free-mode-filter-block-title">Affiner</h4>
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
                {genreOptions.length > 0 && (
                  <div className="free-mode-filter-group">
                    <label className="free-mode-filter-label">Genre (type d&apos;œuvre)</label>
                    <div className="free-mode-chips-container">
                      <button
                        className={`free-mode-chip ${selectedGenre === '' ? 'free-mode-chip-active' : ''}`}
                        onClick={() => setSelectedGenre('')}
                      >
                        Tous
                      </button>
                      {genreOptions.map(g => (
                        <button
                          key={g.id}
                          className={`free-mode-chip ${selectedGenre === g.id ? 'free-mode-chip-active' : ''}`}
                          onClick={() => setSelectedGenre(selectedGenre === g.id ? '' : g.id)}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {formations.length > 0 && (
                  <div className="free-mode-filter-group">
                    <label className="free-mode-filter-label">Formation (instrumentation)</label>
                    <div className="free-mode-chips-container">
                      <button
                        className={`free-mode-chip ${selectedFormations.length === 0 ? 'free-mode-chip-active' : ''}`}
                        onClick={() => setSelectedFormations([])}
                      >
                        Toutes
                      </button>
                      {formations.map(f => (
                        <button
                          key={f.id}
                          className={`free-mode-chip ${selectedFormations.includes(f.id) ? 'free-mode-chip-active' : ''}`}
                          onClick={() => toggleFormation(f.id)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Détails techniques */}
              <div className="free-mode-filter-block free-mode-filter-block-details">
                <h4 className="free-mode-filter-block-title">Détails techniques</h4>
              
              {/* Section Harmonie - Structure des accords */}
              {(tagCategories.renversements?.length > 0 || tagCategories.extensions?.length > 0 || tagCategories.qualites?.length > 0) && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Structure des accords</h4>
                  
                  {/* Renversements */}
                  {tagCategories.renversements?.length > 0 && (
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
                  {tagCategories.extensions?.length > 0 && (
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
                  {tagCategories.qualites?.length > 0 && (
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
              {tagCategories.accordsSpeciaux?.length > 0 && (
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
              {(tagCategories.cadences?.length > 0 || tagCategories.retards?.length > 0) && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Cadences et retards</h4>
                  
                  {/* Cadences */}
                  {tagCategories.cadences?.length > 0 && (
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
                  {tagCategories.retards?.length > 0 && (
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
              {(tagCategories.degres?.length > 0 || tagCategories.structure?.length > 0) && (
                <div className="free-mode-filter-section">
                  <h4 className="free-mode-filter-section-title">Structure et degrés</h4>
                  
                  {/* Degrés */}
                  {tagCategories.degres?.length > 0 && (
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
                  {tagCategories.structure?.length > 0 && (
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
              {tagCategories.fonctionsHarmoniques?.length > 0 && (
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
              {tagCategories.progressions?.length > 0 && (
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
              {tagCategories.contexteModal?.length > 0 && (
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
              {tagCategories.styles?.length > 0 && (
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
