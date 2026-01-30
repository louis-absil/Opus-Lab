import React from 'react'
import './TrendIndicators.css'

function TrendIndicators({ attempts }) {
  if (!attempts || attempts.length === 0) {
    return null
  }

  // Calculer les tendances
  const trends = calculateTrends(attempts)

  return (
    <div className="trend-indicators">
      <h3 className="trend-indicators-title">Tendances</h3>
      <div className="trend-grid">
        {trends.map((trend, index) => (
          <div key={index} className={`trend-card trend-${trend.direction}`}>
            <div className="trend-icon">
              {trend.direction === 'up' && '📈'}
              {trend.direction === 'down' && '📉'}
              {trend.direction === 'stable' && '➡️'}
            </div>
            <div className="trend-content">
              <div className="trend-label">{trend.label}</div>
              <div className="trend-value">
                {trend.direction === 'up' && '+'}
                {trend.direction === 'down' && '-'}
                {trend.percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function calculateTrends(attempts) {
  const trends = []

  // Trier par date (plus récent en premier)
  const sortedAttempts = [...attempts].sort((a, b) => {
    const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0)
    return dateB - dateA
  })

  // Tendance 1: Score moyen cette semaine vs semaine dernière
  const thisWeek = getThisWeekAttempts(sortedAttempts)
  const lastWeek = getLastWeekAttempts(sortedAttempts)
  
  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const thisWeekAvg = thisWeek.reduce((sum, a) => sum + (a.score || 0), 0) / thisWeek.length
    const lastWeekAvg = lastWeek.reduce((sum, a) => sum + (a.score || 0), 0) / lastWeek.length
    const change = calculateChange(thisWeekAvg, lastWeekAvg)
    
    trends.push({
      label: 'Score moyen',
      direction: change.direction,
      percentage: change.percentage,
      value: Math.round(thisWeekAvg)
    })
  }

  // Tendance 2: Nombre d'exercices cette semaine vs semaine dernière
  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const change = calculateChange(thisWeek.length, lastWeek.length)
    
    trends.push({
      label: 'Exercices cette semaine',
      direction: change.direction,
      percentage: change.percentage,
      value: thisWeek.length
    })
  }

  // Tendance 3: Amélioration moyenne (comparaison des 5 derniers vs 5 précédents)
  if (sortedAttempts.length >= 10) {
    const recent5 = sortedAttempts.slice(0, 5)
    const previous5 = sortedAttempts.slice(5, 10)
    const recentAvg = recent5.reduce((sum, a) => sum + (a.score || 0), 0) / recent5.length
    const previousAvg = previous5.reduce((sum, a) => sum + (a.score || 0), 0) / previous5.length
    const change = calculateChange(recentAvg, previousAvg)
    
    trends.push({
      label: 'Progression récente',
      direction: change.direction,
      percentage: change.percentage,
      value: Math.round(recentAvg)
    })
  }

  // Tendance 4: Meilleur score cette semaine
  if (thisWeek.length > 0) {
    const bestThisWeek = Math.max(...thisWeek.map(a => a.score || 0))
    const bestLastWeek = lastWeek.length > 0 ? Math.max(...lastWeek.map(a => a.score || 0)) : bestThisWeek
    const change = calculateChange(bestThisWeek, bestLastWeek)
    
    trends.push({
      label: 'Meilleur score',
      direction: change.direction,
      percentage: change.percentage,
      value: Math.round(bestThisWeek)
    })
  }

  return trends
}

function calculateChange(current, previous) {
  if (previous === 0) {
    return { direction: current > 0 ? 'up' : 'stable', percentage: '0.0' }
  }
  const change = ((current - previous) / previous) * 100
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    percentage: Math.abs(change).toFixed(1)
  }
}

function getThisWeekAttempts(attempts) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  return attempts.filter(a => {
    if (!a.completedAt) return false
    const date = a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= weekAgo
  })
}

function getLastWeekAttempts(attempts) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  
  return attempts.filter(a => {
    if (!a.completedAt) return false
    const date = a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= twoWeeksAgo && date < weekAgo
  })
}

export default TrendIndicators
