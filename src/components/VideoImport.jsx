import { useState, useEffect, useRef } from 'react'
import './VideoImport.css'

// Fonction pour extraire l'ID YouTube depuis une URL
const extractVideoId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : null
}

// Fonction pour détecter si l'entrée est une URL YouTube valide
const isYouTubeUrl = (input) => {
  if (!input || !input.trim()) return false
  return /(?:youtube\.com|youtu\.be)/.test(input) || /^[a-zA-Z0-9_-]{11}$/.test(input.trim())
}

// Fonction pour encoder les mots-clés pour l'URL de recherche YouTube
const encodeSearchQuery = (query) => {
  return encodeURIComponent(query.trim())
}

// Simuler la récupération des métadonnées (à remplacer par l'API YouTube Data v3)
const fetchVideoMetadata = async (videoId) => {
  // TODO: Remplacer par un appel réel à l'API YouTube Data v3
  // const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=YOUR_API_KEY`)
  // const data = await response.json()
  // return data.items[0]
  
  // Simulation avec délai
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return {
    id: videoId,
    snippet: {
      title: 'Vidéo YouTube',
      channelTitle: 'Chaîne YouTube',
      thumbnails: {
        high: {
          url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        }
      },
      description: 'Description de la vidéo'
    },
    contentDetails: {
      duration: 'PT5M0S'
    }
  }
}

function VideoImport({ onVideoSelect }) {
  const [inputValue, setInputValue] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [videoMetadata, setVideoMetadata] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  // Focus automatique sur le champ au chargement
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Détecter les changements dans le champ
  useEffect(() => {
    const trimmedValue = inputValue.trim()
    
    // Réinitialiser l'état si le champ est vide
    if (!trimmedValue) {
      setVideoId(null)
      setVideoMetadata(null)
      setError(null)
      return
    }

    // Vérifier si c'est une URL YouTube valide
    const detectedVideoId = extractVideoId(trimmedValue)
    
    if (detectedVideoId) {
      // C'est une URL YouTube valide
      setError(null)
      if (detectedVideoId !== videoId) {
        setVideoId(detectedVideoId)
        loadVideoMetadata(detectedVideoId)
      }
    } else if (isYouTubeUrl(trimmedValue)) {
      // Format suspect mais pas valide
      setError('Ce lien ne semble pas provenir de YouTube')
      setVideoId(null)
      setVideoMetadata(null)
    } else {
      // Ce n'est pas une URL, c'est probablement une recherche
      setError(null)
      setVideoId(null)
      setVideoMetadata(null)
    }
  }, [inputValue])

  const loadVideoMetadata = async (id) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const metadata = await fetchVideoMetadata(id)
      setVideoMetadata(metadata)
    } catch (err) {
      console.error('Erreur lors du chargement des métadonnées:', err)
      setError('Impossible de charger les informations de la vidéo')
      setVideoMetadata(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  const handlePaste = (e) => {
    // Laisser le comportement par défaut, puis le useEffect détectera le changement
  }

  const handleSearchOnYouTube = () => {
    const trimmedValue = inputValue.trim()
    
    if (trimmedValue && !isYouTubeUrl(trimmedValue)) {
      // L'utilisateur a tapé des mots-clés
      const searchQuery = encodeSearchQuery(trimmedValue)
      window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank')
    } else {
      // Ouvrir YouTube directement
      window.open('https://www.youtube.com', '_blank')
    }
  }

  const handleConfirm = () => {
    if (videoMetadata && videoId) {
      // Parser la durée ISO 8601
      const duration = videoMetadata.contentDetails?.duration || 'PT0M0S'
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      let durationSeconds = 0
      if (match) {
        const hours = parseInt(match[1] || 0, 10)
        const minutes = parseInt(match[2] || 0, 10)
        const seconds = parseInt(match[3] || 0, 10)
        durationSeconds = hours * 3600 + minutes * 60 + seconds
      }

      onVideoSelect({
        id: videoId,
        title: videoMetadata.snippet.title,
        channelTitle: videoMetadata.snippet.channelTitle,
        thumbnail: videoMetadata.snippet.thumbnails.high.url,
        duration: durationSeconds
      })
    }
  }

  const getSearchButtonText = () => {
    const trimmedValue = inputValue.trim()
    
    if (trimmedValue && !isYouTubeUrl(trimmedValue)) {
      return `Rechercher "${trimmedValue}" sur YouTube`
    }
    return 'Rechercher sur YouTube ↗'
  }

  return (
    <div className="video-import-container">
      <div className="video-import-content">
        {/* Champ principal (Hero Input) */}
        <div className="video-import-input-wrapper">
          <div className="video-import-input-container">
            <svg className="video-import-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              placeholder="Collez le lien YouTube ici (Ctrl+V)"
              className={`video-import-input ${error ? 'error' : ''} ${isLoading ? 'loading' : ''}`}
              autoFocus
            />
            {isLoading && (
              <div className="video-import-spinner">
                <div className="spinner"></div>
              </div>
            )}
            {videoMetadata && !isLoading && (
              <div className="video-import-check">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            )}
          </div>
          
          {/* Message d'erreur */}
          {error && (
            <div className="video-import-error">
              {error}
            </div>
          )}
        </div>

        {/* Bouton d'aide "Aller chercher" */}
        <button
          className="video-import-search-btn"
          onClick={handleSearchOnYouTube}
          type="button"
        >
          {getSearchButtonText()}
        </button>

        {/* Zone de prévisualisation */}
        {videoMetadata && !isLoading && (
          <div className="video-import-preview">
            <div className="video-import-preview-card">
              <div className="video-import-preview-thumbnail">
                <img
                  src={videoMetadata.snippet.thumbnails.high.url}
                  alt={videoMetadata.snippet.title}
                />
              </div>
              <div className="video-import-preview-content">
                <h3 className="video-import-preview-title">
                  {videoMetadata.snippet.title}
                </h3>
                <p className="video-import-preview-channel">
                  {videoMetadata.snippet.channelTitle}
                </p>
                <button
                  className="video-import-confirm-btn"
                  onClick={handleConfirm}
                >
                  Confirmer et Créer l'exercice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoImport

