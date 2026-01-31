import React, { useRef, useEffect } from 'react'
import abcjs from 'abcjs'
import './CodexNotation.css'

/**
 * Affiche une partition à partir d'une chaîne ABC (abcjs).
 * @param {string} abcString - Chaîne ABC
 * @param {string} [className] - Classe CSS optionnelle
 */
function CodexNotation({ abcString, className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!abcString?.trim() || !containerRef.current) return
    const el = containerRef.current
    el.innerHTML = ''
    try {
      abcjs.renderAbc(el, abcString.trim(), {
        responsive: 'resize',
        scale: 1,
        paddingleft: 0,
        paddingright: 0
      })
    } catch (err) {
      el.textContent = 'Partition non disponible.'
    }
  }, [abcString])

  if (!abcString?.trim()) return null

  return (
    <div
      ref={containerRef}
      className={`codex-notation ${className}`.trim()}
      aria-label="Partition de l'exemple"
    />
  )
}

export default CodexNotation
