import React, { useState, useEffect } from 'react'
import './MilestoneCelebrations.css'

const MILESTONES = [
  { count: 10, emoji: '🎉', message: '10 exercices complétés !' },
  { count: 25, emoji: '🌟', message: '25 exercices complétés !' },
  { count: 50, emoji: '🏆', message: '50 exercices complétés !' },
  { count: 100, emoji: '💎', message: '100 exercices complétés !' },
  { count: 250, emoji: '👑', message: '250 exercices complétés !' },
  { count: 500, emoji: '🚀', message: '500 exercices complétés !' }
]

function MilestoneCelebrations({ attempts, level, streak }) {
  const [celebratedMilestones, setCelebratedMilestones] = useState(new Set())
  const [currentCelebration, setCurrentCelebration] = useState(null)

  useEffect(() => {
    if (!attempts || attempts.length === 0) return

    // Vérifier les milestones d'exercices
    const totalExercises = attempts.length
    const newMilestone = MILESTONES.find(m => 
      totalExercises >= m.count && !celebratedMilestones.has(`exercise_${m.count}`)
    )

    if (newMilestone) {
      celebrateMilestone(`exercise_${newMilestone.count}`, newMilestone)
    }

    // Vérifier les milestones de niveau (tous les 5 niveaux) — célébration renforcée
    if (level && level % 5 === 0 && !celebratedMilestones.has(`level_${level}`)) {
      celebrateMilestone(`level_${level}`, {
        emoji: '⭐',
        message: `Niveau ${level} atteint !`,
        isLevelMilestone: true
      })
    }

    // Vérifier les milestones de streak
    if (streak >= 7 && !celebratedMilestones.has('streak_7')) {
      celebrateMilestone('streak_7', {
        emoji: '🔥',
        message: '7 jours consécutifs !'
      })
    }
    if (streak >= 30 && !celebratedMilestones.has('streak_30')) {
      celebrateMilestone('streak_30', {
        emoji: '🔥',
        message: '30 jours consécutifs !'
      })
    }

    // Vérifier les records de score
    if (attempts.length > 0) {
      const bestScore = Math.max(...attempts.map(a => a.score || 0))
      if (bestScore === 100 && !celebratedMilestones.has('perfect_score')) {
        celebrateMilestone('perfect_score', {
          emoji: '⭐',
          message: 'Score parfait atteint !'
        })
      }
    }
  }, [attempts, level, streak, celebratedMilestones])

  const celebrateMilestone = (key, milestone) => {
    setCelebratedMilestones(prev => new Set([...prev, key]))
    setCurrentCelebration(milestone)
    
    // Masquer la célébration après 3 secondes
    setTimeout(() => {
      setCurrentCelebration(null)
    }, 3000)
  }

  if (!currentCelebration) {
    return null
  }

  return (
    <div className={`milestone-celebration ${currentCelebration.isLevelMilestone ? 'milestone-celebration--level' : ''}`}>
      <div className="milestone-celebration-content">
        <div className="milestone-emoji-large">{currentCelebration.emoji}</div>
        <div className="milestone-message">{currentCelebration.message}</div>
      </div>
    </div>
  )
}

export default MilestoneCelebrations
