import './ConfirmExitModal.css'

function ConfirmExitModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null

  return (
    <div className="confirm-exit-modal-backdrop" onClick={onClose}>
      <div className="confirm-exit-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-exit-modal-header">
          <h2>⚠️ Quitter l'éditeur</h2>
        </div>
        
        <div className="confirm-exit-modal-content">
          <p>
            Vous allez quitter l'exercice. Les modifications non sauvegardées seront perdues.
          </p>
          <p className="confirm-exit-modal-warning">
            Assurez-vous d'avoir sauvegardé votre travail avant de quitter.
          </p>
        </div>

        <div className="confirm-exit-modal-actions">
          <button
            type="button"
            className="confirm-exit-modal-btn cancel-btn"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="button"
            className="confirm-exit-modal-btn confirm-btn"
            onClick={onConfirm}
          >
            Quitter sans sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmExitModal

