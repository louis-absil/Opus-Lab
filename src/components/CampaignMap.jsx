import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProgress } from '../services/progressionService'
import { getExercisesForNode } from '../services/exerciseService'
import { getNodeShortLabel, getNodeSubtitle, getNodeDescription } from '../utils/nodeCriteria'
import { PARCOURS_NODE_ORDER, getNodeDef, isCadenceNode, isRevisionNode, getNodePhase, PHASE_INTUITION, PHASE_PRECISION, PHASE_MAITRISE, STAGE_LABELS } from '../data/parcoursTree'
import { PARCOURS_IMAGE_URLS } from '../data/parcoursIllustrations'
import './CampaignMap.css'

/**
 * Nœuds visibles = uniquement les nœuds déjà débloqués.
 * Les niveaux non débloqués n'apparaissent pas.
 */
function getVisibleNodeIds(progress) {
  if (!progress || !progress.unlockedNodes?.length) return new Set()
  return new Set(progress.unlockedNodes)
}

/**
 * Illustration / ambiance par nœud (fondation, roc, maison, chemin, sommet…).
 * Chaque clé correspond à une classe CSS .campaign-card-illustration-{theme}
 * et à un dégradé par défaut. Vous pouvez ajouter des images dans public/images/parcours/
 */
export const NODE_ILLUSTRATIONS = {
  '1.1': 'foundation',           // T·D — première pierre / roc
  'cadence-demi': 'path',        // ½ Cad. — passage
  'cadence-parfaite': 'home',    // Cad. V→I — arrivée / maison
  'cadence-demi-et-parfaite': 'path',  // ½ Cad. / Cad. V→I — réuni
  '1.2': 'trinity',              // T-SD-D — triangle / trois (clé CSS conservée)
  'cadence-plagale': 'calm',     // Cad. IV→I
  '2.1': 'landmark',             // I vs I6 — état des lieux
  '2.2': 'steps',                // Cad. 6/4 — quarte et sixte
  'cadence-parfaite-composee': 'road',  // Cad. 6/4→V→I
  '2.3': 'nuance',               // V vs V7
  '3.1': 'color',                // IV vs ii — nuances SD
  '3.2': 'virtuosity',           // D virtuose
  '3.3': 'detour',               // vi — fausse tonique
  'cadence-rompue': 'suspense',  // V→vi
  '4.1': 'napoli',               // N6 — sixte napolitaine
  '4.2': 'dominant',             // V/V
  '4.3': 'secondary',            // V/V renv.
  '4.4': 'summit',                // Domin. sec. — sommet
  'revision-etage-1': 'path',     // Révision étage 1
  'revision-etage-2': 'road',     // Révision étage 2
  'revision-etage-3': 'path',    // Révision étage 3
  'revision-etage-4': 'summit',   // Révision parcours complet
}

function CampaignMap({ userId, isPreviewMode = false, previewProgress = null, onOpenCodex = null }) {
  const navigate = useNavigate()
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
      const exercise = await getExercisesForNode(nodeId)
      if (exercise?.id) {
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
                  const imageUrl = PARCOURS_IMAGE_URLS[nodeId] ?? PARCOURS_IMAGE_URLS['1.1']
                  const bgPosition = nodeId === '4.1' ? '50% 30%' : 'center'
                  const cardStyle = imageUrl
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.08) 60%), url(${imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: bgPosition,
                      }
                    : undefined
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
