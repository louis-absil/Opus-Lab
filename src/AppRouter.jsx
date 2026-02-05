import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import StudentDashboard from './pages/StudentDashboard'
import StudentCatalogue from './pages/StudentCatalogue'
import TeacherCatalogue from './pages/TeacherCatalogue'
import TeacherClasses from './pages/TeacherClasses'
import TeacherAssignments from './pages/TeacherAssignments'
import Editor from './pages/Editor'
import ParcoursImagesEditor from './pages/ParcoursImagesEditor'
import Player from './pages/Player'

function PrivateRoute({ children, requiredRole = null }) {
  const { user, userData, loading, isGuest } = useAuth()
  
  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    )
  }
  
  // Autoriser l'accès si mode invité (pour /student-dashboard uniquement)
  if (isGuest && !requiredRole) {
    return children
  }
  
  if (!user && !isGuest) {
    return <Navigate to="/" replace />
  }
  
  // Vérifier le rôle si requis
  if (requiredRole && userData?.role !== requiredRole) {
    // Rediriger selon le rôle
    if (userData?.role === 'student') {
      return <Navigate to="/student-dashboard" replace />
    } else {
      return <Navigate to="/" replace />
    }
  }
  
  return children
}

function PublicRoute({ children }) {
  const { user, userData, loading, isGuest } = useAuth()
  
  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    )
  }
  
  // Si en mode invité, rediriger vers le dashboard élève
  if (isGuest && !user) {
    return <Navigate to="/student-dashboard" replace />
  }
  
  // Si connecté, rediriger vers le bon dashboard
  if (user && userData) {
    if (userData.role === 'teacher') {
      return <Navigate to="/dashboard" replace />
    } else {
      return <Navigate to="/student-dashboard" replace />
    }
  }
  
  return children
}

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        {/* Route publique : Landing Page */}
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        
        {/* Routes professeur */}
        <Route path="/dashboard" element={<PrivateRoute requiredRole="teacher"><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard/students" element={<PrivateRoute requiredRole="teacher"><StudentCatalogue /></PrivateRoute>} />
        <Route path="/dashboard/classes" element={<PrivateRoute requiredRole="teacher"><TeacherClasses /></PrivateRoute>} />
        <Route path="/dashboard/assignments" element={<PrivateRoute requiredRole="teacher"><TeacherAssignments /></PrivateRoute>} />
        <Route path="/dashboard/teachers" element={<PrivateRoute requiredRole="teacher"><TeacherCatalogue /></PrivateRoute>} />
        <Route path="/editor" element={<PrivateRoute requiredRole="teacher"><Editor /></PrivateRoute>} />
        <Route path="/editor/:id" element={<PrivateRoute requiredRole="teacher"><Editor /></PrivateRoute>} />
        <Route path="/dashboard/parcours-images" element={<PrivateRoute requiredRole="teacher"><ParcoursImagesEditor /></PrivateRoute>} />
        
        {/* Routes élève */}
        <Route path="/student-dashboard" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
        <Route path="/student-dashboard/horizons" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
        
        {/* Route publique : Player (accessible sans connexion) */}
        <Route path="/play/:exerciseId" element={<Player />} />
        
        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRouter

