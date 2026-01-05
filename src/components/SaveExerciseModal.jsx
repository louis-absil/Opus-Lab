import { useState, useEffect } from 'react'
import { findExercisesByVideoId } from '../services/exerciseService'
import { parseYouTubeTitle, generateAutoTags } from '../utils/tagGenerator'
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
  isEditMode = false
}) {
  const [composer, setComposer] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [exerciseTitle, setExerciseTitle] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [privacy, setPrivacy] = useState('private')
  const [isLoading, setIsLoading] = useState(false)

  // Pré-remplissage intelligent à l'ouverture
  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoading(true)
      loadSmartFill()
    }
  }, [isOpen, videoId])

  const loadSmartFill = async () => {
    try {
      // 1. Chercher si cette vidéo a déjà été utilisée
      const existingExercises = await findExercisesByVideoId(videoId)
      
      if (existingExercises.length > 0) {
        // Utiliser les métadonnées du premier exercice trouvé
        const firstExercise = existingExercises[0]
        if (firstExercise.metadata) {
          const loadedComposer = firstExercise.metadata.composer || ''
          const loadedWorkTitle = firstExercise.metadata.workTitle || ''
          setComposer(loadedComposer)
          setWorkTitle(loadedWorkTitle)
          setDifficulty(firstExercise.metadata.difficulty || '')
          
          // Générer le titre d'exercice avec les valeurs chargées
          if (loadedComposer || loadedWorkTitle) {
            const parts = []
            if (loadedComposer) parts.push(loadedComposer)
            if (loadedWorkTitle) parts.push(loadedWorkTitle)
            setExerciseTitle(`Analyse harmonique - ${parts.join(', ')}`)
          } else {
            setExerciseTitle('Analyse harmonique')
          }
        }
      } else {
        // 2. Parser le titre YouTube
        const parsed = parseYouTubeTitle(videoTitle)
        const parsedComposer = parsed.composer || ''
        const parsedWorkTitle = parsed.workTitle || ''
        setComposer(parsedComposer)
        setWorkTitle(parsedWorkTitle)
        
        // Générer le titre d'exercice avec les valeurs parsées
        if (parsedComposer || parsedWorkTitle) {
          const parts = []
          if (parsedComposer) parts.push(parsedComposer)
          if (parsedWorkTitle) parts.push(parsedWorkTitle)
          setExerciseTitle(`Analyse harmonique - ${parts.join(', ')}`)
        } else {
          setExerciseTitle('Analyse harmonique')
        }
      }
    } catch (error) {
      console.error('Erreur lors du pré-remplissage:', error)
      // En cas d'erreur, parser quand même le titre YouTube
      const parsed = parseYouTubeTitle(videoTitle)
      const parsedComposer = parsed.composer || ''
      const parsedWorkTitle = parsed.workTitle || ''
      setComposer(parsedComposer)
      setWorkTitle(parsedWorkTitle)
      
      // Générer le titre d'exercice
      if (parsedComposer || parsedWorkTitle) {
        const parts = []
        if (parsedComposer) parts.push(parsedComposer)
        if (parsedWorkTitle) parts.push(parsedWorkTitle)
        setExerciseTitle(`Analyse harmonique - ${parts.join(', ')}`)
      } else {
        setExerciseTitle('Analyse harmonique')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (exerciseTitle.trim()) {
      // Générer les tags automatiques
      const autoTags = generateAutoTags(markers, chordData)
      
      onSave({
        composer: composer.trim() || null,
        workTitle: workTitle.trim() || null,
        exerciseTitle: exerciseTitle.trim(),
        difficulty: difficulty.trim() || null,
        privacy: privacy,
        autoTags: autoTags
      })
      // Reset après sauvegarde
      resetForm()
    }
  }

  const resetForm = () => {
    setComposer('')
    setWorkTitle('')
    setExerciseTitle('')
    setDifficulty('')
    setPrivacy('private')
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
          {isLoading && (
            <div className="save-modal-loading">
              <span>Chargement des suggestions...</span>
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
            <small className="save-modal-hint">Niveau de difficulté de l'exercice</small>
          </div>

          <div className="save-modal-field">
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

          {isEditMode && (
            <div className="save-modal-warning">
              ⚠️ Vous modifiez un exercice existant. Souhaitez-vous écraser l'original ou créer une copie ?
            </div>
          )}

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
                  // Créer une copie
                  const autoTags = generateAutoTags(markers, chordData)
                  onSave({
                    composer: composer.trim() || null,
                    workTitle: workTitle.trim() || null,
                    exerciseTitle: `${exerciseTitle.trim()} (Copie)`,
                    difficulty: difficulty.trim() || null,
                    privacy: privacy,
                    autoTags: autoTags,
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
        </form>
      </div>
    </div>
  )
}

export default SaveExerciseModal
