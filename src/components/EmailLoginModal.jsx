import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAuthErrorMessage } from '../utils/errorHandler'
import './EmailLoginModal.css'

function EmailLoginModal({ isOpen, onClose }) {
  const { signInWithEmailPassword, registerWithEmailPassword } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const resetForm = () => {
    setError(null)
    setEmail('')
    setPassword('')
    setDisplayName('')
  }

  const handleClose = () => {
    resetForm()
    setMode('signin')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Veuillez saisir votre email.')
      return
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe.')
      return
    }
    if (mode === 'register' && password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailPassword(email, password)
      } else {
        await registerWithEmailPassword(email, password, displayName || null)
      }
      handleClose()
    } catch (err) {
      console.error('Erreur auth email:', err)
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="email-login-backdrop" onClick={handleClose}>
      <div className="email-login-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="email-login-close" onClick={handleClose} aria-label="Fermer">×</button>
        <h2 className="email-login-title">
          {mode === 'signin' ? 'Se connecter avec email' : 'Créer un compte'}
        </h2>
        <form onSubmit={handleSubmit} className="email-login-form">
          {error && (
            <div className="email-login-error" role="alert">
              {error}
            </div>
          )}
          <label className="email-login-label">
            Email
            <input
              type="email"
              className="email-login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.ch"
              autoComplete="email"
              disabled={loading}
            />
          </label>
          <label className="email-login-label">
            Mot de passe
            <input
              type="password"
              className="email-login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Au moins 6 caractères' : ''}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={loading}
            />
          </label>
          {mode === 'register' && (
            <label className="email-login-label">
              Nom d'affichage (optionnel)
              <input
                type="text"
                className="email-login-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom"
                autoComplete="name"
                disabled={loading}
              />
            </label>
          )}
          <button type="submit" className="email-login-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span>
                {mode === 'signin' ? 'Connexion...' : 'Création...'}
              </>
            ) : mode === 'signin' ? (
              'Se connecter'
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>
        <p className="email-login-switch">
          {mode === 'signin' ? (
            <>
              Pas encore de compte ?{' '}
              <button type="button" className="email-login-link" onClick={() => { setMode('register'); setError(null); }}>
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button type="button" className="email-login-link" onClick={() => { setMode('signin'); setError(null); }}>
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default EmailLoginModal
