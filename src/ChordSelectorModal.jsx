import { useState, useEffect, useRef, useCallback } from 'react'
import './ChordSelectorModal.css'

// Degrés classiques (I-VII)
const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Accords spéciaux (racines à part entière, mutuellement exclusifs avec les degrés)
const SPECIAL_ROOTS = [
  { value: 'Gr', label: 'Gr', fullLabel: 'Gr+6', description: 'Allemande' },
  { value: 'Fr', label: 'Fr', fullLabel: 'Fr+6', description: 'Française' },
  { value: 'It', label: 'It', fullLabel: 'It+6', description: 'Italienne' },
  { value: 'N', label: 'IIb', fullLabel: 'IIb6', description: 'Napolitaine' }
]

const ACCIDENTALS = [
  { value: 'b', symbol: '♭', label: 'Bémol' },
  { value: '', symbol: '♮', label: 'Bécarre' },
  { value: '#', symbol: '#', label: 'Dièse' }
]

const CADENCES = [
  { value: 'perfect', label: 'Parfaite' },
  { value: 'imperfect', label: 'Imparfaite' },
  { value: 'plagal', label: 'Plagale' },
  { value: 'deceptive', label: 'Rompue' },
  { value: 'half', label: 'Demi' }
]

// TOUS les chiffrages arabes unifiés (Triades, Septièmes, Extensions, Retard)
const ALL_FIGURES = [
  // Triades
  { value: '5', label: '5', display: '5', type: 'triad' },
  { value: '6', label: '6', display: '6', type: 'triad' },
  { value: '64', label: '6/4', display: ['6', '4'], type: 'triad' },
  // Septièmes
  { value: '7', label: '7', display: '7', type: 'seventh' },
  { value: '65', label: '6/5', display: ['6', '5'], type: 'seventh' },
  { value: '43', label: '4/3', display: ['4', '3'], type: 'seventh' },
  { value: '2', label: '2', display: '2', type: 'seventh' },
  // Extensions
  { value: '9', label: '9', display: '9', type: 'extension' },
  { value: '11', label: '11', display: '11', type: 'extension' },
  { value: '13', label: '13', display: '13', type: 'extension' },
  // Retard
  { value: '54', label: '5/4', display: ['5', '4'], type: 'delay' }
]

function ChordSelectorModal({ 
  isOpen, 
  onClose, 
  onValidate, 
  initialChord = null,
  studentMode = false,
  currentQuestion = null,
  totalQuestions = null
}) {
  // État principal
  const [isCadence, setIsCadence] = useState(false)
  const [cadence, setCadence] = useState(null)
  const [accidental, setAccidental] = useState('')
  const [degree, setDegree] = useState('')
  const [specialRoot, setSpecialRoot] = useState(null)
  const [quality, setQuality] = useState('')
  const [figure, setFigure] = useState('5')
  const [isBorrowed, setIsBorrowed] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Refs pour navigation clavier
  const degreeRefs = useRef({})
  const specialRootRefs = useRef({})
  const figureRefs = useRef({})
  const modalRef = useRef(null)
  const firstFocusRef = useRef(null)
  const currentFocusSection = useRef('degrees')

  // Générer le label d'affichage avec rendu vertical pour les chiffrages
  const generateDisplayLabel = useCallback(() => {
    let label = ''
    
    // Racine spéciale (prioritaire sur degré)
    if (specialRoot) {
      const special = SPECIAL_ROOTS.find(s => s.value === specialRoot)
      if (special) {
        if (special.value === 'N') {
          label = 'II♭6'
        } else {
          label = special.fullLabel
        }
        return label
      }
    }
    
    // Degré classique
    if (degree) {
      // Accidental
      if (accidental === 'b') label += '♭'
      else if (accidental === '#') label += '#'
      
      // Degré (avec parenthèses si emprunt)
      if (isBorrowed) {
        label += `(${degree})`
      } else {
        label += degree
      }
      
      // Qualité (dim, aug)
      if (quality === '°') label += '°'
      else if (quality === '+') label += '+'
      
      // Chiffrage
      if (figure && figure !== '5') {
        const fig = ALL_FIGURES.find(f => f.value === figure)
        if (fig) {
          if (Array.isArray(fig.display)) {
            label += ` ${fig.display[0]}/${fig.display[1]}`
          } else {
            label += fig.display
          }
        }
      }
    }
    
    return label.trim()
  }, [accidental, degree, specialRoot, quality, figure, isBorrowed])

  // Générer l'objet de données complet
  const generateChordData = useCallback(() => {
    const fig = ALL_FIGURES.find(f => f.value === figure)
    const isDelay = fig?.type === 'delay'
    const isExtension = fig?.type === 'extension'
    
    return {
      root: specialRoot || degree,
      accidental: specialRoot ? '' : accidental,
      quality: quality,
      inversion: isDelay ? '54' : (isExtension ? null : figure),
      extension: isExtension ? figure : null,
      delay: isDelay ? '54' : null,
      isBorrowed: isBorrowed,
      cadence: isCadence ? cadence : null,
      displayLabel: generateDisplayLabel()
    }
  }, [degree, specialRoot, accidental, quality, figure, isBorrowed, isCadence, cadence, generateDisplayLabel])

  const handleValidate = useCallback(() => {
    const chordData = generateChordData()
    onValidate(chordData)
  }, [generateChordData, onValidate])

  // Initialiser depuis initialChord si fourni
  useEffect(() => {
    if (initialChord && isOpen) {
      setIsCadence(!!initialChord.cadence)
      setCadence(initialChord.cadence || null)
      setAccidental(initialChord.accidental || '')
      
      const isSpecial = SPECIAL_ROOTS.some(s => s.value === initialChord.root)
      if (isSpecial) {
        setSpecialRoot(initialChord.root)
        setDegree('')
      } else {
        setSpecialRoot(null)
        setDegree(initialChord.root || '')
      }
      
      setQuality(initialChord.quality || '')
      setIsBorrowed(!!initialChord.isBorrowed)
      
      if (initialChord.delay === '54') {
        setFigure('54')
      } else if (initialChord.extension) {
        setFigure(initialChord.extension)
      } else {
        setFigure(initialChord.inversion || '5')
      }
    } else if (isOpen) {
      setIsCadence(false)
      setCadence(null)
      setAccidental('')
      setDegree('')
      setSpecialRoot(null)
      setQuality('')
      setFigure('5')
      setIsBorrowed(false)
    }
  }, [initialChord, isOpen])

  const handleSpecialRootClick = (rootValue) => {
    if (specialRoot === rootValue) {
      setSpecialRoot(null)
    } else {
      setSpecialRoot(rootValue)
      setDegree('')
      setAccidental('')
      setFigure('6')
    }
  }

  const handleDegreeClick = (deg) => {
    if (degree === deg) {
      setDegree('')
      setIsBorrowed(false)
    } else {
      setDegree(deg)
      setSpecialRoot(null)
    }
  }

  // Navigation clavier professionnelle
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!studentMode) {
          onClose()
        }
        return
      }

      if (e.key === 'Enter' && currentFocusSection.current !== 'cadence') {
        e.preventDefault()
        handleValidate()
        return
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && 
          (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault()
        if (currentFocusSection.current === 'degrees') {
          setDegree('')
          setSpecialRoot(null)
        } else if (currentFocusSection.current === 'specialRoots') {
          setSpecialRoot(null)
        } else if (currentFocusSection.current === 'figures') {
          setFigure('5')
        } else if (currentFocusSection.current === 'qualities') {
          setQuality('')
        }
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        
        if (currentFocusSection.current === 'degrees' || currentFocusSection.current === 'specialRoots' || currentFocusSection.current === '') {
          const allNavigableItems = [
            ...DEGREES.map(d => ({ type: 'degree', value: d })),
            ...SPECIAL_ROOTS.map(s => ({ type: 'special', value: s.value }))
          ]
          
          let currentIndex = -1
          if (degree) {
            currentIndex = allNavigableItems.findIndex(item => item.type === 'degree' && item.value === degree)
          } else if (specialRoot) {
            currentIndex = allNavigableItems.findIndex(item => item.type === 'special' && item.value === specialRoot)
          }
          
          if (currentIndex === -1) {
            const firstItem = allNavigableItems[0]
            if (firstItem.type === 'degree') {
              handleDegreeClick(firstItem.value)
            } else {
              handleSpecialRootClick(firstItem.value)
            }
            return
          }
          
          let newIndex
          if (e.key === 'ArrowLeft') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : allNavigableItems.length - 1
          } else {
            newIndex = currentIndex < allNavigableItems.length - 1 ? currentIndex + 1 : 0
          }
          
          const newItem = allNavigableItems[newIndex]
          
          if (newItem.type === 'degree') {
            handleDegreeClick(newItem.value)
            currentFocusSection.current = 'degrees'
          } else {
            handleSpecialRootClick(newItem.value)
            currentFocusSection.current = 'specialRoots'
          }
          return
        }
        
        if (currentFocusSection.current === 'figures') {
          const currentIndex = ALL_FIGURES.findIndex(f => f.value === figure)
          if (currentIndex === -1) return
          
          let newIndex
          if (e.key === 'ArrowLeft') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : ALL_FIGURES.length - 1
          } else {
            newIndex = currentIndex < ALL_FIGURES.length - 1 ? currentIndex + 1 : 0
          }
          setFigure(ALL_FIGURES[newIndex].value)
          return
        }
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        
        if (currentFocusSection.current === 'figures' || currentFocusSection.current === 'degrees' || currentFocusSection.current === 'specialRoots') {
          const currentIndex = ALL_FIGURES.findIndex(f => f.value === figure)
          if (currentIndex === -1) {
            return
          }
          
          let newIndex
          if (e.key === 'ArrowUp') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : ALL_FIGURES.length - 1
          } else {
            newIndex = currentIndex < ALL_FIGURES.length - 1 ? currentIndex + 1 : 0
          }
          const newFigure = ALL_FIGURES[newIndex].value
          setFigure(newFigure)
          currentFocusSection.current = 'figures'
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    if (firstFocusRef.current) {
      setTimeout(() => {
        firstFocusRef.current?.focus()
        currentFocusSection.current = 'degrees'
      }, 100)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, degree, specialRoot, figure, quality, onClose, handleValidate, studentMode])

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  const displayLabel = generateDisplayLabel()
  const chordData = generateChordData()

  return (
    <div 
      className="chord-modal-backdrop" 
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="chord-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Zone d'Aperçu (Display) - Héros Visuel */}
        <div className="chord-display-zone">
          <div className="chord-display-screen">
            <div className="chord-display-content">
              {specialRoot ? (
                (() => {
                  const special = SPECIAL_ROOTS.find(s => s.value === specialRoot)
                  if (special) {
                    if (special.value === 'N') {
                      return (
                        <>
                          <span className="chord-display-root">II</span>
                          <span className="chord-display-accidental">♭</span>
                          <span className="chord-display-figure">6</span>
                        </>
                      )
                    } else {
                      return (
                        <>
                          <span className="chord-display-root">{special.label}</span>
                          <span className="chord-display-figure">+6</span>
                        </>
                      )
                    }
                  }
                  return null
                })()
              ) : (
                <>
                  {accidental && (
                    <span className="chord-display-accidental">
                      {accidental === 'b' ? '♭' : accidental === '#' ? '#' : ''}
                    </span>
                  )}
                  {degree && (
                    <>
                      {isBorrowed && <span className="chord-display-paren">(</span>}
                      <span className="chord-display-root">{degree}</span>
                      {isBorrowed && <span className="chord-display-paren">)</span>}
                    </>
                  )}
                  {quality && (
                    <span className="chord-display-quality">{quality}</span>
                  )}
                  {!specialRoot && figure && figure !== '5' && (() => {
                    const fig = ALL_FIGURES.find(f => f.value === figure)
                    if (fig) {
                      if (Array.isArray(fig.display)) {
                        return (
                          <span className="chord-display-figure-stacked">
                            <span className="chord-display-figure-top">{fig.display[0]}</span>
                            <span className="chord-display-figure-bottom">{fig.display[1]}</span>
                          </span>
                        )
                      } else {
                        return <span className="chord-display-figure">{fig.display}</span>
                      }
                    }
                    return null
                  })()}
                </>
              )}
              {!displayLabel && (
                <span className="chord-display-placeholder">Sélectionnez un accord</span>
              )}
            </div>
          </div>
          
          {/* Bouton de validation intégré */}
          <button 
            className="chord-validate-fab"
            onClick={handleValidate}
            disabled={!displayLabel}
            aria-label="Valider"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          
          {/* Icône Info pour raccourcis */}
          <button 
            className="chord-info-btn"
            onClick={() => setShowShortcuts(!showShortcuts)}
            aria-label="Raccourcis clavier"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>

        {/* Raccourcis clavier (tooltip) */}
        {showShortcuts && (
          <div className="chord-shortcuts-tooltip">
            <div className="chord-shortcuts-content">
              <div className="chord-shortcuts-row">
                <kbd>←</kbd><kbd>→</kbd> <span>Degrés</span>
              </div>
              <div className="chord-shortcuts-row">
                <kbd>↑</kbd><kbd>↓</kbd> <span>Chiffrages</span>
              </div>
              <div className="chord-shortcuts-row">
                <kbd>Entrée</kbd> <span>Valider</span>
              </div>
              {!studentMode && (
                <div className="chord-shortcuts-row">
                  <kbd>Échap</kbd> <span>Annuler</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zone des Touches */}
        <div className="chord-pads-zone">
          {/* Zone Haute : Modificateurs (Altérations) */}
          <div className="chord-pads-section chord-pads-modifiers">
            {ACCIDENTALS.map((acc) => (
              <button
                key={acc.value}
                className={`chord-pad chord-pad-modifier ${accidental === acc.value ? 'active' : ''} ${specialRoot ? 'disabled' : ''}`}
                onClick={() => {
                  if (!specialRoot) {
                    setAccidental(acc.value)
                  }
                }}
                disabled={!!specialRoot}
                title={acc.label}
              >
                {acc.symbol}
              </button>
            ))}
            <button
              className={`chord-pad chord-pad-modifier ${quality === '°' ? 'active' : ''} ${specialRoot ? 'disabled' : ''}`}
              onClick={() => !specialRoot && setQuality(quality === '°' ? '' : '°')}
              disabled={!!specialRoot}
              title="Diminué"
            >
              °
            </button>
            <button
              className={`chord-pad chord-pad-modifier ${quality === '+' ? 'active' : ''} ${specialRoot ? 'disabled' : ''}`}
              onClick={() => !specialRoot && setQuality(quality === '+' ? '' : '+')}
              disabled={!!specialRoot}
              title="Augmenté"
            >
              +
            </button>
            <button
              className={`chord-pad chord-pad-modifier ${isBorrowed ? 'active' : ''} ${specialRoot || !degree ? 'disabled' : ''}`}
              onClick={() => !specialRoot && degree && setIsBorrowed(!isBorrowed)}
              disabled={!!specialRoot || !degree}
              title="Emprunt"
            >
              ( )
            </button>
          </div>

          {/* Zone Centrale : Racines (Degrés + Spéciaux) */}
          <div className="chord-pads-section chord-pads-roots">
            {/* Degrés classiques */}
            {DEGREES.map((deg) => (
              <button
                key={deg}
                ref={(el) => {
                  if (deg === (degree || '')) firstFocusRef.current = el
                  degreeRefs.current[deg] = el
                }}
                className={`chord-pad chord-pad-root ${degree === deg ? 'active' : ''}`}
                onClick={() => handleDegreeClick(deg)}
                onFocus={() => currentFocusSection.current = 'degrees'}
              >
                {deg}
              </button>
            ))}
            
            {/* Racines spéciales */}
            {SPECIAL_ROOTS.map((special) => (
              <button
                key={special.value}
                ref={(el) => {
                  specialRootRefs.current[special.value] = el
                }}
                className={`chord-pad chord-pad-root chord-pad-special ${specialRoot === special.value ? 'active' : ''}`}
                onClick={() => handleSpecialRootClick(special.value)}
                onFocus={() => currentFocusSection.current = 'specialRoots'}
                title={special.description}
              >
                <span className="chord-pad-special-main">{special.value === 'N' ? 'II' : special.label}</span>
                <span className="chord-pad-special-suffix">{special.value === 'N' ? '♭6' : '+6'}</span>
              </button>
            ))}
          </div>

          {/* Zone Basse : Chiffrages */}
          <div className="chord-pads-section chord-pads-figures">
            {ALL_FIGURES.map((fig) => {
              const isSelected = figure === fig.value
              
              return (
                <button
                  key={fig.value}
                  ref={(el) => {
                    figureRefs.current[fig.value] = el
                  }}
                  className={`chord-pad chord-pad-figure ${isSelected ? 'active' : ''}`}
                  onClick={() => setFigure(fig.value)}
                  onFocus={() => currentFocusSection.current = 'figures'}
                  title={fig.label}
                >
                  {Array.isArray(fig.display) ? (
                    <span className="chord-pad-figure-stacked">
                      <span className="chord-pad-figure-top">{fig.display[0]}</span>
                      <span className="chord-pad-figure-bottom">{fig.display[1]}</span>
                    </span>
                  ) : (
                    <span>{fig.display}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Zone Cadence (optionnelle, en bas) */}
        <div className="chord-cadence-zone">
          <label className="chord-cadence-toggle">
            <input
              type="checkbox"
              checked={isCadence}
              onChange={(e) => {
                setIsCadence(e.target.checked)
                if (!e.target.checked) setCadence(null)
              }}
              onFocus={() => currentFocusSection.current = 'cadence'}
            />
            <span>Cadence</span>
          </label>
          {isCadence && (
            <div className="chord-cadence-options">
              {CADENCES.map((cad) => (
                <label key={cad.value} className="chord-cadence-option">
                  <input
                    type="radio"
                    name="cadence"
                    value={cad.value}
                    checked={cadence === cad.value}
                    onChange={(e) => setCadence(e.target.value)}
                  />
                  <span>{cad.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Bouton Annuler (si pas en mode élève) */}
        {!studentMode && (
          <div className="chord-cancel-zone">
            <button 
              className="chord-cancel-btn"
              onClick={onClose}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChordSelectorModal
