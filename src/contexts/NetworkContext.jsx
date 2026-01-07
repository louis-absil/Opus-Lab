import { createContext, useContext, useState, useEffect } from 'react'

const NetworkContext = createContext(null)

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => {
    // Vérifier l'état initial de la connexion
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Fonction pour gérer le retour en ligne
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        // La connexion vient d'être rétablie
        console.log('Connexion rétablie')
        setWasOffline(false)
        // Émettre un événement personnalisé pour notifier les autres composants
        window.dispatchEvent(new CustomEvent('network-online'))
      }
    }

    // Fonction pour gérer la perte de connexion
    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      console.warn('Connexion perdue')
      // Émettre un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('network-offline'))
    }

    // Ajouter les listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Nettoyer les listeners au démontage
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return (
    <NetworkContext.Provider value={{ isOnline, wasOffline }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork doit être utilisé dans un NetworkProvider')
  }
  return context
}

