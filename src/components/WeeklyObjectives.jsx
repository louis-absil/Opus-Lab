import React, { useState, useEffect } from 'react'
import { getUserObjectives, generateAdaptiveObjectives, createObjective } from '../services/objectiveService'
import './WeeklyObjectives.css'

function WeeklyObjectives({ userId, attempts, onObjectivesComplete }) {
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
      const currentWeekAttempts = getCurrentWeekAttempts(attempts || [])

      // Créer uniquement les objectifs dont le type n'existe pas encore (déduplication)
      if (attempts) {
        const existingTypeIds = new Set(
          userObjectives.map(o => o.objectiveTypeId || o.id)
        )
        const newObjectives = generateAdaptiveObjectives(attempts, currentWeekAttempts)
        const toCreate = newObjectives.filter(obj => !existingTypeIds.has(obj.id))
        for (const obj of toCreate) {
          await createObjective(userId, obj)
          existingTypeIds.add(obj.id)
        }
        if (toCreate.length > 0) {
          userObjectives = await getUserObjectives(userId)
        }
      }

      // Mettre à jour la progression affichée et dédupliquer par type (un seul objectif par objectiveTypeId)
      if (userObjectives.length > 0 && attempts) {
        const updatedObjectives = userObjectives.map(obj => {
          if (obj.category === 'quantity') {
            return { ...obj, current: currentWeekAttempts.length }
          }
          if (obj.category === 'quality') {
            const avg = currentWeekAttempts.length > 0
              ? currentWeekAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / currentWeekAttempts.length
              : 0
            return { ...obj, current: Math.round(avg) }
          }
          if (obj.category === 'variety') {
            const uniqueIds = new Set(
              currentWeekAttempts.map(a => a.exerciseId).filter(Boolean)
            )
            return { ...obj, current: uniqueIds.size }
          }
          return obj
        })
        const deduped = deduplicateObjectivesByType(updatedObjectives)
        setObjectives(deduped)
        const allCompleted = deduped.length > 0 && deduped.every(
          obj => (obj.current || 0) >= (obj.target || 0)
        )
        onObjectivesComplete?.(allCompleted)
      } else {
        const deduped = deduplicateObjectivesByType(userObjectives)
        setObjectives(deduped)
        const allCompleted = deduped.length > 0 && deduped.every(
          obj => (obj.current || 0) >= (obj.target || 0)
        )
        onObjectivesComplete?.(allCompleted)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des objectifs:', error)
    } finally {
      setLoading(false)
    }
  }

  /** Un seul objectif par type (évite les doublons en base ou anciens doublons). */
  const deduplicateObjectivesByType = (list) => {
    const seen = new Set()
    return list.filter(obj => {
      const typeId = obj.objectiveTypeId ?? typeIdFromCategory(obj.category) ?? obj.id
      if (seen.has(typeId)) return false
      seen.add(typeId)
      return true
    })
  }

  const typeIdFromCategory = (category) => {
    if (category === 'quantity') return 'weekly_exercises'
    if (category === 'quality') return 'weekly_score'
    if (category === 'variety') return 'weekly_variety'
    return null
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

  const allCompleted = objectives.length > 0 && objectives.every(
    obj => (obj.current || 0) >= (obj.target || 0)
  )

  return (
    <div className="weekly-objectives">
      <h3 className="objectives-title">Mes Objectifs</h3>
      {allCompleted && (
        <p className="objectives-unlocked-message">
          Objectifs atteints : une suggestion prioritaire t&apos;attend plus bas.
        </p>
      )}
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
