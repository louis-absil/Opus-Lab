import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAssignmentsByTeacher, updateAssignment, deleteAssignment } from '../services/assignmentService'
import { getTeacherClasses } from '../services/teacherClassService'
import './TeacherAssignments.css'

const LIST_LIMIT = 30

function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function TeacherAssignments() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [classNames, setClassNames] = useState({}) // teacherClassId -> name
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [list, classes] = await Promise.all([
        getAssignmentsByTeacher(user.uid, LIST_LIMIT),
        getTeacherClasses(user.uid)
      ])
      setAssignments(list)
      const map = {}
      classes.forEach((c) => { map[c.id] = c.name })
      setClassNames(map)
    } catch (err) {
      console.error('TeacherAssignments load:', err)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!user || userData?.role !== 'teacher') {
      navigate('/dashboard')
      return
    }
  }, [user, userData?.role, navigate])

  const startEdit = (a) => {
    setEditingId(a.id)
    setEditTitle(a.title || '')
    setEditDueDate(a.dueDate ? (a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate)).toISOString().slice(0, 10) : '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditDueDate('')
  }

  const saveEdit = async () => {
    if (!editingId || !user) return
    setSaving(true)
    try {
      await updateAssignment(editingId, user.uid, {
        title: editTitle.trim() || null,
        dueDate: editDueDate ? new Date(editDueDate + 'T23:59:59') : null
      })
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? {
                ...a,
                title: editTitle.trim() || null,
                dueDate: editDueDate ? new Date(editDueDate + 'T23:59:59') : null
              }
            : a
        )
      )
      cancelEdit()
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Supprimer ce devoir ?')) return
    setDeletingId(assignmentId)
    try {
      await deleteAssignment(assignmentId, user.uid)
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setDeletingId(null)
    }
  }

  if (!user || userData?.role !== 'teacher') return null

  return (
    <div className="teacher-assignments-page">
      <header className="teacher-assignments-header">
        <button type="button" className="teacher-assignments-back" onClick={() => navigate('/dashboard')}>
          ← Retour au tableau de bord
        </button>
        <h1 className="teacher-assignments-title">Devoirs</h1>
        <p className="teacher-assignments-intro">
          Exercices que vous avez assignés à vos classes. Les élèves les voient dans leur tableau de bord.
        </p>
      </header>

      {loading ? (
        <div className="teacher-assignments-loading">
          <div className="spinner" />
          <p>Chargement des devoirs…</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="teacher-assignments-empty">
          <p>Aucun devoir pour le moment.</p>
          <p>Depuis le tableau de bord, ouvrez le menu d’un exercice et choisissez « Assigner à une classe ».</p>
        </div>
      ) : (
        <ul className="teacher-assignments-list">
          {assignments.map((a) => (
            <li key={a.id} className="teacher-assignments-card">
              <div className="teacher-assignments-card-main">
                <h3 className="teacher-assignments-card-title">
                  {editingId === a.id ? (
                    <input
                      type="text"
                      className="teacher-assignments-edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titre du devoir"
                    />
                  ) : (
                    a.title || a.exerciseTitle || 'Exercice'
                  )}
                </h3>
                <p className="teacher-assignments-card-class">{classNames[a.teacherClassId] || a.teacherClassId}</p>
                <p className="teacher-assignments-card-date">
                  Limite : {editingId === a.id ? (
                    <input
                      type="date"
                      className="teacher-assignments-edit-date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  ) : (
                    formatDate(a.dueDate)
                  )}
                </p>
              </div>
              <div className="teacher-assignments-card-actions">
                {editingId === a.id ? (
                  <>
                    <button type="button" onClick={saveEdit} disabled={saving}>{saving ? '…' : 'Enregistrer'}</button>
                    <button type="button" onClick={cancelEdit} disabled={saving}>Annuler</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="teacher-assignments-btn-play" onClick={() => navigate(`/play/${a.exerciseId}`)}>
                      Voir l’exercice
                    </button>
                    <button type="button" onClick={() => startEdit(a)}>Modifier</button>
                    <button type="button" className="danger" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id}>
                      {deletingId === a.id ? '…' : 'Supprimer'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TeacherAssignments
