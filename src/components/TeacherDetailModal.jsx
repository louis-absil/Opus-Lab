import './TeacherDetailModal.css'

/**
 * Modal détail d'un professeur : nom, email, établissements, matières, bouton mailto pour contacter
 */
function TeacherDetailModal({ isOpen, onClose, teacher, currentUserId }) {
  if (!isOpen) return null

  const isSelf = currentUserId && teacher?.id === currentUserId
  const email = teacher?.email
  const establishments = Array.isArray(teacher?.teacherEstablishments) ? teacher.teacherEstablishments : []
  const subjects = Array.isArray(teacher?.teacherSubjects) ? teacher.teacherSubjects : []
  const hasEstablishments = establishments.length > 0
  const hasSubjects = subjects.length > 0

  return (
    <div className="teacher-detail-modal-backdrop" onClick={onClose}>
      <div className="teacher-detail-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="teacher-detail-modal-header">
          <h2>Profil professeur</h2>
          <button type="button" className="teacher-detail-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="teacher-detail-modal-content">
          <h3>{teacher?.displayName || teacher?.email || 'Professeur'}{isSelf ? ' (Vous)' : ''}</h3>
          {email && (
            <p className="teacher-detail-email">{email}</p>
          )}
          {hasEstablishments && (
            <div className="teacher-detail-block">
              <span className="teacher-detail-label">Établissement(s)</span>
              <div className="teacher-detail-badges">
                {establishments.map((name) => (
                  <span key={name} className="teacher-detail-badge">{name}</span>
                ))}
              </div>
            </div>
          )}
          {hasSubjects && (
            <div className="teacher-detail-block">
              <span className="teacher-detail-label">Matière(s)</span>
              <div className="teacher-detail-badges">
                {subjects.map((name) => (
                  <span key={name} className="teacher-detail-badge">{name}</span>
                ))}
              </div>
            </div>
          )}
          {email && !isSelf && (
            <div className="teacher-detail-contact-block">
              <span className="teacher-detail-label">Contacter ce professeur</span>
              <div className="teacher-detail-contact-actions">
                <a
                  href={`mailto:${email}`}
                  className="teacher-detail-mailto"
                >
                  Envoyer un email
                </a>
                <button
                  type="button"
                  className="teacher-detail-copy-email"
                  onClick={() => {
                    navigator.clipboard?.writeText(email).then(() => {
                      const btn = document.querySelector('.teacher-detail-copy-email')
                      if (btn) {
                        const prev = btn.textContent
                        btn.textContent = 'Copié !'
                        setTimeout(() => { btn.textContent = prev }, 2000)
                      }
                    })
                  }}
                >
                  Copier l'email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherDetailModal
