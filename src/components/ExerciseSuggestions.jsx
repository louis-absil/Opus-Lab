import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPublicExercises } from '../services/exerciseService'
import './ExerciseSuggestions.css'

function ExerciseSuggestions({ profileStats, attempts }) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profileStats && attempts) {
      loadSuggestions()
    }
  }, [profileStats, attempts])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const suggestedExercises = await generateSuggestions(profileStats, attempts)
      setSuggestions(suggestedExercises)
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = async (stats, allAttempts) => {
    // Identifier les points faibles
    const weakPoints = findWeakestSkills(stats)
    
    // Récupérer les exercices récemment complétés
    const recentExerciseIds = allAttempts
      .slice(0, 20)
      .map(a => a.exerciseId)
      .filter(Boolean)

    // Récupérer tous les exercices publics
    const allExercises = await searchPublicExercises()
    
    // Filtrer et scorer les exercices
    const scoredExercises = allExercises
      .filter(ex => !recentExerciseIds.includes(ex.id)) // Exclure les exercices récents
      .map(ex => ({
        ...ex,
        score: calculateExerciseScore(ex, weakPoints, stats)
      }))
      .filter(ex => ex.score > 0) // Garder seulement ceux qui ont un score > 0
      .sort((a, b) => b.score - a.score) // Trier par score décroissant
      .slice(0, 5) // Prendre les 5 meilleurs

    return scoredExercises
  }

  const findWeakestSkills = (stats) => {
    const weakPoints = []

    // Analyser les degrés
    if (stats.degreeStats) {
      Object.entries(stats.degreeStats).forEach(([degree, stat]) => {
        if (stat.total >= 3) { // Au moins 3 tentatives
          const successRate = (stat.correct / stat.total) * 100
          if (successRate < 70) { // Moins de 70% de réussite
            weakPoints.push({
              type: 'degree',
              value: degree,
              successRate
            })
          }
        }
      })
    }

    // Analyser les cadences
    if (stats.cadenceStats) {
      Object.entries(stats.cadenceStats).forEach(([cadence, stat]) => {
        if (stat.total >= 3) {
          const successRate = (stat.correct / stat.total) * 100
          if (successRate < 70) {
            weakPoints.push({
              type: 'cadence',
              value: cadence,
              successRate
            })
          }
        }
      })
    }

    // Trier par taux de réussite (les plus faibles en premier)
    return weakPoints.sort((a, b) => a.successRate - b.successRate)
  }

  const calculateExerciseScore = (exercise, weakPoints, stats) => {
    let score = 0
    const exerciseTags = exercise.autoTags || []
    const exerciseTitle = exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || ''

    // Si l'exercice cible un point faible, augmenter le score
    weakPoints.forEach(weakPoint => {
      if (weakPoint.type === 'degree') {
        // Vérifier si l'exercice contient ce degré dans ses tags ou titre
        const degreeInTags = exerciseTags.some(tag => 
          tag.toLowerCase().includes(weakPoint.value.toLowerCase())
        )
        if (degreeInTags) {
          score += (100 - weakPoint.successRate) // Plus le point est faible, plus on ajoute de points
        }
      } else if (weakPoint.type === 'cadence') {
        const cadenceInTags = exerciseTags.some(tag => 
          tag.toLowerCase().includes(weakPoint.value.toLowerCase())
        )
        if (cadenceInTags) {
          score += (100 - weakPoint.successRate)
        }
      }
    })

    // Bonus si l'exercice n'a jamais été complété
    if (!attempts.some(a => a.exerciseId === exercise.id)) {
      score += 20
    }

    // Ajuster selon la difficulté (préférer les exercices de difficulté adaptée)
    const avgScore = stats.averageScore || 50
    const difficulty = exercise.metadata?.difficulty || 'intermédiaire'
    const difficultyLevels = { 'débutant': 1, 'intermédiaire': 2, 'avancé': 3, 'expert': 4 }
    const exerciseDifficulty = difficultyLevels[difficulty] || 2
    
    // Si le score moyen est bas, suggérer des exercices plus faciles
    if (avgScore < 60 && exerciseDifficulty <= 2) {
      score += 15
    } else if (avgScore >= 80 && exerciseDifficulty >= 3) {
      score += 15
    }

    return score
  }

  const handleStartExercise = (exerciseId) => {
    navigate(`/play/${exerciseId}`)
  }

  if (loading) {
    return (
      <div className="suggestions-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="suggestions-empty">
        <div className="suggestions-empty-emoji">💡</div>
        <p className="suggestions-empty-text">Aucune suggestion pour le moment</p>
      </div>
    )
  }

  return (
    <div className="exercise-suggestions">
      <h3 className="suggestions-title">Recommandé pour toi</h3>
      <div className="suggestions-list">
        {suggestions.map(exercise => (
          <div key={exercise.id} className="suggestion-card">
            <div className="suggestion-info">
              <div className="suggestion-badge">Recommandé</div>
              <h4 className="suggestion-name">
                {exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || 'Exercice'}
              </h4>
              {exercise.metadata?.composer && (
                <p className="suggestion-composer">{exercise.metadata.composer}</p>
              )}
              {exercise.metadata?.difficulty && (
                <span className="suggestion-difficulty">
                  {exercise.metadata.difficulty}
                </span>
              )}
            </div>
            <button
              className="suggestion-button"
              onClick={() => handleStartExercise(exercise.id)}
            >
              Commencer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExerciseSuggestions
