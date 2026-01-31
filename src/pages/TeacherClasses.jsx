import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getTeacherClasses,
  createTeacherClass,
  deleteTeacherClass
} from '../services/teacherClassService'
import './TeacherClasses.css'

export default function TeacherClasses() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCode, setCreateCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const loadClasses = useCallback(() => {
    if (!user) return
    setLoading(true)
    getTeacherClasses(user.uid)
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    if (!user || userData?.role !== 'teacher') {
      navigate('/dashboard')
      return
    }
  }, [user, userData?.role, navigate])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateError('')
    const name = createName.trim()
    if (!name) {
      setCreateError('Veuillez saisir un nom pour la classe.')
      return
    }
    setCreating(true)
    try {
      await createTeacherClass(user.uid, name, createCode.trim() || null)
      setCreateName('')
      setCreateCode('')
      setShowCreate(false)
      loadClasses()
    } catch (err) {
      setCreateError(err.message || 'Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (classId) => {
    if (!window.confirm('Supprimer cette classe ? Les élèves resteront dans votre liste « Mes élèves ».')) return
    setDeletingId(classId)
    try {
      await deleteTeacherClass(classId, user.uid)
      loadClasses()
    } catch (err) {
      alert(err.message || 'Erreur lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  const copyCode = (classId, code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(classId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  if (!user || userData?.role !== 'teacher') return null

  return (
    <div className="teacher-classes-page">
      <header className="teacher-classes-header">
        <button type="button" className="teacher-classes-back" onClick={() => navigate('/dashboard')}>
          ← Retour au tableau de bord
        </button>
        <h1 className="teacher-classes-title">Mes classes</h1>
        <p className="teacher-classes-intro">
          Créez des classes et partagez le code à vos élèves pour qu’ils vous rejoignent depuis leur profil.
        </p>
      </header>

      <div className="teacher-classes-actions">
        <button
          type="button"
          className="teacher-classes-btn-create"
          onClick={() => { setShowCreate(true); setCreateError(''); setCreateName(''); setCreateCode(''); }}
        >
          Créer une classe
        </button>
      </div>

      {showCreate && (
        <div className="teacher-classes-create-backdrop" onClick={() => !creating && setShowCreate(false)}>
          <div className="teacher-classes-create-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nouvelle classe</h2>
            <form onSubmit={handleCreate}>
              <label>
                Nom de la classe
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="ex. 1ère S – Groupe A"
                  autoFocus
                />
              </label>
              <label>
                Code (optionnel)
                <input
                  type="text"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  placeholder="Laissé vide = généré automatiquement"
                  maxLength={20}
                />
              </label>
              {createError && <p className="teacher-classes-create-error">{createError}</p>}
              <div className="teacher-classes-create-actions">
                <button type="button" onClick={() => !creating && setShowCreate(false)} disabled={creating}>
                  Annuler
                </button>
                <button type="submit" disabled={creating}>
                  {creating ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="teacher-classes-loading">
          <div className="spinner" />
          <p>Chargement des classes…</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="teacher-classes-empty">
          <p>Aucune classe pour le moment.</p>
          <p>Créez une classe et communiquez le code à vos élèves pour qu’ils vous rejoignent depuis leur profil.</p>
        </div>
      ) : (
        <ul className="teacher-classes-list">
          {classes.map((c) => (
            <li key={c.id} className="teacher-classes-card">
              <div className="teacher-classes-card-main">
                <h3 className="teacher-classes-card-name">{c.name}</h3>
                <div className="teacher-classes-card-code-row">
                  <code className="teacher-classes-card-code">{c.code}</code>
                  <button
                    type="button"
                    className="teacher-classes-copy-btn"
                    onClick={() => copyCode(c.id, c.code)}
                    title="Copier le code"
                  >
                    {copiedId === c.id ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>
              <div className="teacher-classes-card-actions">
                <button
                  type="button"
                  className="teacher-classes-card-link"
                  onClick={() => navigate('/dashboard/students', { state: { filterMyStudents: true } })}
                >
                  Voir mes élèves
                </button>
                <button
                  type="button"
                  className="teacher-classes-card-delete"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  title="Supprimer la classe"
                >
                  {deletingId === c.id ? '…' : 'Supprimer'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
