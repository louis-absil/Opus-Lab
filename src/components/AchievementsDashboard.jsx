import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { getAllBadgesWithStatus } from '../services/badgeService'
import './AchievementsDashboard.css'

// Grille : minmax(120px, 1fr), gap 1rem (16px) en desktop ; 100px + 12px en mobile minmax(120px, 1fr), gap 1rem (16px) en desktop ; 100px + 12px en mobile
const CARD_MIN = 120
const GAP = 16
const ROWS_DESKTOP = 2
const ROWS_MOBILE = 2
const BREAKPOINT_ROWS = 600

function computeVisibleCount(containerWidth) {
  if (!containerWidth || containerWidth <= 0) return 10
  const cardMin = containerWidth < 768 ? 100 : CARD_MIN
  const gap = containerWidth < 768 ? 12 : GAP
  const columns = Math.max(1, Math.floor((containerWidth + gap) / (cardMin + gap)))
  const rows = containerWidth >= BREAKPOINT_ROWS ? ROWS_DESKTOP : ROWS_MOBILE
  return columns * rows
}

function AchievementsDashboard({ userId, attempts, userXp, onOpenHorizons = null }) {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLocked, setShowLocked] = useState(false)
  const [showRestUnlocked, setShowRestUnlocked] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [visibleUnlockedCount, setVisibleUnlockedCount] = useState(10)
  const unlockedGridRef = useRef(null)

  useEffect(() => {
    if (userId && attempts) {
      loadBadges()
    }
  }, [userId, attempts, userXp])

  useEffect(() => {
    const el = unlockedGridRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? {}
      setVisibleUnlockedCount(computeVisibleCount(width))
    })
    ro.observe(el)
    setVisibleUnlockedCount(computeVisibleCount(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [badges.length])

  const loadBadges = async () => {
    try {
      setLoading(true)
      const badgesWithStatus = await getAllBadgesWithStatus(userId, attempts || [], { xp: userXp })
      setBadges(badgesWithStatus)
    } catch (error) {
      console.error('Erreur lors du chargement des badges:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="achievements-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  const unlockedCount = badges.filter(b => b.unlocked).length
  const totalCount = badges.length
  const lockedCount = totalCount - unlockedCount
  const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  // Trier : débloqués récents en premier, puis en cours, puis verrouillés
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1
    if (!a.unlocked && b.unlocked) return 1
    if (a.unlocked && b.unlocked) {
      const dateA = a.unlockedAt?.toDate ? a.unlockedAt.toDate() : new Date(a.unlockedAt || 0)
      const dateB = b.unlockedAt?.toDate ? b.unlockedAt.toDate() : new Date(b.unlockedAt || 0)
      return dateB - dateA
    }
    return (b.progress / b.maxProgress) - (a.progress / a.maxProgress)
  })

  const unlockedBadges = sortedBadges.filter(b => b.unlocked)
  const lockedBadges = sortedBadges.filter(b => !b.unlocked)
  const visibleUnlocked = unlockedBadges.slice(0, visibleUnlockedCount)
  const restUnlocked = unlockedBadges.slice(visibleUnlockedCount)
  const hasRestUnlocked = restUnlocked.length > 0

  const renderBadgeCard = (badge) => {
    if (badge.staged) {
      const progressPercent = badge.maxProgress > 0
        ? Math.min(100, (badge.progress / badge.maxProgress) * 100)
        : (badge.unlocked ? 100 : 0)
      return (
        <div
          key={badge.id}
          role="button"
          tabIndex={0}
          className={`achievement-card achievement-card-staged ${badge.unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
          onClick={() => setSelectedBadge(badge)}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedBadge(badge)}
          aria-label={`Voir le détail : ${badge.name}`}
        >
          <div className={`achievement-emoji ${badge.unlocked ? '' : 'achievement-emoji-locked'}`}>
            {badge.emoji}
          </div>
          <div className="achievement-name">{badge.name}</div>
          {badge.unlocked && badge.unlockedAt && (
            <div className="achievement-date">
              {new Intl.DateTimeFormat('fr-FR', {
                day: 'numeric',
                month: 'short'
              }).format(badge.unlockedAt instanceof Date ? badge.unlockedAt : new Date(badge.unlockedAt))}
            </div>
          )}
          <div
            className="achievement-staged-popover"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="achievement-stages-dots">
              {(badge.stages || []).map((stage, i) => (
                <span
                  key={stage}
                  className={`achievement-stage-dot ${(badge.unlockedStages || [])[i] ? 'achievement-stage-dot-unlocked' : ''}`}
                  title={`Palier ${stage}`}
                >
                  {stage}
                </span>
              ))}
            </div>
            <div className="achievement-progress-mini">
              <div className="achievement-progress-bar-mini">
                <div
                  className="achievement-progress-fill-mini"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="achievement-progress-text-mini">
                {badge.progress} / {badge.maxProgress}
              </span>
            </div>
          </div>
        </div>
      )
    }

    const progressPercent = badge.maxProgress > 1
      ? (badge.progress / badge.maxProgress) * 100
      : (badge.unlocked ? 100 : 0)
    return (
      <div
        key={badge.id}
        role="button"
        tabIndex={0}
        className={`achievement-card ${badge.unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
        onClick={() => setSelectedBadge(badge)}
        onKeyDown={(e) => e.key === 'Enter' && setSelectedBadge(badge)}
        aria-label={`Voir le détail : ${badge.name}`}
      >
        <div className={`achievement-emoji ${badge.unlocked ? '' : 'achievement-emoji-locked'}`}>
          {badge.emoji}
        </div>
        <div className="achievement-name">{badge.name}</div>
        {badge.maxProgress > 1 && !badge.unlocked && (
          <div className="achievement-progress-mini">
            <div className="achievement-progress-bar-mini">
              <div
                className="achievement-progress-fill-mini"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="achievement-progress-text-mini">
              {badge.progress}/{badge.maxProgress}
            </span>
          </div>
        )}
        {badge.unlocked && badge.unlockedAt && (
          <div className="achievement-date">
            {new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'short'
            }).format(badge.unlockedAt.toDate ? badge.unlockedAt.toDate() : new Date(badge.unlockedAt))}
          </div>
        )}
        {badge.unlocked && badge.unlocks && (
          <div className="achievement-unlocks">
            {badge.unlocks.type === 'profileTitle' && (
              <span className="achievement-unlocks-label">Reconnu : {badge.unlocks.value}</span>
            )}
            {badge.unlocks.type === 'challenge' && (
              <span className="achievement-unlocks-label">Débloqué : {badge.unlocks.label}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="achievements-dashboard">
      <div className="achievements-header">
        <h3 className="achievements-title">Accomplissements</h3>
        <div className="achievements-progress">
          <div className="achievements-progress-bar">
            <div
              className="achievements-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="achievements-progress-text">
            {unlockedCount} / {totalCount} badges
          </span>
        </div>
      </div>

      {/* Bloc 1 : badges débloqués visibles (responsive) */}
      {visibleUnlocked.length > 0 && (
        <div className="achievements-block">
          <h4 className="achievements-block-title">Derniers badges obtenus</h4>
          <div ref={unlockedGridRef} className="achievements-grid">
            {visibleUnlocked.map(renderBadgeCard)}
          </div>
        </div>
      )}

      {/* Bloc 2 : Autres badges obtenus (accordéon) */}
      {hasRestUnlocked && (
        <div className="achievements-rest-unlocked-section">
          <button
            type="button"
            className="achievements-locked-toggle"
            onClick={() => setShowRestUnlocked(!showRestUnlocked)}
            aria-expanded={showRestUnlocked}
          >
            {showRestUnlocked ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>Voir le reste des badges débloqués ({restUnlocked.length})</span>
          </button>
          {showRestUnlocked && (
            <div className="achievements-grid achievements-grid-rest-unlocked">
              {restUnlocked.map(renderBadgeCard)}
            </div>
          )}
        </div>
      )}

      {/* Bloc 3 : Badges non obtenus */}
      {lockedCount > 0 && (
        <div className="achievements-locked-section">
          <button
            type="button"
            className="achievements-locked-toggle"
            onClick={() => setShowLocked(!showLocked)}
            aria-expanded={showLocked}
          >
            {showLocked ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>Voir les badges non débloqués ({lockedCount})</span>
          </button>
          {showLocked && (
            <div className="achievements-grid achievements-grid-locked">
              {lockedBadges.map(renderBadgeCard)}
            </div>
          )}
        </div>
      )}

      {unlockedBadges.length === 0 && lockedCount > 0 && (
        <p className="achievements-empty-hint">Complète des exercices pour débloquer tes premiers badges !</p>
      )}

      {selectedBadge && (
        <div
          className="achievements-modal-overlay"
          onClick={() => setSelectedBadge(null)}
          role="presentation"
        >
          <div
            className={`achievements-modal ${selectedBadge.unlocked ? 'achievements-modal-unlocked' : 'achievements-modal-locked'}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-modal-title"
          >
            <button
              type="button"
              className="achievements-modal-close"
              onClick={() => setSelectedBadge(null)}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
            <div className="achievements-modal-emoji">
              {selectedBadge.emoji}
            </div>
            <h4 id="achievement-modal-title" className="achievements-modal-name">
              {selectedBadge.name}
            </h4>
            <p className="achievements-modal-description">
              {selectedBadge.description}
            </p>
            {selectedBadge.staged ? (
              <>
                <p className="achievements-modal-progress">
                  Progression : {selectedBadge.progress} / {selectedBadge.maxProgress}
                </p>
                <div className="achievements-modal-stages">
                  <h5 className="achievements-modal-stages-title">Paliers</h5>
                  <ul className="achievements-modal-stages-list">
                    {(selectedBadge.stages || []).map((stage, i) => (
                      <li
                        key={stage}
                        className={`achievements-modal-stage-item ${(selectedBadge.unlockedStages || [])[i] ? 'achievements-modal-stage-unlocked' : 'achievements-modal-stage-locked'}`}
                      >
                        <span className="achievements-modal-stage-value">{stage}</span>
                        <span className="achievements-modal-stage-status">
                          {(selectedBadge.unlockedStages || [])[i] ? 'Débloqué' : 'En cours'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                  <p className="achievements-modal-date">
                    Dernier palier débloqué le {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }).format(selectedBadge.unlockedAt instanceof Date ? selectedBadge.unlockedAt : new Date(selectedBadge.unlockedAt))}
                  </p>
                )}
              </>
            ) : (
              <>
                {!selectedBadge.unlocked && selectedBadge.maxProgress > 1 && (
                  <p className="achievements-modal-progress">
                    Progression : {selectedBadge.progress} / {selectedBadge.maxProgress}
                  </p>
                )}
                {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                  <p className="achievements-modal-date">
                    Débloqué le {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }).format(selectedBadge.unlockedAt.toDate ? selectedBadge.unlockedAt.toDate() : new Date(selectedBadge.unlockedAt))}
                  </p>
                )}
                {selectedBadge.unlocked && selectedBadge.unlocks && (
                  <p className="achievements-modal-unlocks">
                    {selectedBadge.unlocks.type === 'profileTitle' && <>Reconnu : {selectedBadge.unlocks.value}</>}
                    {selectedBadge.unlocks.type === 'challenge' && <>Débloqué : {selectedBadge.unlocks.label}</>}
                  </p>
                )}
                {selectedBadge.unlocks?.type === 'horizons' && onOpenHorizons && (
                  <button
                    type="button"
                    className="achievements-modal-horizons-cta"
                    onClick={() => {
                      onOpenHorizons()
                      setSelectedBadge(null)
                    }}
                  >
                    Voir Nouveaux Horizons
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AchievementsDashboard
