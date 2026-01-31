import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, serverTimestamp, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Configuration Firebase depuis les variables d'environnement
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)

// Initialiser les services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

// Activer la persistance Firestore (cache local)
// Cela permet à l'application de fonctionner hors ligne
// Note: enableIndexedDbPersistence affiche un avertissement de dépréciation future
// mais reste la méthode recommandée pour l'instant. La nouvelle API avec FirestoreSettings.cache
// sera utilisée dans une future version de Firebase.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Plusieurs onglets ouverts, persistance déjà activée
    console.warn('Persistance Firestore déjà activée dans un autre onglet')
  } else if (err.code === 'unimplemented') {
    // Le navigateur ne supporte pas la persistance
    console.warn('Persistance Firestore non supportée par ce navigateur')
  } else {
    console.error('Erreur lors de l\'activation de la persistance Firestore:', err)
  }
})

// Helper pour serverTimestamp
export { serverTimestamp }

export default app

