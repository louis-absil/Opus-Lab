import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllUserAttempts } from '../services/attemptService'
import { getExercisesByAuthor } from '../services/exerciseService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import './ProfileModal.css'

function ProfileModal({ isOpen, onClose, userRole, isPreviewMode = false }) {
  const { user, userData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState(null)
  const [teacherStats, setTeacherStats] = useState(null)

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
          let isCorrect = false
          if (userAnswer && correct) {
            const validation = validateAnswerWithFunctions(
              userAnswer,
              correct,
              userAnswer.selectedFunction || userAnswer.function || null
            )
            // Niveau 1 = réponse parfaite (correcte)
            isCorrect = validation.level === 1
          }

          // Stats par degré - utiliser degree au lieu de root
          const degree = correct.degree || ''
          if (degree) {
            if (!degreeStats[degree]) {
              degreeStats[degree] = { total: 0, correct: 0 }
            }
            degreeStats[degree].total++
            if (isCorrect) {
              degreeStats[degree].correct++
            }
          }

          // Stats par cadence
          const cadence = correct.cadence || ''
          if (cadence) {
            if (!cadenceStats[cadence]) {
              cadenceStats[cadence] = { total: 0, correct: 0 }
            }
            cadenceStats[cadence].total++
            if (isCorrect) {
              cadenceStats[cadence].correct++
            }
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
                    {userData?.xp !== undefined && (
                      <p className="profile-xp">XP: {userData.xp}</p>
                    )}
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
                          const percentage = stats.total > 0 
                            ? Math.round((stats.correct / stats.total) * 100) 
                            : 0
                          return (
                            <div key={degree} className="degree-stat-item">
                              <div className="degree-stat-header">
                                <span className="degree-name">{degree}</span>
                                <span className="degree-percentage">{percentage}%</span>
                              </div>
                              <div className="degree-stat-bar">
                                <div 
                                  className="degree-stat-fill" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="degree-stat-detail">
                                {stats.correct}/{stats.total} correctes
                              </div>
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
                          const percentage = stats.total > 0 
                            ? Math.round((stats.correct / stats.total) * 100) 
                            : 0
                          return (
                            <div key={cadence} className="cadence-stat-item">
                              <div className="cadence-stat-header">
                                <span className="cadence-name">{cadenceLabels[cadence] || cadence}</span>
                                <span className="cadence-percentage">{percentage}%</span>
                              </div>
                              <div className="cadence-stat-bar">
                                <div 
                                  className="cadence-stat-fill" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="cadence-stat-detail">
                                {stats.correct}/{stats.total} correctes
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

