import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllUserAttempts } from '../services/attemptService'
import { getExercisesByAuthor } from '../services/exerciseService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import { getFigureKeyLabel } from '../utils/tagFormatter'
import './ProfileModal.css'

/** Ordre d'affichage des figures (renversements) */
const FIGURE_ORDER = ['', '5', '6', '64', '7', '65', '43', '2', '42', '9', '54']

function ProfileModal({ isOpen, onClose, userRole, isPreviewMode = false }) {
  const { user, userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState(null)
  const [teacherStats, setTeacherStats] = useState(null)
  const [expandedDegrees, setExpandedDegrees] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (isPreviewMode && userRole === 'student') {
        // Mode preview : afficher des stats mockées pour l'aperçu élève
        loadPreviewStudentStats()
      } else if (user) {
        loadStats()
      }
    }
  }, [isOpen, user, userRole, isPreviewMode])

  const loadStats = async () => {
    try {
      setLoading(true)
      if (userRole === 'student' || userData?.role === 'student') {
        await loadStudentStats()
      } else if (userRole === 'teacher' || userData?.role === 'teacher') {
        await loadTeacherStats()
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Stats mockées pour l'aperçu élève en mode preview
  const loadPreviewStudentStats = () => {
    setLoading(true)
    // Simuler un chargement
    setTimeout(() => {
      setStudentStats({
        totalAttempts: 12,
        totalQuestions: 85,
        totalCorrect: 68,
        averageScore: 80,
        degreeStats: {
          'I': { total: 15, correct: 13 },
          'V': { total: 12, correct: 10 },
          'IV': { total: 8, correct: 7 },
          'vi': { total: 6, correct: 5 },
          'ii': { total: 5, correct: 4 },
          'Gr': { total: 3, correct: 2 },
          'N': { total: 2, correct: 1 }
        },
        cadenceStats: {
          'perfect': { total: 8, correct: 7 },
          'imperfect': { total: 5, correct: 4 },
          'plagal': { total: 3, correct: 2 }
        },
        totalAnalyzed: 85
      })
      setLoading(false)
    }, 500)
  }

  const loadStudentStats = async () => {
    const attempts = await getAllUserAttempts(user.uid)
    
    // Calculer les stats globales
    const totalAttempts = attempts.length
    const totalQuestions = attempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0)
    const totalCorrect = attempts.reduce((sum, a) => sum + (a.correctCount || 0), 0)
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts 
      : 0

    // Analyser par degré
    const degreeStats = {}
    const cadenceStats = {}
    let totalAnalyzed = 0

    attempts.forEach(attempt => {
      if (attempt.correctAnswers && Array.isArray(attempt.correctAnswers)) {
        attempt.correctAnswers.forEach((correct, index) => {
          if (!correct) return
          
          totalAnalyzed++
          const userAnswer = attempt.userAnswers?.[index]
          // Utiliser validateAnswerWithFunctions pour une validation robuste
          let validation = null
          if (userAnswer && correct) {
            validation = validateAnswerWithFunctions(
              userAnswer,
              correct,
              userAnswer.selectedFunction || userAnswer.function || null
            )
          }

          // Initialiser la validation avec des valeurs par défaut si pas de réponse
          if (!validation) {
            validation = { level: 0, score: 0, cadenceBonus: 0 }
          }

          const isCorrect = validation.level === 1
          const isPartial = validation.level === 2 || validation.level === 3
          const isIncorrect = validation.level === 0
          const score = validation.score || 0

          // Stats par degré - utiliser degree au lieu de root
          const degree = correct.degree || ''
          if (degree) {
            if (!degreeStats[degree]) {
              degreeStats[degree] = { 
                total: 0, 
                correct: 0, 
                partial: 0, 
                incorrect: 0,
                totalScore: 0,
                averageScore: 0,
                byFigure: {}
              }
            }
            degreeStats[degree].total++
            if (isCorrect) {
              degreeStats[degree].correct++
            } else if (isPartial) {
              degreeStats[degree].partial++
            } else if (isIncorrect) {
              degreeStats[degree].incorrect++
            }
            degreeStats[degree].totalScore += score
            degreeStats[degree].averageScore = Math.round(degreeStats[degree].totalScore / degreeStats[degree].total)

            // Stats par renversement (figure)
            const figureKey = (correct.figure && correct.figure !== '5') ? correct.figure : ''
            const byFigure = degreeStats[degree].byFigure
            if (!byFigure[figureKey]) {
              byFigure[figureKey] = { total: 0, correct: 0, partial: 0, incorrect: 0, totalScore: 0, averageScore: 0 }
            }
            byFigure[figureKey].total++
            if (isCorrect) byFigure[figureKey].correct++
            else if (isPartial) byFigure[figureKey].partial++
            else if (isIncorrect) byFigure[figureKey].incorrect++
            byFigure[figureKey].totalScore += score
            byFigure[figureKey].averageScore = Math.round(byFigure[figureKey].totalScore / byFigure[figureKey].total)
          }

          // Stats par cadence
          const cadence = correct.cadence || ''
          if (cadence) {
            if (!cadenceStats[cadence]) {
              cadenceStats[cadence] = { 
                total: 0, 
                correct: 0, 
                partial: 0, 
                incorrect: 0,
                totalScore: 0,
                averageScore: 0
              }
            }
            cadenceStats[cadence].total++
            if (isCorrect) {
              cadenceStats[cadence].correct++
            } else if (isPartial) {
              cadenceStats[cadence].partial++
            } else if (isIncorrect) {
              cadenceStats[cadence].incorrect++
            }
            cadenceStats[cadence].totalScore += score
            cadenceStats[cadence].averageScore = Math.round(cadenceStats[cadence].totalScore / cadenceStats[cadence].total)
          }
        })
      }
    })

    setStudentStats({
      totalAttempts,
      totalQuestions,
      totalCorrect,
      averageScore,
      degreeStats,
      cadenceStats,
      totalAnalyzed
    })
  }

  const loadTeacherStats = async () => {
    const exercises = await getExercisesByAuthor(user.uid)
    
    const publishedCount = exercises.filter(e => e.status === 'published').length
    const draftCount = exercises.filter(e => e.status === 'draft').length
    const totalMarkers = exercises.reduce((sum, e) => sum + (e.markers?.length || 0), 0)
    
    // Compter les exercices par compositeur
    const composerCount = {}
    exercises.forEach(ex => {
      const composer = ex.metadata?.composer || 'Non spécifié'
      composerCount[composer] = (composerCount[composer] || 0) + 1
    })

    setTeacherStats({
      totalExercises: exercises.length,
      publishedCount,
      draftCount,
      totalMarkers,
      composerCount
    })
  }

  if (!isOpen) return null

  const cadenceLabels = {
    perfect: 'Parfaite',
    imperfect: 'Imparfaite',
    plagal: 'Plagale',
    deceptive: 'Rompue',
    half: 'Demi'
  }

  const canExpandByFigure = (stats) => {
    const byFigure = stats?.byFigure
    if (!byFigure || typeof byFigure !== 'object') return false
    return Object.keys(byFigure).length >= 1
  }

  const toggleDegreeExpand = (degree) => {
    setExpandedDegrees(prev => ({ ...prev, [degree]: !prev[degree] }))
  }

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>Profil & Statistiques</h2>
          <button className="profile-modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="profile-modal-loading">
            <div className="spinner"></div>
            <p>Chargement des statistiques...</p>
          </div>
        ) : (
          <div className="profile-modal-content">
            {/* Informations utilisateur */}
            <div className="profile-user-info">
              {isPreviewMode ? (
                <>
                  <div className="profile-avatar-large preview-avatar">
                    <span className="preview-avatar-text">👤</span>
                  </div>
                  <div>
                    <h3>Élève Exemple</h3>
                    <p className="profile-role">Élève (Aperçu)</p>
                    <p className="profile-xp">XP: 680</p>
                    {isPreviewMode && (
                      <p className="profile-preview-badge">Mode Preview</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {user?.photoURL && (
                    <img src={user.photoURL} alt={user.displayName} className="profile-avatar-large" />
                  )}
                  <div>
                    <h3>{userData?.displayName || user?.displayName || 'Utilisateur'}</h3>
                    <p className="profile-role">{userRole === 'teacher' || userData?.role === 'teacher' ? 'Professeur' : 'Élève'}</p>
                    {userData?.xp !== undefined && (() => {
                      const lvl = Math.floor((userData.xp || 0) / 100) + 1
                      const title = lvl <= 4 ? 'Débutant' : lvl <= 9 ? 'En progression' : lvl <= 24 ? 'Régulier' : lvl <= 49 ? 'Assidu' : 'Expert'
                      return (
                        <p className="profile-xp">
                          <span className="profile-level-title">{title}</span>
                          <span className="profile-xp-value"> · Niv. {lvl} · {userData.xp} XP</span>
                        </p>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Stats Élève */}
            {((userRole === 'student' || userData?.role === 'student') || isPreviewMode) && studentStats && (
              <>
                <div className="profile-stats-section">
                  <h3>📊 Vue d'ensemble</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{studentStats.totalAttempts}</div>
                      <div className="stat-label">Exercices complétés</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{Math.round(studentStats.averageScore)}%</div>
                      <div className="stat-label">Score moyen</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{studentStats.totalCorrect}</div>
                      <div className="stat-label">Réponses correctes</div>
                    </div>
                  </div>
                </div>

                {Object.keys(studentStats.degreeStats).length > 0 && (
                  <div className="profile-stats-section">
                    <h3>🎵 Performance par degré</h3>
                    <div className="degree-stats-list">
                      {Object.entries(studentStats.degreeStats)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([degree, stats]) => {
                          const percentage = stats.averageScore !== undefined 
                            ? stats.averageScore 
                            : (stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0)
                          const expandable = canExpandByFigure(stats)
                          const isExpanded = expandedDegrees[degree]
                          const byFigureEntries = stats.byFigure && typeof stats.byFigure === 'object'
                            ? FIGURE_ORDER.filter(fig => fig in stats.byFigure).map(fig => [fig, stats.byFigure[fig]])
                            : []
                          const renderDegreeRow = (label, s, rowKey, isSub = false) => {
                            const pct = s.averageScore !== undefined 
                              ? s.averageScore 
                              : (s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0)
                            return (
                              <div key={rowKey} className={`degree-stat-item ${isSub ? 'degree-stat-item--sub' : ''}`}>
                                <div className="degree-stat-header">
                                  <span className="degree-name">{label}</span>
                                  <span className="degree-percentage">{pct}%</span>
                                </div>
                                <div className="degree-stat-bar">
                                  <div className="degree-stat-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="degree-stat-detail">
                                  {s.correct || 0}/{s.total} parfaites
                                  {s.partial > 0 && `, ${s.partial} partiellement justes`}
                                </div>
                              </div>
                            )
                          }
                          const inversionLabel = (figKey) =>
                            (figKey === '' || figKey === '5') ? degree : `${degree}${getFigureKeyLabel(figKey)}`
                          const handleDegreeKeyDown = (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleDegreeExpand(degree)
                            }
                          }
                          const cardContent = renderDegreeRow(degree, stats, degree)
                          return (
                            <div key={degree} className="profile-degree-block">
                              {expandable ? (
                                <div
                                  className="profile-degree-card profile-degree-card--clickable"
                                  onClick={() => toggleDegreeExpand(degree)}
                                  onKeyDown={handleDegreeKeyDown}
                                  role="button"
                                  tabIndex={0}
                                  aria-expanded={isExpanded}
                                  title={isExpanded ? 'Replier le détail par renversement' : 'Voir le détail par renversement'}
                                >
                                  {cardContent}
                                </div>
                              ) : (
                                <div className="profile-degree-card">{cardContent}</div>
                              )}
                              {expandable && isExpanded && byFigureEntries.length > 0 && (
                                <div className="profile-degree-by-figure">
                                  {byFigureEntries.map(([figKey, figStats]) =>
                                    renderDegreeRow(inversionLabel(figKey), figStats, `${degree}-${figKey || 'fund'}`, true)
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {Object.keys(studentStats.cadenceStats).length > 0 && (
                  <div className="profile-stats-section">
                    <h3>🎼 Performance par cadence</h3>
                    <div className="cadence-stats-list">
                      {Object.entries(studentStats.cadenceStats)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([cadence, stats]) => {
                          const percentage = stats.averageScore !== undefined 
                            ? stats.averageScore 
                            : (stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0)
                          const label = cadenceLabels[cadence] || cadence
                          return (
                            <div key={cadence} className="profile-cadence-block">
                              <div className="cadence-stat-item">
                                <div className="cadence-stat-header">
                                  <span className="cadence-name">{label}</span>
                                  <span className="cadence-percentage">{percentage}%</span>
                                </div>
                                <div className="cadence-stat-bar">
                                  <div className="cadence-stat-fill" style={{ width: `${percentage}%` }} />
                                </div>
                                <div className="cadence-stat-detail">
                                  {stats.correct || 0}/{stats.total || 0} parfaites
                                  {(stats.partial || 0) > 0 && `, ${stats.partial} partiellement justes`}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Stats Professeur */}
            {(userRole === 'teacher' || userData?.role === 'teacher') && teacherStats && (
              <>
                <div className="profile-stats-section">
                  <h3>📚 Vue d'ensemble</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{teacherStats.totalExercises}</div>
                      <div className="stat-label">Exercices créés</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{teacherStats.publishedCount}</div>
                      <div className="stat-label">Publiés</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{teacherStats.draftCount}</div>
                      <div className="stat-label">Brouillons</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{teacherStats.totalMarkers}</div>
                      <div className="stat-label">Marqueurs total</div>
                    </div>
                  </div>
                </div>

                {Object.keys(teacherStats.composerCount).length > 0 && (
                  <div className="profile-stats-section">
                    <h3>🎼 Répartition par compositeur</h3>
                    <div className="composer-stats-list">
                      {Object.entries(teacherStats.composerCount)
                        .sort((a, b) => b[1] - a[1])
                        .map(([composer, count]) => (
                          <div key={composer} className="composer-stat-item">
                            <span className="composer-name">{composer}</span>
                            <span className="composer-count">{count} exercice{count > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileModal

