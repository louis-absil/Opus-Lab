import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPublicExercises, getRandomPublicExercise } from '../services/exerciseService'
import { getUnlockedHorizonsStyles } from '../services/badgeService'
import { HORIZONS_MUSIC_CATEGORIES, HORIZONS_STYLE_ORDER } from '../utils/tagGenerator'
import { HORIZONS_IMAGE_URLS } from '../data/horizonsIllustrations'
import ExerciseCard from './ExerciseCard'
import './HorizonsMap.css'

const STYLE_GRADIENTS = {
  film: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%)',
  game: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
  anime: 'linear-gradient(135deg, #db2777 0%, #be185d 50%, #9d174d 100%)',
  variety: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)',
  pop: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)'
}

function HorizonsMap({
  attempts = [],
  userXp = 0,
  onSwitchTab = null,
  onClose = null,
  previewUnlockedHorizonsStyles = null,
  selectedStyleId: controlledStyleId = null,
  setSelectedStyleId: setControlledStyleId = null,
  hideInternalBack = false
}) {
  const navigate = useNavigate()
  const [internalStyleId, setInternalStyleId] = useState(null)
  /* Contrôle par le parent dès qu'il fournit setSelectedStyleId (même si selectedStyleId est null pour la vue "cartes") */
  const isControlled = setControlledStyleId != null
  const selectedStyleId = isControlled ? controlledStyleId : internalStyleId
  const setSelectedStyleId = isControlled ? setControlledStyleId : setInternalStyleId
  const [styleExercises, setStyleExercises] = useState([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [loadingRandom, setLoadingRandom] = useState(false)

  const unlockedStyles = useMemo(
    () => (Array.isArray(previewUnlockedHorizonsStyles) && previewUnlockedHorizonsStyles.length > 0
      ? HORIZONS_STYLE_ORDER.filter((id) => previewUnlockedHorizonsStyles.includes(id))
      : getUnlockedHorizonsStyles(attempts, { xp: userXp })),
    [attempts, userXp, previewUnlockedHorizonsStyles]
  )
  const hasAnyUnlocked = unlockedStyles.length > 0

  useEffect(() => {
    if (!selectedStyleId || !hasAnyUnlocked) {
      setStyleExercises([])
      return
    }
    let cancelled = false
    setLoadingExercises(true)
    searchPublicExercises({ onlyHorizons: true, musicCategory: selectedStyleId })
      .then((list) => {
        if (!cancelled) setStyleExercises(list)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement exercices Horizons:', err)
          setStyleExercises([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExercises(false)
      })
    return () => { cancelled = true }
  }, [selectedStyleId, hasAnyUnlocked])

  const handleCardClick = (styleId) => {
    if (!unlockedStyles.includes(styleId)) return
    setSelectedStyleId(styleId)
  }

  const handleLaunchRandom = async () => {
    if (!selectedStyleId) return
    setLoadingRandom(true)
    try {
      const exercise = await getRandomPublicExercise({ onlyHorizons: true, musicCategory: selectedStyleId })
      if (exercise?.id) {
        navigate(`/play/${exercise.id}`)
      }
    } catch (err) {
      console.error('Erreur lancement exercice aléatoire:', err)
    } finally {
      setLoadingRandom(false)
    }
  }

  if (!hasAnyUnlocked) {
    return (
      <div className="horizons-map">
        <div className="horizons-map-header">
          <h2 className="horizons-map-title">Nouveaux Horizons</h2>
          <p className="horizons-map-subtitle">
            Débloque des styles de musique (film, JV, anime, variété, pop) pour découvrir de nouveaux exercices.
          </p>
        </div>
        <div className="horizons-map-empty">
          <p className="horizons-map-empty-title">Débloque ton premier style</p>
          <p className="horizons-map-empty-text">
            25 exercices complétés, ou Série de 7 jours, ou Niveau 10.
          </p>
          {onSwitchTab && (
            <button type="button" className="horizons-map-empty-cta" onClick={() => { onSwitchTab('free-mode'); onClose?.() }}>
              Aller au Mode Libre
            </button>
          )}
        </div>
      </div>
    )
  }

  if (selectedStyleId) {
    const cat = HORIZONS_MUSIC_CATEGORIES[selectedStyleId]
    return (
      <div className="horizons-map">
        <div className={`horizons-map-header horizons-map-header-with-back ${hideInternalBack ? 'horizons-map-header-back-hidden' : ''}`}>
          {!hideInternalBack && (
            <button
              type="button"
              className="horizons-map-back"
              onClick={() => setSelectedStyleId(null)}
              aria-label="Retour aux styles"
            >
              ← Retour
            </button>
          )}
          <h2 className="horizons-map-title">{cat?.label ?? selectedStyleId}</h2>
          <p className="horizons-map-subtitle">
            Choisis un exercice ou lance-en un au hasard.
          </p>
        </div>
        <div className="horizons-map-actions">
          <button
            type="button"
            className="horizons-map-random-btn"
            onClick={handleLaunchRandom}
            disabled={loadingRandom || styleExercises.length === 0}
          >
            {loadingRandom ? 'Chargement…' : 'Lancer un exercice au hasard'}
          </button>
        </div>
        {loadingExercises ? (
          <div className="horizons-map-loading">
            <div className="spinner-small" />
          </div>
        ) : styleExercises.length === 0 ? (
          <div className="horizons-map-empty horizons-map-empty-inline">
            <p>Aucun exercice dans ce style pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="horizons-map-exercise-list">
            {styleExercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onClick={(id) => navigate(`/play/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="horizons-map">
      <div className="horizons-map-header">
        <h2 className="horizons-map-title">Nouveaux Horizons</h2>
        <p className="horizons-map-subtitle">
          Choisis un style pour voir les exercices disponibles.
        </p>
      </div>
      <div className="horizons-map-cards">
        {HORIZONS_STYLE_ORDER.map((styleId) => {
          const unlocked = unlockedStyles.includes(styleId)
          const cat = HORIZONS_MUSIC_CATEGORIES[styleId]
          const imageUrl = HORIZONS_IMAGE_URLS[styleId]
          const gradient = STYLE_GRADIENTS[styleId] || STYLE_GRADIENTS.film
          const cardStyle = imageUrl
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 60%), url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: gradient }
          return (
            <button
              key={styleId}
              type="button"
              className={`horizons-style-card ${unlocked ? 'horizons-style-card-unlocked' : 'horizons-style-card-locked'}`}
              style={cardStyle}
              onClick={() => handleCardClick(styleId)}
              disabled={!unlocked}
            >
              <span className="horizons-style-card-inner">
                <span className="horizons-style-card-label">{cat?.tagLabel ?? styleId}</span>
                <span className="horizons-style-card-subtitle">{cat?.label ?? styleId}</span>
                {!unlocked && (
                  <span className="horizons-style-card-lock" aria-hidden>🔒</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default HorizonsMap
