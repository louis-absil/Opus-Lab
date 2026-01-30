import React, { useState, useEffect } from 'react'
import { getAllBadgesWithStatus } from '../services/badgeService'
import './AchievementsDashboard.css'

function AchievementsDashboard({ userId, attempts, userXp }) {
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
      <div className="achievements-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  const unlockedCount = badges.filter(b => b.unlocked).length
  const totalCount = badges.length
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

  return (
    <div className="achievements-dashboard">
      <div className="achievements-header">
        <h3 className="achievements-title">Accomplissements</h3>
        <div className="achievements-progress">
          <div className="achievements-progress-bar">
            <div 
              className="achievements-progress-fill"
              style={{ width: `${completionPercent}%` }}
            ></div>
          </div>
          <span className="achievements-progress-text">
            {unlockedCount} / {totalCount} badges
          </span>
        </div>
      </div>

      <div className="achievements-grid">
        {sortedBadges.map(badge => {
          const progressPercent = badge.maxProgress > 1 
            ? (badge.progress / badge.maxProgress) * 100 
            : (badge.unlocked ? 100 : 0)

          return (
            <div 
              key={badge.id} 
              className={`achievement-card ${badge.unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
              title={badge.description}
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
                    ></div>
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AchievementsDashboard
