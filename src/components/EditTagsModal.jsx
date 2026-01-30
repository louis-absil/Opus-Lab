import { useState, useEffect } from 'react'
import { updateExercise } from '../services/exerciseService'
import { filterKnownTags } from '../data/knownTags'
import './EditTagsModal.css'

function EditTagsModal({ isOpen, onClose, exercise, onSave }) {
  const [tags, setTags] = useState([])
  const [newTagInput, setNewTagInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && exercise) {
      setTags(Array.isArray(exercise.autoTags) ? [...exercise.autoTags] : [])
      setNewTagInput('')
      setError(null)
    }
  }, [isOpen, exercise])

  useEffect(() => {
    if (!newTagInput.trim()) {
      setSuggestions(filterKnownTags(''))
      return
    }
    setSuggestions(filterKnownTags(newTagInput))
  }, [newTagInput])

  const handleRemoveTag = (indexToRemove) => {
    setTags(prev => prev.filter((_, i) => i !== indexToRemove))
  }

  const handleAddTag = (tag) => {
    const t = (typeof tag === 'string' ? tag : newTagInput).trim()
    if (!t) return
    const normalized = t.replace(/\s+/g, '')
    const value = normalized || t
    if (value && !tags.includes(value)) {
      setTags(prev => [...prev, value])
      setNewTagInput('')
      setShowSuggestions(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!exercise?.id) return
    setSaving(true)
    setError(null)
    try {
      await updateExercise(exercise.id, { autoTags: tags })
      onSave?.()
      onClose?.()
    } catch (err) {
      console.error('Erreur lors de la mise à jour des tags:', err)
      setError(err.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) onClose?.()
  }

  if (!isOpen) return null

  const title = exercise?.metadata?.exerciseTitle
    || exercise?.metadata?.title
    || (exercise?.metadata?.composer && exercise?.metadata?.workTitle
      ? `${exercise.metadata.composer} - ${exercise.metadata.workTitle}`
      : 'Exercice')

  return (
    <div className="edit-tags-modal-backdrop" onClick={handleBackdropClick}>
      <div className="edit-tags-modal-container" onClick={e => e.stopPropagation()}>
        <div className="edit-tags-modal-header">
          <h2>Éditer les tags</h2>
          <button
            type="button"
            className="edit-tags-modal-close"
            onClick={() => !saving && onClose?.()}
            disabled={saving}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <p className="edit-tags-modal-subtitle">{title}</p>
        <form onSubmit={handleSubmit} className="edit-tags-modal-form">
          <div className="edit-tags-modal-chips">
            {tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="edit-tags-modal-chip">
                {tag}
                <button
                  type="button"
                  className="edit-tags-modal-chip-remove"
                  onClick={() => handleRemoveTag(index)}
                  disabled={saving}
                  aria-label={`Retirer ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="edit-tags-modal-add">
            <input
              type="text"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Ajouter un tag..."
              disabled={saving}
              className="edit-tags-modal-input"
            />
            <button
              type="button"
              className="edit-tags-modal-add-btn"
              onClick={() => handleAddTag()}
              disabled={saving || !newTagInput.trim()}
            >
              Ajouter
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="edit-tags-modal-suggestions">
                {suggestions.filter(s => !tags.includes(s)).slice(0, 8).map(s => (
                  <button
                    key={s}
                    type="button"
                    className="edit-tags-modal-suggestion"
                    onMouseDown={e => { e.preventDefault(); handleAddTag(s); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && (
            <div className="edit-tags-modal-error" role="alert">
              {error}
            </div>
          )}
          <div className="edit-tags-modal-actions">
            <button
              type="button"
              className="edit-tags-modal-btn cancel"
              onClick={() => !saving && onClose?.()}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="edit-tags-modal-btn save"
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTagsModal
