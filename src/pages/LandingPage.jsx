import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LandingPage.css'

function LandingPage() {
  const { signInWithGoogle, loading, enableGuestMode } = useAuth()
  const navigate = useNavigate()
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      await signInWithGoogle()
      // La redirection sera gérée par AppRouter selon le rôle
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      alert('Erreur lors de la connexion. Veuillez réessayer.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleGuestMode = () => {
    enableGuestMode()
    navigate('/student-dashboard')
  }

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-hero">
          <div className="landing-logo">
            <h1 className="landing-title">Opus Lab</h1>
            <p className="landing-subtitle">L'entraînement harmonique intelligent</p>
          </div>

          <div className="landing-content">
            <h2 className="landing-headline">
              Maîtrisez l'analyse harmonique<br />
              grâce à l'écoute active
            </h2>
            <p className="landing-description">
              Opus Lab est une plateforme d'entraînement pour les musiciens qui souhaitent 
              perfectionner leur oreille harmonique. Analysez des extraits musicaux, 
              identifiez les accords et progressez à votre rythme.
            </p>

            <div className="landing-features">
              <div className="feature-card">
                <div className="feature-icon">🎵</div>
                <h3>Extraits réels</h3>
                <p>Entraînez-vous sur des œuvres classiques authentiques</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Suivi de progression</h3>
                <p>Gagnez de l'XP et suivez vos performances</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Exercices ciblés</h3>
                <p>Filtrez par compositeur, difficulté ou type d'accord</p>
              </div>
            </div>

            <div className="landing-cta">
              <button
                className="cta-button"
                onClick={handleSignIn}
                disabled={isSigningIn || loading}
              >
                {isSigningIn ? (
                  <>
                    <span className="spinner-small"></span>
                    Connexion...
                  </>
                ) : (
                  <>
                    <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connexion avec Google
                  </>
                )}
              </button>
              <p className="cta-hint">
                Gratuit et sans engagement • Créez votre compte en un clic
              </p>
              
              <div className="landing-guest-option">
                <div className="guest-divider">
                  <span>ou</span>
                </div>
                <button
                  className="cta-button guest-button"
                  onClick={handleGuestMode}
                >
                  Continuer en mode invité
                </button>
                <p className="guest-hint">
                  Testez l'application sans créer de compte • Les scores ne seront pas sauvegardés
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer">
          <p>© 2024 Opus Lab • Plateforme d'entraînement harmonique</p>
        </div>
      </div>
    </div>
  )
}

export default LandingPage

