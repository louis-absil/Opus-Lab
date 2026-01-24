import { useState, useMemo, useEffect, useRef } from 'react'
import './ActivityHeatmap.css'

function ActivityHeatmap({ attempts }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [visibleWeeks, setVisibleWeeks] = useState(52)
  const containerRef = useRef(null)

  // Calculer l'activité par jour sur les 365 derniers jours
  const activityData = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return {}
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Trouver la date la plus récente entre today et les tentatives
    let latestAttemptDate = null
    attempts.forEach(attempt => {
      if (!attempt.completedAt) return
      const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
      // Normaliser la date à minuit pour la comparaison
      const normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)
      
      if (!latestAttemptDate || normalizedDate > latestAttemptDate) {
        latestAttemptDate = normalizedDate
      }
    })
    
    // Utiliser la date la plus récente entre today et latestAttemptDate
    const maxDate = latestAttemptDate && latestAttemptDate > today ? latestAttemptDate : today
    maxDate.setHours(0, 0, 0, 0)
    
    const activity = {}
    const oneYearAgo = new Date(maxDate)
    oneYearAgo.setFullYear(maxDate.getFullYear() - 1)

    // Initialiser tous les jours à 0 jusqu'à maxDate (au lieu de today)
    for (let d = new Date(oneYearAgo); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      activity[dateKey] = 0
    }

    // Compter les tentatives par jour
    // Recalculer latestAttemptDate après avoir traité toutes les tentatives
    let finalLatestAttemptDate = latestAttemptDate
    
    attempts.forEach(attempt => {
      if (!attempt.completedAt) return
      
      const date = attempt.completedAt.toDate ? attempt.completedAt.toDate() : new Date(attempt.completedAt)
      const normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)
      const dateKey = normalizedDate.toISOString().split('T')[0]
      
      // Mettre à jour latestAttemptDate si nécessaire
      if (!finalLatestAttemptDate || normalizedDate > finalLatestAttemptDate) {
        finalLatestAttemptDate = normalizedDate
      }
      
      if (activity.hasOwnProperty(dateKey)) {
        activity[dateKey] = (activity[dateKey] || 0) + 1
      } else {
        // Si la date n'est pas dans les clés, l'ajouter dynamiquement
        activity[dateKey] = 1
      }
    })
    
    // Mettre à jour maxDate avec le latestAttemptDate final
    if (finalLatestAttemptDate && finalLatestAttemptDate > maxDate) {
      maxDate.setTime(finalLatestAttemptDate.getTime())
      // Réinitialiser les clés d'activité jusqu'à maxDate si nécessaire
      const maxDateKey = maxDate.toISOString().split('T')[0]
      if (!activity.hasOwnProperty(maxDateKey)) {
        // Ajouter les jours manquants jusqu'à maxDate
        const lastKey = Object.keys(activity).sort().pop()
        if (lastKey) {
          const lastDate = new Date(lastKey)
          for (let d = new Date(lastDate); d < maxDate; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0]
            if (!activity.hasOwnProperty(dateKey)) {
              activity[dateKey] = 0
            }
          }
        }
        activity[maxDateKey] = activity[maxDateKey] || 0
      }
    }

    return activity
  }, [attempts])

  // Trouver le maximum pour normaliser les couleurs
  const maxActivity = useMemo(() => {
    return Math.max(...Object.values(activityData), 1)
  }, [activityData])

  // Générer les carrés pour la grille (52 semaines × 7 jours)
  const squares = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Trouver la date la plus récente dans activityData pour s'assurer d'inclure toutes les tentatives
    const activityKeys = Object.keys(activityData)
    let maxActivityDate = today
    if (activityKeys.length > 0) {
      const sortedKeys = activityKeys.sort()
      const latestKey = sortedKeys[sortedKeys.length - 1]
      const latestDate = new Date(latestKey)
      if (latestDate > today) {
        maxActivityDate = latestDate
        maxActivityDate.setHours(0, 0, 0, 0)
      }
    }
    
    const oneYearAgo = new Date(maxActivityDate)
    oneYearAgo.setFullYear(maxActivityDate.getFullYear() - 1)
    
    // Commencer par le premier lundi de l'année ou le jour le plus ancien
    const startDate = new Date(oneYearAgo)
    const dayOfWeek = startDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startDate.setDate(startDate.getDate() - daysToMonday)

    const squaresArray = []
    const currentDate = new Date(startDate)
    const endDate = new Date(maxActivityDate) // Utiliser maxActivityDate au lieu de today
    
    // Générer les carrés jusqu'à aujourd'hui inclus
    // IMPORTANT: On continue jusqu'à endDate même si on dépasse 52*7
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0]
      const activity = activityData[dateKey] || 0
      const intensity = maxActivity > 0 ? activity / maxActivity : 0
      
      squaresArray.push({
        date: new Date(currentDate),
        dateKey,
        activity,
        intensity
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return squaresArray
  }, [activityData, maxActivity])

  // Grouper par semaines (7 jours)
  const weeks = useMemo(() => {
    const weeksArray = []
    for (let i = 0; i < squares.length; i += 7) {
      weeksArray.push(squares.slice(i, i + 7))
    }
    return weeksArray
  }, [squares])

  // Calculer le nombre de semaines visibles selon la largeur disponible
  useEffect(() => {
    const calculateVisibleWeeks = () => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.offsetWidth
      // Largeur d'une semaine : 12px (carré avec bordure) + 3px (gap) = 15px
      // On soustrait un peu pour la marge de sécurité
      const weekWidth = 15
      const padding = 32 // Padding du conteneur (1rem de chaque côté)
      const availableWidth = containerWidth - padding
      const maxWeeks = Math.floor(availableWidth / weekWidth)
      
      // Afficher au moins 10 semaines, au maximum toutes les semaines disponibles
      const calculatedVisibleWeeks = Math.max(10, Math.min(maxWeeks, weeks.length))
      setVisibleWeeks(calculatedVisibleWeeks)
    }

    // Attendre que le DOM soit rendu
    const timeoutId = setTimeout(calculateVisibleWeeks, 0)
    window.addEventListener('resize', calculateVisibleWeeks)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', calculateVisibleWeeks)
    }
  }, [weeks.length])

  // Prendre uniquement les semaines les plus récentes qui tiennent dans l'espace
  // On prend les dernières semaines pour garantir que la dernière semaine contient toujours aujourd'hui
  const visibleWeeksData = useMemo(() => {
    // S'assurer qu'on prend toujours les dernières semaines (qui incluent aujourd'hui)
    return weeks.slice(-visibleWeeks)
  }, [weeks, visibleWeeks])

  const getColor = (intensity) => {
    if (intensity === 0) return '#ffffff' // Pas d'activité - blanc
    if (intensity < 0.25) return '#e9d5ff' // Violet très clair
    if (intensity < 0.5) return '#c4b5fd' // Violet clair
    if (intensity < 0.75) return '#8b5cf6' // Violet moyen
    return '#6d28d9' // Violet foncé
  }

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  return (
    <div className="activity-heatmap">
      <div className="heatmap-container" ref={containerRef}>
        <div className="heatmap-grid">
          {visibleWeeksData.map((week, weekIndex) => {
            // Calculer l'index réel dans toutes les semaines
            const realWeekIndex = weeks.length - visibleWeeks + weekIndex
            return (
              <div key={realWeekIndex} className="heatmap-week">
                {week.map((square, dayIndex) => {
                  const isToday = square.dateKey === new Date().toISOString().split('T')[0]
                  const isSelected = selectedDay === square.dateKey
                  
                  return (
                    <div
                      key={`${realWeekIndex}-${dayIndex}`}
                      className={`heatmap-square ${isToday ? 'heatmap-today' : ''} ${isSelected ? 'heatmap-selected' : ''}`}
                      style={{ backgroundColor: getColor(square.intensity) }}
                      title={`${formatDate(square.date)}: ${square.activity} tentative${square.activity > 1 ? 's' : ''}`}
                      onClick={() => setSelectedDay(square.dateKey === selectedDay ? null : square.dateKey)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Moins</span>
        <div className="heatmap-legend-squares">
          <div className="heatmap-legend-square" style={{ backgroundColor: '#ffffff' }}></div>
          <div className="heatmap-legend-square" style={{ backgroundColor: '#e9d5ff' }}></div>
          <div className="heatmap-legend-square" style={{ backgroundColor: '#c4b5fd' }}></div>
          <div className="heatmap-legend-square" style={{ backgroundColor: '#8b5cf6' }}></div>
          <div className="heatmap-legend-square" style={{ backgroundColor: '#6d28d9' }}></div>
        </div>
        <span className="heatmap-legend-label">Plus</span>
      </div>
    </div>
  )
}

export default ActivityHeatmap
