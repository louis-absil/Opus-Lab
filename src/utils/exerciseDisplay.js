/**
 * Clé de regroupement des exercices (même vidéo + même œuvre + même mouvement)
 */
function getGroupKey(exercise) {
  const videoId = exercise.video?.id ?? ''
  const workTitle = (exercise.metadata?.workTitle ?? '').trim()
  const movementTitle = (exercise.metadata?.movementTitle ?? '').trim()
  return `${videoId}\0${workTitle}\0${movementTitle}`
}

/**
 * Retourne le rang (1-based) de l'exercice dans son groupe, avec tri stable (createdAt puis id).
 * @param {Object} exercise
 * @param {Array} allExercises - liste contenant exercise (même auteur ou même contexte d'affichage)
 * @returns {{ rank: number, groupSize: number }} rank = 1, 2, 3... ; groupSize = nombre d'exercices dans le groupe
 */
export function getExerciseGroupRank(exercise, allExercises) {
  if (!allExercises || !Array.isArray(allExercises) || allExercises.length === 0) {
    return { rank: 1, groupSize: 1 }
  }
  const key = getGroupKey(exercise)
  const group = allExercises.filter((ex) => getGroupKey(ex) === key)
  if (group.length <= 1) {
    return { rank: 1, groupSize: group.length || 1 }
  }
  const sorted = [...group].sort((a, b) => {
    const tA = a.createdAt?.toDate?.()?.getTime() ?? a.createdAt ?? 0
    const tB = b.createdAt?.toDate?.()?.getTime() ?? b.createdAt ?? 0
    if (tA !== tB) return tA - tB
    return (a.id || '').localeCompare(b.id || '')
  })
  const index = sorted.findIndex((ex) => ex.id === exercise.id)
  const rank = index >= 0 ? index + 1 : 1
  return { rank, groupSize: sorted.length }
}

/**
 * Libellé affiché pour un exercice : "Œuvre – Mouvement (N)" avec (N) si plusieurs exercices dans le groupe.
 * @param {Object} exercise
 * @param {Array} allExercises - liste pour calcul du rang (même contexte que la liste affichée)
 * @returns {string}
 */
export function getExerciseDisplayTitle(exercise, allExercises = []) {
  const workTitle = (exercise.metadata?.workTitle || exercise.metadata?.exerciseTitle || exercise.metadata?.title || '').trim()
  const movementTitle = (exercise.metadata?.movementTitle ?? '').trim()
  const base = workTitle
    ? (movementTitle ? `${workTitle} – ${movementTitle}` : workTitle)
    : (exercise.metadata?.exerciseTitle || exercise.metadata?.title || 'Sans titre')

  const { rank, groupSize } = getExerciseGroupRank(exercise, allExercises)
  if (groupSize > 1) {
    return `${base} (${rank})`
  }
  return base
}
