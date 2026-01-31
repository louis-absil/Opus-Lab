import React from 'react'
import './PeriodComparison.css'

function PeriodComparison({ attempts }) {
  if (!attempts || attempts.length === 0) {
    return null
  }

  const comparisons = calculateComparisons(attempts)

  if (comparisons.length === 0) {
    return null
  }

  return (
    <div className="period-comparison">
      <h3 className="comparison-title">Comparaison</h3>
      <div className="comparison-grid">
        {comparisons.map((comparison, index) => (
          <div key={index} className="comparison-card">
            <div className="comparison-header">
              <h4 className="comparison-metric">{comparison.metric}</h4>
              <div className={`comparison-change comparison-${comparison.direction}`}>
                {comparison.direction === 'up' && '↑'}
                {comparison.direction === 'down' && '↓'}
                {comparison.direction === 'stable' && '→'}
                {comparison.percentage}%
              </div>
            </div>
            <div className="comparison-values">
              <div className="comparison-period">
                <div className="comparison-period-label">{comparison.currentLabel}</div>
                <div className="comparison-period-value">{comparison.current}</div>
              </div>
              <div className="comparison-vs">vs</div>
              <div className="comparison-period">
                <div className="comparison-period-label">{comparison.previousLabel}</div>
                <div className="comparison-period-value">{comparison.previous}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function calculateComparisons(attempts) {
  const comparisons = []

  // Trier par date (plus récent en premier)
  const sortedAttempts = [...attempts].sort((a, b) => {
    const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0)
    return dateB - dateA
  })

  // Comparaison 1: Cette semaine vs semaine dernière
  const thisWeek = getThisWeekAttempts(sortedAttempts)
  const lastWeek = getLastWeekAttempts(sortedAttempts)

  if (thisWeek.length > 0) {
    const thisWeekAvg = thisWeek.reduce((sum, a) => sum + (a.score || 0), 0) / thisWeek.length
    const thisWeekBest = Math.max(...thisWeek.map(a => a.score || 0))
    if (lastWeek.length > 0) {
      const lastWeekAvg = lastWeek.reduce((sum, a) => sum + (a.score || 0), 0) / lastWeek.length
      const change = calculateChange(thisWeekAvg, lastWeekAvg)
      comparisons.push({
        metric: 'Score moyen',
        currentLabel: 'Cette semaine',
        previousLabel: 'Semaine dernière',
        current: `${Math.round(thisWeekAvg)}%`,
        previous: `${Math.round(lastWeekAvg)}%`,
        direction: change.direction,
        percentage: change.percentage
      })
      comparisons.push({
        metric: 'Nombre d\'exercices',
        currentLabel: 'Cette semaine',
        previousLabel: 'Semaine dernière',
        current: thisWeek.length.toString(),
        previous: lastWeek.length.toString(),
        direction: calculateChange(thisWeek.length, lastWeek.length).direction,
        percentage: calculateChange(thisWeek.length, lastWeek.length).percentage
      })
      const lastWeekBest = Math.max(...lastWeek.map(a => a.score || 0))
      comparisons.push({
        metric: 'Meilleur score',
        currentLabel: 'Cette semaine',
        previousLabel: 'Semaine dernière',
        current: `${Math.round(thisWeekBest)}%`,
        previous: `${Math.round(lastWeekBest)}%`,
        direction: calculateChange(thisWeekBest, lastWeekBest).direction,
        percentage: calculateChange(thisWeekBest, lastWeekBest).percentage
      })
    } else {
      comparisons.push({
        metric: 'Score moyen',
        currentLabel: 'Cette semaine',
        previousLabel: 'Semaine dernière',
        current: `${Math.round(thisWeekAvg)}%`,
        previous: '—',
        direction: 'stable',
        percentage: '—'
      })
      comparisons.push({
        metric: 'Nombre d\'exercices',
        currentLabel: 'Cette semaine',
        previousLabel: 'Semaine dernière',
        current: thisWeek.length.toString(),
        previous: '—',
        direction: 'stable',
        percentage: '—'
      })
      comparisons.push({
        metric: 'Meilleur score',
        currentLabel: 'Cette semaine',
        previousLabel: 'Semaine dernière',
        current: `${Math.round(thisWeekBest)}%`,
        previous: '—',
        direction: 'stable',
        percentage: '—'
      })
    }
  } else if (lastWeek.length > 0) {
    // Aucune activité cette semaine mais des données la semaine dernière : afficher pour ne pas laisser l'onglet vide
    const lastWeekAvg = lastWeek.reduce((sum, a) => sum + (a.score || 0), 0) / lastWeek.length
    const lastWeekBest = Math.max(...lastWeek.map(a => a.score || 0))
    comparisons.push({
      metric: 'Score moyen',
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      current: '—',
      previous: `${Math.round(lastWeekAvg)}%`,
      direction: 'stable',
      percentage: '—'
    })
    comparisons.push({
      metric: 'Nombre d\'exercices',
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      current: '0',
      previous: lastWeek.length.toString(),
      direction: 'stable',
      percentage: '—'
    })
    comparisons.push({
      metric: 'Meilleur score',
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      current: '—',
      previous: `${Math.round(lastWeekBest)}%`,
      direction: 'stable',
      percentage: '—'
    })
  } else {
    // Aucune activité ni cette semaine ni la précédente : afficher quand même les lignes pour cohérence
    comparisons.push({
      metric: 'Score moyen',
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      current: '—',
      previous: '—',
      direction: 'stable',
      percentage: '—'
    })
    comparisons.push({
      metric: 'Nombre d\'exercices',
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      current: '0',
      previous: '—',
      direction: 'stable',
      percentage: '—'
    })
    comparisons.push({
      metric: 'Meilleur score',
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      current: '—',
      previous: '—',
      direction: 'stable',
      percentage: '—'
    })
  }

  // Comparaison 2: Ce mois vs mois dernier
  const thisMonth = getThisMonthAttempts(sortedAttempts)
  const lastMonth = getLastMonthAttempts(sortedAttempts)
  if (thisMonth.length > 0) {
    if (lastMonth.length > 0) {
      comparisons.push({
        metric: 'Exercices ce mois',
        currentLabel: 'Ce mois',
        previousLabel: 'Mois dernier',
        current: thisMonth.length.toString(),
        previous: lastMonth.length.toString(),
        direction: calculateChange(thisMonth.length, lastMonth.length).direction,
        percentage: calculateChange(thisMonth.length, lastMonth.length).percentage
      })
    } else {
      comparisons.push({
        metric: 'Exercices ce mois',
        currentLabel: 'Ce mois',
        previousLabel: 'Mois dernier',
        current: thisMonth.length.toString(),
        previous: '—',
        direction: 'stable',
        percentage: '—'
      })
    }
  } else {
    comparisons.push({
      metric: 'Exercices ce mois',
      currentLabel: 'Ce mois',
      previousLabel: 'Mois dernier',
      current: '0',
      previous: lastMonth.length > 0 ? lastMonth.length.toString() : '—',
      direction: 'stable',
      percentage: '—'
    })
  }

  return comparisons
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

function getThisMonthAttempts(attempts) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  return attempts.filter(a => {
    if (!a.completedAt) return false
    const date = a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= monthStart
  })
}

function getLastMonthAttempts(attempts) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  return attempts.filter(a => {
    if (!a.completedAt) return false
    const date = a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= lastMonthStart && date < monthStart
  })
}

export default PeriodComparison
