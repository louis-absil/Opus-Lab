import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { getOrCreateUser, getUserById } from '../services/userService'

const AuthContext = createContext(null)

const GUEST_MODE_KEY = 'opuslab_guest_mode'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null) // Données Firestore (rôle, XP, etc.)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(() => {
    // Vérifier le localStorage au chargement
    return localStorage.getItem(GUEST_MODE_KEY) === 'true'
  })

  // Charger les données utilisateur depuis Firestore
  // #region agent log
  const loadUserData = useCallback(async (firebaseUser, forceServer = false) => {
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:loadUserData',message:'loadUserData appelé',data:{uid:firebaseUser?.uid,forceServer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!firebaseUser) {
      setUserData(null)
      return
    }

    // Vérifier la connexion avant de faire des requêtes
    if (!navigator.onLine) {
      console.warn('Hors ligne - impossible de charger les données utilisateur')
      // Ne pas bloquer l'application, l'utilisateur peut continuer
      // Les données seront chargées quand la connexion reviendra
      return
    }

    try {
      // Créer ou récupérer l'utilisateur dans Firestore
      // Si forceServer est true, récupérer depuis le serveur pour éviter le cache
      const userData = await getOrCreateUser(firebaseUser.uid, {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      }, forceServer)
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:loadUserData',message:'setUserData appelé',data:{role:userData?.role,uid:userData?.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setUserData(userData)
      console.log('Données utilisateur chargées:', userData.role) // Debug
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error)
      
      // Si c'est une erreur réseau, ne pas bloquer l'application
      if (error.code === 'unavailable' || 
          error.code === 'network/offline' ||
          error.code === 'network/connection-failed' ||
          error.message?.includes('network') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
        console.warn('Erreur réseau - l\'application continue de fonctionner')
        // L'utilisateur peut continuer à utiliser l'app
        // Les données seront chargées quand la connexion reviendra
        return
      }
      
      // Pour les autres erreurs, essayer de récupérer directement
      try {
        const userData = await getUserById(firebaseUser.uid, forceServer)
        if (userData) {
          setUserData(userData)
          console.log('Données utilisateur récupérées directement:', userData.role) // Debug
        }
      } catch (err) {
        console.error('Erreur lors de la récupération directe:', err)
        // Même en cas d'erreur, ne pas bloquer l'application
      }
    }
  }, [])
  // #endregion

  // Refs pour éviter les dépendances dans handleNetworkOnline
  const userRef = useRef(user)
  const userDataRef = useRef(userData)
  const isGuestRef = useRef(isGuest)
  
  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    userRef.current = user
    userDataRef.current = userData
    isGuestRef.current = isGuest
  }, [user, userData, isGuest])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:useEffect',message:'useEffect exécuté',data:{isGuest,hasUser:!!user,hasUserData:!!userData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Timeout de sécurité pour éviter un blocage infini
    const timeoutId = setTimeout(() => {
      console.warn('AuthContext: Timeout - onAuthStateChanged ne s\'est pas déclenché dans les 5 secondes')
      setLoading(false)
    }, 5000)

    // Écouter les événements de reconnexion réseau
    const handleNetworkOnline = async () => {
      // Quand la connexion revient, recharger les données utilisateur si nécessaire
      // Utiliser les refs pour éviter les dépendances
      if (userRef.current && !userDataRef.current) {
        console.log('Reconnexion détectée - rechargement des données utilisateur')
        await loadUserData(userRef.current, true)
      }
    }

    window.addEventListener('network-online', handleNetworkOnline)

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:onAuthStateChanged',message:'onAuthStateChanged callback',data:{hasFirebaseUser:!!firebaseUser,uid:firebaseUser?.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        clearTimeout(timeoutId)
        setUser(firebaseUser)
        
        if (firebaseUser) {
          // Si l'utilisateur se connecte, désactiver le mode invité
          if (isGuestRef.current) {
            setIsGuest(false)
            localStorage.removeItem(GUEST_MODE_KEY)
          }
          await loadUserData(firebaseUser)
        } else {
          setUserData(null)
        }
        
        setLoading(false)
      }, (error) => {
        console.error('Erreur onAuthStateChanged:', error)
        clearTimeout(timeoutId)
        setLoading(false)
        // Ne pas bloquer l'application même en cas d'erreur
      })

      return () => {
        clearTimeout(timeoutId)
        unsubscribe()
        window.removeEventListener('network-online', handleNetworkOnline)
      }
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'auth:', error)
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [isGuest, loadUserData]) // Retirer user et userData des dépendances

  const signInWithGoogle = async () => {
    let timeoutId = null
    
    try {
      // Vérifier la connectivité réseau avant d'essayer de se connecter
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const networkError = new Error('Aucune connexion internet détectée. Veuillez vérifier votre connexion réseau.')
        networkError.code = 'network/offline'
        throw networkError
      }

      // En mode mobile, utiliser un timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Timeout de connexion - la connexion prend trop de temps'))
        }, 30000) // 30 secondes de timeout
      })

      const authPromise = signInWithPopup(auth, googleProvider)
      
      // Annuler le timeout si la connexion réussit
      const result = await Promise.race([
        authPromise.then((result) => {
          if (timeoutId) clearTimeout(timeoutId)
          return result
        }),
        timeoutPromise
      ])
      
      // loadUserData sera appelé automatiquement par onAuthStateChanged
      return result
    } catch (error) {
      // Nettoyer le timeout en cas d'erreur
      if (timeoutId) clearTimeout(timeoutId)
      
      console.error('Erreur lors de la connexion Google:', error)
      
      // Détecter les erreurs de connexion réseau
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const networkError = new Error('Aucune connexion internet détectée. Veuillez vérifier votre connexion réseau.')
        networkError.code = 'network/offline'
        throw networkError
      }
      
      // Détecter les erreurs Firebase liées à la connexion
      // auth/internal-error est souvent causé par des problèmes réseau, surtout en mobile
      if (error.code === 'auth/internal-error' || 
          error.code === 'auth/network-request-failed' ||
          error.code === 'auth/operation-not-allowed' ||
          error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('timeout') ||
          error.message?.includes('Timeout')) {
        const networkError = new Error('Impossible de se connecter aux serveurs. Vérifiez votre connexion internet et réessayez.')
        networkError.code = 'network/connection-failed'
        networkError.originalError = error
        throw networkError
      }
      
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUserData(null)
      // Nettoyer le mode invité lors de la déconnexion
      setIsGuest(false)
      localStorage.removeItem(GUEST_MODE_KEY)
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      throw error
    }
  }

  const enableGuestMode = () => {
    setIsGuest(true)
    localStorage.setItem(GUEST_MODE_KEY, 'true')
  }

  const disableGuestMode = () => {
    setIsGuest(false)
    localStorage.removeItem(GUEST_MODE_KEY)
  }

  const refreshUserData = async () => {
    if (user) {
      // Forcer la récupération depuis le serveur pour éviter le cache
      await loadUserData(user, true)
    }
  }

  const value = {
    user,
    userData, // Données Firestore (rôle, XP, etc.)
    loading,
    isGuest, // Mode invité
    signInWithGoogle,
    logout,
    refreshUserData,
    enableGuestMode,
    disableGuestMode
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

