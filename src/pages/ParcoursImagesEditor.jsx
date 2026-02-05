import React, { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useParcoursImages } from '../contexts/ParcoursImagesContext'
import { canAccessParcoursImagesEditor } from '../config/adminAllowlist'
import { PARCOURS_NODE_ORDER } from '../data/parcoursTree'
import { getNodeShortLabel } from '../utils/nodeCriteria'
import { wikimediaThumb } from '../data/parcoursIllustrations'
import { getCropBackgroundStyle } from '../utils/cropBackgroundStyle'
import './ParcoursImagesEditor.css'

const THUMB_WIDTH = 800
const CROP_ASPECT = 8 / 5

function isCommonsUrl(url) {
  if (!url || typeof url !== 'string') return false
  return url.includes('upload.wikimedia.org') || url.includes('commons.wikimedia.org')
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function ParcoursImagesEditor() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { imageEntries, saveEntry } = useParcoursImages()
  const allowed = canAccessParcoursImagesEditor(user?.email)

  const [selectedNodeId, setSelectedNodeId] = useState(PARCOURS_NODE_ORDER[0] ?? '')
  const [imageUrlRaw, setImageUrlRaw] = useState('')
  const [imageAspectRatio, setImageAspectRatio] = useState(1.6)
  const [crop, setCrop] = useState(() => ({ x: 0.1, y: 0.25, w: 0.8, h: 0.5 }))
  const [saveMessage, setSaveMessage] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startCropX: 0, startCropY: 0 })
  const resizeRef = useRef({ active: false, corner: null, startX: 0, startY: 0, startCrop: null })
  const previewRef = useRef(null)

  const imageUrlFinal = useMemo(() => {
    if (!imageUrlRaw.trim()) return ''
    if (isCommonsUrl(imageUrlRaw)) return wikimediaThumb(imageUrlRaw.trim(), THUMB_WIDTH)
    return imageUrlRaw.trim()
  }, [imageUrlRaw])

  const nodeOptions = useMemo(
    () => PARCOURS_NODE_ORDER.map((id) => ({ id, label: getNodeShortLabel(id) })),
    []
  )

  const pxToNorm = useCallback((clientX, clientY) => {
    const el = previewRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    return { x: clamp01(x), y: clamp01(y) }
  }, [])

  const getEventClient = (e) => {
    if (e.touches && e.touches.length) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
    return { clientX: e.clientX, clientY: e.clientY }
  }

  const handleCropMouseDown = useCallback((e) => {
    if (e.target.closest('.parcours-images-editor-crop-handle')) return
    e.preventDefault()
    const { clientX, clientY } = getEventClient(e)
    const { x, y } = pxToNorm(clientX, clientY)
    dragRef.current = { active: true, startX: x, startY: y, startCropX: crop.x, startCropY: crop.y }
    setIsDragging(true)
  }, [crop.x, crop.y, pxToNorm])

  const handleCropMouseMove = useCallback((e) => {
    if (!dragRef.current.active) return
    const { clientX, clientY } = getEventClient(e)
    const { x, y } = pxToNorm(clientX, clientY)
    const dx = x - dragRef.current.startX
    const dy = y - dragRef.current.startY
    setCrop((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(1 - prev.w, dragRef.current.startCropX + dx)),
      y: Math.max(0, Math.min(1 - prev.h, dragRef.current.startCropY + dy)),
    }))
  }, [pxToNorm])

  const handleCropMouseUp = useCallback(() => {
    dragRef.current.active = false
    setIsDragging(false)
    resizeRef.current.active = false
    resizeRef.current.corner = null
    setIsResizing(false)
  }, [])

  const computeResizedCrop = useCallback((corner, startCrop, dx, dy) => {
    const minDim = 0.08
    const { x: sx, y: sy, w: sw, h: sh } = startCrop
    let x, y, w, h
    if (corner === 'se') {
      const R = sx + sw + dx
      const B = sy + sh + dy
      w = Math.min(R, (B - sy) * CROP_ASPECT)
      w = Math.max(minDim, Math.min(1 - sx, w))
      h = w / CROP_ASPECT
      if (sy + h > 1) {
        h = 1 - sy
        w = h * CROP_ASPECT
      }
      x = sx
      y = sy
    } else if (corner === 'sw') {
      const L = sx + dx
      const B = sy + sh + dy
      w = Math.min(sx + sw - L, (B - sy) * CROP_ASPECT)
      w = Math.max(minDim, Math.min(sx + sw, w))
      h = w / CROP_ASPECT
      if (sy + h > 1) {
        h = 1 - sy
        w = h * CROP_ASPECT
      }
      x = sx + sw - w
      y = sy
    } else if (corner === 'ne') {
      const R = sx + sw + dx
      const T = sy + dy
      w = Math.min(R - sx, (sy + sh - T) * CROP_ASPECT)
      w = Math.max(minDim, w)
      h = w / CROP_ASPECT
      if (sy + sh - h < 0) {
        h = Math.max(minDim, sy + sh)
        w = h * CROP_ASPECT
      }
      x = sx
      y = sy + sh - h
    } else {
      const L = sx + dx
      const T = sy + dy
      w = Math.min(sx + sw - L, (sy + sh - T) * CROP_ASPECT)
      w = Math.max(minDim, w)
      h = w / CROP_ASPECT
      if (sy + sh - h < 0) {
        h = Math.max(minDim, sy + sh)
        w = h * CROP_ASPECT
      }
      x = sx + sw - w
      y = sy + sh - h
    }
    return {
      x: clamp01(x),
      y: clamp01(y),
      w: clamp01(w),
      h: clamp01(h),
    }
  }, [])

  const handleResizeStart = useCallback((corner, e) => {
    e.preventDefault()
    e.stopPropagation()
    const { clientX, clientY } = getEventClient(e)
    const { x, y } = pxToNorm(clientX, clientY)
    resizeRef.current = { active: true, corner, startX: x, startY: y, startCrop: { ...crop } }
    setIsResizing(true)
  }, [crop, pxToNorm])

  const handleResizeMove = useCallback((e) => {
    if (!resizeRef.current.active || !resizeRef.current.corner) return
    const { clientX, clientY } = getEventClient(e)
    const { x, y } = pxToNorm(clientX, clientY)
    const dx = x - resizeRef.current.startX
    const dy = y - resizeRef.current.startY
    const next = computeResizedCrop(resizeRef.current.corner, resizeRef.current.startCrop, dx, dy)
    setCrop(next)
  }, [pxToNorm, computeResizedCrop])

  React.useEffect(() => {
    const active = isDragging || isResizing
    if (!active) return
    const onMove = (e) => {
      if (e.touches) e.preventDefault()
      if (dragRef.current.active) handleCropMouseMove(e)
      else if (resizeRef.current.active) handleResizeMove(e)
    }
    const onUp = () => {
      handleCropMouseUp()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [isDragging, isResizing, handleCropMouseMove, handleResizeMove, handleCropMouseUp])

  React.useEffect(() => {
    if (imageUrlFinal) setCrop({ x: 0.1, y: 0.25, w: 0.8, h: 0.5 })
  }, [imageUrlFinal])

  const handleImageLoad = useCallback((e) => {
    const img = e.target
    if (img.naturalWidth && img.naturalHeight) {
      setImageAspectRatio(img.naturalWidth / img.naturalHeight)
    }
  }, [])

  const isFullCrop = crop.x === 0 && crop.y === 0 && crop.w === 1 && crop.h === 1

  const getCurrentEntry = useCallback(() => {
    if (!imageUrlFinal) return null
    if (isFullCrop) return imageUrlFinal
    return { url: imageUrlFinal, crop: { x: crop.x, y: crop.y, w: crop.w, h: crop.h } }
  }, [imageUrlFinal, isFullCrop, crop.x, crop.y, crop.w, crop.h])

  const handleCopyEntry = useCallback(() => {
    const entry = getCurrentEntry()
    if (entry == null) return
    const text = typeof entry === 'string'
      ? `  '${selectedNodeId}': ${JSON.stringify(entry)},`
      : `  '${selectedNodeId}': ${JSON.stringify(entry)},`
    navigator.clipboard.writeText(text).catch(() => {})
  }, [selectedNodeId, getCurrentEntry])

  const handleSave = useCallback(async () => {
    const entry = getCurrentEntry()
    if (entry == null) return
    setIsSaving(true)
    setSaveMessage(null)
    try {
      await saveEntry(selectedNodeId, entry)
      setSaveMessage('Sauvegardé !')
      setTimeout(() => setSaveMessage(null), 2500)
    } catch (err) {
      console.error('Erreur sauvegarde parcours images:', err)
      setSaveMessage('Erreur lors de la sauvegarde.')
      setTimeout(() => setSaveMessage(null), 3500)
    } finally {
      setIsSaving(false)
    }
  }, [selectedNodeId, getCurrentEntry, saveEntry])

  const handleDownloadJson = useCallback(() => {
    const base = { ...imageEntries }
    const entry = getCurrentEntry()
    if (entry != null) base[selectedNodeId] = entry
    const json = JSON.stringify(base, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'parcoursImages.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [selectedNodeId, getCurrentEntry, imageEntries])

  if (!allowed) {
    return (
      <div className="parcours-images-editor-page">
        <div className="parcours-images-editor-access-denied">
          <h1>Accès réservé</h1>
          <p>Vous n’avez pas accès à cet outil.</p>
          <button type="button" className="parcours-images-editor-back" onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="parcours-images-editor-page">
      <header className="parcours-images-editor-header">
        <button type="button" className="parcours-images-editor-back" onClick={() => navigate('/dashboard')}>
          Retour
        </button>
        <h1>Outil images parcours</h1>
      </header>
      <main className="parcours-images-editor-main">
        <p className="parcours-images-editor-intro">Sélectionnez un nœud, collez l’URL de l’image, recadrez si besoin, puis sauvegardez ou exportez.</p>

        <section className="parcours-images-editor-card">
          <h2 className="parcours-images-editor-card-title">Nœud du parcours</h2>
          <p className="parcours-images-editor-nodes-hint">Cliquez sur un nœud pour le sélectionner.</p>
          <div className="parcours-images-editor-nodes-list" role="listbox" aria-label="Nœuds du parcours">
            {nodeOptions.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={selectedNodeId === id}
                className={`parcours-images-editor-node-item ${selectedNodeId === id ? 'parcours-images-editor-node-item-selected' : ''}`}
                onClick={() => setSelectedNodeId(id)}
              >
                <span className="parcours-images-editor-node-label">{label}</span>
                <span className="parcours-images-editor-node-id">{id}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="parcours-images-editor-card">
          <h2 className="parcours-images-editor-card-title">URL de l’image</h2>
          <div className="parcours-images-editor-field">
            <label htmlFor="parcours-images-url">Lien (Commons, Pexels, Unsplash…)</label>
            <input
              id="parcours-images-url"
              type="url"
              value={imageUrlRaw}
              onChange={(e) => setImageUrlRaw(e.target.value)}
              placeholder="https://upload.wikimedia.org/... ou Pexels, Unsplash..."
              className="parcours-images-editor-input"
            />
            {imageUrlFinal && (
              <p className="parcours-images-editor-url-final">
                URL utilisée (thumb si Commons) : <code>{imageUrlFinal}</code>
              </p>
            )}
          </div>
        </section>

        {imageUrlFinal && (
          <>
            <section className="parcours-images-editor-card parcours-images-editor-preview-card">
              <h2 className="parcours-images-editor-card-title">Aperçu et recadrage</h2>
              <p className="parcours-images-editor-crop-hint">Glissez la zone pour la déplacer ; tirez les coins pour zoomer (ratio 8:5 fixe).</p>
              <div
                ref={previewRef}
                className="parcours-images-editor-preview-wrap"
              >
                <img
                  src={imageUrlFinal}
                  alt="Aperçu"
                  className="parcours-images-editor-preview-img"
                  onLoad={handleImageLoad}
                />
                <div
                  role="presentation"
                  className="parcours-images-editor-crop-box"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                  }}
                  onMouseDown={handleCropMouseDown}
                  onTouchStart={handleCropMouseDown}
                >
                  {['nw', 'ne', 'sw', 'se'].map((corner) => (
                    <div
                      key={corner}
                      role="presentation"
                      className={`parcours-images-editor-crop-handle parcours-images-editor-crop-handle-${corner}`}
                      onMouseDown={(e) => handleResizeStart(corner, e)}
                      onTouchStart={(e) => handleResizeStart(corner, e)}
                    />
                  ))}
                </div>
              </div>
            </section>
            <section className="parcours-images-editor-card parcours-images-editor-render-section">
              <h2 className="parcours-images-editor-card-title">Rendu sur le parcours</h2>
              <p className="parcours-images-editor-render-hint">Aperçu aux mêmes dimensions qu’une carte du parcours.</p>
              <div
                className="parcours-images-editor-render-card"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.08) 60%), url(${imageUrlFinal})`,
                  ...(crop.w > 0 && crop.h > 0
                    ? getCropBackgroundStyle(crop, imageAspectRatio, CROP_ASPECT)
                    : { backgroundSize: 'cover', backgroundPosition: 'center' }),
                }}
              />
            </section>
          </>
        )}

        <section className="parcours-images-editor-card parcours-images-editor-export">
          <h2 className="parcours-images-editor-card-title">Sauvegarder et exporter</h2>
          <div className="parcours-images-editor-export-actions">
            <button
              type="button"
              className="parcours-images-editor-btn parcours-images-editor-btn-save"
              disabled={!imageUrlFinal || isSaving}
              onClick={handleSave}
            >
              {isSaving ? 'Sauvegarde…' : 'Sauvegarder sur le parcours'}
            </button>
            <button
              type="button"
              className="parcours-images-editor-btn"
              onClick={handleCopyEntry}
              disabled={!imageUrlFinal}
            >
              Copier l’entrée pour ce nœud
            </button>
            <button
              type="button"
              className="parcours-images-editor-btn"
              onClick={handleDownloadJson}
              disabled={!imageUrlFinal}
            >
              Télécharger parcoursImages.json
            </button>
          </div>
          <p className="parcours-images-editor-export-hint">
            « Sauvegarder » enregistre directement pour tous. Sinon, collez l’entrée dans <code>parcoursIllustrations.js</code> ou remplacez le fichier JSON.
          </p>
          {saveMessage && (
            <p className={`parcours-images-editor-toast ${saveMessage.startsWith('Erreur') ? 'parcours-images-editor-toast-error' : ''}`}>
              {saveMessage}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export default ParcoursImagesEditor
