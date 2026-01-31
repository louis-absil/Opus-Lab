import { useState, useEffect, useRef } from 'react'
import { getGlobalNotionsFromAutoTags, getTagForNotionLabel } from '../utils/globalNotions'
import './ExerciseCard.css'

const MOBILE_BREAKPOINT = 768

function getYouTubeThumbnail(videoId) {
  if (!videoId) return null
  const id = videoId.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)?.[1] || videoId
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

const TOOLTIP_HIDE_DELAY_MS = 180

function ExerciseCard({ exercise, onClick, onPillClick, recommendedLabel, recommendedPillPayload, variant }) {
  const isMobile = useIsMobile()
  const [showTooltip, setShowTooltip] = useState(false)
  const hideTooltipTimeoutRef = useRef(null)
  const isMini = variant === 'mini'

  useEffect(() => {
    return () => {
      if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    }
  }, [])
  const showRecommended = Boolean(recommendedLabel)
  const recommendedPriority = showRecommended && recommendedLabel.includes('objectif')
  const canClickRecommended = Boolean(onPillClick && recommendedPillPayload)
  const recommendedPillProps = canClickRecommended
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: (e) => handlePillClick(e, recommendedPillPayload),
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onPillClick(recommendedPillPayload)
          }
        }
      }
    : {}

  const videoId = exercise.video?.id
  const thumbnailUrl = getYouTubeThumbnail(videoId)
  const title = exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || exercise.metadata?.title || 'Sans titre'
  const difficulty = exercise.metadata?.difficulty || null
  const notions = getGlobalNotionsFromAutoTags(exercise.autoTags)
  const allPills = difficulty ? [difficulty, ...notions] : notions
  const hasMorePills = allPills.length > 3

  const notionSlug = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\u0300-\u036f/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  const handlePillClick = (e, payload) => {
    e.stopPropagation()
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ExerciseCard.jsx:handlePillClick', message: 'pill click', data: { type: payload.type, value: payload.value }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {})
    // #endregion
    onPillClick(payload)
  }

  const renderPill = (label, index, isDifficulty = false) => {
    const canFilterPill = onPillClick && (isDifficulty || getTagForNotionLabel(exercise.autoTags, label))
    const pillProps = canFilterPill
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: (e) => {
            if (isDifficulty) handlePillClick(e, { type: 'difficulty', value: label })
            else {
              const tag = getTagForNotionLabel(exercise.autoTags, label)
              if (tag) handlePillClick(e, { type: 'tag', value: tag })
            }
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (isDifficulty) onPillClick({ type: 'difficulty', value: label })
              else {
                const tag = getTagForNotionLabel(exercise.autoTags, label)
                if (tag) onPillClick({ type: 'tag', value: tag })
              }
            }
          }
        }
      : {}

    if (isDifficulty) {
      return (
        <span
          key="difficulty"
          className={`exercise-card-difficulty ${label}${canFilterPill ? ' exercise-card-pill-clickable' : ''}`}
          {...pillProps}
        >
          {label}
        </span>
      )
    }
    return (
      <span
        key={index}
        className={`exercise-card-pill exercise-card-pill--notion${canFilterPill ? ' exercise-card-pill-clickable' : ''}`}
        data-notion={notionSlug(label)}
        {...pillProps}
      >
        {label}
      </span>
    )
  }

  // Desktop : difficulté + 2 notions visibles (max 3 pastilles)
  const visibleForDesktop = difficulty ? [difficulty, ...notions.slice(0, 2)] : notions.slice(0, 3)
  const pillCount = (showRecommended ? 1 : 0) + (difficulty ? 1 : 0) + notions.length
  const useScrollLayout = isMobile
  const showTooltipForMini = isMini && (showRecommended || difficulty || notions.length > 0)

  return (
    <div
      className={`exercise-card${isMini ? ' exercise-card--mini' : ''}`}
      onClick={(e) => {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ExerciseCard.jsx:card-onClick', message: 'card click', data: { targetTag: e.target.tagName, targetClass: (e.target.className || '').slice(0, 80), currentTargetClass: (e.currentTarget?.className || '').slice(0, 40) }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {})
        // #endregion
        onClick(exercise.id)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(exercise.id)
        }
      }}
      aria-label={`Lancer l'exercice ${title}`}
    >
      <div className="exercise-card-thumbnail">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="exercise-card-thumbnail-img"
            onError={(e) => {
              e.target.style.display = 'none'
              if (e.target.nextElementSibling) {
                e.target.nextElementSibling.style.display = 'flex'
              }
            }}
          />
        ) : null}
        <div
          className="exercise-card-thumbnail-placeholder"
          style={{ display: thumbnailUrl ? 'none' : 'flex' }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
      </div>
      <div className="exercise-card-body">
        <h3 className="exercise-card-title">{title}</h3>
        {exercise.metadata?.composer && (
          <p className="exercise-card-composer">{exercise.metadata.composer}</p>
        )}
        {(showRecommended || difficulty || notions.length > 0) && (
          <div className="exercise-card-footer">
            {useScrollLayout ? (
              <div className="exercise-card-pills exercise-card-pills--scroll">
                {showRecommended && (
                  <span className={`exercise-card-pill exercise-card-pill--recommended${recommendedPriority ? ' exercise-card-pill--recommended-priority' : ''}${canClickRecommended ? ' exercise-card-pill-clickable' : ''}`} {...recommendedPillProps}>
                    {recommendedLabel}
                  </span>
                )}
                {difficulty && renderPill(difficulty, 0, true)}
                {notions.map((label, i) => renderPill(label, i, false))}
              </div>
            ) : (
              <div
                className="exercise-card-pills-wrapper"
                onMouseEnter={() => {
                  if (hideTooltipTimeoutRef.current) {
                    clearTimeout(hideTooltipTimeoutRef.current)
                    hideTooltipTimeoutRef.current = null
                  }
                  setShowTooltip(true)
                }}
                onMouseLeave={() => {
                  hideTooltipTimeoutRef.current = setTimeout(() => setShowTooltip(false), TOOLTIP_HIDE_DELAY_MS)
                }}
              >
                <div className="exercise-card-pills exercise-card-pills--visible">
                  {showRecommended && (
                    <span className={`exercise-card-pill exercise-card-pill--recommended${recommendedPriority ? ' exercise-card-pill--recommended-priority' : ''}${canClickRecommended ? ' exercise-card-pill-clickable' : ''}`} {...recommendedPillProps}>
                      {recommendedLabel}
                    </span>
                  )}
                  {difficulty && renderPill(difficulty, 0, true)}
                  {visibleForDesktop.filter((l) => l !== difficulty).map((label, i) => renderPill(label, i, false))}
                </div>
                {((hasMorePills || showTooltipForMini) && showTooltip) && (
                  <div
                    className="exercise-card-pills-tooltip"
                    role="tooltip"
                    onClick={(e) => {
                      e.stopPropagation()
                      // #region agent log
                      fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ExerciseCard.jsx:tooltip-onClick', message: 'tooltip area click', data: { targetTag: e.target.tagName, targetClass: (e.target.className || '').slice(0, 80) }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {})
                      // #endregion
                    }}
                    onMouseEnter={() => {
                      if (hideTooltipTimeoutRef.current) {
                        clearTimeout(hideTooltipTimeoutRef.current)
                        hideTooltipTimeoutRef.current = null
                      }
                      setShowTooltip(true)
                    }}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    {showRecommended && (
                      <span className={`exercise-card-pill exercise-card-pill--recommended${recommendedPriority ? ' exercise-card-pill--recommended-priority' : ''}${canClickRecommended ? ' exercise-card-pill-clickable' : ''}`} {...recommendedPillProps}>
                        {recommendedLabel}
                      </span>
                    )}
                    {difficulty && renderPill(difficulty, 0, true)}
                    {notions.map((label, i) => renderPill(label, i, false))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExerciseCard
