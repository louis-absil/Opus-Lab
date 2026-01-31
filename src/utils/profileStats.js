import { validateAnswerWithFunctions } from './riemannFunctions'

/**
 * Calcule la série (streak) de jours consécutifs avec activité
 */
export function calculateStreak(attempts) {
  if (!attempts || attempts.length === 0) return 0
  const daysWithActivity = new Set()
  attempts.forEach((attempt) => {
    if (!attempt.completedAt) return
    const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    daysWithActivity.add(dateKey)
  })
  if (daysWithActivity.size === 0) return 0
  const sortedDates = Array.from(daysWithActivity).sort().reverse()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  let streak = 0
  let currentDate = new Date(today)
  if (sortedDates.includes(todayKey)) {
    streak = 1
    currentDate.setDate(currentDate.getDate() - 1)
  } else {
    currentDate.setDate(currentDate.getDate() - 1)
  }
  while (true) {
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, '0')
    const d = String(currentDate.getDate()).padStart(2, '0')
    const dateKey = `${y}-${m}-${d}`
    if (sortedDates.includes(dateKey)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

/**
 * Calcule les stats de profil (degrés, cadences, moyennes) à partir des tentatives
 */
export function computeProfileStatsFromAttempts(attempts) {
  const totalAttempts = attempts.length
  const totalQuestions = attempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0)
  const totalCorrect = attempts.reduce((sum, a) => sum + (a.correctCount || 0), 0)
  const averageScore = totalAttempts > 0
    ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
    : 0
  const degreeStats = {}
  const cadenceStats = {}

  attempts.forEach((attempt) => {
    if (!attempt.correctAnswers || !Array.isArray(attempt.correctAnswers)) return
    attempt.correctAnswers.forEach((correct, index) => {
      if (!correct) return
      const userAnswer = attempt.userAnswers?.[index]
      let validation = null
      if (userAnswer && correct) {
        validation = validateAnswerWithFunctions(
          userAnswer,
          correct,
          userAnswer.selectedFunction || userAnswer.function || null
        )
      }
      if (!validation) validation = { level: 0, score: 0, cadenceBonus: 0 }
      const isCorrect = validation.level === 1
      const isPartial = validation.level === 2 || validation.level === 3
      const isIncorrect = validation.level === 0
      const score = validation.score || 0

      const degree = correct.degree || ''
      if (degree) {
        if (!degreeStats[degree]) {
          degreeStats[degree] = { total: 0, correct: 0, partial: 0, incorrect: 0, totalScore: 0, averageScore: 0, byFigure: {} }
        }
        degreeStats[degree].total++
        if (isCorrect) degreeStats[degree].correct++
        else if (isPartial) degreeStats[degree].partial++
        else if (isIncorrect) degreeStats[degree].incorrect++
        degreeStats[degree].totalScore += score
        degreeStats[degree].averageScore = Math.round(degreeStats[degree].totalScore / degreeStats[degree].total)
        const figureKey = (correct.figure && correct.figure !== '5') ? correct.figure : ''
        const byFigure = degreeStats[degree].byFigure
        if (!byFigure[figureKey]) {
          byFigure[figureKey] = { total: 0, correct: 0, partial: 0, incorrect: 0, totalScore: 0, averageScore: 0 }
        }
        byFigure[figureKey].total++
        if (isCorrect) byFigure[figureKey].correct++
        else if (isPartial) byFigure[figureKey].partial++
        else if (isIncorrect) byFigure[figureKey].incorrect++
        byFigure[figureKey].totalScore += score
        byFigure[figureKey].averageScore = Math.round(byFigure[figureKey].totalScore / byFigure[figureKey].total)
      }

      const cadence = correct.cadence || ''
      if (cadence) {
        if (!cadenceStats[cadence]) {
          cadenceStats[cadence] = { total: 0, correct: 0, partial: 0, incorrect: 0, totalScore: 0, averageScore: 0 }
        }
        cadenceStats[cadence].total++
        if (isCorrect) cadenceStats[cadence].correct++
        else if (isPartial) cadenceStats[cadence].partial++
        else if (isIncorrect) cadenceStats[cadence].incorrect++
        cadenceStats[cadence].totalScore += score
        cadenceStats[cadence].averageScore = Math.round(cadenceStats[cadence].totalScore / cadenceStats[cadence].total)
      }
    })
  })

  return {
    totalAttempts,
    totalQuestions,
    totalCorrect,
    averageScore,
    degreeStats,
    cadenceStats,
    streak: calculateStreak(attempts)
  }
}
