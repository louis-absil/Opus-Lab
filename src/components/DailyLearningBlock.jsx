import React, { useState, useEffect, useMemo } from 'react'
import { getUserProgress } from '../services/progressionService'
import { PARCOURS_NODE_ORDER, getNodeDef } from '../data/parcoursTree'
import { getPersonalizedTip } from '../utils/personalizedTipSelector'
import './DailyLearningBlock.css'

/**
 * Bloc pédagogique affiché entre le header et les cartes parcours :
 * - Prochaine étape (nœud actif du parcours)
 * - Conseil du jour (tip personnalisé selon difficultés/niveau/parcours) ou message Horizons si débloqué
 * - CTA Continuer le parcours
 */
function DailyLearningBlock({ userId, attempts = null, previewProgress = null, onContinueClick, unlockedHorizonsCount = 0, hasSeenHorizonsPanel = false, onConseilHorizonsClick = null }) {
  const [progress, setProgress] = useState(previewProgress)
  const [loading, setLoading] = useState(!previewProgress && !!userId)

  useEffect(() => {
    if (previewProgress) {
      setProgress(previewProgress)
      setLoading(false)
      return
    }
    if (!userId) {
      setProgress(null)
      setLoading(false)
      return
    }
    let cancelled = false
    getUserProgress(userId)
      .then((data) => {
        if (!cancelled) {
          setProgress(data)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Erreur chargement progression (DailyLearningBlock):', err)
          setProgress(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, previewProgress])

  const activeNodeId = (() => {
    if (!progress?.unlockedNodes?.length) return null
    for (let i = PARCOURS_NODE_ORDER.length - 1; i >= 0; i--) {
      if (progress.unlockedNodes.includes(PARCOURS_NODE_ORDER[i])) {
        return PARCOURS_NODE_ORDER[i]
      }
    }
    return null
  })()

  const nodeDef = activeNodeId ? getNodeDef(activeNodeId) : null
  const personalizedTip = useMemo(
    () => getPersonalizedTip(attempts || [], { activeNodeId }),
    [attempts, activeNodeId]
  )

  if (loading) {
    return (
      <div className="daily-learning-block">
        <div className="daily-learning-block-content">
          <div className="daily-learning-loading">
            <div className="daily-learning-spinner" aria-hidden="true" />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="daily-learning-block">
      <div className="daily-learning-block-content">
        <section className="daily-learning-next" aria-labelledby="daily-next-heading">
          <h2 id="daily-next-heading" className="daily-learning-heading">Prochaine étape</h2>
          {nodeDef ? (
            <div className="daily-learning-node">
              <span className="daily-learning-node-label">{nodeDef.shortLabel}</span>
              <span className="daily-learning-node-subtitle">{nodeDef.subtitle}</span>
            </div>
          ) : (
            <p className="daily-learning-node-fallback">Commence le parcours pour débloquer les étapes.</p>
          )}
        </section>
        <section
          className="daily-learning-tip"
          aria-labelledby="daily-tip-heading"
          aria-describedby={personalizedTip.reason ? 'daily-tip-reason' : undefined}
        >
          <h2 id="daily-tip-heading" className="daily-learning-heading daily-learning-tip-heading">Conseil du jour</h2>
          {unlockedHorizonsCount > 0 && !hasSeenHorizonsPanel && onConseilHorizonsClick ? (
            <>
              <p className="daily-learning-tip-text">
                Tu as débloqué <strong>Nouveaux Horizons</strong> ! Pour y accéder, va dans le <strong>Mode Libre</strong> : le bouton Nouveaux Horizons est à côté du filtre.
              </p>
              <button
                type="button"
                className="daily-learning-horizons-cta"
                onClick={onConseilHorizonsClick}
                aria-label="Montrer où se trouve Nouveaux Horizons"
              >
                Montre-moi où c'est
              </button>
            </>
          ) : (
            <>
              <p className="daily-learning-tip-text" id="daily-tip-text">{personalizedTip.text}</p>
              {personalizedTip.reason && (
                <p className="daily-learning-tip-reason" id="daily-tip-reason">
                  {personalizedTip.reason}
                </p>
              )}
            </>
          )}
        </section>
        <div className="daily-learning-cta-wrap">
          <button
            type="button"
            className="daily-learning-cta"
            onClick={onContinueClick}
            aria-label="Continuer le parcours"
          >
            Continuer le parcours
          </button>
        </div>
      </div>
    </div>
  )
}

export default DailyLearningBlock
