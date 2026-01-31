import { useState, useEffect } from 'react'
import { getTeacherClasses } from '../services/teacherClassService'
import { createAssignment } from '../services/assignmentService'
import './AssignToClassModal.css'

function getYouTubeThumbnail(videoId) {
  if (!videoId) return null
  const id = videoId.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)?.[1] || videoId
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}

function AssignToClassModal({ isOpen, onClose, exercise, teacherId, onSuccess }) {
  const [teacherClasses, setTeacherClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !teacherId) return
    setLoadingClasses(true)
    setError('')
    setSelectedClassId('')
    setTitle('')
    setDueDate('')
    getTeacherClasses(teacherId)
      .then(setTeacherClasses)
      .catch(() => setTeacherClasses([]))
      .finally(() => setLoadingClasses(false))
  }, [isOpen, teacherId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedClassId || !exercise?.id || !teacherId) return
    setSubmitting(true)
    try {
      const exerciseTitle = exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || exercise.video?.title || 'Exercice'
      const exerciseThumbnail = getYouTubeThumbnail(exercise.video?.id) || null
      await createAssignment(teacherId, selectedClassId, exercise.id, {
        title: title.trim() || null,
        dueDate: dueDate ? new Date(dueDate + 'T23:59:59') : null,
        exerciseTitle,
        exerciseThumbnail
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'assignation.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="assign-to-class-modal-backdrop" onClick={onClose}>
      <div className="assign-to-class-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="assign-to-class-modal-header">
          <h2>Assigner à une classe</h2>
          <button type="button" className="assign-to-class-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <p className="assign-to-class-modal-exercise">
          {exercise?.metadata?.workTitle || exercise?.metadata?.exerciseTitle || exercise?.video?.title || 'Exercice'}
        </p>
        <form onSubmit={handleSubmit} className="assign-to-class-modal-form">
          <label>
            Classe <span className="required">*</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              required
              disabled={loadingClasses}
            >
              <option value="">— Choisir —</option>
              {teacherClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {teacherClasses.length === 0 && !loadingClasses && (
            <p className="assign-to-class-modal-hint">Créez d’abord une classe dans Mes classes.</p>
          )}
          <label>
            Titre du devoir (optionnel)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Devoir 1 – Cadences"
            />
          </label>
          <label>
            Date limite (optionnel)
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          {error && <p className="assign-to-class-modal-error">{error}</p>}
          <div className="assign-to-class-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>Annuler</button>
            <button type="submit" disabled={submitting || !selectedClassId || loadingClasses}>
              {submitting ? 'Envoi…' : 'Assigner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssignToClassModal
