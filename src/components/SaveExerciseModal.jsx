import { useState, useEffect, useRef } from 'react'
import { findExercisesByVideoId } from '../services/exerciseService'
import { parseYouTubeTitle, generateAutoTags, getHorizonsTagsForCategory, HORIZONS_MUSIC_CATEGORIES, HORIZONS_STYLE_ORDER } from '../utils/tagGenerator'
import { computeDifficultyFromContent } from '../utils/difficultyFromContent'
import { filterKnownTags } from '../data/knownTags'
import { CLASSICAL_FORMATIONS, HORIZONS_FORMATIONS, CLASSICAL_GENRES, getFormationTag, getGenreTag, inferFormationsFromWorkTitle, inferGenreFromWorkTitle } from '../data/formations'
import './SaveExerciseModal.css'

function SaveExerciseModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isSaving,
  videoId,
  videoTitle,
  markers,
  chordData,
  isEditMode = false,
  initialAutoTags = null,
  initialSection = null,
  initialMusicCategory = null,
  initialFormation = null,
  initialGenre = null,
  initialComposer = null,
  initialWorkTitle = null,
  initialMovementTitle = null,
  initialExerciseTitle = null,
  initialDifficulty = null
}) {
  const [composer, setComposer] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [movementTitle, setMovementTitle] = useState('')
  const [exerciseTitle, setExerciseTitle] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [privacy, setPrivacy] = useState('private')
  const [exerciseType, setExerciseType] = useState('classical')
  const [musicCategory, setMusicCategory] = useState('')
  const [selectedFormations, setSelectedFormations] = useState([]) // instrumentation (multi-select)
  const [genre, setGenre] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [existingExercisesCount, setExistingExercisesCount] = useState(0)
  const [manualTags, setManualTags] = useState([])
  const [newTagInput, setNewTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const tagInputRef = useRef(null)

  const buildSuggestedExerciseTitle = (c, w, m, variantNum) => {
    const parts = [c, w, m].filter(Boolean)
    const base = parts.length ? parts.join(', ') : 'Exercice d\'analyse harmonique'
    return variantNum != null ? `${base} (${variantNum})` : base
  }

  // Pré-remplissage intelligent à l'ouverture
  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoading(true)
      loadSmartFill()
    }
  }, [isOpen, videoId])

  // Initialiser type / style à l'ouverture
  useEffect(() => {
    if (!isOpen) return
    if (isEditMode && (initialSection === 'horizons' || initialMusicCategory)) {
      setExerciseType('horizons')
      setMusicCategory(initialMusicCategory || '')
    } else if (!isEditMode) {
      setExerciseType('classical')
      setMusicCategory('')
    }
  }, [isOpen, isEditMode, initialSection, initialMusicCategory])

  // Initialiser formation (array) et genre à l'ouverture (édition)
  useEffect(() => {
    if (!isOpen) return
    const formationArray = Array.isArray(initialFormation) ? initialFormation : (initialFormation ? [initialFormation] : [])
    setSelectedFormations(formationArray)
    setGenre(initialGenre || '')
  }, [isOpen, initialFormation, initialGenre])

  // Réinitialiser formations si elles n'existent pas dans la liste du type actuel
  useEffect(() => {
    const list = exerciseType === 'horizons' ? HORIZONS_FORMATIONS : CLASSICAL_FORMATIONS
    const ids = new Set(list.map(f => f.id))
    setSelectedFormations(prev => prev.filter(id => ids.has(id)))
  }, [exerciseType])

  // Suggestion formation + genre depuis workTitle (création, quand workTitle change)
  useEffect(() => {
    if (!isOpen || isEditMode || selectedFormations.length > 0 || genre) return
    const section = exerciseType === 'horizons' ? 'horizons' : null
    const inferredFormations = inferFormationsFromWorkTitle(workTitle, section)
    const inferredGenre = exerciseType === 'classical' ? inferGenreFromWorkTitle(workTitle) : null
    if (inferredFormations.length > 0) setSelectedFormations(inferredFormations)
    if (inferredGenre) setGenre(inferredGenre)
  }, [isOpen, isEditMode, workTitle, exerciseType, selectedFormations.length, genre])

  // Initialiser manualTags à l'ouverture : édition = initialAutoTags, création = générés + tags Horizons si besoin
  useEffect(() => {
    if (!isOpen) return
    if (isEditMode && Array.isArray(initialAutoTags)) {
      setManualTags([...initialAutoTags])
    } else {
      const generated = generateAutoTags(markers || [], chordData || {}, composer.trim() || null)
      const horizonsTags = (initialSection === 'horizons' && initialMusicCategory) ? getHorizonsTagsForCategory(initialMusicCategory) : []
      const formationTags = (Array.isArray(initialFormation) ? initialFormation : (initialFormation ? [initialFormation] : [])).map(id => getFormationTag(id)).filter(Boolean)
      const genreTag = initialGenre && getGenreTag(initialGenre) ? [getGenreTag(initialGenre)] : []
      setManualTags([...new Set([...horizonsTags, ...formationTags, ...genreTag, ...generated])])
    }
  }, [isOpen, isEditMode, initialAutoTags, initialSection, initialMusicCategory, initialFormation])

  // Mettre à jour les tags générés quand composer/markers/chordData/type/category/formations/genre changent (création uniquement)
  useEffect(() => {
    if (!isOpen || isEditMode) return
    const generated = generateAutoTags(markers || [], chordData || {}, composer.trim() || null)
    const horizonsTags = exerciseType === 'horizons' && musicCategory ? getHorizonsTagsForCategory(musicCategory) : []
    const formationTags = selectedFormations.map(id => getFormationTag(id)).filter(Boolean)
    const genreTag = genre ? getGenreTag(genre) : null
    setManualTags(prev => {
      const withoutFormationGenre = prev.filter(t => !t.startsWith('Formation') && !t.startsWith('Genre'))
      const merged = [...new Set([...horizonsTags, ...formationTags, ...(genreTag ? [genreTag] : []), ...generated, ...withoutFormationGenre])]
      if (prev.length === merged.length && merged.every(t => prev.includes(t))) return prev
      return merged
    })
  }, [isOpen, isEditMode, composer, markers, chordData, exerciseType, musicCategory, selectedFormations, genre])

  // Suggestions pour l'input "ajouter un tag"
  useEffect(() => {
    if (!newTagInput.trim()) {
      setTagSuggestions(filterKnownTags(''))
      return
    }
    setTagSuggestions(filterKnownTags(newTagInput))
  }, [newTagInput])

  const loadSmartFill = async () => {
    try {
      const existingExercises = await findExercisesByVideoId(videoId)

      if (isEditMode && (initialExerciseTitle != null || initialComposer != null)) {
        setComposer(initialComposer ?? '')
        setWorkTitle(initialWorkTitle ?? '')
        setMovementTitle(initialMovementTitle ?? '')
        setExerciseTitle(initialExerciseTitle ?? 'Analyse harmonique')
        setDifficulty(initialDifficulty ?? computeDifficultyFromContent(markers || [], chordData || {}) ?? '')
        setExistingExercisesCount(Math.max(0, existingExercises.length))
        return
      }

      const listFormations = exerciseType === 'horizons' ? HORIZONS_FORMATIONS : CLASSICAL_FORMATIONS
      const formationIds = new Set(listFormations.map((f) => f.id))

      if (existingExercises.length > 0) {
        const firstExercise = existingExercises[0]
        if (firstExercise.metadata) {
          const loadedComposer = firstExercise.metadata.composer || ''
          const loadedWorkTitle = firstExercise.metadata.workTitle || ''
          const loadedMovement = firstExercise.metadata.movementTitle || ''
          setComposer(loadedComposer)
          setWorkTitle(loadedWorkTitle)
          setMovementTitle(loadedMovement)
          setExistingExercisesCount(existingExercises.length)
          const computedDifficulty = computeDifficultyFromContent(markers || [], chordData || {})
          setDifficulty(computedDifficulty ?? firstExercise.metadata.difficulty ?? '')
          setExerciseTitle(buildSuggestedExerciseTitle(loadedComposer, loadedWorkTitle, loadedMovement, existingExercises.length + 1))
          const fromMeta = firstExercise.metadata.formation
          const loadedFormations = Array.isArray(fromMeta) ? fromMeta : fromMeta ? [fromMeta] : []
          const validFormations = loadedFormations.filter((id) => formationIds.has(id))
          if (validFormations.length > 0) setSelectedFormations(validFormations)
          else {
            const inferred = inferFormationsFromWorkTitle(loadedWorkTitle, exerciseType === 'horizons' ? 'horizons' : null)
            if (inferred.length > 0) setSelectedFormations(inferred.filter((id) => formationIds.has(id)))
          }
          if (firstExercise.metadata.genre) setGenre(firstExercise.metadata.genre)
          else {
            const inferredGenre = exerciseType === 'classical' ? inferGenreFromWorkTitle(loadedWorkTitle) : null
            if (inferredGenre) setGenre(inferredGenre)
          }
        } else {
          setExistingExercisesCount(existingExercises.length)
        }
      } else {
        const parsed = parseYouTubeTitle(videoTitle)
        const parsedComposer = parsed.composer || ''
        const parsedWorkTitle = parsed.workTitle || ''
        const parsedMovement = parsed.movementTitle || null
        setComposer(parsedComposer)
        setWorkTitle(parsedWorkTitle)
        setMovementTitle(parsedMovement || '')
        setExistingExercisesCount(0)
        setExerciseTitle(buildSuggestedExerciseTitle(parsedComposer, parsedWorkTitle, parsedMovement || '', null))
        const computedDifficulty = computeDifficultyFromContent(markers || [], chordData || {})
        setDifficulty(computedDifficulty ?? '')
        const inferredFormations = inferFormationsFromWorkTitle(parsedWorkTitle, exerciseType === 'horizons' ? 'horizons' : null)
        if (inferredFormations.length > 0) setSelectedFormations(inferredFormations.filter((id) => formationIds.has(id)))
        const inferredGenre = exerciseType === 'classical' ? inferGenreFromWorkTitle(parsedWorkTitle) : null
        if (inferredGenre) setGenre(inferredGenre)
      }
    } catch (error) {
      console.error('Erreur lors du pré-remplissage:', error)
      const parsed = parseYouTubeTitle(videoTitle)
      setComposer(parsed.composer || '')
      setWorkTitle(parsed.workTitle || '')
      setMovementTitle(parsed.movementTitle || '')
      setExistingExercisesCount(0)
      setExerciseTitle(buildSuggestedExerciseTitle(parsed.composer || '', parsed.workTitle || '', parsed.movementTitle || '', null))
      const computedDifficulty = computeDifficultyFromContent(markers || [], chordData || {})
      setDifficulty(computedDifficulty ?? '')
      const listFormationsFallback = exerciseType === 'horizons' ? HORIZONS_FORMATIONS : CLASSICAL_FORMATIONS
      const formationIdsFallback = new Set(listFormationsFallback.map((f) => f.id))
      const inferredFormations = inferFormationsFromWorkTitle(parsed.workTitle || '', exerciseType === 'horizons' ? 'horizons' : null)
      if (inferredFormations.length > 0) setSelectedFormations(inferredFormations.filter((id) => formationIdsFallback.has(id)))
      const inferredGenre = exerciseType === 'classical' ? inferGenreFromWorkTitle(parsed.workTitle || '') : null
      if (inferredGenre) setGenre(inferredGenre)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTag = (indexToRemove) => {
    setManualTags(prev => prev.filter((_, i) => i !== indexToRemove))
  }

  const handleAddTag = (tag) => {
    const t = (typeof tag === 'string' ? tag : newTagInput).trim()
    if (!t) return
    const normalized = t.replace(/\s+/g, '')
    const value = normalized || t
    if (value && !manualTags.includes(value)) {
      setManualTags(prev => [...prev, value])
      setNewTagInput('')
      setShowTagSuggestions(false)
    }
  }

  const handleResetAutoTags = () => {
    const generated = generateAutoTags(markers || [], chordData || {}, composer.trim() || null)
    const horizonsTags = exerciseType === 'horizons' && musicCategory ? getHorizonsTagsForCategory(musicCategory) : []
    const formationTags = selectedFormations.map(id => getFormationTag(id)).filter(Boolean)
    const genreTag = genre ? getGenreTag(genre) : null
    setManualTags([...new Set([...horizonsTags, ...formationTags, ...(genreTag ? [genreTag] : []), ...generated])])
  }

  const toggleFormation = (formationId) => {
    setSelectedFormations(prev => prev.includes(formationId) ? prev.filter(id => id !== formationId) : [...prev, formationId])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (exerciseTitle.trim()) {
      const section = exerciseType === 'horizons' ? 'horizons' : null
      const category = exerciseType === 'horizons' && musicCategory ? musicCategory : null
      const formationTags = selectedFormations.map(id => getFormationTag(id)).filter(Boolean)
      const genreTag = genre ? getGenreTag(genre) : null
      const tagsWithoutFormationGenre = manualTags.filter(t => !t.startsWith('Formation') && !t.startsWith('Genre'))
      const autoTags = [...new Set([...formationTags, ...(genreTag ? [genreTag] : []), ...tagsWithoutFormationGenre])]
      onSave({
        composer: composer.trim() || null,
        workTitle: workTitle.trim() || null,
        movementTitle: movementTitle.trim() || null,
        exerciseTitle: exerciseTitle.trim(),
        difficulty: difficulty.trim() || null,
        privacy: privacy,
        autoTags,
        section,
        musicCategory: category,
        formation: selectedFormations.length > 0 ? selectedFormations : null,
        genre: genre || null
      })
      resetForm()
    }
  }

  const resetForm = () => {
    setComposer('')
    setWorkTitle('')
    setMovementTitle('')
    setExerciseTitle('')
    setDifficulty('')
    setPrivacy('private')
    setExerciseType('classical')
    setMusicCategory('')
    setSelectedFormations([])
    setGenre('')
    setExistingExercisesCount(0)
    setManualTags([])
    setNewTagInput('')
    setShowTagSuggestions(false)
  }

  const handleClose = () => {
    if (!isSaving) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="save-modal-backdrop" onClick={handleClose}>
      <div className="save-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="save-modal-header">
          <h2>{isEditMode ? 'Sauvegarder les modifications' : 'Sauvegarder l\'exercice'}</h2>
          <button 
            className="save-modal-close" 
            onClick={handleClose}
            disabled={isSaving}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="save-modal-form">
          <div className="save-modal-body">
          {isLoading && (
            <div className="save-modal-loading">
              <span>Chargement des suggestions...</span>
            </div>
          )}

          {!isLoading && existingExercisesCount > 0 && (
            <div className="save-modal-existing-hint" role="status">
              {existingExercisesCount} exercice{existingExercisesCount > 1 ? 's' : ''} existant{existingExercisesCount > 1 ? 's' : ''} pour cette œuvre. Titre suggéré avec numéro ({existingExercisesCount + 1}).
            </div>
          )}

          <div className="save-modal-field">
            <label htmlFor="exercise-composer">
              Compositeur
            </label>
            <input
              id="exercise-composer"
              type="text"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Ex: Mozart, J.S. Bach"
              disabled={isSaving || isLoading}
            />
            <small className="save-modal-hint">Suggestion automatique basée sur les exercices existants</small>
          </div>

          <div className="save-modal-field">
            <label htmlFor="exercise-work-title">
              Titre de l'Œuvre
            </label>
            <input
              id="exercise-work-title"
              type="text"
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="Ex: Symphonie 40, Prélude en Do majeur"
              disabled={isSaving || isLoading}
            />
            <small className="save-modal-hint">Suggestion automatique basée sur le titre YouTube</small>
          </div>

          <div className="save-modal-field">
            <label htmlFor="exercise-movement">
              Mouvement <span className="save-modal-optional">(optionnel)</span>
            </label>
            <input
              id="exercise-movement"
              type="text"
              value={movementTitle}
              onChange={(e) => setMovementTitle(e.target.value)}
              placeholder="ex. II. Andante, 2e mouvement"
              disabled={isSaving || isLoading}
            />
            <small className="save-modal-hint">Pour une œuvre en plusieurs mouvements (vidéo complète ou titre sans mouvement)</small>
          </div>

          <div className="save-modal-field">
            <label htmlFor="exercise-title">
              Titre de l'Exercice / Variante <span className="required">*</span>
            </label>
            <input
              id="exercise-title"
              type="text"
              value={exerciseTitle}
              onChange={(e) => setExerciseTitle(e.target.value)}
              placeholder="Ex: Exposition - Niveau 1, Analyse complète"
              required
              disabled={isSaving || isLoading}
              autoFocus
            />
            <small className="save-modal-hint">Nom spécifique de cette variante d'exercice (généré automatiquement, modifiable)</small>
          </div>

          <div className="save-modal-field">
            <label htmlFor="exercise-difficulty">Niveau de difficulté</label>
            <select
              id="exercise-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isSaving || isLoading}
            >
              <option value="">Sélectionner...</option>
              <option value="débutant">Débutant</option>
              <option value="intermédiaire">Intermédiaire</option>
              <option value="avancé">Avancé</option>
              <option value="expert">Expert</option>
            </select>
            <small className="save-modal-hint">Suggestion automatique selon les accords et cadences (modifiable)</small>
          </div>

          <div className="save-modal-field">
            <label htmlFor="exercise-type">Type d&apos;exercice</label>
            <select
              id="exercise-type"
              value={exerciseType}
              onChange={(e) => {
                const v = e.target.value
                setExerciseType(v)
                if (v !== 'horizons') setMusicCategory('')
              }}
              disabled={isSaving || isLoading}
            >
              <option value="classical">Musique classique</option>
              <option value="horizons">Nouveaux Horizons (non classique)</option>
            </select>
            <small className="save-modal-hint">Nouveaux Horizons : film, JV, anime, variété, pop (section déblocable par les élèves)</small>
          </div>

          {exerciseType === 'horizons' && (
            <div className="save-modal-field">
              <label htmlFor="exercise-music-category">Style</label>
              <select
                id="exercise-music-category"
                value={musicCategory}
                onChange={(e) => setMusicCategory(e.target.value)}
                disabled={isSaving || isLoading}
              >
                <option value="">Sélectionner un style...</option>
                {HORIZONS_STYLE_ORDER.map((id) => (
                  <option key={id} value={id}>{HORIZONS_MUSIC_CATEGORIES[id].label}</option>
                ))}
              </select>
              <small className="save-modal-hint">Les tags Horizons et le style seront ajoutés automatiquement</small>
            </div>
          )}

          <div className="save-modal-field">
            <label>Formation (instrumentation)</label>
            <div className="save-modal-formation-chips">
              {(exerciseType === 'horizons' ? HORIZONS_FORMATIONS : CLASSICAL_FORMATIONS).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`save-modal-formation-chip ${selectedFormations.includes(f.id) ? 'save-modal-formation-chip-active' : ''}`}
                  onClick={() => toggleFormation(f.id)}
                  disabled={isSaving || isLoading}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <small className="save-modal-hint">Sélectionne un ou plusieurs (ex. Piano + Orchestre pour un concerto).</small>
          </div>

          {exerciseType === 'classical' && (
            <div className="save-modal-field">
              <label htmlFor="exercise-genre">Genre (type d&apos;œuvre)</label>
              <select
                id="exercise-genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                disabled={isSaving || isLoading}
              >
                <option value="">Non renseigné</option>
                {CLASSICAL_GENRES.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
              <small className="save-modal-hint">Concerto, Trio, Symphonie, etc. (distinct de l&apos;instrumentation).</small>
            </div>
          )}

          <div className="save-modal-field save-modal-tags-field">
            <label>Tags de l&apos;exercice</label>
            <div className="save-modal-tags-chips">
              {manualTags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="save-modal-tag-chip">
                  {tag}
                  <button
                    type="button"
                    className="save-modal-tag-chip-remove"
                    onClick={() => handleRemoveTag(index)}
                    disabled={isSaving || isLoading}
                    aria-label={`Retirer ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="save-modal-tags-add">
              <input
                ref={tagInputRef}
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="Ajouter un tag..."
                disabled={isSaving || isLoading}
                className="save-modal-tag-input"
              />
              <button
                type="button"
                className="save-modal-tag-add-btn"
                onClick={() => handleAddTag()}
                disabled={isSaving || isLoading || !newTagInput.trim()}
              >
                Ajouter
              </button>
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <div className="save-modal-tag-suggestions">
                  {tagSuggestions.filter(s => !manualTags.includes(s)).slice(0, 8).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="save-modal-tag-suggestion"
                      onMouseDown={(e) => { e.preventDefault(); handleAddTag(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="save-modal-tags-actions">
              <button
                type="button"
                className="save-modal-btn-reset-tags"
                onClick={handleResetAutoTags}
                disabled={isSaving || isLoading}
              >
                Réinitialiser aux tags automatiques
              </button>
            </div>
            <small className="save-modal-hint">Modifiez les tags pour corriger les erreurs ou ajouter des tags personnalisés.</small>
          </div>
        </div>

        <div className="save-modal-footer">
          {isEditMode && (
            <div className="save-modal-warning">
              ⚠️ Vous modifiez un exercice existant. Souhaitez-vous écraser l'original ou créer une copie ?
            </div>
          )}

          <div className="save-modal-field save-modal-privacy-field">
            <label htmlFor="exercise-privacy">Confidentialité</label>
            <select
              id="exercise-privacy"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              disabled={isSaving || isLoading}
            >
              <option value="private">Privé (visible uniquement par moi)</option>
              <option value="public">Public (visible par tous)</option>
            </select>
          </div>

          <div className="save-modal-actions">
            <button
              type="button"
              className="save-modal-btn cancel-btn"
              onClick={handleClose}
              disabled={isSaving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="save-modal-btn save-btn"
              disabled={!exerciseTitle.trim() || isSaving || isLoading}
            >
              {isSaving ? 'Sauvegarde...' : isEditMode ? 'Écraser' : 'Sauvegarder'}
            </button>
            {isEditMode && (
              <button
                type="button"
                className="save-modal-btn save-copy-btn"
                onClick={(e) => {
                  e.preventDefault()
                  const formationTags = selectedFormations.map(id => getFormationTag(id)).filter(Boolean)
                  const genreTag = genre ? getGenreTag(genre) : null
                  const tagsWithoutFormationGenre = manualTags.filter(t => !t.startsWith('Formation') && !t.startsWith('Genre'))
                  const autoTags = [...new Set([...formationTags, ...(genreTag ? [genreTag] : []), ...tagsWithoutFormationGenre])]
                  onSave({
                    composer: composer.trim() || null,
                    workTitle: workTitle.trim() || null,
                    movementTitle: movementTitle.trim() || null,
                    exerciseTitle: `${exerciseTitle.trim()} (Copie)`,
                    difficulty: difficulty.trim() || null,
                    privacy: privacy,
                    autoTags,
                    section: exerciseType === 'horizons' ? 'horizons' : null,
                    musicCategory: exerciseType === 'horizons' && musicCategory ? musicCategory : null,
                    formation: selectedFormations.length > 0 ? selectedFormations : null,
                    genre: genre || null,
                    saveAsCopy: true
                  })
                  resetForm()
                }}
                disabled={!exerciseTitle.trim() || isSaving || isLoading}
              >
                Sauvegarder copie
              </button>
            )}
          </div>
        </div>
        </form>
      </div>
    </div>
  )
}

export default SaveExerciseModal
