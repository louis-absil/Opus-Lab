import { createContext, useContext, useState, useEffect } from 'react'
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
  const loadUserData = async (firebaseUser, forceServer = false) => {
    if (!firebaseUser) {
      setUserData(null)
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
      setUserData(userData)
      console.log('Données utilisateur chargées:', userData.role) // Debug
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error)
      // En cas d'erreur, essayer de récupérer directement
      try {
        const userData = await getUserById(firebaseUser.uid, forceServer)
        if (userData) {
          setUserData(userData)
          console.log('Données utilisateur récupérées directement:', userData.role) // Debug
        }
      } catch (err) {
        console.error('Erreur lors de la récupération directe:', err)
      }
    }
  }

  useEffect(() => {
    // Timeout de sécurité pour éviter un blocage infini
    const timeoutId = setTimeout(() => {
      console.warn('AuthContext: Timeout - onAuthStateChanged ne s\'est pas déclenché dans les 5 secondes')
      setLoading(false)
    }, 5000)

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        clearTimeout(timeoutId)
        setUser(firebaseUser)
        
        if (firebaseUser) {
          // Si l'utilisateur se connecte, désactiver le mode invité
          if (isGuest) {
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
      })

      return () => {
        clearTimeout(timeoutId)
        unsubscribe()
      }
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'auth:', error)
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [isGuest])

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      // loadUserData sera appelé automatiquement par onAuthStateChanged
      return result
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error)
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

