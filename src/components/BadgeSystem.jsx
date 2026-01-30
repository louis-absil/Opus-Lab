import React, { useState, useEffect } from 'react'
import { getAllBadgesWithStatus } from '../services/badgeService'
import './BadgeSystem.css'

function BadgeSystem({ userId, attempts, userXp }) {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && attempts) {
      loadBadges()
    }
  }, [userId, attempts, userXp])

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
      <div className="badge-system-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  // Trier les badges : débloqués récents en premier, puis en cours, puis verrouillés
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1
    if (!a.unlocked && b.unlocked) return 1
    if (a.unlocked && b.unlocked) {
      const dateA = a.unlockedAt?.toDate ? a.unlockedAt.toDate() : new Date(a.unlockedAt || 0)
      const dateB = b.unlockedAt?.toDate ? b.unlockedAt.toDate() : new Date(b.unlockedAt || 0)
      return dateB - dateA
    }
    // Pour les badges non débloqués, trier par progression
    return (b.progress / b.maxProgress) - (a.progress / a.maxProgress)
  })

  // Derniers badges débloqués (3-5)
  const recentBadges = sortedBadges.filter(b => b.unlocked).slice(0, 5)
  
  // Badges en cours (progression > 0 mais pas débloqué)
  const inProgressBadges = sortedBadges.filter(b => !b.unlocked && b.progress > 0).slice(0, 3)

  return (
    <div className="badge-system">
      {recentBadges.length > 0 && (
        <div className="badge-section">
          <h3 className="badge-section-title">Derniers badges débloqués</h3>
          <div className="badge-grid">
            {recentBadges.map(badge => (
              <div key={badge.id} className="badge-card badge-unlocked">
                <div className="badge-emoji">{badge.emoji}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-description">{badge.description}</div>
                {badge.unlockedAt && (
                  <div className="badge-date">
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'short'
                    }).format(badge.unlockedAt.toDate ? badge.unlockedAt.toDate() : new Date(badge.unlockedAt))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {inProgressBadges.length > 0 && (
        <div className="badge-section">
          <h3 className="badge-section-title">En cours</h3>
          <div className="badge-grid">
            {inProgressBadges.map(badge => {
              const progressPercent = (badge.progress / badge.maxProgress) * 100
              return (
                <div key={badge.id} className="badge-card badge-in-progress">
                  <div className="badge-emoji badge-emoji-locked">{badge.emoji}</div>
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-description">{badge.description}</div>
                  <div className="badge-progress">
                    <div className="badge-progress-bar">
                      <div 
                        className="badge-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <span className="badge-progress-text">
                      {badge.progress} / {badge.maxProgress}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recentBadges.length === 0 && inProgressBadges.length === 0 && (
        <div className="badge-empty">
          <div className="badge-empty-emoji">🏆</div>
          <p className="badge-empty-text">Complète des exercices pour débloquer tes premiers badges !</p>
        </div>
      )}
    </div>
  )
}

export default BadgeSystem
