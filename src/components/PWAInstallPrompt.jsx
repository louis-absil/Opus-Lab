import { useState, useEffect } from 'react'
import './PWAInstallPrompt.css'

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)

  useEffect(() => {
    // Vérifier si la PWA est déjà installée
    const checkPWAInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
      
      return isStandalone || isFullscreen || isMinimalUI || 
             (window.navigator.standalone === true) || // iOS
             (window.matchMedia('(display-mode: standalone)').matches)
    }

    setIsPWAInstalled(checkPWAInstalled())

    // Écouter l'événement beforeinstallprompt (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      // Empêcher l'affichage automatique de la bannière
      e.preventDefault()
      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Afficher le prompt d'installation
    deferredPrompt.prompt()

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installation acceptée')
      setIsVisible(false)
      setDeferredPrompt(null)
    } else {
      console.log('PWA installation refusée')
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  // Ne pas afficher si PWA déjà installée ou si pas de prompt disponible
  if (isPWAInstalled || !isVisible || !deferredPrompt) {
    return null
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">📱</div>
        <div className="pwa-install-text">
          <h3>Installez Opus Lab</h3>
          <p>Installez l'app pour partager directement depuis YouTube</p>
        </div>
        <div className="pwa-install-buttons">
          <button 
            className="pwa-install-btn-primary"
            onClick={handleInstall}
          >
            Installer
          </button>
          <button 
            className="pwa-install-btn-dismiss"
            onClick={handleDismiss}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt

