import { useState, useMemo } from 'react'
import { FUNCTION_COLORS } from '../utils/riemannFunctions'
import { getFigureKeyLabel } from '../utils/tagFormatter'
import './PerformanceDetails.css'

/** Ordre d'affichage des figures (renversements) */
const FIGURE_ORDER = ['', '5', '6', '64', '7', '65', '43', '2', '42', '9', '54']

function PerformanceDetails({ degreeStats, cadenceStats }) {
  const [expandedCategories, setExpandedCategories] = useState({
    fonctions: true,
    diatoniques: true,
    chromatiques: false,
    cadences: false
  })
  const [expandedDegrees, setExpandedDegrees] = useState({})
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const toggleDegreeExpand = (degree) => {
    setExpandedDegrees(prev => ({ ...prev, [degree]: !prev[degree] }))
  }

  const canExpandByFigure = (stats) => {
    const byFigure = stats?.byFigure
    if (!byFigure || typeof byFigure !== 'object') return false
    return Object.keys(byFigure).length >= 1
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

  const renderStatBar = (label, stats, key, isSubItem = false) => {
    // Utiliser averageScore si disponible, sinon calculer à partir de correct/total (rétrocompatibilité)
    const percentage = stats.averageScore !== undefined 
      ? stats.averageScore 
      : (stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0)
    
    const correct = stats.correct || 0
    const partial = stats.partial || 0
    const incorrect = stats.incorrect || 0
    
    return (
      <div key={key} className={`performance-stat-item ${isSubItem ? 'performance-stat-item--sub' : ''}`}>
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
          <span className="performance-stat-breakdown">
            {correct} parfaites
            {partial > 0 && <>, {partial} partiellement justes</>}
            {incorrect > 0 && <>, {incorrect} fausses</>}
          </span>
          {stats.averageScore !== undefined && (
            <span className="performance-stat-average"> • Score moyen: {percentage}%</span>
          )}
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

  // Calculer les scores moyens pour chaque fonction harmonique
  const functionStats = useMemo(() => {
    if (!degreeStats) return null

    const functions = {
      T: { degrees: ['I', 'III', 'VI'], name: 'Tonique', color: FUNCTION_COLORS.T },
      SD: { degrees: ['IV', 'II'], name: 'Sous-Dominante', color: FUNCTION_COLORS.SD },
      D: { degrees: ['V', 'VII', 'VII°'], name: 'Dominante', color: FUNCTION_COLORS.D }
    }

    const result = {}
    
    Object.entries(functions).forEach(([key, func]) => {
      let total = 0
      let correct = 0
      let partial = 0
      let incorrect = 0
      let totalScore = 0

      func.degrees.forEach(degree => {
        const stats = degreeStats[degree]
        if (stats) {
          total += stats.total || 0
          correct += stats.correct || 0
          partial += stats.partial || 0
          incorrect += stats.incorrect || 0
          if (stats.averageScore !== undefined) {
            totalScore += (stats.averageScore * (stats.total || 0))
          } else if (stats.total > 0) {
            totalScore += (Math.round((stats.correct / stats.total) * 100) * (stats.total || 0))
          }
        }
      })

      const averageScore = total > 0 ? Math.round(totalScore / total) : 0

      result[key] = {
        name: func.name,
        color: func.color,
        total,
        correct,
        partial,
        incorrect,
        averageScore
      }
    })

    return result
  }, [degreeStats])

  const renderFunctionGauge = (funcKey, funcData) => {
    const percentage = funcData.averageScore
    const color = funcData.color.primary
    
    return (
      <div key={funcKey} className="performance-function-gauge">
        <div className="performance-function-gauge-header">
          <span className="performance-function-name" style={{ color }}>
            {funcData.name}
          </span>
          <span className="performance-function-percentage" style={{ color }}>
            {percentage}%
          </span>
        </div>
        <div className="performance-function-gauge-bar">
          <div 
            className="performance-function-gauge-fill" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
        <div className="performance-function-gauge-detail">
          {funcData.correct} parfaites
          {funcData.partial > 0 && <>, {funcData.partial} partiellement justes</>}
          {funcData.incorrect > 0 && <>, {funcData.incorrect} fausses</>}
          {' • '}
          {funcData.total} tentatives
        </div>
      </div>
    )
  }

  return (
    <div className="performance-details">
      {/* Fonctions Harmoniques */}
      {functionStats && (functionStats.T.total > 0 || functionStats.SD.total > 0 || functionStats.D.total > 0) && (
        <div className="performance-category">
          <button
            className="performance-category-header"
            onClick={() => toggleCategory('fonctions')}
          >
            <span className="performance-category-title">Fonctions Harmoniques</span>
            <span className="performance-category-icon">
              {expandedCategories.fonctions ? '▼' : '▶'}
            </span>
          </button>
          {expandedCategories.fonctions && (
            <div className="performance-category-content performance-functions-grid">
              {renderFunctionGauge('T', functionStats.T)}
              {renderFunctionGauge('SD', functionStats.SD)}
              {renderFunctionGauge('D', functionStats.D)}
            </div>
          )}
        </div>
      )}
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
          <div className="performance-category-content performance-degrees-grid">
            {diatoniqueStats.length > 0 ? (
              diatoniqueStats.map(([degree, stats]) => {
                const expandable = canExpandByFigure(stats)
                const isExpanded = expandedDegrees[degree]
                const byFigureEntries = stats.byFigure && typeof stats.byFigure === 'object'
                  ? FIGURE_ORDER.filter(fig => fig in stats.byFigure).map(fig => [fig, stats.byFigure[fig]])
                  : []
                const handleDegreeKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleDegreeExpand(degree)
                  }
                }
                const cardContent = renderStatBar(degree, stats, `diatonique-${degree}`)
                return (
                  <div key={`diatonique-${degree}`} className="performance-degree-block">
                    {expandable ? (
                      <div
                        className="performance-degree-card performance-degree-card--clickable"
                        onClick={() => toggleDegreeExpand(degree)}
                        onKeyDown={handleDegreeKeyDown}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        title={isExpanded ? 'Replier le détail par renversement' : 'Voir le détail par renversement'}
                      >
                        {cardContent}
                      </div>
                    ) : (
                      <div className="performance-degree-card">{cardContent}</div>
                    )}
                    {expandable && isExpanded && byFigureEntries.length > 0 && (
                      <div className="performance-degree-by-figure">
                        {byFigureEntries.map(([figKey, figStats]) => {
                          const inversionLabel = (figKey === '' || figKey === '5') ? degree : `${degree}${getFigureKeyLabel(figKey)}`
                          return renderStatBar(
                            inversionLabel,
                            figStats,
                            `diatonique-${degree}-${figKey || 'fund'}`,
                            true
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
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
          <div className="performance-category-content performance-degrees-grid">
            {chromatiqueStats.length > 0 ? (
              chromatiqueStats.map(([degree, stats]) => {
                const label = degree === 'N' ? 'N (Napolitaine)' : 
                             degree === 'Gr' ? 'Gr (Gr+6)' :
                             degree === 'It' ? 'It (It+6)' :
                             degree === 'Fr' ? 'Fr (Fr+6)' : degree
                const expandable = canExpandByFigure(stats)
                const isExpanded = expandedDegrees[`chrom-${degree}`]
                const byFigureEntries = stats.byFigure && typeof stats.byFigure === 'object'
                  ? FIGURE_ORDER.filter(fig => fig in stats.byFigure).map(fig => [fig, stats.byFigure[fig]])
                  : []
                const handleChromKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleDegreeExpand(`chrom-${degree}`)
                  }
                }
                const cardContent = renderStatBar(label, stats, `chromatique-${degree}`)
                return (
                  <div key={`chromatique-${degree}`} className="performance-degree-block">
                    {expandable ? (
                      <div
                        className="performance-degree-card performance-degree-card--clickable"
                        onClick={() => toggleDegreeExpand(`chrom-${degree}`)}
                        onKeyDown={handleChromKeyDown}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        title={isExpanded ? 'Replier le détail par renversement' : 'Voir le détail par renversement'}
                      >
                        {cardContent}
                      </div>
                    ) : (
                      <div className="performance-degree-card">{cardContent}</div>
                    )}
                    {expandable && isExpanded && byFigureEntries.length > 0 && (
                      <div className="performance-degree-by-figure">
                        {byFigureEntries.map(([figKey, figStats]) => {
                          const inversionLabel = (figKey === '' || figKey === '5') ? degree : `${degree}${getFigureKeyLabel(figKey)}`
                          return renderStatBar(
                            inversionLabel,
                            figStats,
                            `chromatique-${degree}-${figKey || 'fund'}`,
                            true
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
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
          <div className="performance-category-content performance-degrees-grid">
            {cadenceStatsArray.length > 0 ? (
              cadenceStatsArray.map(([cadence, stats]) => {
                const label = cadenceLabels[cadence] || cadence
                return (
                  <div key={`cadence-${cadence}`} className="performance-cadence-block">
                    {renderStatBar(label, stats, `cadence-${cadence}`)}
                  </div>
                )
              })
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
