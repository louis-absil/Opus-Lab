import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getStudentsPaginated } from '../services/userService'
import {
  getEstablishments,
  getClasses,
  getPendingEstablishmentRequests,
  getPendingClassRequests,
  approveEstablishmentRequest,
  rejectEstablishmentRequest,
  rejectEstablishmentRequests,
  approveClassRequest,
  rejectClassRequest,
  rejectClassRequests,
  deleteEstablishmentRequest,
  deleteClassRequest,
  deleteEstablishmentRequests,
  deleteClassRequests
} from '../services/referenceDataService'
import StudentDetailModal from '../components/StudentDetailModal'
import './StudentCatalogue.css'

const PAGE_SIZE = 25

function StudentCatalogue() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [students, setStudents] = useState([])
  const [lastDoc, setLastDoc] = useState(null)
  const [pageHistory, setPageHistory] = useState([]) // [{ students, lastDoc }] pour bouton Précédent
  const [loading, setLoading] = useState(true)
  const [establishments, setEstablishments] = useState([])
  const [classes, setClasses] = useState([])
  const [filterScope, setFilterScope] = useState('all') // 'all' | 'mine' (Mes élèves)
  const [filterEstablishment, setFilterEstablishment] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [pendingEstablishments, setPendingEstablishments] = useState([])
  const [pendingClasses, setPendingClasses] = useState([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [approveEditValue, setApproveEditValue] = useState({}) // requestId -> value
  const [resolvingId, setResolvingId] = useState(null)
  const [selectedEstablishmentIds, setSelectedEstablishmentIds] = useState([])
  const [selectedClassIds, setSelectedClassIds] = useState([])

  const loadStudents = useCallback(async (startAfterDoc = null, currentPageSnapshot = null) => {
    if (!user) return
    setLoading(true)
    // #region agent log
    const teacherIdVal = filterScope === 'mine' ? user.uid : undefined
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentCatalogue.jsx:loadStudents',message:'loadStudents called',data:{filterScope,teacherIdPassed:teacherIdVal,filterEstablishment,filterClass},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      if (currentPageSnapshot) {
        setPageHistory((prev) => [...prev, currentPageSnapshot])
      }
      const { students: list, lastDoc: nextLast } = await getStudentsPaginated({
        pageSize: PAGE_SIZE,
        startAfterDoc: startAfterDoc || undefined,
        teacherId: teacherIdVal,
        establishment: filterEstablishment || undefined,
        class: filterClass || undefined
      })
      setStudents(list)
      setLastDoc(nextLast)
      if (!startAfterDoc) setPageHistory([])
    } catch (err) {
      console.error('StudentCatalogue loadStudents:', err)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [user, filterScope, filterEstablishment, filterClass])

  useEffect(() => {
    if (!user) return
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentCatalogue.jsx:useEffect',message:'effect run filter change',data:{filterScope,filterEstablishment,filterClass},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    loadStudents(null)
    setPageHistory([])
  }, [user, filterScope, filterEstablishment, filterClass])

  useEffect(() => {
    getEstablishments().then(setEstablishments).catch(() => setEstablishments([]))
    getClasses().then(setClasses).catch(() => setClasses([]))
  }, [])

  // Ouvrir avec filtre "Mes élèves" si on arrive depuis Mes classes
  useEffect(() => {
    if (location.state?.filterMyStudents && filterScope !== 'mine') {
      setFilterScope('mine')
      setPageHistory([])
    }
  }, [location.state?.filterMyStudents])

  const loadPending = useCallback(() => {
    setLoadingPending(true)
    Promise.all([getPendingEstablishmentRequests(), getPendingClassRequests()])
      .then(([est, cls]) => {
        setPendingEstablishments(est)
        setPendingClasses(cls)
        setApproveEditValue({})
        setSelectedEstablishmentIds([])
        setSelectedClassIds([])
      })
      .catch(() => {})
      .finally(() => setLoadingPending(false))
  }, [])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const handleApproveEstablishment = async (requestId, resolvedValue) => {
    const value = resolvedValue ?? pendingEstablishments.find((r) => r.id === requestId)?.requestedValue ?? ''
    if (!value.trim()) return
    setResolvingId(requestId)
    try {
      await approveEstablishmentRequest(requestId, value.trim(), user.uid)
      setPendingEstablishments((prev) => prev.filter((r) => r.id !== requestId))
      setEstablishments((prev) => [...new Set([...prev, value.trim()])].sort((a, b) => a.localeCompare(b, 'fr')))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }

  const handleRejectEstablishment = async (requestId) => {
    setResolvingId(requestId)
    try {
      await rejectEstablishmentRequest(requestId, user.uid)
      setPendingEstablishments((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }

  const handleApproveClass = async (requestId, resolvedValue) => {
    const value = resolvedValue ?? pendingClasses.find((r) => r.id === requestId)?.requestedValue ?? ''
    if (!value.trim()) return
    setResolvingId(requestId)
    try {
      await approveClassRequest(requestId, value.trim(), user.uid)
      setPendingClasses((prev) => prev.filter((r) => r.id !== requestId))
      setClasses((prev) => [...new Set([...prev, value.trim()])].sort((a, b) => a.localeCompare(b, 'fr')))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }

  const handleRejectClass = async (requestId) => {
    setResolvingId(requestId)
    try {
      await rejectClassRequest(requestId, user.uid)
      setPendingClasses((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }

  const toggleEstablishmentSelection = (id) => {
    setSelectedEstablishmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const toggleAllEstablishments = () => {
    if (selectedEstablishmentIds.length === pendingEstablishments.length) {
      setSelectedEstablishmentIds([])
    } else {
      setSelectedEstablishmentIds(pendingEstablishments.map((r) => r.id))
    }
  }
  const handleRejectEstablishmentSelection = async () => {
    if (selectedEstablishmentIds.length === 0) return
    setResolvingId('bulk-est')
    try {
      await rejectEstablishmentRequests(selectedEstablishmentIds, user.uid)
      setPendingEstablishments((prev) => prev.filter((r) => !selectedEstablishmentIds.includes(r.id)))
      setSelectedEstablishmentIds([])
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }
  const handleDeleteEstablishment = async (requestId) => {
    if (!window.confirm('Supprimer cette demande définitivement ?')) return
    setResolvingId(requestId)
    try {
      await deleteEstablishmentRequest(requestId)
      setPendingEstablishments((prev) => prev.filter((r) => r.id !== requestId))
      setSelectedEstablishmentIds((prev) => prev.filter((x) => x !== requestId))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }
  const handleDeleteEstablishmentSelection = async () => {
    if (selectedEstablishmentIds.length === 0) return
    if (!window.confirm(`Supprimer définitivement les ${selectedEstablishmentIds.length} demande(s) sélectionnée(s) ?`)) return
    setResolvingId('bulk-est')
    try {
      await deleteEstablishmentRequests(selectedEstablishmentIds)
      setPendingEstablishments((prev) => prev.filter((r) => !selectedEstablishmentIds.includes(r.id)))
      setSelectedEstablishmentIds([])
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }

  const toggleClassSelection = (id) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  const toggleAllClasses = () => {
    if (selectedClassIds.length === pendingClasses.length) {
      setSelectedClassIds([])
    } else {
      setSelectedClassIds(pendingClasses.map((r) => r.id))
    }
  }
  const handleRejectClassSelection = async () => {
    if (selectedClassIds.length === 0) return
    setResolvingId('bulk-cls')
    try {
      await rejectClassRequests(selectedClassIds, user.uid)
      setPendingClasses((prev) => prev.filter((r) => !selectedClassIds.includes(r.id)))
      setSelectedClassIds([])
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }
  const handleDeleteClass = async (requestId) => {
    if (!window.confirm('Supprimer cette demande définitivement ?')) return
    setResolvingId(requestId)
    try {
      await deleteClassRequest(requestId)
      setPendingClasses((prev) => prev.filter((r) => r.id !== requestId))
      setSelectedClassIds((prev) => prev.filter((x) => x !== requestId))
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }
  const handleDeleteClassSelection = async () => {
    if (selectedClassIds.length === 0) return
    if (!window.confirm(`Supprimer définitivement les ${selectedClassIds.length} demande(s) sélectionnée(s) ?`)) return
    setResolvingId('bulk-cls')
    try {
      await deleteClassRequests(selectedClassIds)
      setPendingClasses((prev) => prev.filter((r) => !selectedClassIds.includes(r.id)))
      setSelectedClassIds([])
    } catch (err) {
      alert(err.message || 'Erreur')
    } finally {
      setResolvingId(null)
    }
  }

  const handleNextPage = () => {
    if (lastDoc && students.length > 0) loadStudents(lastDoc, { students, lastDoc })
  }

  const handlePrevPage = () => {
    if (pageHistory.length === 0) return
    const prev = pageHistory[pageHistory.length - 1]
    setStudents(prev.students)
    setLastDoc(prev.lastDoc)
    setPageHistory((prevH) => prevH.slice(0, -1))
  }

  const hasNextPage = !!lastDoc && students.length === PAGE_SIZE
  const hasPrevPage = pageHistory.length > 0

  if (!user || userData?.role !== 'teacher') {
    navigate('/dashboard')
    return null
  }

  return (
    <div className="student-catalogue-page">
      <header className="student-catalogue-header">
        <button type="button" className="student-catalogue-back" onClick={() => navigate('/dashboard')}>
          ← Retour au tableau de bord
        </button>
        <h1 className="student-catalogue-title">Catalogue élèves</h1>
      </header>

      {/* Filtres */}
      <div className="student-catalogue-filters">
        <div className="student-catalogue-filter-scope">
          <button
            type="button"
            className={`student-catalogue-scope-tab ${filterScope === 'all' ? 'active' : ''}`}
            onClick={() => setFilterScope('all')}
          >
            Tous les élèves
          </button>
          <button
            type="button"
            className={`student-catalogue-scope-tab ${filterScope === 'mine' ? 'active' : ''}`}
            onClick={() => setFilterScope('mine')}
          >
            Mes élèves
          </button>
        </div>
        <label>
          Établissement
          <select
            value={filterEstablishment}
            onChange={(e) => setFilterEstablishment(e.target.value)}
          >
            <option value="">Tous</option>
            {establishments.filter((name) => name !== 'Autre').map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Classe
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">Toutes</option>
            {classes.filter((name) => name !== 'Autre').map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Demandes à valider */}
      {(pendingEstablishments.length > 0 || pendingClasses.length > 0) && (
        <section className="student-catalogue-pending">
          <h2>Demandes à valider</h2>
          {loadingPending && <p className="student-catalogue-loading-small">Chargement…</p>}
          {pendingEstablishments.length > 0 && (
            <div className="student-catalogue-pending-block">
              <h3>Établissements</h3>
              <div className="student-catalogue-pending-toolbar">
                <label className="student-catalogue-pending-select-all">
                  <input
                    type="checkbox"
                    checked={pendingEstablishments.length > 0 && selectedEstablishmentIds.length === pendingEstablishments.length}
                    onChange={toggleAllEstablishments}
                    disabled={!!resolvingId}
                  />
                  Tout sélectionner
                </label>
                <button
                  type="button"
                  onClick={handleRejectEstablishmentSelection}
                  disabled={selectedEstablishmentIds.length === 0 || resolvingId === 'bulk-est'}
                >
                  {resolvingId === 'bulk-est' ? '…' : `Rejeter la sélection (${selectedEstablishmentIds.length})`}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={handleDeleteEstablishmentSelection}
                  disabled={selectedEstablishmentIds.length === 0 || resolvingId === 'bulk-est'}
                >
                  Supprimer la sélection
                </button>
              </div>
              <ul>
                {pendingEstablishments.map((req) => (
                  <li key={req.id} className="student-catalogue-pending-item">
                    <input
                      type="checkbox"
                      checked={selectedEstablishmentIds.includes(req.id)}
                      onChange={() => toggleEstablishmentSelection(req.id)}
                      disabled={!!resolvingId}
                      className="student-catalogue-pending-checkbox"
                      aria-label="Sélectionner"
                    />
                    <span className="student-catalogue-pending-value">{req.requestedValue}</span>
                    <input
                      type="text"
                      placeholder="Corriger le libellé si besoin"
                      value={approveEditValue[req.id] ?? req.requestedValue}
                      onChange={(e) => setApproveEditValue((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      className="student-catalogue-pending-input"
                    />
                    <div className="student-catalogue-pending-actions">
                      <button
                        type="button"
                        onClick={() => handleApproveEstablishment(req.id, approveEditValue[req.id] ?? req.requestedValue)}
                        disabled={resolvingId === req.id || resolvingId === 'bulk-est'}
                      >
                        {resolvingId === req.id ? '…' : 'Valider'}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRejectEstablishment(req.id)}
                        disabled={resolvingId === req.id || resolvingId === 'bulk-est'}
                      >
                        Rejeter
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteEstablishment(req.id)}
                        disabled={resolvingId === req.id || resolvingId === 'bulk-est'}
                        title="Supprimer définitivement"
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingClasses.length > 0 && (
            <div className="student-catalogue-pending-block">
              <h3>Classes</h3>
              <div className="student-catalogue-pending-toolbar">
                <label className="student-catalogue-pending-select-all">
                  <input
                    type="checkbox"
                    checked={pendingClasses.length > 0 && selectedClassIds.length === pendingClasses.length}
                    onChange={toggleAllClasses}
                    disabled={!!resolvingId}
                  />
                  Tout sélectionner
                </label>
                <button
                  type="button"
                  onClick={handleRejectClassSelection}
                  disabled={selectedClassIds.length === 0 || resolvingId === 'bulk-cls'}
                >
                  {resolvingId === 'bulk-cls' ? '…' : `Rejeter la sélection (${selectedClassIds.length})`}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={handleDeleteClassSelection}
                  disabled={selectedClassIds.length === 0 || resolvingId === 'bulk-cls'}
                >
                  Supprimer la sélection
                </button>
              </div>
              <ul>
                {pendingClasses.map((req) => (
                  <li key={req.id} className="student-catalogue-pending-item">
                    <input
                      type="checkbox"
                      checked={selectedClassIds.includes(req.id)}
                      onChange={() => toggleClassSelection(req.id)}
                      disabled={!!resolvingId}
                      className="student-catalogue-pending-checkbox"
                      aria-label="Sélectionner"
                    />
                    <span className="student-catalogue-pending-value">{req.requestedValue}</span>
                    <input
                      type="text"
                      placeholder="Corriger le libellé si besoin"
                      value={approveEditValue[req.id] ?? req.requestedValue}
                      onChange={(e) => setApproveEditValue((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      className="student-catalogue-pending-input"
                    />
                    <div className="student-catalogue-pending-actions">
                      <button
                        type="button"
                        onClick={() => handleApproveClass(req.id, approveEditValue[req.id] ?? req.requestedValue)}
                        disabled={resolvingId === req.id || resolvingId === 'bulk-cls'}
                      >
                        {resolvingId === req.id ? '…' : 'Valider'}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRejectClass(req.id)}
                        disabled={resolvingId === req.id || resolvingId === 'bulk-cls'}
                      >
                        Rejeter
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDeleteClass(req.id)}
                        disabled={resolvingId === req.id || resolvingId === 'bulk-cls'}
                        title="Supprimer définitivement"
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Liste élèves */}
      <section className="student-catalogue-list">
        {loading ? (
          <div className="student-catalogue-loading">
            <div className="spinner"></div>
            <p>Chargement des élèves…</p>
          </div>
        ) : students.length === 0 ? (
          <p className="student-catalogue-empty">Aucun élève trouvé.</p>
        ) : (
          <>
            <div className="student-catalogue-table-wrap">
              <table className="student-catalogue-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Établissement</th>
                    <th>Classe</th>
                    <th>Niveau</th>
                    <th>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const level = Math.floor((s.xp || 0) / 100) + 1
                    return (
                      <tr
                        key={s.id}
                        className="student-catalogue-row"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <td>{s.displayName || s.email || '—'}</td>
                        <td>{s.establishment || '—'}</td>
                        <td>{s.class || '—'}</td>
                        <td>{level}</td>
                        <td>{s.xp ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="student-catalogue-pagination">
              <button type="button" onClick={handlePrevPage} disabled={!hasPrevPage}>
                Précédent
              </button>
              <button type="button" onClick={handleNextPage} disabled={!hasNextPage}>
                Suivant
              </button>
            </div>
          </>
        )}
      </section>

      <StudentDetailModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        currentUserId={user?.uid}
      />
    </div>
  )
}

export default StudentCatalogue
