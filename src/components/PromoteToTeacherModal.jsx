import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { promoteToTeacher, isEmailAuthorized } from '../services/userService'
import './PromoteToTeacherModal.css'

function PromoteToTeacherModal({ isOpen, onClose }) {
  const { user, refreshUserData } = useAuth()
  const [error, setError] = useState('')
  const [isPromoting, setIsPromoting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Vérifier si l'email est autorisé au chargement de la modale
  useEffect(() => {
    if (isOpen && user?.email) {
      checkAuthorization()
    } else {
      setIsAuthorized(false)
      setError('')
    }
  }, [isOpen, user?.email])

  const checkAuthorization = async () => {
    if (!user?.email) {
      setIsAuthorized(false)
      return
    }

    try {
      setIsChecking(true)
      const authorized = await isEmailAuthorized(user.email)
      setIsAuthorized(authorized)
      
      if (!authorized) {
        setError('Votre email n\'est pas autorisé à devenir professeur. Contactez l\'administrateur.')
      } else {
        setError('')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error)
      setIsAuthorized(false)
      setError('Erreur lors de la vérification de votre autorisation.')
    } finally {
      setIsChecking(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('Vous devez être connecté')
      return
    }

    if (!user.email) {
      setError('Email utilisateur non disponible')
      return
    }

    if (!isAuthorized) {
      setError('Votre email n\'est pas autorisé. Contactez l\'administrateur.')
      return
    }

    try {
      setIsPromoting(true)
      await promoteToTeacher(user.uid, user.email)
      
      console.log('Promotion réussie, attente de la synchronisation Firestore...')
      
      // Attendre plus longtemps pour que Firestore se synchronise complètement
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Rafraîchir les données utilisateur depuis le serveur (forceServer = true)
      await refreshUserData()
      
      // Attendre encore un peu pour s'assurer que les données sont à jour
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Fermer la modale
      onClose()
      setError('')
      
      // Afficher un message de succès
      alert('Félicitations ! Vous êtes maintenant professeur. La page va se recharger.')
      
      // Recharger la page pour forcer la mise à jour complète
      // Utiliser un délai pour s'assurer que tout est bien synchronisé
      setTimeout(() => {
        window.location.reload()
      }, 200)
    } catch (error) {
      console.error('Erreur lors de la promotion:', error)
      setError(error.message || 'Erreur lors de la promotion')
    } finally {
      setIsPromoting(false)
    }
  }

  const handleClose = () => {
    setError('')
    setIsAuthorized(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="promote-modal-backdrop" onClick={handleClose}>
      <div className="promote-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="promote-modal-header">
          <h2>Devenir Professeur</h2>
          <button className="promote-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="promote-modal-form">
          <p className="promote-description">
            Pour devenir professeur et accéder aux outils de création d'exercices, 
            votre email doit être autorisé par l'administrateur.
          </p>
          
          {user?.email && (
            <div className="promote-field">
              <label>Email vérifié</label>
              <div className="promote-email-display">
                {user.email}
              </div>
            </div>
          )}

          {isChecking && (
            <div className="promote-checking">
              <div className="spinner-small"></div>
              <span>Vérification de votre autorisation...</span>
            </div>
          )}

          {!isChecking && isAuthorized && (
            <div className="promote-authorized">
              ✓ Votre email est autorisé. Vous pouvez devenir professeur.
            </div>
          )}

          {error && <div className="promote-error">{error}</div>}

          <div className="promote-actions">
            <button
              type="button"
              className="promote-btn cancel-btn"
              onClick={handleClose}
              disabled={isPromoting || isChecking}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="promote-btn submit-btn"
              disabled={!isAuthorized || isPromoting || isChecking}
            >
              {isPromoting ? 'Promotion...' : 'Devenir Professeur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PromoteToTeacherModal

