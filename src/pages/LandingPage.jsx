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
              Perfectionnez votre analyse harmonique par l'écoute active d'œuvres du répertoire classique.
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
                Accès gratuit. Aucune carte bancaire requise.
              </p>
            </div>
          </div>
          <div className="hero-visual fade-up">
            <div className="device-mockup">
              <div className="device-frame">
                <div className="device-screen">
                  <div className="app-preview">
                    <div className="preview-header">
                      <h2 className="preview-app-title">Opus Lab</h2>
                      <div className="preview-exercise-info">
                        <span className="preview-exercise-title">Symphonie n°5 en ut mineur</span>
                        <span className="preview-composer">Ludwig van Beethoven</span>
                      </div>
                    </div>
                    <div className="preview-video-area">
                      <img 
                        src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=450&fit=crop&q=80" 
                        alt="Orchestre symphonique classique en concert"
                        className="preview-video-image"
                      />
                      <div className="video-overlay">
                        <svg className="play-icon" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="rgba(0,0,0,0.5)"/>
                          <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
                        </svg>
                      </div>
                    </div>
                    <div className="preview-timeline-section">
                      <div className="preview-timeline">
                        <div className="timeline-bar">
                          <div className="timeline-progress"></div>
                          <div className="timeline-marker"></div>
                          <div className="timeline-question-marker" style={{left: '25%'}}></div>
                          <div className="timeline-question-marker answered" style={{left: '50%'}}></div>
                          <div className="timeline-question-marker" style={{left: '75%'}}></div>
                        </div>
                        <div className="timeline-time">
                          <span>00:15</span>
                          <span>00:45</span>
                        </div>
                      </div>
                      <div className="preview-progress">
                        <span className="progress-text">Progression : 1/3</span>
                      </div>
                    </div>
                    <div className="preview-chords">
                      <div className="chords-label">Identifiez l'accord :</div>
                      <div className="chords-buttons">
                        <button className="chord-btn">
                          <span className="chord-degree">I</span>
                          <span className="chord-inversion">6</span>
                        </button>
                        <button className="chord-btn">
                          <span className="chord-degree">IV</span>
                          <span className="chord-inversion">6/4</span>
                        </button>
                        <button className="chord-btn active">
                          <span className="chord-degree">V</span>
                          <span className="chord-inversion">5/3</span>
                        </button>
                        <button className="chord-btn">
                          <span className="chord-degree">vi</span>
                          <span className="chord-inversion">6</span>
                        </button>
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
            <img 
              src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=600&fit=crop&q=80" 
              alt="Orchestre symphonique classique en concert"
              loading="lazy"
            />
          </div>
          <div className="feature-content">
            <h2 className="feature-title">Analyse du répertoire classique</h2>
            <p className="feature-description">
              Travaillez sur des extraits authentiques tirés du répertoire classique occidental. 
              Chaque exercice vous confronte à des œuvres réelles, développant votre compréhension 
              harmonique à travers l'écoute active de matériaux musicaux authentiques.
            </p>
          </div>
        </div>

        {/* Feature 2 - Image Right */}
        <div className="feature-block feature-right">
          <div className="feature-content">
            <h2 className="feature-title">Suivi pédagogique de la progression</h2>
            <p className="feature-description">
              Mesurez votre évolution grâce à un système de points d'expérience et de gamification. 
              Chaque exercice complété contribue à votre progression, transformant l'apprentissage 
              de l'analyse harmonique en parcours structuré et quantifiable.
            </p>
          </div>
          <div className="feature-image">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=80" 
              alt="Graphique de progression et statistiques"
              loading="lazy"
            />
          </div>
        </div>

        {/* Feature 3 - Image Left */}
        <div className="feature-block feature-left">
          <div className="feature-image">
            <img 
              src="https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&h=600&fit=crop&q=80" 
              alt="Instruments classiques et partition"
              loading="lazy"
            />
          </div>
          <div className="feature-content">
            <h2 className="feature-title">Parcours pédagogique personnalisé</h2>
            <p className="feature-description">
              Sélectionnez vos exercices selon le compositeur, la période historique, le niveau de 
              difficulté ou le type d'accord étudié. Construisez un parcours d'apprentissage adapté 
              à vos objectifs pédagogiques et à votre niveau de maîtrise.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="cta-section" ref={ctaRef}>
        <div className="cta-container">
          <h2 className="cta-title fade-up">Prêt à développer votre oreille harmonique ?</h2>
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
        <p>© 2024 Opus Lab • Plateforme d'entraînement à l'analyse harmonique</p>
      </footer>
    </div>
  )
}

export default LandingPage
