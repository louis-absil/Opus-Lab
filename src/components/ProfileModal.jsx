import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllUserAttempts, getAttemptsCountByAuthor } from '../services/attemptService'
import { getExercisesByAuthor } from '../services/exerciseService'
import { getStudentsCount, updateUserProfile } from '../services/userService'
import { uploadAvatar, validateAvatarFile } from '../services/avatarService'
import { getEstablishments, getPendingEstablishmentRequests, getPendingClassRequests } from '../services/referenceDataService'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import { getFigureKeyLabel } from '../utils/tagFormatter'
import { getExerciseDisplayTitle } from '../utils/exerciseDisplay'
import { TEACHER_SUBJECTS } from '../data/teacherSubjects'
import './ProfileModal.css'

/** Ordre d'affichage des figures (renversements) */
const FIGURE_ORDER = ['', '5', '6', '64', '7', '65', '43', '2', '42', '9', '54']

function ProfileModal({ isOpen, onClose, userRole, isPreviewMode = false, onNavigate }) {
  const { user, userData, refreshUserData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState(null)
  const [teacherStats, setTeacherStats] = useState(null)
  const [expandedDegrees, setExpandedDegrees] = useState({})
  // Prof : établissements et matières (édition)
  const [profileEstablishments, setProfileEstablishments] = useState([])
  const [profileSubjects, setProfileSubjects] = useState([])
  const [establishmentsList, setEstablishmentsList] = useState([])
  const [loadingEstablishments, setLoadingEstablishments] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const fileInputRef = useRef(null)
  // Édition du nom (prof et élève)
  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [displayNameSaving, setDisplayNameSaving] = useState(false)
  const [displayNameError, setDisplayNameError] = useState(null)

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

  // Prof : charger liste établissements et synchroniser établissements/matières depuis userData
  useEffect(() => {
    if (!isOpen || isPreviewMode) return
    const isTeacher = userRole === 'teacher' || userData?.role === 'teacher'
    if (isTeacher) {
      setProfileEstablishments(Array.isArray(userData?.teacherEstablishments) ? [...userData.teacherEstablishments] : [])
      setProfileSubjects(Array.isArray(userData?.teacherSubjects) ? [...userData.teacherSubjects] : [])
      setLoadingEstablishments(true)
      getEstablishments()
        .then(setEstablishmentsList)
        .catch(() => setEstablishmentsList([]))
        .finally(() => setLoadingEstablishments(false))
    }
  }, [isOpen, isPreviewMode, userRole, userData?.role, userData?.teacherEstablishments, userData?.teacherSubjects])

  // Prof : backfill listedInTeacherCatalogue pour les comptes existants (sinon ils n'apparaissent pas dans l'annuaire)
  useEffect(() => {
    if (!isOpen || isPreviewMode || !user?.uid) return
    const isTeacher = userRole === 'teacher' || userData?.role === 'teacher'
    if (isTeacher && userData?.listedInTeacherCatalogue === undefined) {
      updateUserProfile(user.uid, { listedInTeacherCatalogue: true })
        .then(() => refreshUserData())
        .catch(console.error)
    }
  }, [isOpen, isPreviewMode, user?.uid, userRole, userData?.role, userData?.listedInTeacherCatalogue])

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

    // Compter les exercices par difficulté
    const difficultyCount = {}
    exercises.forEach(ex => {
      const difficulty = ex.metadata?.difficulty || 'Non spécifié'
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1
    })

    // Exercices récents (déjà triés par date dans getExercisesByAuthor)
    const recentExercises = exercises.slice(0, 5)

    let studentsCount = null
    try {
      studentsCount = await getStudentsCount()
    } catch (err) {
      console.warn('ProfileModal: getStudentsCount', err)
    }

    let pendingRequestsCount = 0
    try {
      const [pendingEst, pendingCls] = await Promise.all([
        getPendingEstablishmentRequests(),
        getPendingClassRequests()
      ])
      pendingRequestsCount = pendingEst.length + pendingCls.length
    } catch (err) {
      console.warn('ProfileModal: pending requests', err)
    }

    let attemptsOnMyExercisesCount = null
    try {
      attemptsOnMyExercisesCount = await getAttemptsCountByAuthor(user.uid)
    } catch (err) {
      console.warn('ProfileModal: getAttemptsCountByAuthor', err)
    }

    setTeacherStats({
      totalExercises: exercises.length,
      publishedCount,
      draftCount,
      totalMarkers,
      composerCount,
      difficultyCount,
      recentExercises,
      studentsCount,
      pendingRequestsCount,
      attemptsOnMyExercisesCount
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

  // Image de profil : priorité à Firestore (photo personnalisée), sinon Auth (ex. Google)
  const profilePhotoURL = userData?.photoURL ?? user?.photoURL

  const handleAvatarChange = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !user?.uid) return
    e.target.value = ''
    setAvatarError(null)
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setAvatarError(validation.error)
      return
    }
    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(user.uid, file)
      await updateUserProfile(user.uid, { photoURL: url })
      await refreshUserData()
    } catch (err) {
      setAvatarError(err.message || 'Erreur lors du chargement de l\'image.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const startEditingDisplayName = () => {
    setDisplayNameInput(userData?.displayName || user?.displayName || '')
    setDisplayNameError(null)
    setEditingDisplayName(true)
  }

  const cancelEditingDisplayName = () => {
    setEditingDisplayName(false)
    setDisplayNameInput('')
    setDisplayNameError(null)
  }

  const saveDisplayName = async () => {
    const trimmed = displayNameInput?.trim() || ''
    if (!user?.uid) return
    setDisplayNameError(null)
    if (!trimmed) {
      setDisplayNameError('Le nom ne peut pas être vide.')
      return
    }
    setDisplayNameSaving(true)
    try {
      await updateUserProfile(user.uid, { displayName: trimmed })
      await refreshUserData()
      setEditingDisplayName(false)
      setDisplayNameInput('')
    } catch (err) {
      setDisplayNameError(err.message || 'Erreur lors de l\'enregistrement.')
    } finally {
      setDisplayNameSaving(false)
    }
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
                  <div className="profile-avatar-wrap">
                    {profilePhotoURL ? (
                      <img src={profilePhotoURL} alt={userData?.displayName || user?.displayName} className="profile-avatar-large" />
                    ) : (
                      <div className="profile-avatar-large profile-avatar-placeholder" aria-hidden="true">
                        <span className="profile-avatar-initials">
                          {(userData?.displayName || user?.displayName || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!isPreviewMode && user?.uid && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="profile-avatar-input"
                          aria-label="Changer la photo de profil"
                          onChange={handleAvatarChange}
                          disabled={avatarUploading}
                        />
                        <button
                          type="button"
                          className="profile-avatar-change-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarUploading}
                          title="Changer la photo de profil"
                        >
                          {avatarUploading ? 'Chargement…' : 'Changer la photo'}
                        </button>
                        {avatarError && (
                          <p className="profile-avatar-error" role="alert">{avatarError}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    {!isPreviewMode && user?.uid && editingDisplayName ? (
                      <div className="profile-display-name-edit">
                        <input
                          type="text"
                          className="profile-display-name-input"
                          value={displayNameInput}
                          onChange={(e) => setDisplayNameInput(e.target.value)}
                          placeholder="Votre nom"
                          disabled={displayNameSaving}
                          aria-label="Nom d'affichage"
                        />
                        <div className="profile-display-name-actions">
                          <button
                            type="button"
                            className="profile-display-name-save"
                            onClick={saveDisplayName}
                            disabled={displayNameSaving}
                          >
                            {displayNameSaving ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                          <button
                            type="button"
                            className="profile-display-name-cancel"
                            onClick={cancelEditingDisplayName}
                            disabled={displayNameSaving}
                          >
                            Annuler
                          </button>
                        </div>
                        {displayNameError && (
                          <p className="profile-display-name-error" role="alert">{displayNameError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="profile-display-name-wrap">
                        <h3 className="profile-display-name">{userData?.displayName || user?.displayName || 'Utilisateur'}</h3>
                        {!isPreviewMode && user?.uid && (
                          <button
                            type="button"
                            className="profile-display-name-edit-btn"
                            onClick={startEditingDisplayName}
                          >
                            Modifier le nom
                          </button>
                        )}
                      </div>
                    )}
                    <p className="profile-role">{userRole === 'teacher' || userData?.role === 'teacher' ? 'Professeur' : 'Élève'}</p>
                    {userData?.xp !== undefined && (() => {
                      const lvl = Math.floor((userData.xp || 0) / 100) + 1
                      const title = lvl <= 4 ? 'Débutant' : lvl <= 9 ? 'En progression' : lvl <= 24 ? 'Régulier' : lvl <= 49 ? 'Assidu' : 'Expert'
                      const isTeacher = userRole === 'teacher' || userData?.role === 'teacher'
                      return (
                        <p className="profile-xp">
                          {isTeacher && <span className="profile-xp-mode-label">Progression en mode élève : </span>}
                          <span className="profile-level-title">{title}</span>
                          <span className="profile-xp-value"> · Niv. {lvl} · {userData.xp} XP</span>
                        </p>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Prof : Où j'enseigne / Mes matières (éditable) */}
            {(userRole === 'teacher' || userData?.role === 'teacher') && !isPreviewMode && user?.uid && (
              <div className="profile-stats-section profile-teacher-edit-section">
                <h3>Où j'enseigne / Mes matières</h3>
                <p className="profile-teacher-edit-hint">
                  Ajoutez des établissements et des matières via les listes déroulantes. Choisissez « Enseignement instrumental » si vous n'enseignez pas de matière théorique.
                </p>
                <div className="profile-teacher-edit-fields">
                  <div className="profile-teacher-edit-field">
                    <label htmlFor="profile-teacher-establishment-select">Établissements</label>
                    {loadingEstablishments ? (
                      <p className="profile-teacher-edit-loading">Chargement…</p>
                    ) : (
                      <>
                        <select
                          id="profile-teacher-establishment-select"
                          className="profile-teacher-select"
                          value=""
                          onChange={async (e) => {
                            const v = e.target.value
                            if (!v) return
                            if (profileEstablishments.includes(v)) return
                            const next = [...profileEstablishments, v]
                            setProfileEstablishments(next)
                            e.target.value = ''
                            try {
                              await updateUserProfile(user.uid, { teacherEstablishments: next })
                              await refreshUserData()
                            } catch (err) {
                              console.error(err)
                              setProfileEstablishments(profileEstablishments)
                            }
                          }}
                        >
                          <option value="">— Ajouter un établissement —</option>
                          {establishmentsList
                            .filter((name) => name !== 'Autre' && !profileEstablishments.includes(name))
                            .map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <div className="profile-teacher-chips">
                          {profileEstablishments.map((name) => (
                            <span key={name} className="profile-teacher-chip">
                              {name}
                              <button
                                type="button"
                                className="profile-teacher-chip-remove"
                                onClick={async () => {
                                  const next = profileEstablishments.filter((e) => e !== name)
                                  setProfileEstablishments(next)
                                  try {
                                    await updateUserProfile(user.uid, { teacherEstablishments: next })
                                    await refreshUserData()
                                  } catch (err) {
                                    console.error(err)
                                    setProfileEstablishments(profileEstablishments)
                                  }
                                }}
                                aria-label={`Retirer ${name}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="profile-teacher-edit-field">
                    <label htmlFor="profile-teacher-subject-select">Matières</label>
                    <select
                      id="profile-teacher-subject-select"
                      className="profile-teacher-select"
                      value=""
                      onChange={async (e) => {
                        const v = e.target.value
                        if (!v) return
                        if (profileSubjects.includes(v)) return
                        const next = [...profileSubjects, v]
                        setProfileSubjects(next)
                        e.target.value = ''
                        try {
                          await updateUserProfile(user.uid, { teacherSubjects: next })
                          await refreshUserData()
                        } catch (err) {
                          console.error(err)
                          setProfileSubjects(profileSubjects)
                        }
                      }}
                    >
                      <option value="">— Ajouter une matière —</option>
                      {TEACHER_SUBJECTS.filter((s) => !profileSubjects.includes(s)).map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    <div className="profile-teacher-chips">
                      {profileSubjects.map((name) => (
                        <span key={name} className="profile-teacher-chip">
                          {name}
                          <button
                            type="button"
                            className="profile-teacher-chip-remove"
                            onClick={async () => {
                              const next = profileSubjects.filter((s) => s !== name)
                              setProfileSubjects(next)
                              try {
                                await updateUserProfile(user.uid, { teacherSubjects: next })
                                await refreshUserData()
                              } catch (err) {
                                console.error(err)
                                setProfileSubjects(profileSubjects)
                              }
                            }}
                            aria-label={`Retirer ${name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="profile-teacher-edit-field profile-teacher-listed-toggle">
                  <label className="profile-teacher-checkbox-label">
                    <input
                      type="checkbox"
                      checked={userData?.listedInTeacherCatalogue !== false}
                      onChange={async (e) => {
                        const checked = e.target.checked
                        try {
                          await updateUserProfile(user.uid, { listedInTeacherCatalogue: checked })
                          await refreshUserData()
                        } catch (err) {
                          console.error(err)
                        }
                      }}
                    />
                    <span>Apparaître dans l'annuaire des professeurs</span>
                  </label>
                  <p className="profile-teacher-edit-hint profile-teacher-listed-hint">
                    Décochez pour ne plus apparaître dans l'annuaire (les autres profs ne pourront plus vous y voir ni vous contacter depuis la liste).
                  </p>
                </div>
              </div>
            )}

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
                {teacherStats.pendingRequestsCount > 0 && (
                  <div className="profile-stats-section profile-pending-banner">
                    <div className="profile-pending-banner-inner">
                      <span className="profile-pending-banner-text">
                        {teacherStats.pendingRequestsCount} demande{teacherStats.pendingRequestsCount > 1 ? 's' : ''} en attente
                      </span>
                      <button
                        type="button"
                        className="profile-pending-banner-btn"
                        onClick={() => onNavigate?.('/dashboard/students')}
                      >
                        Gérer
                      </button>
                    </div>
                  </div>
                )}

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
                    {teacherStats.studentsCount !== null && teacherStats.studentsCount !== undefined && (
                      <div className="stat-card">
                        <div className="stat-value">{teacherStats.studentsCount}</div>
                        <div className="stat-label">Élèves (catalogue)</div>
                      </div>
                    )}
                    {teacherStats.attemptsOnMyExercisesCount !== null && teacherStats.attemptsOnMyExercisesCount !== undefined && (
                      <div className="stat-card">
                        <div className="stat-value">{teacherStats.attemptsOnMyExercisesCount}</div>
                        <div className="stat-label">Tentatives sur mes exercices</div>
                      </div>
                    )}
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

                {Object.keys(teacherStats.difficultyCount || {}).length > 0 && (
                  <div className="profile-stats-section">
                    <h3>📊 Répartition par difficulté</h3>
                    <div className="difficulty-stats-list">
                      {Object.entries(teacherStats.difficultyCount)
                        .sort((a, b) => b[1] - a[1])
                        .map(([difficulty, count]) => (
                          <div key={difficulty} className="difficulty-stat-item">
                            <span className="difficulty-stat-name">{difficulty}</span>
                            <span className="difficulty-stat-count">{count} exercice{count > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {teacherStats.recentExercises?.length > 0 && (
                  <div className="profile-stats-section">
                    <h3>📝 Exercices récents</h3>
                    <ul className="profile-recent-exercises">
                      {teacherStats.recentExercises.map((ex) => (
                        <li key={ex.id} className="profile-recent-exercise-item">
                          <a
                            href={`/editor/${ex.id}`}
                            className="profile-recent-exercise-link"
                            onClick={(e) => {
                              e.preventDefault()
                              onNavigate?.('/editor/' + ex.id)
                            }}
                          >
                            <span className="profile-recent-exercise-title">
                              {getExerciseDisplayTitle(ex, teacherStats.recentExercises)}
                            </span>
                            <span className={`profile-recent-exercise-status profile-recent-exercise-status--${ex.status || 'draft'}`}>
                              {ex.status === 'published' ? 'Publié' : 'Brouillon'}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {onNavigate && (
                  <div className="profile-stats-section">
                    <h3>🔗 Accès rapides</h3>
                    <div className="profile-quick-links">
                      <button type="button" className="profile-quick-link" onClick={() => onNavigate('/dashboard/students')}>
                        Catalogue élèves
                      </button>
                      <button type="button" className="profile-quick-link" onClick={() => onNavigate('/student-dashboard')}>
                        Vue élève
                      </button>
                      <button type="button" className="profile-quick-link" onClick={() => onNavigate('/editor')}>
                        Créer un exercice
                      </button>
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

