import { useState, useEffect, useRef } from 'react'
import YouTube from 'react-youtube'
import './VideoSearch.css'

// Fonction pour extraire l'ID YouTube depuis une URL
const extractVideoId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  return match ? match[1] : null
}

// Données mockées pour la simulation (à remplacer par l'API YouTube Data v3)
const mockSearchResults = (query) => {
  const mockVideos = [
    {
      id: { videoId: 'dQw4w9WgXcQ' },
      snippet: {
        title: 'Mozart - Symphony No. 40 in G minor, K. 550',
        channelTitle: 'Classical Music',
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg` }
        },
        description: 'Wolfgang Amadeus Mozart - Symphony No. 40 in G minor, K. 550'
      },
      contentDetails: { duration: 'PT28M15S' }
    },
    {
      id: { videoId: 'jgpJVI3tDbY' },
      snippet: {
        title: 'Beethoven - Moonlight Sonata (1st Movement)',
        channelTitle: 'Piano Classics',
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/jgpJVI3tDbY/hqdefault.jpg` }
        },
        description: 'Ludwig van Beethoven - Piano Sonata No. 14 "Moonlight"'
      },
      contentDetails: { duration: 'PT15M42S' }
    },
    {
      id: { videoId: 'rOjHhS5MtvA' },
      snippet: {
        title: 'Bach - Goldberg Variations (Aria)',
        channelTitle: 'Baroque Music',
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/rOjHhS5MtvA/hqdefault.jpg` }
        },
        description: 'Johann Sebastian Bach - Goldberg Variations, BWV 988'
      },
      contentDetails: { duration: 'PT1H12M30S' }
    },
    {
      id: { videoId: '4Tr0otuiQuU' },
      snippet: {
        title: 'Chopin - Nocturne in E-flat major, Op. 9, No. 2',
        channelTitle: 'Romantic Piano',
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/4Tr0otuiQuU/hqdefault.jpg` }
        },
        description: 'Frédéric Chopin - Nocturne in E-flat major'
      },
      contentDetails: { duration: 'PT4M20S' }
    },
    {
      id: { videoId: 'Nnuq9PXbywA' },
      snippet: {
        title: 'Debussy - Clair de Lune',
        channelTitle: 'Impressionist Music',
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/Nnuq9PXbywA/hqdefault.jpg` }
        },
        description: 'Claude Debussy - Suite Bergamasque: III. Clair de Lune'
      },
      contentDetails: { duration: 'PT5M10S' }
    },
    {
      id: { videoId: 'rOjHhS5MtvA' },
      snippet: {
        title: 'Vivaldi - Four Seasons (Spring)',
        channelTitle: 'Baroque Orchestra',
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/rOjHhS5MtvA/hqdefault.jpg` }
        },
        description: 'Antonio Vivaldi - The Four Seasons: Spring'
      },
      contentDetails: { duration: 'PT9M45S' }
    }
  ]
  
  // Filtrer selon la requête (simulation)
  if (!query || query.trim() === '') {
    return mockVideos
  }
  
  const lowerQuery = query.toLowerCase()
  return mockVideos.filter(video => 
    video.snippet.title.toLowerCase().includes(lowerQuery) ||
    video.snippet.channelTitle.toLowerCase().includes(lowerQuery) ||
    video.snippet.description.toLowerCase().includes(lowerQuery)
  )
}

// Fonction pour parser la durée ISO 8601 (PT1H2M10S) en format lisible
const parseDuration = (duration) => {
  if (!duration) return '0:00'
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return '0:00'
    
    const hours = parseInt(match[1] || 0, 10)
    const minutes = parseInt(match[2] || 0, 10)
    const seconds = parseInt(match[3] || 0, 10)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  } catch (error) {
    console.error('Erreur lors du parsing de la durée:', error)
    return '0:00'
  }
}

function VideoSearch({ onVideoSelect, initialVideoId = null }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [showEmptyState, setShowEmptyState] = useState(true)
  const searchTimeoutRef = useRef(null)
  const playerRef = useRef(null)

  // Charger une vidéo directement si un ID est fourni
  useEffect(() => {
    if (initialVideoId) {
      const videoId = extractVideoId(initialVideoId) || initialVideoId
      handleDirectVideoLoad(videoId)
    }
  }, [initialVideoId])

  // Recherche avec debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowEmptyState(true)
      setIsSearching(false)
      return
    }

    // Détecter si c'est une URL YouTube
    const videoId = extractVideoId(searchQuery)
    if (videoId) {
      handleDirectVideoLoad(videoId)
      return
    }

    // Sinon, lancer une recherche
    setIsSearching(true)
    setShowEmptyState(false)
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const performSearch = async (query) => {
    try {
      // TODO: Remplacer par l'appel à l'API YouTube Data v3
      // const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=YOUR_API_KEY`)
      // const data = await response.json()
      // setSearchResults(data.items || [])
      
      // Simulation avec données mockées
      await new Promise(resolve => setTimeout(resolve, 800)) // Simuler la latence
      const results = mockSearchResults(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleDirectVideoLoad = async (videoId) => {
    try {
      setIsSearching(true)
      setShowEmptyState(false)
      
      // TODO: Remplacer par l'appel à l'API YouTube Data v3 pour obtenir les détails
      // const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=YOUR_API_KEY`)
      // const data = await response.json()
      
      // Simulation
      await new Promise(resolve => setTimeout(resolve, 500))
      const mockVideo = {
        id: { videoId },
        snippet: {
          title: 'Vidéo YouTube',
          channelTitle: 'Chaîne YouTube',
          thumbnails: {
            high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }
          },
          description: 'Description de la vidéo'
        },
        contentDetails: { duration: 'PT5M0S' }
      }
      
      setSelectedVideo(mockVideo)
      setIsPreviewOpen(true)
      setIsSearching(false)
    } catch (error) {
      console.error('Erreur lors du chargement de la vidéo:', error)
      setIsSearching(false)
    }
  }

  const handleVideoClick = (video) => {
    setSelectedVideo(video)
    setIsPreviewOpen(true)
  }

  const handleUseVideo = () => {
    if (selectedVideo && selectedVideo.id.videoId) {
      onVideoSelect({
        id: selectedVideo.id.videoId,
        title: selectedVideo.snippet.title,
        channelTitle: selectedVideo.snippet.channelTitle,
        thumbnail: selectedVideo.snippet.thumbnails.high.url,
        duration: parseDuration(selectedVideo.contentDetails?.duration)
      })
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowEmptyState(true)
    setSelectedVideo(null)
    setIsPreviewOpen(false)
  }

  const handleReady = (event) => {
    playerRef.current = event.target
  }

  return (
    <div className="video-search-container">
      {/* Barre de recherche unifiée */}
      <div className="video-search-bar">
        <div className="video-search-input-wrapper">
          <svg className="video-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une vidéo ou coller une URL YouTube..."
            className="video-search-input"
            autoFocus
          />
          {searchQuery && (
            <button
              className="video-search-clear"
              onClick={handleClearSearch}
              aria-label="Effacer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          {isSearching && (
            <div className="video-search-spinner">
              <div className="spinner"></div>
            </div>
          )}
        </div>
      </div>

      {/* Panneau de prévisualisation */}
      {isPreviewOpen && selectedVideo && (
        <div className="video-preview-panel">
          <div className="video-preview-content">
            <div className="video-preview-player">
              <YouTube
                videoId={selectedVideo.id.videoId}
                opts={{
                  height: '100%',
                  width: '100%',
                  playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0
                  }
                }}
                onReady={handleReady}
                className="video-preview-youtube"
              />
            </div>
            <div className="video-preview-info">
              <h3 className="video-preview-title">{selectedVideo.snippet.title}</h3>
              <p className="video-preview-channel">{selectedVideo.snippet.channelTitle}</p>
              {selectedVideo.snippet.description && (
                <p className="video-preview-description">
                  {selectedVideo.snippet.description.length > 200
                    ? `${selectedVideo.snippet.description.substring(0, 200)}...`
                    : selectedVideo.snippet.description}
                </p>
              )}
              <div className="video-preview-duration">
                Durée: {parseDuration(selectedVideo.contentDetails?.duration)}
              </div>
              <button
                className="video-preview-use-btn"
                onClick={handleUseVideo}
              >
                Utiliser cette vidéo
              </button>
            </div>
          </div>
          <button
            className="video-preview-close"
            onClick={() => setIsPreviewOpen(false)}
            aria-label="Fermer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Grille de résultats ou Empty State */}
      {!isPreviewOpen && (
        <>
          {showEmptyState && !searchQuery ? (
            <div className="video-search-empty">
              <div className="video-search-empty-icon">🎵</div>
              <h2 className="video-search-empty-title">Recherchez une vidéo YouTube</h2>
              <p className="video-search-empty-text">
                Entrez des mots-clés pour rechercher ou collez directement une URL YouTube
              </p>
              <div className="video-search-suggestions">
                <h3 className="video-search-suggestions-title">Suggestions</h3>
                <div className="video-search-suggestions-list">
                  {['Mozart Symphony', 'Beethoven Piano', 'Bach Goldberg', 'Chopin Nocturne'].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="video-search-suggestion-tag"
                      onClick={() => setSearchQuery(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isSearching ? (
            <div className="video-search-grid">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="video-card-skeleton">
                  <div className="video-card-skeleton-thumbnail"></div>
                  <div className="video-card-skeleton-content">
                    <div className="video-card-skeleton-title"></div>
                    <div className="video-card-skeleton-channel"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="video-search-grid">
              {searchResults.map((video) => (
                <div
                  key={video.id.videoId}
                  className="video-card"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="video-card-thumbnail">
                    <img
                      src={video.snippet.thumbnails.high.url}
                      alt={video.snippet.title}
                      loading="lazy"
                    />
                    <div className="video-card-duration">
                      {parseDuration(video.contentDetails?.duration)}
                    </div>
                  </div>
                  <div className="video-card-content">
                    <h4 className="video-card-title" title={video.snippet.title}>
                      {video.snippet.title}
                    </h4>
                    <p className="video-card-channel">{video.snippet.channelTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="video-search-empty">
              <div className="video-search-empty-icon">🔍</div>
              <h2 className="video-search-empty-title">Aucun résultat</h2>
              <p className="video-search-empty-text">
                Essayez avec d'autres mots-clés ou collez une URL YouTube directement
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default VideoSearch

