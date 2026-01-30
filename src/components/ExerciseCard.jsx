import { useState, useEffect } from 'react'
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

function ExerciseCard({ exercise, onClick, onPillClick }) {
  const isMobile = useIsMobile()
  const [showTooltip, setShowTooltip] = useState(false)

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

  return (
    <div
      className="exercise-card"
      onClick={() => onClick(exercise.id)}
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
        {(difficulty || notions.length > 0) && (
          <div className="exercise-card-footer">
            {isMobile ? (
              <div className="exercise-card-pills exercise-card-pills--scroll">
                {difficulty && renderPill(difficulty, 0, true)}
                {notions.map((label, i) => renderPill(label, i, false))}
              </div>
            ) : (
              <div
                className="exercise-card-pills-wrapper"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <div className="exercise-card-pills exercise-card-pills--visible">
                  {difficulty && renderPill(difficulty, 0, true)}
                  {visibleForDesktop.filter((l) => l !== difficulty).map((label, i) => renderPill(label, i, false))}
                </div>
                {hasMorePills && showTooltip && (
                  <div className="exercise-card-pills-tooltip" role="tooltip">
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
