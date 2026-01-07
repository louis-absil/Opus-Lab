import { useNetwork } from '../contexts/NetworkContext'
import './NetworkStatus.css'

export default function NetworkStatus() {
  const { isOnline, wasOffline } = useNetwork()

  // Ne rien afficher si en ligne
  if (isOnline) {
    return null
  }

  return (
    <div className="network-status offline">
      <span className="network-icon">⚠️</span>
      <span className="network-message">
        Aucune connexion internet. Certaines fonctionnalités peuvent être limitées.
      </span>
    </div>
  )
}

