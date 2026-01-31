import React, { useState, useMemo, useRef, useEffect } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { validateAnswerWithFunctions, DEGREE_TO_FUNCTIONS } from '../utils/riemannFunctions'
import './TrendIndicators.css'

const CHART_POINTS_LIMIT = 30

/** Messages d'encouragement positifs par palier de 20 % pour le meilleur score */
function getBestScoreEncouragement(score) {
  if (score == null || score < 0) return ''
  const s = Math.round(Number(score))
  if (s <= 19) return 'Chaque exercice compte, continue !'
  if (s <= 39) return 'Tu progresses, garde le rythme !'
  if (s <= 59) return 'Bon cap, continue comme ça !'
  if (s <= 79) return 'Très bien, tu tiens la barre !'
  if (s < 100) return 'Excellent !'
  return 'Parfait !'
}

function TrendIndicators({ attempts }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const pedagogicalSectionRef = useRef(null)

  const PEDAGOGICAL_LIMIT = 50

  const { sortedAttempts, trends, proStats, chartData, pedagogicalStats } = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return { sortedAttempts: [], trends: [], proStats: null, chartData: [], pedagogicalStats: null }
    }
    const sorted = [...attempts].sort((a, b) => {
      const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
      const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0)
      return dateB - dateA
    })
    const trendsList = calculateTrends(sorted)
    const stats = calculateProStats(sorted)
    const forChart = [...sorted].reverse().slice(-CHART_POINTS_LIMIT).map((a, i) => {
      const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
      return {
        name: `Ex. ${i + 1}`,
        score: a.score ?? 0,
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        fullDate: date.getTime()
      }
    })
    const pedago = calculatePedagogicalStats(sorted.slice(0, PEDAGOGICAL_LIMIT))
    return { sortedAttempts: sorted, trends: trendsList, proStats: stats, chartData: forChart, pedagogicalStats: pedago }
  }, [attempts])

  if (!attempts || attempts.length === 0) {
    return null
  }

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="trend-chart-tooltip">
          <span className="trend-chart-tooltip-date">{d.date}</span>
          <span className="trend-chart-tooltip-value">{d.score}%</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className="trend-indicators trend-indicators--bourse">
      <h3 className="trend-indicators-title">Tendances</h3>

      {/* KPI type bourse : gros pourcentages d'évolution */}
      <div className="trend-kpi-grid">
        {trends.map((trend, index) => (
          <div key={index} className={`trend-kpi-card trend-kpi-${trend.direction}`}>
            <div className="trend-kpi-label">{trend.label}</div>
            {trend.label === 'Meilleur score' ? (
              <>
                <div className="trend-kpi-value-wrap">
                  <span className="trend-kpi-value trend-kpi-value--best">
                    Meilleur score {trend.currentValue}{trend.unit || ''}
                  </span>
                </div>
                {trend.hasLastWeek && trend.previousValue != null && (
                  <div className="trend-kpi-raw">
                    {trend.direction === 'up' && '+'}
                    {trend.direction === 'down' && '-'}
                    {trend.percentage}% par rapport à la semaine dernière
                  </div>
                )}
                {!trend.hasLastWeek && (
                  <div className="trend-kpi-raw">Cette semaine</div>
                )}
                {trend.bestScoreValue != null && (
                  <p className="trend-kpi-encouragement">{getBestScoreEncouragement(trend.bestScoreValue)}</p>
                )}
                {trend.count != null && trend.count > 0 && (
                  <div className="trend-kpi-count">sur {trend.count} ex.</div>
                )}
              </>
            ) : (
              <>
                <div className="trend-kpi-value-wrap">
                  {trend.direction === 'up' && <TrendingUp className="trend-kpi-icon" size={22} aria-hidden />}
                  {trend.direction === 'down' && <TrendingDown className="trend-kpi-icon" size={22} aria-hidden />}
                  {trend.direction === 'stable' && <Minus className="trend-kpi-icon trend-kpi-icon-stable" size={22} aria-hidden />}
                  <span className="trend-kpi-value">
                    {trend.direction === 'up' && '+'}
                    {trend.direction === 'down' && '-'}
                    {trend.percentage}%
                  </span>
                </div>
                {trend.currentValue != null && trend.previousValue != null && (
                  <div className="trend-kpi-raw">
                    <span className="trend-kpi-current">{trend.currentValue}{trend.unit || ''}</span>
                    <span className="trend-kpi-vs"> vs </span>
                    <span className="trend-kpi-previous">{trend.previousValue}{trend.unit || ''}</span>
                  </div>
                )}
                {trend.count != null && trend.count > 0 && (
                  <div className="trend-kpi-count">sur {trend.count} ex.</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Contenu pédagogique : Fonctions, Cadences, Degrés, Position */}
      {pedagogicalStats && (pedagogicalStats.byFunction.total > 0 || pedagogicalStats.byCadence.total > 0 || pedagogicalStats.byDegree.total > 0 || pedagogicalStats.byFigure.total > 0) && (
        <div className="trend-pedagogical-section" ref={pedagogicalSectionRef}>
          <h4 className="trend-pedagogical-title">Par compétence</h4>
          <div className="trend-kpi-grid trend-pedagogical-grid">
            {/* Fonctions T / SD / D */}
            <div className="trend-pedago-card">
              <div className="trend-pedago-label">Fonctions</div>
              {pedagogicalStats.byFunction.total > 0 ? (
                <div className="trend-pedago-bars">
                  {['T', 'SD', 'D'].map((f) => {
                    const data = pedagogicalStats.byFunction[f]
                    if (!data || data.total === 0) return null
                    const pct = Math.round((data.correct / data.total) * 100)
                    const label = f === 'T' ? 'Tonique' : f === 'SD' ? 'Sous-dom.' : 'Dominante'
                    return (
                      <div key={f} className="trend-pedago-row">
                        <span className="trend-pedago-row-label">{label}</span>
                        <div className="trend-pedago-bar-wrap">
                          <div className="trend-pedago-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="trend-pedago-row-value">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="trend-pedago-empty">Pas encore de données</p>
              )}
            </div>
            {/* Cadences */}
            <div className="trend-pedago-card">
              <div className="trend-pedago-label">Cadences</div>
              {pedagogicalStats.byCadence.total > 0 ? (
                <div className="trend-pedago-summary">
                  {pedagogicalStats.byCadence.best && (
                    <p className="trend-pedago-line trend-pedago-strong">
                      Meilleure : {pedagogicalStats.byCadence.best.name} ({pedagogicalStats.byCadence.best.pct}%)
                    </p>
                  )}
                  {pedagogicalStats.byCadence.weak && pedagogicalStats.byCadence.weak.name !== pedagogicalStats.byCadence.best?.name && (
                    <p className="trend-pedago-line trend-pedago-weak">
                      À travailler : {pedagogicalStats.byCadence.weak.name} ({pedagogicalStats.byCadence.weak.pct}%)
                    </p>
                  )}
                </div>
              ) : (
                <p className="trend-pedago-empty">Pas encore de données</p>
              )}
            </div>
            {/* Degrés */}
            <div className="trend-pedago-card">
              <div className="trend-pedago-label">Degrés</div>
              {pedagogicalStats.byDegree.total > 0 ? (
                <div className="trend-pedago-summary">
                  {pedagogicalStats.byDegree.strong && (
                    <p className="trend-pedago-line trend-pedago-strong">
                      Point fort : {pedagogicalStats.byDegree.strong.degree} ({pedagogicalStats.byDegree.strong.pct}%)
                    </p>
                  )}
                  {pedagogicalStats.byDegree.weak && pedagogicalStats.byDegree.weak.degree !== pedagogicalStats.byDegree.strong?.degree && (
                    <p className="trend-pedago-line trend-pedago-weak">
                      À travailler : {pedagogicalStats.byDegree.weak.degree} ({pedagogicalStats.byDegree.weak.pct}%)
                    </p>
                  )}
                </div>
              ) : (
                <p className="trend-pedago-empty">Pas encore de données</p>
              )}
            </div>
            {/* Position / Renversements */}
            <div className="trend-pedago-card">
              <div className="trend-pedago-label">Position</div>
              {pedagogicalStats.byFigure.total > 0 ? (
                <div className="trend-pedago-bars">
                  {pedagogicalStats.byFigure.fundamental != null && (
                    <div className="trend-pedago-row">
                      <span className="trend-pedago-row-label">Fondamental</span>
                      <div className="trend-pedago-bar-wrap">
                        <div className="trend-pedago-bar" style={{ width: `${pedagogicalStats.byFigure.fundamental.pct}%` }} />
                      </div>
                      <span className="trend-pedago-row-value">{pedagogicalStats.byFigure.fundamental.pct}%</span>
                    </div>
                  )}
                  {pedagogicalStats.byFigure.renversement != null && (
                    <div className="trend-pedago-row">
                      <span className="trend-pedago-row-label">Renversements</span>
                      <div className="trend-pedago-bar-wrap">
                        <div className="trend-pedago-bar" style={{ width: `${pedagogicalStats.byFigure.renversement.pct}%` }} />
                      </div>
                      <span className="trend-pedago-row-value">{pedagogicalStats.byFigure.renversement.pct}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="trend-pedago-empty">Pas encore de données</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Graphique évolution des scores */}
      {chartData.length >= 2 && (
        <div className="trend-chart-section">
          <h4 className="trend-chart-title">Évolution des scores (derniers exercices)</h4>
          <div className="trend-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="trendScoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={customTooltip} />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#trendScoreGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Statistiques détaillées (accordéon) */}
      <div className="trend-details-wrap">
        <button
          type="button"
          className="trend-details-toggle"
          onClick={() => setDetailsOpen(!detailsOpen)}
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? 'Masquer les statistiques détaillées' : 'Voir les statistiques détaillées'}
        </button>
        {detailsOpen && proStats && (
          <div className="trend-details">
            {proStats.rolling7Days != null && (
              <div className="trend-detail-block">
                <h4 className="trend-detail-title">Moyenne sur 7 jours</h4>
                <p className="trend-detail-value">
                  Score moyen : <strong>{proStats.rolling7Days.avgScore}%</strong>
                  {' · '}Exercices : <strong>{proStats.rolling7Days.count}</strong>
                </p>
              </div>
            )}
            {proStats.regularity != null && (
              <div className="trend-detail-block">
                <h4 className="trend-detail-title">Régularité</h4>
                <p className="trend-detail-value">
                  <strong>{proStats.regularity.activeDays}</strong> jour{proStats.regularity.activeDays > 1 ? 's' : ''} avec au moins 1 exercice sur les 7 derniers jours
                </p>
              </div>
            )}
            {proStats.weeksEvolution != null && proStats.weeksEvolution.length > 0 && (
              <div className="trend-detail-block">
                <h4 className="trend-detail-title">Évolution sur 4 semaines</h4>
                <div className="trend-weeks-table">
                  {proStats.weeksEvolution.map((week, i) => (
                    <div key={i} className="trend-week-row">
                      <span className="trend-week-label">{week.label}</span>
                      <span className="trend-week-value">{week.avgScore}%</span>
                      <span className="trend-week-count">{week.count} ex.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function calculateTrends(attempts) {
  const trends = []
  const thisWeek = getThisWeekAttempts(attempts)
  const lastWeek = getLastWeekAttempts(attempts)

  // Tendance 1: Score moyen cette semaine vs semaine dernière
  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const thisWeekAvg = thisWeek.reduce((sum, a) => sum + (a.score || 0), 0) / thisWeek.length
    const lastWeekAvg = lastWeek.reduce((sum, a) => sum + (a.score || 0), 0) / lastWeek.length
    const change = calculateChange(thisWeekAvg, lastWeekAvg)
    trends.push({
      label: 'Score moyen',
      direction: change.direction,
      percentage: change.percentage,
      value: Math.round(thisWeekAvg),
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      currentValue: Math.round(thisWeekAvg),
      previousValue: Math.round(lastWeekAvg),
      unit: '%',
      count: thisWeek.length
    })
  }

  // Tendance 2: Nombre d'exercices cette semaine vs semaine dernière
  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const change = calculateChange(thisWeek.length, lastWeek.length)
    trends.push({
      label: 'Exercices cette semaine',
      direction: change.direction,
      percentage: change.percentage,
      value: thisWeek.length,
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      currentValue: thisWeek.length,
      previousValue: lastWeek.length,
      count: thisWeek.length
    })
  }

  // Tendance 3: Amélioration moyenne (comparaison des 5 derniers vs 5 précédents)
  if (attempts.length >= 10) {
    const recent5 = attempts.slice(0, 5)
    const previous5 = attempts.slice(5, 10)
    const recentAvg = recent5.reduce((sum, a) => sum + (a.score || 0), 0) / recent5.length
    const previousAvg = previous5.reduce((sum, a) => sum + (a.score || 0), 0) / previous5.length
    const change = calculateChange(recentAvg, previousAvg)
    trends.push({
      label: 'Progression récente',
      direction: change.direction,
      percentage: change.percentage,
      value: Math.round(recentAvg),
      currentLabel: '5 derniers',
      previousLabel: '5 précédents',
      currentValue: Math.round(recentAvg),
      previousValue: Math.round(previousAvg),
      unit: '%',
      count: 5
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
      value: Math.round(bestThisWeek),
      bestScoreValue: bestThisWeek,
      currentLabel: 'Cette semaine',
      previousLabel: 'Semaine dernière',
      currentValue: Math.round(bestThisWeek),
      previousValue: Math.round(bestLastWeek),
      unit: '%',
      count: thisWeek.length,
      hasLastWeek: lastWeek.length > 0
    })
  }

  return trends
}

function calculateProStats(attempts) {
  const last7Days = getLastNDaysAttempts(attempts, 7)
  if (last7Days.length === 0) return null

  const rolling7Days = {
    avgScore: last7Days.length > 0
      ? Math.round(last7Days.reduce((sum, a) => sum + (a.score || 0), 0) / last7Days.length)
      : 0,
    count: last7Days.length
  }

  const activeDays = new Set()
  last7Days.forEach(a => {
    const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    activeDays.add(key)
  })
  const regularity = { activeDays: activeDays.size }

  const weeksEvolution = getWeeksEvolution(attempts, 4)

  return { rolling7Days, regularity, weeksEvolution }
}

function getLastNDaysAttempts(attempts, days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return attempts.filter(a => {
    const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= cutoff
  })
}

function getWeeksEvolution(attempts, numWeeks) {
  const result = []
  const now = new Date()
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7 * (w + 1))
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - 7 * w)
    const inWeek = attempts.filter(a => {
      const date = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
      return date >= weekStart && date < weekEnd
    })
    const avgScore = inWeek.length > 0
      ? Math.round(inWeek.reduce((sum, a) => sum + (a.score || 0), 0) / inWeek.length)
      : 0
    result.push({
      label: w === 0 ? 'Semaine dernière' : `J-${7 * (w + 1)}`,
      avgScore,
      count: inWeek.length
    })
  }
  return result.reverse()
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

/** Agrège les stats pédagogiques (fonctions, cadences, degrés, position) sur les N derniers exercices */
function calculatePedagogicalStats(attempts) {
  const byFunction = { T: { correct: 0, total: 0 }, SD: { correct: 0, total: 0 }, D: { correct: 0, total: 0 }, total: 0 }
  const byCadence = {}
  const byDegree = {}
  const byFigure = { fundamental: { correct: 0, total: 0 }, renversement: { correct: 0, total: 0 }, total: 0 }

  attempts.forEach((attempt) => {
    const correctAnswers = attempt.correctAnswers || []
    const userAnswers = attempt.userAnswers || []
    correctAnswers.forEach((correct, index) => {
      const userAnswer = userAnswers[index]
      const selectedFunction = userAnswer?.selectedFunction || userAnswer?.function || null
      const hasDegree = !!(userAnswer?.degree || userAnswer?.root || userAnswer?.displayLabel)
      // Réponses QCM / fonction seule : pas de degré sauvegardé → considérer "bonne fonction" comme correcte (level 1)
      const functionOnlyAvailable = !hasDegree && !!selectedFunction
      const validation = validateAnswerWithFunctions(
        userAnswer,
        correct,
        selectedFunction,
        { functionOnlyAvailable }
      )
      const isCorrect = validation.level === 1
      const score = validation.score ?? 0

      const degree = (correct.degree || '').toUpperCase().replace('°', '')
      if (degree && DEGREE_TO_FUNCTIONS[degree]) {
        const func = DEGREE_TO_FUNCTIONS[degree][0]
        if (byFunction[func]) {
          byFunction[func].total++
          if (isCorrect) byFunction[func].correct++
        }
        byFunction.total++
      }

      const cadence = (correct.cadence || '').trim() || 'sans'
      if (!byCadence[cadence]) byCadence[cadence] = { correct: 0, total: 0 }
      byCadence[cadence].total++
      if (isCorrect) byCadence[cadence].correct++

      if (degree) {
        if (!byDegree[degree]) byDegree[degree] = { correct: 0, total: 0 }
        byDegree[degree].total++
        if (isCorrect) byDegree[degree].correct++
      }

      const fig = (correct.figure || '5').toString().trim()
      const isFundamental = fig === '5' || fig === ''
      if (isFundamental) {
        byFigure.fundamental.total++
        if (isCorrect) byFigure.fundamental.correct++
      } else {
        byFigure.renversement.total++
        if (isCorrect) byFigure.renversement.correct++
      }
      byFigure.total++
    })
  })

  const cadenceLabels = {
    perfect: 'Parfaite', parfaite: 'Parfaite', half: 'Demi', demi: 'Demi', 'demi-cadence': 'Demi',
    plagal: 'Plagale', plagale: 'Plagale', sans: 'Sans cadence', '': 'Sans cadence'
  }
  const cadenceEntries = Object.entries(byCadence)
    .filter(([k, v]) => v.total > 0 && k !== 'sans' && k !== '')
    .map(([name, v]) => ({ name: cadenceLabels[name] || name, pct: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => b.pct - a.pct)
  const degreeEntries = Object.entries(byDegree)
    .filter(([, v]) => v.total > 0)
    .map(([degree, v]) => ({ degree, pct: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => b.pct - a.pct)

  return {
    byFunction: {
      ...byFunction,
      T: byFunction.T.total > 0 ? { ...byFunction.T, pct: Math.round((byFunction.T.correct / byFunction.T.total) * 100) } : null,
      SD: byFunction.SD.total > 0 ? { ...byFunction.SD, pct: Math.round((byFunction.SD.correct / byFunction.SD.total) * 100) } : null,
      D: byFunction.D.total > 0 ? { ...byFunction.D, pct: Math.round((byFunction.D.correct / byFunction.D.total) * 100) } : null
    },
    byCadence: {
      total: Object.values(byCadence).reduce((s, v) => s + v.total, 0),
      best: cadenceEntries[0] ? { name: cadenceEntries[0].name, pct: cadenceEntries[0].pct } : null,
      weak: cadenceEntries.length > 1 ? { name: cadenceEntries[cadenceEntries.length - 1].name, pct: cadenceEntries[cadenceEntries.length - 1].pct } : null
    },
    byDegree: {
      total: Object.values(byDegree).reduce((s, v) => s + v.total, 0),
      strong: degreeEntries[0] ? { degree: degreeEntries[0].degree, pct: degreeEntries[0].pct } : null,
      weak: degreeEntries.length > 1 ? { degree: degreeEntries[degreeEntries.length - 1].degree, pct: degreeEntries[degreeEntries.length - 1].pct } : degreeEntries[0] ? { degree: degreeEntries[0].degree, pct: degreeEntries[0].pct } : null
    },
    byFigure: {
      total: byFigure.total,
      fundamental: byFigure.fundamental.total > 0 ? { pct: Math.round((byFigure.fundamental.correct / byFigure.fundamental.total) * 100) } : null,
      renversement: byFigure.renversement.total > 0 ? { pct: Math.round((byFigure.renversement.correct / byFigure.renversement.total) * 100) } : null
    }
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
