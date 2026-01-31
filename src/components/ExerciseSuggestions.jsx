import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPublicExercises } from '../services/exerciseService'
import ExerciseCard from './ExerciseCard'
import './ExerciseSuggestions.css'

const SUGGESTIONS_COUNT = 3
const RECENT_EXERCISES_LIMIT = 20

function ExerciseSuggestions({ profileStats, attempts, onSwitchTab, onPillClick, allObjectivesCompleted }) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState([])
  const [isPersonalized, setIsPersonalized] = useState(true)
  const [noPublicExercises, setNoPublicExercises] = useState(false)
  const [isReprise, setIsReprise] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuggestions()
  }, [profileStats, attempts])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const allAttempts = attempts || []
      const result = await generateSuggestions(profileStats || null, allAttempts)
      setSuggestions(result.suggestions)
      setIsPersonalized(result.isPersonalized)
      setNoPublicExercises(result.noPublicExercises)
      setIsReprise(result.isReprise ?? false)
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error)
      setSuggestions([])
      setNoPublicExercises(false)
      setIsReprise(false)
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = async (stats, allAttempts) => {
    const recentExerciseIds = allAttempts
      .slice(0, RECENT_EXERCISES_LIMIT)
      .map(a => a.exerciseId)
      .filter(Boolean)

    const allExercises = await searchPublicExercises()
    if (allExercises.length === 0) {
      return { suggestions: [], isPersonalized: false, noPublicExercises: true }
    }

    const weakPoints = stats ? findWeakestSkills(stats) : []
    const scoreFn = (ex) => calculateExerciseScore(ex, weakPoints, stats || {}, allAttempts)

    const candidates = allExercises.filter(ex => !recentExerciseIds.includes(ex.id))
    const scored = candidates.map(ex => ({ ...ex, score: scoreFn(ex) }))
    const withScore = weakPoints.length > 0
      ? scored.filter(ex => ex.score > 0)
      : scored
    const personalized = [...withScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, SUGGESTIONS_COUNT)

    if (personalized.length > 0) {
      return { suggestions: personalized, isPersonalized: true, noPublicExercises: false }
    }

    const fallback = [...allExercises]
      .filter(ex => !recentExerciseIds.includes(ex.id))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
      .slice(0, SUGGESTIONS_COUNT)

    if (fallback.length > 0) {
      return { suggestions: fallback, isPersonalized: false, noPublicExercises: false }
    }

    // Tous les exercices publics ont déjà été faits récemment : suggérer les plus pertinents à refaire
    const alreadyDone = allExercises.filter(ex => recentExerciseIds.includes(ex.id))
    const alreadyDoneScored = alreadyDone
      .map(ex => ({ ...ex, score: scoreFn(ex) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, SUGGESTIONS_COUNT)
    return { suggestions: alreadyDoneScored, isPersonalized: true, noPublicExercises: false, isReprise: true }
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

  const calculateExerciseScore = (exercise, weakPoints, stats, allAttempts) => {
    let score = 0
    const exerciseTags = exercise.autoTags || []
    const attemptsList = allAttempts || []

    weakPoints.forEach(weakPoint => {
      if (weakPoint.type === 'degree') {
        const degreeInTags = exerciseTags.some(tag =>
          tag.toLowerCase().includes(weakPoint.value.toLowerCase())
        )
        if (degreeInTags) score += (100 - weakPoint.successRate)
      } else if (weakPoint.type === 'cadence') {
        const cadenceInTags = exerciseTags.some(tag =>
          tag.toLowerCase().includes(weakPoint.value.toLowerCase())
        )
        if (cadenceInTags) score += (100 - weakPoint.successRate)
      }
    })

    if (!attemptsList.some(a => a.exerciseId === exercise.id)) {
      score += 20
    }

    const avgScore = (stats && stats.averageScore) || 50
    const difficulty = exercise.metadata?.difficulty || 'intermédiaire'
    const difficultyLevels = { 'débutant': 1, 'intermédiaire': 2, 'avancé': 3, 'expert': 4 }
    const exerciseDifficulty = difficultyLevels[difficulty] || 2
    if (avgScore < 60 && exerciseDifficulty <= 2) score += 15
    else if (avgScore >= 80 && exerciseDifficulty >= 3) score += 15

    return score
  }

  const handleStartExercise = (exerciseId) => {
    navigate(`/play/${exerciseId}`)
  }

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ExerciseSuggestions.jsx:render-state', message: 'Suggestions render state', data: { loading, noPublicExercises, suggestionsLength: suggestions?.length ?? 0, hasProfileStats: !!profileStats, attemptsLength: attempts?.length ?? 0 }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => {})
  }
  // #endregion

  if (loading) {
    return (
      <div className="suggestions-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  if (noPublicExercises) {
    return (
      <div className="exercise-suggestions exercise-suggestions-no-public">
        <h3 className="suggestions-title">Exercices</h3>
        <div className="suggestions-empty suggestions-no-public">
          <div className="suggestions-empty-emoji">📚</div>
          <p className="suggestions-empty-text">Aucun exercice public pour le moment</p>
          <p className="suggestions-empty-hint">Explore le Parcours ou le Mode libre pour t&apos;entraîner.</p>
          <div className="suggestions-cta-row">
            <button
              type="button"
              className="suggestion-button"
              onClick={() => onSwitchTab && onSwitchTab('campaign')}
            >
              Parcours
            </button>
            <button
              type="button"
              className="suggestion-button suggestion-button-secondary"
              onClick={() => onSwitchTab && onSwitchTab('free-mode')}
            >
              Mode libre
            </button>
          </div>
        </div>
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

  const sectionTitle = isReprise ? 'À refaire' : (isPersonalized ? 'Recommandé pour toi' : 'À découvrir')
  const getBadgeLabel = (index) => {
    if (isReprise) return 'Déjà fait – à revoir'
    if (allObjectivesCompleted && index === 0) return 'Recommandé objectif'
    if (isPersonalized) return 'Recommandé'
    return 'À explorer'
  }

  return (
    <div className="exercise-suggestions">
      <h3 className="suggestions-title">{sectionTitle}</h3>
      <div className="suggestions-list">
        {suggestions.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onClick={handleStartExercise}
            onPillClick={onPillClick}
            recommendedLabel={getBadgeLabel(index)}
            recommendedPillPayload={isReprise ? { type: 'doneStatus', value: 'done' } : undefined}
            variant="mini"
          />
        ))}
      </div>
    </div>
  )
}

export default ExerciseSuggestions
