/**
 * Utilitaire pour gérer les erreurs d'authentification et de connexion
 */

/**
 * Obtient un message d'erreur convivial selon le type d'erreur
 * @param {Error} error - L'erreur à analyser
 * @returns {string} Message d'erreur convivial
 */
export function getAuthErrorMessage(error) {
  // Erreurs de connexion réseau
  if (error.code === 'network/offline' || error.code === 'network/connection-failed') {
    return 'Aucune connexion internet détectée. Veuillez vérifier votre connexion réseau et réessayer.'
  }
  
  // Erreurs de timeout
  if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return 'La connexion prend trop de temps. Vérifiez votre connexion internet et réessayez.'
  }
  
  // Erreurs Firebase liées au réseau
  if (error.code === 'auth/network-request-failed' || 
      error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError')) {
    return 'Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.'
  }
  
  // Erreurs Firebase internes (souvent liées à la connexion, surtout en mobile)
  if (error.code === 'auth/internal-error') {
    return 'Erreur de connexion aux serveurs. Vérifiez votre connexion internet et réessayez. Si le problème persiste, vérifiez que les popups ne sont pas bloquées.'
  }
  
  // Popup fermée par l'utilisateur
  if (error.code === 'auth/popup-closed-by-user') {
    return 'Connexion annulée. Vous pouvez réessayer à tout moment.'
  }
  
  // Popup bloquée
  if (error.code === 'auth/popup-blocked') {
    return 'La fenêtre de connexion a été bloquée. Veuillez autoriser les popups pour ce site.'
  }

  // Erreurs Email/Mot de passe
  if (error.code === 'auth/invalid-email') {
    return 'Adresse email invalide.'
  }
  if (error.code === 'auth/user-not-found') {
    return 'Aucun compte avec cet email.'
  }
  if (error.code === 'auth/wrong-password') {
    return 'Mot de passe incorrect.'
  }
  if (error.code === 'auth/email-already-in-use') {
    return 'Un compte existe déjà avec cet email.'
  }
  if (error.code === 'auth/weak-password') {
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  }
  if (error.code === 'auth/too-many-requests') {
    return 'Trop de tentatives. Réessayez plus tard.'
  }
  if (error.code === 'auth/invalid-credential') {
    return 'Email ou mot de passe incorrect.'
  }
  
  // Erreur par défaut
  return error.message || 'Erreur lors de la connexion. Veuillez réessayer.'
}

/**
 * Vérifie si l'erreur est liée à la connexion réseau
 * @param {Error} error - L'erreur à vérifier
 * @returns {boolean} True si l'erreur est liée au réseau
 */
export function isNetworkError(error) {
  return error.code === 'network/offline' || 
         error.code === 'network/connection-failed' ||
         error.code === 'auth/network-request-failed' ||
         error.code === 'auth/internal-error' ||
         error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
         error.message?.includes('Failed to fetch') ||
         error.message?.includes('NetworkError') ||
         error.message?.includes('timeout') ||
         error.message?.includes('Timeout')
}

/**
 * Vérifie si l'utilisateur est en ligne
 * @returns {boolean} True si l'utilisateur est en ligne
 */
export function isOnline() {
  return navigator.onLine
}


