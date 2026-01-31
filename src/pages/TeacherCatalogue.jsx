import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getTeachersPaginated } from '../services/userService'
import TeacherDetailModal from '../components/TeacherDetailModal'
import './TeacherCatalogue.css'

const PAGE_SIZE = 25

function TeacherCatalogue() {
  const { user, userData } = useAuth()
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState([])
  const [lastDoc, setLastDoc] = useState(null)
  const [pageHistory, setPageHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState(null)

  const loadTeachers = useCallback(async (startAfterDoc = null, currentPageSnapshot = null) => {
    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TeacherCatalogue.jsx:loadTeachers',message:'early return no user',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2c'})}).catch(()=>{});
      // #endregion
      return
    }
    setLoading(true)
    try {
      if (currentPageSnapshot) {
        setPageHistory((prev) => [...prev, currentPageSnapshot])
      }
      const { teachers: list, lastDoc: nextLast } = await getTeachersPaginated({
        pageSize: PAGE_SIZE,
        startAfterDoc: startAfterDoc || undefined
      })
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TeacherCatalogue.jsx:loadTeachers',message:'getTeachersPaginated result',data:{count:list?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2b'})}).catch(()=>{});
      // #endregion
      setTeachers(list)
      setLastDoc(nextLast)
      if (!startAfterDoc) setPageHistory([])
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TeacherCatalogue.jsx:loadTeachers',message:'catch error',data:{errMessage:err?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2a'})}).catch(()=>{});
      // #endregion
      console.error('TeacherCatalogue loadTeachers:', err)
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    loadTeachers(null)
    setPageHistory([])
  }, [user, loadTeachers])

  const handleNextPage = () => {
    if (lastDoc && teachers.length > 0) loadTeachers(lastDoc, { teachers, lastDoc })
  }

  const handlePrevPage = () => {
    if (pageHistory.length === 0) return
    const prev = pageHistory[pageHistory.length - 1]
    setTeachers(prev.teachers)
    setLastDoc(prev.lastDoc)
    setPageHistory((prevH) => prevH.slice(0, -1))
  }

  const hasNextPage = !!lastDoc && teachers.length === PAGE_SIZE
  const hasPrevPage = pageHistory.length > 0

  /** Affichage concis : premier(s) éléments puis "et X autre(s)" */
  const formatList = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return '—'
    if (arr.length === 1) return arr[0]
    if (arr.length === 2) return `${arr[0]}, ${arr[1]}`
    return `${arr[0]}, ${arr[1]} et ${arr.length - 2} autre(s)`
  }

  if (!user || userData?.role !== 'teacher') {
    navigate('/dashboard')
    return null
  }

  return (
    <div className="teacher-catalogue-page">
      <header className="teacher-catalogue-header">
        <button type="button" className="teacher-catalogue-back" onClick={() => navigate('/dashboard')}>
          ← Retour au tableau de bord
        </button>
        <h1 className="teacher-catalogue-title">Annuaire des professeurs</h1>
      </header>

      <section className="teacher-catalogue-list">
        {loading ? (
          <div className="teacher-catalogue-loading">
            <div className="spinner"></div>
            <p>Chargement des professeurs…</p>
          </div>
        ) : teachers.length === 0 ? (
          <p className="teacher-catalogue-empty">Aucun professeur trouvé.</p>
        ) : (
          <>
            <div className="teacher-catalogue-table-wrap">
              <table className="teacher-catalogue-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Établissement(s)</th>
                    <th>Matière(s)</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr
                      key={t.id}
                      className="teacher-catalogue-row"
                      onClick={() => setSelectedTeacher(t)}
                    >
                      <td>
                        {t.displayName || t.email || '—'}
                        {t.id === user?.uid ? ' (Vous)' : ''}
                      </td>
                      <td>{t.email || '—'}</td>
                      <td className="teacher-catalogue-cell-list">{formatList(t.teacherEstablishments)}</td>
                      <td className="teacher-catalogue-cell-list">{formatList(t.teacherSubjects)}</td>
                      <td className="teacher-catalogue-cell-contact" onClick={(e) => e.stopPropagation()}>
                        {t.email && t.id !== user?.uid ? (
                          <a
                            href={`mailto:${t.email}`}
                            className="teacher-catalogue-contact-link"
                            title="Envoyer un email"
                          >
                            Contacter
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="teacher-catalogue-pagination">
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

      <TeacherDetailModal
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        teacher={selectedTeacher}
        currentUserId={user?.uid}
      />
    </div>
  )
}

export default TeacherCatalogue
