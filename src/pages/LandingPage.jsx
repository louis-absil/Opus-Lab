import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LandingPage.css'

function LandingPage() {
  const { signInWithGoogle, loading, enableGuestMode } = useAuth()
  const navigate = useNavigate()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const ctaRef = useRef(null)

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

  // Animation au scroll
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-up-visible')
        }
      })
    }, observerOptions)

    const elements = document.querySelectorAll('.fade-up')
    elements.forEach(el => observer.observe(el))

    return () => {
      elements.forEach(el => observer.unobserve(el))
    }
  }, [])

  return (
    <div className="landing-page">
      {/* Hero Section - Split Screen */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title fade-up">
              Opus Lab
            </h1>
            <p className="hero-subtitle fade-up">
              Maîtrisez l'analyse harmonique grâce à l'écoute active sur des œuvres réelles.
            </p>
            <div className="hero-cta fade-up">
              <button
                className="cta-primary"
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
              <p className="cta-reassurance">
                Compte gratuit. Pas de carte requise.
              </p>
            </div>
          </div>
          <div className="hero-visual fade-up">
            <div className="device-mockup">
              <div className="device-frame">
                <div className="device-screen">
                  <div className="app-preview">
                    <div className="preview-header">
                      <div className="preview-title">Opus Lab - Player</div>
                    </div>
                    <div className="preview-video-area">
                      <div className="video-placeholder">
                        <svg className="play-icon" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
                        </svg>
                        <span>Vidéo YouTube</span>
                      </div>
                    </div>
                    <div className="preview-timeline">
                      <div className="timeline-bar">
                        <div className="timeline-progress"></div>
                        <div className="timeline-marker"></div>
                      </div>
                      <div className="timeline-chords">
                        <span className="chord-tag">Do majeur</span>
                        <span className="chord-tag">Fa majeur</span>
                        <span className="chord-tag active">Sol majeur</span>
                      </div>
                    </div>
                    <div className="preview-controls">
                      <button className="control-btn">⏮</button>
                      <button className="control-btn play">⏸</button>
                      <button className="control-btn">⏭</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Alternating Layout */}
      <section className="features-section" ref={featuresRef}>
        {/* Feature 1 - Image Left */}
        <div className="feature-block feature-left">
          <div className="feature-image">
            <div className="feature-illustration illustration-1">
              <svg viewBox="0 0 200 200" className="illustration-svg">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="1" />
                    <stop offset="100%" stopColor="#764ba2" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="80" fill="url(#grad1)" opacity="0.2"/>
                <path d="M50 100 L90 70 L90 130 Z" fill="url(#grad1)"/>
                <circle cx="150" cy="100" r="30" fill="url(#grad1)" opacity="0.5"/>
                <text x="100" y="180" textAnchor="middle" fontSize="16" fill="#667eea" fontWeight="600">Œuvres Classiques</text>
              </svg>
            </div>
          </div>
          <div className="feature-content">
            <h2 className="feature-title">Analysez les chefs-d'œuvre</h2>
            <p className="feature-description">
              Entraînez-vous sur des extraits authentiques de grandes œuvres classiques. 
              Chaque exercice vous plonge dans l'univers réel des compositeurs, 
              développant votre oreille harmonique avec des matériaux musicaux authentiques.
            </p>
          </div>
        </div>

        {/* Feature 2 - Image Right */}
        <div className="feature-block feature-right">
          <div className="feature-content">
            <h2 className="feature-title">Visualisez votre succès</h2>
            <p className="feature-description">
              Suivez votre progression avec un système de points d'expérience (XP) 
              et de gamification. Chaque exercice réussi vous rapproche de la maîtrise, 
              transformant l'apprentissage en parcours motivant et mesurable.
            </p>
          </div>
          <div className="feature-image">
            <div className="feature-illustration illustration-2">
              <svg viewBox="0 0 200 200" className="illustration-svg">
                <defs>
                  <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="1" />
                    <stop offset="100%" stopColor="#764ba2" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <rect x="40" y="140" width="20" height="40" fill="url(#grad2)" opacity="0.6"/>
                <rect x="70" y="120" width="20" height="60" fill="url(#grad2)" opacity="0.7"/>
                <rect x="100" y="100" width="20" height="80" fill="url(#grad2)" opacity="0.8"/>
                <rect x="130" y="80" width="20" height="100" fill="url(#grad2)"/>
                <circle cx="100" cy="50" r="15" fill="url(#grad2)"/>
                <text x="100" y="180" textAnchor="middle" fontSize="16" fill="#667eea" fontWeight="600">Progression XP</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Feature 3 - Image Left */}
        <div className="feature-block feature-left">
          <div className="feature-image">
            <div className="feature-illustration illustration-3">
              <svg viewBox="0 0 200 200" className="illustration-svg">
                <defs>
                  <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" stopOpacity="1" />
                    <stop offset="100%" stopColor="#764ba2" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <rect x="30" y="50" width="140" height="100" rx="10" fill="url(#grad3)" opacity="0.1"/>
                <rect x="50" y="70" width="100" height="8" rx="4" fill="url(#grad3)"/>
                <rect x="50" y="90" width="80" height="8" rx="4" fill="url(#grad3)" opacity="0.7"/>
                <rect x="50" y="110" width="120" height="8" rx="4" fill="url(#grad3)" opacity="0.5"/>
                <circle cx="170" cy="80" r="8" fill="url(#grad3)"/>
                <text x="100" y="180" textAnchor="middle" fontSize="16" fill="#667eea" fontWeight="600">Filtres Avancés</text>
              </svg>
            </div>
          </div>
          <div className="feature-content">
            <h2 className="feature-title">Entraînement à la carte</h2>
            <p className="feature-description">
              Filtrez les exercices par compositeur, période, difficulté ou type d'accord. 
              Créez votre parcours personnalisé selon vos objectifs et votre niveau, 
              pour un apprentissage ciblé et efficace.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="cta-section" ref={ctaRef}>
        <div className="cta-container">
          <h2 className="cta-title fade-up">Prêt à améliorer votre oreille ?</h2>
          <div className="cta-buttons fade-up">
            <button
              className="cta-button-primary"
              onClick={handleSignIn}
              disabled={isSigningIn || loading}
            >
              {isSigningIn ? (
                <>
                  <span className="spinner-small"></span>
                  Connexion...
                </>
              ) : (
                'Créer mon compte gratuit'
              )}
            </button>
            <button
              className="cta-button-secondary"
              onClick={handleGuestMode}
            >
              Essayer une démo sans compte
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2024 Opus Lab • Plateforme d'entraînement harmonique</p>
      </footer>
    </div>
  )
}

export default LandingPage
