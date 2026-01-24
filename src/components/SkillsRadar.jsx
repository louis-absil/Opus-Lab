import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import './SkillsRadar.css'

function SkillsRadar({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="skills-radar-empty">
        <p>Pas assez de données pour afficher le radar des compétences</p>
      </div>
    )
  }

  // Fonction de formatage personnalisé pour les tooltips
  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="skills-radar-tooltip">
          <p className="skills-radar-tooltip-label">{payload[0].payload.axis}</p>
          <p className="skills-radar-tooltip-value">{payload[0].value}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="skills-radar-container">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart 
          data={data}
          margin={{ top: 60, right: 50, bottom: 40, left: 50 }}
        >
          <defs>
            {/* Dégradé principal pour le remplissage - violet translucide et lumineux */}
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#667eea" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#764ba2" stopOpacity={0.4} />
            </linearGradient>
            {/* Dégradé pour le contour - plus vibrant */}
            <linearGradient id="radarStrokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
            {/* Ombre portée pour la profondeur */}
            <filter id="radarGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <PolarGrid 
            stroke="#e2e8f0" 
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
            className="skills-radar-grid"
          />
          <PolarAngleAxis 
            dataKey="axis" 
            tick={{ 
              fill: '#1e293b', 
              fontSize: 14, 
              fontWeight: 700,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              letterSpacing: '0.5px'
            }}
            tickLine={false}
            axisLine={false}
            className="skills-radar-angle-axis"
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ 
              fill: '#64748b', 
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              dy: -8
            }}
            tickCount={5}
            axisLine={false}
            tickLine={false}
            className="skills-radar-radius-axis"
            tickFormatter={(value) => {
              // Masquer le tick "100" pour éviter le chevauchement avec le label "Tonique" en haut
              if (value === 100) {
                return '';
              }
              return value;
            }}
          />
          <Radar
            name="Compétences"
            dataKey="value"
            stroke="url(#radarStrokeGradient)"
            fill="url(#radarGradient)"
            fillOpacity={1}
            strokeWidth={3.5}
            filter="url(#radarGlow)"
            dot={{ 
              fill: '#ffffff', 
              strokeWidth: 4, 
              stroke: '#8b5cf6',
              r: 6,
              className: 'skills-radar-dot',
              filter: 'drop-shadow(0 2px 6px rgba(139, 92, 246, 0.5))'
            }}
            activeDot={{ 
              r: 9, 
              stroke: '#ffffff',
              strokeWidth: 4,
              fill: '#8b5cf6',
              className: 'skills-radar-active-dot',
              filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.7))'
            }}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Tooltip 
            content={customTooltip}
            cursor={{ stroke: '#667eea', strokeWidth: 1, strokeDasharray: '5 5' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default SkillsRadar
