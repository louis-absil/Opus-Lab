import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProgress } from '../services/progressionService'
import { getExercisesForNode, getExerciseDominantMode, PARCOURS_LAST_MODE_KEY } from '../services/exerciseService'
import { getNodeShortLabel, getNodeSubtitle, getNodeDescription } from '../utils/nodeCriteria'
import { PARCOURS_NODE_ORDER, getNodeDef, isCadenceNode, isRevisionNode, getNodePhase, PHASE_INTUITION, PHASE_PRECISION, PHASE_MAITRISE, STAGE_LABELS } from '../data/parcoursTree'
import { NODE_ILLUSTRATIONS, getImageUrlAndCrop } from '../data/parcoursIllustrations'
import { useParcoursImages } from '../contexts/ParcoursImagesContext'
import { getCropBackgroundStyle } from '../utils/cropBackgroundStyle'
import './CampaignMap.css'

/**
 * Nœuds visibles = uniquement les nœuds déjà débloqués.
 * Les niveaux non débloqués n'apparaissent pas.
 */
function getVisibleNodeIds(progress) {
  if (!progress || !progress.unlockedNodes?.length) return new Set()
  return new Set(progress.unlockedNodes)
}

function CampaignMap({ userId, isPreviewMode = false, previewProgress = null, onOpenCodex = null }) {
  const navigate = useNavigate()
  const { imageEntries } = useParcoursImages()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingNode, setLoadingNode] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  useEffect(() => {
    if (previewProgress) {
      setProgress(previewProgress)
      setLoading(false)
      return
    }
    if (userId) loadProgress()
    else setLoading(false)
  }, [userId, previewProgress])

  const loadProgress = async () => {
    try {
      setLoading(true)
      const userProgress = await getUserProgress(userId)
      setProgress(userProgress)
    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error)
    } finally {
      setLoading(false)
    }
  }

  const visibleNodeIds = useMemo(() => getVisibleNodeIds(progress), [progress])
  const orderedUnlockedNodes = useMemo(
    () => PARCOURS_NODE_ORDER.filter((id) => visibleNodeIds.has(id)),
    [visibleNodeIds]
  )

  /** Sections par étage : { stage, label, nodeIds } — uniquement les étages qui ont au moins un nœud débloqué. */
  const sectionsByStage = useMemo(() => {
    if (!orderedUnlockedNodes.length) return []
    const sections = []
    let current = null
    for (const nodeId of orderedUnlockedNodes) {
      const def = getNodeDef(nodeId)
      const stage = def?.stage ?? 1
      if (current && current.stage === stage) {
        current.nodeIds.push(nodeId)
      } else {
        current = { stage, label: STAGE_LABELS[stage] ?? `Étage ${stage}`, nodeIds: [nodeId] }
        sections.push(current)
      }
    }
    return sections
  }, [orderedUnlockedNodes])

  const isUnlocked = (nodeId) => progress?.unlockedNodes?.includes(nodeId)
  const isCompleted = (nodeId) => {
    if (!isUnlocked(nodeId)) return false
    const stats = progress?.nodeStats?.[nodeId]
    return stats && (stats.attempts ?? 0) > 0
  }

  const getLastUnlockedNodeId = () => {
    if (!progress?.unlockedNodes?.length) return null
    for (let i = PARCOURS_NODE_ORDER.length - 1; i >= 0; i--) {
      if (progress.unlockedNodes.includes(PARCOURS_NODE_ORDER[i])) return PARCOURS_NODE_ORDER[i]
    }
    return null
  }
  const activeNodeId = getLastUnlockedNodeId()
  const isActive = (nodeId) => activeNodeId === nodeId

  const getNodeState = (nodeId) => {
    if (!isUnlocked(nodeId)) return 'locked'
    if (isActive(nodeId)) return 'active'
    return 'completed'
  }

  const getMasteryLevelLabel = (masteryLevel) => {
    switch (masteryLevel) {
      case 'beginner': return 'Débutant'
      case 'intermediate': return 'Intermédiaire'
      case 'advanced': return 'Avancé'
      default: return 'Débutant'
    }
  }
  const getProgressionModeLabel = (progressionMode) => {
    switch (progressionMode) {
      case 'functions': return 'Fonctions'
      case 'qcm': return 'QCM'
      case 'full': return 'Complet'
      default: return 'Fonctions'
    }
  }

  /** Mode effectif au lancement (aligné sur Player : phase du nœud, pas le mode sauvegardé). */
  const getEffectiveProgressionMode = (nodeId, nodeStats) => {
    const phase = getNodePhase(nodeId, nodeStats)
    if (phase === PHASE_INTUITION) return 'functions'
    if (phase === PHASE_PRECISION) return 'qcm'
    return 'full'
  }

  const handleCardClick = (nodeId) => {
    if (!isUnlocked(nodeId)) return
    setSelectedNodeId(nodeId)
  }

  const handleLaunchExercise = async () => {
    const nodeId = selectedNodeId
    if (!nodeId || !progress?.unlockedNodes?.includes(nodeId)) return
    try {
      setLoadingNode(nodeId)
      const lastMode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(PARCOURS_LAST_MODE_KEY) : null
      const exercise = await getExercisesForNode(nodeId, { lastMode: lastMode || undefined })
      if (exercise?.id) {
        const dominantMode = getExerciseDominantMode(exercise)
        if (typeof sessionStorage !== 'undefined' && dominantMode) {
          sessionStorage.setItem(PARCOURS_LAST_MODE_KEY, dominantMode)
        }
        setSelectedNodeId(null)
        navigate(`/play/${exercise.id}?mode=parcours&node=${nodeId}`)
      } else {
        alert('Aucun exercice disponible pour ce niveau pour l’instant. Réessaie plus tard ou choisis un autre niveau.')
      }
    } catch (error) {
      console.error('Erreur lors du lancement de l\'exercice:', error)
      alert('Impossible de charger un exercice pour ce niveau. Réessaie plus tard.')
    } finally {
      setLoadingNode(null)
    }
  }

  const selectedNodeUnlocked = selectedNodeId && isUnlocked(selectedNodeId)
  const selectedNodeStats = selectedNodeId && progress?.nodeStats?.[selectedNodeId]

  if (loading) {
    return (
      <div className="campaign-map-loading">
        <div className="spinner-small"></div>
      </div>
    )
  }

  return (
    <div className="campaign-map">
      <div className="campaign-map-header">
        <h2 className="campaign-map-title">Parcours</h2>
        <p className="campaign-map-subtitle">
          Tes niveaux débloqués (T → SD → D, puis précision et maîtrise)
        </p>
      </div>

      <div className="campaign-parcours-scroll">
        <div className="campaign-parcours-list">
          {orderedUnlockedNodes.length === 0 ? (
            <div className="campaign-parcours-empty">
              <p>Aucun niveau débloqué pour l’instant. Complète un premier exercice pour ouvrir le parcours.</p>
            </div>
          ) : (
            sectionsByStage.map((section) => (
              <div key={section.stage} className="campaign-stage-section">
                <div className={`campaign-stage-title-wrap campaign-stage-${section.stage}`}>
                  <h3 className="campaign-stage-title">{section.label}</h3>
                </div>
                {section.nodeIds.map((nodeId) => {
                  const state = getNodeState(nodeId)
                  const isLoading = loadingNode === nodeId
                  const cadence = isCadenceNode(nodeId)
                  const revision = isRevisionNode(nodeId)
                  const illustration = NODE_ILLUSTRATIONS[nodeId] || 'default'
                  const rawEntry = imageEntries[nodeId] ?? imageEntries['1.1']
                  const { url: imageUrl, crop } = getImageUrlAndCrop(rawEntry)
                  const bgPosition = nodeId === '4.1' ? '50% 30%' : 'center'
                  let cardStyle
                  if (imageUrl) {
                    const base = {
                      backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.08) 60%), url(${imageUrl})`,
                    }
                    if (crop && crop.w > 0 && crop.h > 0) {
                      const imageAspect = rawEntry?.imageAspectRatio ?? 1.6
                      const { backgroundSize, backgroundPosition } = getCropBackgroundStyle(crop, imageAspect, 3)
                      cardStyle = {
                        ...base,
                        backgroundSize,
                        backgroundPosition,
                      }
                    } else {
                      cardStyle = {
                        ...base,
                        backgroundSize: 'cover',
                        backgroundPosition: bgPosition,
                      }
                    }
                  } else {
                    cardStyle = undefined
                  }
                  return (
                    <button
                      key={nodeId}
                      type="button"
                      className={`campaign-node-card campaign-node-${state} ${isLoading ? 'campaign-node-loading' : ''} ${cadence ? 'campaign-node-cadence' : ''} ${revision ? 'campaign-node-revision' : ''} campaign-card-illustration-${illustration}`}
                      style={cardStyle}
                      onClick={() => handleCardClick(nodeId)}
                    >
                      <span className="campaign-node-card-inner">
                        <span className="campaign-node-label">{getNodeShortLabel(nodeId)}</span>
                        <span className="campaign-node-subtitle">{getNodeSubtitle(nodeId)}</span>
                        {state === 'completed' && (
                          <span className="campaign-node-badge" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedNodeId && (
        <div className="campaign-modal-overlay" onClick={() => setSelectedNodeId(null)}>
          <div className="campaign-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="campaign-modal-close" onClick={() => setSelectedNodeId(null)} aria-label="Fermer">
              ×
            </button>
            <h3 className="campaign-modal-title">{getNodeShortLabel(selectedNodeId)} — {getNodeSubtitle(selectedNodeId)}</h3>
            <p className="campaign-modal-description">{getNodeDescription(selectedNodeId)}</p>
            {selectedNodeUnlocked && selectedNodeStats && (
              <div className="campaign-modal-stats">
                <span>Mode : {getProgressionModeLabel(getEffectiveProgressionMode(selectedNodeId, selectedNodeStats))}</span>
                <span>Score moyen : {Math.round(selectedNodeStats.averageScore ?? 0)}%</span>
                <span>Niveau : {getMasteryLevelLabel(selectedNodeStats.masteryLevel)}</span>
              </div>
            )}
            {!selectedNodeUnlocked && (
              <p className="campaign-modal-locked">Débloque ce nœud en maîtrisant les prérequis (exercices réussis).</p>
            )}
            <div className="campaign-modal-actions">
              {selectedNodeUnlocked && (
                <button type="button" className="campaign-modal-btn campaign-modal-btn-primary" onClick={handleLaunchExercise} disabled={!!loadingNode}>
                  {loadingNode === selectedNodeId ? 'Chargement…' : 'Lancer un exercice'}
                </button>
              )}
              <button
                type="button"
                className="campaign-modal-btn campaign-modal-btn-codex"
                onClick={() => {
                  if (onOpenCodex && selectedNodeId) {
                    onOpenCodex(selectedNodeId)
                    setSelectedNodeId(null)
                  }
                }}
              >
                Voir le cours (Codex)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignMap
