import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './WeeklyStats.css'

function WeeklyStats({ attempts }) {
  if (!attempts || attempts.length === 0) {
    return null
  }

  const weeklyData = calculateWeeklyStats(attempts)

  if (weeklyData.total === 0) {
    return (
      <div className="weekly-stats-empty">
        <div className="weekly-stats-empty-emoji">📅</div>
        <p className="weekly-stats-empty-text">Aucune activité cette semaine</p>
      </div>
    )
  }

  // Trouver le meilleur jour
  const bestDay = weeklyData.days.reduce((best, day) => 
    day.count > best.count ? day : best
  , weeklyData.days[0])

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const colors = ['#667eea', '#764ba2', '#8b5cf6', '#667eea', '#764ba2', '#8b5cf6', '#667eea']

  return (
    <div className="weekly-stats">
      <h3 className="weekly-stats-title">Cette Semaine</h3>
      
      <div className="weekly-stats-summary">
        <div className="weekly-stat-card">
          <div className="weekly-stat-value">{weeklyData.total}</div>
          <div className="weekly-stat-label">Exercices</div>
        </div>
        <div className="weekly-stat-card">
          <div className="weekly-stat-value">{Math.round(weeklyData.avgScore)}%</div>
          <div className="weekly-stat-label">Score moyen</div>
        </div>
        <div className="weekly-stat-card">
          <div className="weekly-stat-value">{dayNames[bestDay.index]}</div>
          <div className="weekly-stat-label">Meilleur jour</div>
        </div>
      </div>

      <div className="weekly-stats-chart">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData.days} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="weekly-stats-tooltip">
                      <p className="weekly-stats-tooltip-label">{data.name}</p>
                      <p className="weekly-stats-tooltip-value">{data.count} exercice{data.count !== 1 ? 's' : ''}</p>
                      {data.avgScore > 0 && (
                        <p className="weekly-stats-tooltip-score">Score moyen: {Math.round(data.avgScore)}%</p>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {weeklyData.days.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function calculateWeeklyStats(attempts) {
  // Obtenir le début de la semaine (lundi)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Ajuster pour lundi
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)

  // Filtrer les tentatives de cette semaine
  const thisWeekAttempts = attempts.filter(a => {
    if (!a.completedAt) return false
    const date = a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0)
    return date >= weekStart
  })

  // Grouper par jour de la semaine
  const days = [
    { name: 'Lun', index: 0, count: 0, totalScore: 0, attempts: [] },
    { name: 'Mar', index: 1, count: 0, totalScore: 0, attempts: [] },
    { name: 'Mer', index: 2, count: 0, totalScore: 0, attempts: [] },
    { name: 'Jeu', index: 3, count: 0, totalScore: 0, attempts: [] },
    { name: 'Ven', index: 4, count: 0, totalScore: 0, attempts: [] },
    { name: 'Sam', index: 5, count: 0, totalScore: 0, attempts: [] },
    { name: 'Dim', index: 6, count: 0, totalScore: 0, attempts: [] }
  ]

  thisWeekAttempts.forEach(attempt => {
    const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt || 0)
    const dayIndex = (date.getDay() + 6) % 7 // Convertir dimanche (0) en 6, lundi (1) en 0, etc.
    
    if (dayIndex >= 0 && dayIndex < 7) {
      days[dayIndex].count++
      days[dayIndex].totalScore += attempt.score || 0
      days[dayIndex].attempts.push(attempt)
    }
  })

  // Calculer les moyennes
  const daysWithStats = days.map(day => ({
    ...day,
    avgScore: day.count > 0 ? day.totalScore / day.count : 0
  }))

  // Calculer les totaux
  const total = thisWeekAttempts.length
  const avgScore = total > 0
    ? thisWeekAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / total
    : 0

  return {
    days: daysWithStats,
    total,
    avgScore
  }
}

export default WeeklyStats
