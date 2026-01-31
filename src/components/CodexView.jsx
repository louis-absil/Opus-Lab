import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CODEX_CATEGORIES, CODEX_CATEGORY_ORDER } from '../data/codexEntries'
import {
  getCodexEntriesByCategory,
  getCodexEntryById,
  getCodexEntriesForNode,
  getCodexEntriesOrdered
} from '../utils/codexHelpers'
import { STAGE_LABELS, getNodeDef } from '../data/parcoursTree'
import { getCodexImageUrl } from '../data/codexIllustrations'
import { getExamplesForFiche } from '../data/codexMusicalExamples'
import CodexExampleBlock from './CodexExampleBlock'
import './CodexView.css'

/** Rendu simple du contenu (texte avec **gras**) */
function renderContent(text) {
  if (!text || typeof text !== 'string') return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function CodexView({
  selectedEntryId,
  onSelectEntry,
  initialFicheId = null,
  initialNodeId = null,
  onOpenParcoursNode = null,
  onOpenFreeModeWithTag = null
}) {
  const navigate = useNavigate()
  const byCategory = useMemo(() => getCodexEntriesByCategory(), [])
  const orderedEntries = useMemo(() => getCodexEntriesOrdered(), [])
  const selectedEntry = selectedEntryId ? getCodexEntryById(selectedEntryId) : null
  const currentIndex = selectedEntry ? orderedEntries.findIndex((e) => e.id === selectedEntry.id) : -1
  const prevEntry = currentIndex > 0 ? orderedEntries[currentIndex - 1] : null
  const nextEntry = currentIndex >= 0 && currentIndex < orderedEntries.length - 1 ? orderedEntries[currentIndex + 1] : null

  // Ouvrir une fiche au montage si initialFicheId ou initialNodeId fourni
  useEffect(() => {
    if (initialFicheId && getCodexEntryById(initialFicheId)) {
      onSelectEntry?.(initialFicheId)
      return
    }
    if (initialNodeId) {
      const entries = getCodexEntriesForNode(initialNodeId)
      if (entries.length > 0) {
        onSelectEntry?.(entries[0].id)
      }
    }
  }, [initialFicheId, initialNodeId, onSelectEntry])

  const handleBack = () => {
    onSelectEntry?.(null)
  }

  const handleParcoursNode = (nodeId) => {
    if (onOpenParcoursNode) {
      onOpenParcoursNode(nodeId)
    } else {
      navigate('/student-dashboard')
      onSelectEntry?.(null)
    }
  }

  const handlePratiquer = (tag) => {
    if (onOpenFreeModeWithTag) {
      onOpenFreeModeWithTag(tag)
    } else {
      navigate('/student-dashboard')
      onSelectEntry?.(null)
    }
  }

  if (selectedEntry) {
    return (
      <div className="codex-view codex-view--detail">
        <button
          type="button"
          className="codex-back"
          onClick={handleBack}
          aria-label="Retour à la liste"
        >
          ← Liste des fiches
        </button>
        <article className="codex-detail">
          {getCodexImageUrl(selectedEntry.id) && (
            <div className="codex-detail-illustration">
              <img
                src={getCodexImageUrl(selectedEntry.id)}
                alt=""
                loading="lazy"
                width={800}
                height={500}
                className="codex-detail-img"
                decoding="async"
              />
            </div>
          )}
          <h2 className="codex-detail-title">{selectedEntry.title}</h2>
          <p className="codex-detail-desc">{selectedEntry.shortDescription}</p>
          <div className="codex-detail-content">
            {selectedEntry.sections?.length ? (
              <>
                {selectedEntry.content?.trim() && (
                  <p>{renderContent(selectedEntry.content.trim().split('\n')[0])}</p>
                )}
                <nav className="codex-toc" aria-label="Table des matières">
                  <h4 className="codex-toc-title">Sur cette fiche</h4>
                  <ul className="codex-toc-list">
                    {selectedEntry.sections.map((sec) => (
                      <li key={sec.id}>
                        <a href={`#codex-section-${sec.id}`} className="codex-toc-link">
                          {sec.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                {selectedEntry.sections.map((sec) => (
                  <section key={sec.id} id={`codex-section-${sec.id}`} className="codex-detail-section">
                    <h3 className="codex-detail-section-title">{sec.title}</h3>
                    <div className="codex-detail-section-content">
                      {sec.content.split('\n\n').map((para, i) => (
                        <p key={i}>{renderContent(para)}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            ) : (
              selectedEntry.content.split('\n\n').map((para, i) => (
                <p key={i}>{renderContent(para)}</p>
              ))
            )}
          </div>
          {getExamplesForFiche(selectedEntry.id).length > 0 && (
            <div className="codex-detail-examples">
              <h4 className="codex-examples-title">Exemples musicaux</h4>
              {getExamplesForFiche(selectedEntry.id).map((ex) => (
                <CodexExampleBlock key={ex.id} example={ex} />
              ))}
            </div>
          )}
          {(prevEntry || nextEntry) && (
            <div className="codex-detail-nav">
              {prevEntry ? (
                <button type="button" className="codex-nav-btn codex-nav-prev" onClick={() => onSelectEntry?.(prevEntry.id)}>
                  ← {prevEntry.title}
                </button>
              ) : <span />}
              {nextEntry ? (
                <button type="button" className="codex-nav-btn codex-nav-next" onClick={() => onSelectEntry?.(nextEntry.id)}>
                  {nextEntry.title} →
                </button>
              ) : <span />}
            </div>
          )}
          {(selectedEntry.relatedNodeIds?.length > 0 || selectedEntry.relatedTags?.length > 0) && (
            <div className="codex-detail-links">
              {selectedEntry.relatedNodeIds?.length > 0 && (
                <div className="codex-detail-block">
                  <h4>Nœuds du parcours</h4>
                  <ul className="codex-node-list">
                    {selectedEntry.relatedNodeIds.map((nodeId) => {
                      const def = getNodeDef(nodeId)
                      const stageLabel = def?.stage ? STAGE_LABELS[def.stage] : null
                      return (
                        <li key={nodeId}>
                          <button
                            type="button"
                            className="codex-node-btn"
                            onClick={() => handleParcoursNode(nodeId)}
                          >
                            {def?.shortLabel ?? nodeId} — {def?.subtitle ?? nodeId}
                            {stageLabel && (
                              <span className="codex-node-stage"> ({stageLabel})</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {selectedEntry.relatedTags?.length > 0 && (
                <div className="codex-detail-block">
                  <h4>Pratiquer</h4>
                  <p className="codex-detail-hint">
                    Consulter le Mode Libre avec les notions liées à cette fiche.
                  </p>
                  <button
                    type="button"
                    className="codex-pratiquer-btn"
                    onClick={() => handlePratiquer(selectedEntry.relatedTags[0])}
                  >
                    Ouvrir le Mode Libre
                  </button>
                </div>
              )}
            </div>
          )}
        </article>
      </div>
    )
  }

  return (
    <div className="codex-view codex-view--list">
      <div className="codex-header">
        <h2 className="codex-title">Codex</h2>
        <p className="codex-subtitle">
          Fiches de cours et de référence pour l&apos;analyse harmonique.
        </p>
      </div>
      <div className="codex-list">
        {CODEX_CATEGORY_ORDER.filter((cat) => byCategory[cat]?.length).map((cat) => (
          <section key={cat} className="codex-category">
            <h3 className="codex-category-title">{CODEX_CATEGORIES[cat] ?? cat}</h3>
            <ul className="codex-entry-list">
              {byCategory[cat].map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="codex-entry-card"
                    onClick={() => onSelectEntry?.(entry.id)}
                  >
                    <span className="codex-entry-title">{entry.title}</span>
                    <span className="codex-entry-desc">{entry.shortDescription}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default CodexView
