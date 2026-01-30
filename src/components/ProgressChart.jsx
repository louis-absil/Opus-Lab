import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import './ProgressChart.css'

function ProgressChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="progress-chart-empty">
        <p>Complète au moins 2 exercices pour voir ta progression</p>
      </div>
    )
  }

  // Fonction de formatage personnalisé pour les tooltips
  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="progress-chart-tooltip">
          <p className="progress-chart-tooltip-title">{data.exerciseTitle || 'Exercice'}</p>
          <p className="progress-chart-tooltip-date">{data.date}</p>
          <p className="progress-chart-tooltip-value">{data.score}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="progress-chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
        >
          <defs>
            {/* Dégradé pour la zone sous la courbe */}
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#667eea" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#764ba2" stopOpacity={0.1} />
            </linearGradient>
            {/* Dégradé pour la ligne */}
            <linearGradient id="progressStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            strokeWidth={1}
            vertical={false}
          />
          <XAxis 
            dataKey="name"
            tick={{ 
              fill: '#64748b', 
              fontSize: 12, 
              fontWeight: 500,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ 
              fill: '#64748b', 
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            content={customTooltip}
            cursor={{ stroke: '#667eea', strokeWidth: 1, strokeDasharray: '5 5' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="url(#progressStrokeGradient)"
            strokeWidth={3}
            fill="url(#progressGradient)"
            dot={{ 
              fill: '#ffffff', 
              strokeWidth: 3, 
              stroke: '#8b5cf6',
              r: 5,
              filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.4))'
            }}
            activeDot={{ 
              r: 7, 
              stroke: '#ffffff',
              strokeWidth: 3,
              fill: '#8b5cf6',
              filter: 'drop-shadow(0 4px 8px rgba(139, 92, 246, 0.6))'
            }}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ProgressChart
