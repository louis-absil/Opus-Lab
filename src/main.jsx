import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { NetworkProvider } from './contexts/NetworkContext'
import { ParcoursImagesProvider } from './contexts/ParcoursImagesContext'
import NetworkStatus from './components/NetworkStatus'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NetworkProvider>
    <AuthProvider>
      <ParcoursImagesProvider>
        <NetworkStatus />
        <AppRouter />
      </ParcoursImagesProvider>
    </AuthProvider>
    </NetworkProvider>
  </StrictMode>,
)
