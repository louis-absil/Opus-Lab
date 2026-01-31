import { useState, useEffect } from 'react'
import { getAllUserAttempts } from '../services/attemptService'
import { computeProfileStatsFromAttempts } from '../utils/profileStats'
import PerformanceDetails from './PerformanceDetails'
import './StudentDetailModal.css'

/**
 * Modal détail d'un élève (vue prof) : infos, stats, degrés/cadences
 */
function StudentDetailModal({ isOpen, onClose, student, currentUserId }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!isOpen || !student?.id) return
    setLoading(true)
    getAllUserAttempts(student.id)
      .then((data) => {
        setAttempts(data)
        setStats(computeProfileStatsFromAttempts(data))
      })
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false))
  }, [isOpen, student?.id])

  if (!isOpen) return null

  const level = student?.xp != null ? Math.floor((student.xp || 0) / 100) + 1 : 0
  const sortedByDate = [...attempts].sort((a, b) => {
    const ta = a.completedAt?.toDate?.()?.getTime() ?? 0
    const tb = b.completedAt?.toDate?.()?.getTime() ?? 0
    return tb - ta
  })
  const lastAttempt = sortedByDate[0] ?? null
  const lastActivityStr = lastAttempt?.completedAt
    ? (lastAttempt.completedAt.toDate ? lastAttempt.completedAt.toDate() : new Date(lastAttempt.completedAt)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="student-detail-modal-backdrop" onClick={onClose}>
      <div className="student-detail-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="student-detail-modal-header">
          <h2>Profil élève</h2>
          <button type="button" className="student-detail-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        {loading ? (
          <div className="student-detail-modal-loading">
            <div className="spinner"></div>
            <p>Chargement des données…</p>
          </div>
        ) : (
          <div className="student-detail-modal-content">
            <div className="student-detail-info">
              <h3>{student?.displayName || student?.email || 'Élève'}</h3>
              <p className="student-detail-meta">
                {student?.establishment && <span>Établissement : {student.establishment}</span>}
                {student?.class && <span>Classe : {student.class}</span>}
              </p>
              <div className="student-detail-stats-row">
                <span>Niveau {level}</span>
                <span>{student?.xp ?? 0} XP</span>
                {stats && (
                  <>
                    <span>{stats.totalAttempts} tentative{stats.totalAttempts !== 1 ? 's' : ''}</span>
                    <span>Score moyen : {Math.round(stats.averageScore)} %</span>
                    <span>Série : {stats.streak} jour{stats.streak !== 1 ? 's' : ''}</span>
                  </>
                )}
                <span>Dernière activité : {lastActivityStr}</span>
              </div>
            </div>
            {stats && (Object.keys(stats.degreeStats).length > 0 || Object.keys(stats.cadenceStats).length > 0) && (
              <div className="student-detail-performance">
                <PerformanceDetails degreeStats={stats.degreeStats} cadenceStats={stats.cadenceStats} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDetailModal
