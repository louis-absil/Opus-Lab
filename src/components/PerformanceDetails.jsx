import { useState } from 'react'
import './PerformanceDetails.css'

function PerformanceDetails({ degreeStats, cadenceStats }) {
  const [expandedCategories, setExpandedCategories] = useState({
    diatoniques: true,
    chromatiques: false,
    cadences: false
  })

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const cadenceLabels = {
    perfect: 'Parfaite',
    imperfect: 'Imparfaite',
    plagal: 'Plagale',
    deceptive: 'Rompue',
    half: 'Demi'
  }

  // Catégoriser les degrés
  const diatoniqueDegrees = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  const chromatiqueDegrees = ['N', 'Gr', 'It', 'Fr']

  const getBarColor = (percentage) => {
    if (percentage < 30) return '#ef4444' // Rouge
    if (percentage < 50) return '#f59e0b' // Orange
    return '#667eea' // Violet
  }

  const renderStatBar = (label, stats, key) => {
    const percentage = stats.total > 0 
      ? Math.round((stats.correct / stats.total) * 100) 
      : 0
    
    return (
      <div key={key} className="performance-stat-item">
        <div className="performance-stat-header">
          <span className="performance-stat-name">{label}</span>
          <span className="performance-stat-percentage" style={{ color: getBarColor(percentage) }}>
            {percentage}%
          </span>
        </div>
        <div className="performance-stat-bar">
          <div 
            className="performance-stat-fill" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: getBarColor(percentage)
            }}
          />
        </div>
        <div className="performance-stat-detail">
          {stats.correct}/{stats.total} correctes
        </div>
      </div>
    )
  }

  const diatoniqueStats = Object.entries(degreeStats || {})
    .filter(([degree]) => diatoniqueDegrees.includes(degree))
    .sort((a, b) => a[0].localeCompare(b[0]))

  const chromatiqueStats = Object.entries(degreeStats || {})
    .filter(([degree]) => chromatiqueDegrees.includes(degree) || degree === 'N' || degree === 'Gr')
    .sort((a, b) => a[0].localeCompare(b[0]))

  const cadenceStatsArray = Object.entries(cadenceStats || {})
    .sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="performance-details">
      {/* Degrés Diatoniques */}
      <div className="performance-category">
        <button
          className="performance-category-header"
          onClick={() => toggleCategory('diatoniques')}
        >
          <span className="performance-category-title">Degrés Diatoniques</span>
          <span className="performance-category-icon">
            {expandedCategories.diatoniques ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategories.diatoniques && (
          <div className="performance-category-content">
            {diatoniqueStats.length > 0 ? (
              diatoniqueStats.map(([degree, stats]) => 
                renderStatBar(degree, stats, `diatonique-${degree}`)
              )
            ) : (
              <p className="performance-empty">Aucune donnée disponible</p>
            )}
          </div>
        )}
      </div>

      {/* Accords Chromatiques */}
      <div className="performance-category">
        <button
          className="performance-category-header"
          onClick={() => toggleCategory('chromatiques')}
        >
          <span className="performance-category-title">Accords Chromatiques</span>
          <span className="performance-category-icon">
            {expandedCategories.chromatiques ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategories.chromatiques && (
          <div className="performance-category-content">
            {chromatiqueStats.length > 0 ? (
              chromatiqueStats.map(([degree, stats]) => {
                const label = degree === 'N' ? 'N (Napolitaine)' : 
                             degree === 'Gr' ? 'Gr (Gr+6)' :
                             degree === 'It' ? 'It (It+6)' :
                             degree === 'Fr' ? 'Fr (Fr+6)' : degree
                return renderStatBar(label, stats, `chromatique-${degree}`)
              })
            ) : (
              <p className="performance-empty">Aucune donnée disponible</p>
            )}
          </div>
        )}
      </div>

      {/* Cadences */}
      <div className="performance-category">
        <button
          className="performance-category-header"
          onClick={() => toggleCategory('cadences')}
        >
          <span className="performance-category-title">Cadences</span>
          <span className="performance-category-icon">
            {expandedCategories.cadences ? '▼' : '▶'}
          </span>
        </button>
        {expandedCategories.cadences && (
          <div className="performance-category-content">
            {cadenceStatsArray.length > 0 ? (
              cadenceStatsArray.map(([cadence, stats]) => 
                renderStatBar(cadenceLabels[cadence] || cadence, stats, `cadence-${cadence}`)
              )
            ) : (
              <p className="performance-empty">Aucune donnée disponible</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceDetails
