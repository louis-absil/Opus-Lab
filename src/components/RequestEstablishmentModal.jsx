import { useState } from 'react'
import { createPendingEstablishmentRequest, createPendingClassRequest } from '../services/referenceDataService'
import './RequestEstablishmentModal.css'

/**
 * Modal pour demander l'ajout d'un établissement ou d'une classe (élève).
 * La demande sera validée par un professeur.
 */
function RequestEstablishmentModal({ isOpen, onClose, type, userId }) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const isEstablishment = type === 'establishment'
  const title = isEstablishment ? 'Demander un établissement' : 'Demander une classe'
  const label = isEstablishment ? 'Nom de l\'établissement' : 'Nom de la classe'
  const placeholder = isEstablishment ? 'Ex. Conservatoire de…' : 'Ex. Bachelor 1 (BA1)'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Veuillez saisir un libellé.')
      return
    }
    setError(null)
    setSending(true)
    try {
      if (isEstablishment) {
        await createPendingEstablishmentRequest(userId, trimmed)
      } else {
        await createPendingClassRequest(userId, trimmed)
      }
      setSuccess(true)
      setValue('')
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setValue('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="request-establishment-modal-backdrop" onClick={handleClose}>
      <div className="request-establishment-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="request-establishment-modal-header">
          <h2>{title}</h2>
          <button type="button" className="request-establishment-modal-close" onClick={handleClose} aria-label="Fermer">×</button>
        </div>
        <p className="request-establishment-modal-info">
          Votre demande sera envoyée aux professeurs. Une fois validée (et éventuellement corrigée), l’entrée apparaîtra dans la liste.
        </p>
        {success ? (
          <p className="request-establishment-modal-success">Demande envoyée. Un professeur pourra la valider.</p>
        ) : (
          <form onSubmit={handleSubmit} className="request-establishment-modal-form">
            <label htmlFor="request-establishment-input">{label}</label>
            <input
              id="request-establishment-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              disabled={sending}
              autoFocus
            />
            {error && <p className="request-establishment-modal-error">{error}</p>}
            <div className="request-establishment-modal-actions">
              <button type="button" onClick={handleClose} disabled={sending}>Annuler</button>
              <button type="submit" disabled={sending}>{sending ? 'Envoi…' : 'Envoyer la demande'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default RequestEstablishmentModal
