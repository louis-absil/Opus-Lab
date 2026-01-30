import React, { useState, useEffect } from 'react'
import { getUserObjectives, generateAdaptiveObjectives, createObjective } from '../services/objectiveService'
import './WeeklyObjectives.css'

function WeeklyObjectives({ userId, attempts }) {
  const [objectives, setObjectives] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && attempts) {
      loadObjectives()
    }
  }, [userId, attempts])

  const loadObjectives = async () => {
    try {
      setLoading(true)
      let userObjectives = await getUserObjectives(userId)

      // Si pas d'objectifs, en créer de nouveaux
      if (userObjectives.length === 0 && attempts) {
        const currentWeekAttempts = getCurrentWeekAttempts(attempts)
        const newObjectives = generateAdaptiveObjectives(attempts, currentWeekAttempts)
        
        // Créer les objectifs dans Firestore
        for (const obj of newObjectives) {
          await createObjective(userId, obj)
        }
        
        userObjectives = await getUserObjectives(userId)
      }

      // Mettre à jour la progression
      if (userObjectives.length > 0 && attempts) {
        const currentWeekAttempts = getCurrentWeekAttempts(attempts)
        const updatedObjectives = userObjectives.map(obj => {
          if (obj.category === 'quantity') {
            return { ...obj, current: currentWeekAttempts.length }
          } else if (obj.category === 'quality') {
            const avg = currentWeekAttempts.length > 0
              ? currentWeekAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / currentWeekAttempts.length
              : 0
            return { ...obj, current: Math.round(avg) }
          }
          return obj
        })
        setObjectives(updatedObjectives)
      } else {
        setObjectives(userObjectives)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des objectifs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentWeekAttempts = (allAttempts) => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    return allAttempts.filter(a => {
      if (!a.completedAt) return false
      const date = a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt)
      return date >= weekAgo
    })
  }

  if (loading) {
    return (
      <div className="objectives-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  if (objectives.length === 0) {
    return (
      <div className="objectives-empty">
        <div className="objectives-empty-emoji">🎯</div>
        <p className="objectives-empty-text">Aucun objectif actif pour le moment</p>
      </div>
    )
  }

  return (
    <div className="weekly-objectives">
      <h3 className="objectives-title">Mes Objectifs</h3>
      <div className="objectives-list">
        {objectives.map(objective => {
          const progress = Math.min((objective.current / objective.target) * 100, 100)
          const isCompleted = objective.current >= objective.target
          
          return (
            <div key={objective.id} className={`objective-card ${isCompleted ? 'objective-completed' : ''}`}>
              <div className="objective-header">
                <div className="objective-info">
                  <h4 className="objective-name">{objective.title}</h4>
                  <p className="objective-description">{objective.description}</p>
                </div>
                {isCompleted && (
                  <div className="objective-check">✓</div>
                )}
              </div>
              <div className="objective-progress">
                <div className="objective-progress-bar">
                  <div 
                    className="objective-progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="objective-progress-text">
                  <span className="objective-current">{objective.current}</span>
                  <span className="objective-separator">/</span>
                  <span className="objective-target">{objective.target} {objective.unit}</span>
                  {objective.reward && (
                    <span className="objective-reward">+{objective.reward} XP</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeeklyObjectives
