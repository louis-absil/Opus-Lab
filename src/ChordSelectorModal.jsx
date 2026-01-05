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
  const [degree, setDegree] = useState('') // Initialisé vide pour permettre la sélection des accords spéciaux
  const [specialRoot, setSpecialRoot] = useState(null)
  const [quality, setQuality] = useState('')
  const [figure, setFigure] = useState('5') // Remplace inversion/extension/delay
  const [isBorrowed, setIsBorrowed] = useState(false) // Emprunt (degré entre parenthèses)
  
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
        // Pour l'affichage dans la liste, on utilise le format simple
        // L'aperçu gère le formatage avec exposants
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
  }, [accidental, degree, specialRoot, quality, figure])

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
      
      // Détecter si c'est une racine spéciale
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
      
      // Déterminer la figure à partir de inversion/extension/delay
      if (initialChord.delay === '54') {
        setFigure('54')
      } else if (initialChord.extension) {
        setFigure(initialChord.extension)
      } else {
        setFigure(initialChord.inversion || '5')
      }
    } else if (isOpen) {
      // Reset à l'ouverture
      setIsCadence(false)
      setCadence(null)
      setAccidental('')
      setDegree('') // Initialisé vide pour permettre la sélection des accords spéciaux
      setSpecialRoot(null)
      setQuality('')
      setFigure('5')
      setIsBorrowed(false)
    }
  }, [initialChord, isOpen])

  // Gérer la sélection d'une racine spéciale (désélectionne le degré pour éviter la confusion)
  const handleSpecialRootClick = (rootValue) => {
    // Si on clique sur le même bouton, désélectionner, sinon sélectionner
    if (specialRoot === rootValue) {
      setSpecialRoot(null)
    } else {
      setSpecialRoot(rootValue)
      setDegree('') // Désélectionner le degré pour éviter la confusion
      setAccidental('')
      // Définir le chiffrage approprié (toujours "6" pour les accords spéciaux)
      setFigure('6')
    }
  }

  // Gérer la sélection d'un degré (désélectionne la racine spéciale pour éviter la confusion)
  const handleDegreeClick = (deg) => {
    // Si on clique sur le même degré, désélectionner, sinon sélectionner
    if (degree === deg) {
      setDegree('')
      setIsBorrowed(false) // Réinitialiser l'emprunt si on désélectionne
    } else {
      setDegree(deg)
      setSpecialRoot(null) // Désélectionner la racine spéciale pour éviter la confusion
      // Garder l'état isBorrowed si on change juste de degré
    }
  }

  // Navigation clavier professionnelle
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      // Échap : Annuler et fermer (désactivé en mode élève)
      if (e.key === 'Escape') {
        if (!studentMode) {
          onClose()
        }
        return
      }

      // Entrée : Valider et fermer
      if (e.key === 'Enter' && currentFocusSection.current !== 'cadence') {
        e.preventDefault()
        handleValidate()
        return
      }

      // Backspace/Delete : Reset de la sélection en cours
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

      // Flèches Gauche/Droite : Navigation entre degrés ET racines spéciales (navigation unifiée)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        
        // Navigation unifiée : on peut naviguer entre degrés et sixtes
        // Si on est dans la section degrés ou spéciales, on navigue dans les deux groupes
        if (currentFocusSection.current === 'degrees' || currentFocusSection.current === 'specialRoots' || currentFocusSection.current === '') {
          // Combiner tous les éléments navigables (degrés + sixtes)
          const allNavigableItems = [
            ...DEGREES.map(d => ({ type: 'degree', value: d })),
            ...SPECIAL_ROOTS.map(s => ({ type: 'special', value: s.value }))
          ]
          
          // Trouver l'index actuel
          let currentIndex = -1
          if (degree) {
            currentIndex = allNavigableItems.findIndex(item => item.type === 'degree' && item.value === degree)
          } else if (specialRoot) {
            currentIndex = allNavigableItems.findIndex(item => item.type === 'special' && item.value === specialRoot)
          }
          
          // Si aucun n'est sélectionné, commencer par le premier
          if (currentIndex === -1) {
            const firstItem = allNavigableItems[0]
            if (firstItem.type === 'degree') {
              handleDegreeClick(firstItem.value)
            } else {
              handleSpecialRootClick(firstItem.value)
            }
            return
          }
          
          // Naviguer
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

      // Flèches Haut/Bas : Navigation dans les chiffrages
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        
        // Permettre la navigation même si on n'est pas dans la section figures
        // Si on est sur un degré, on peut naviguer dans les chiffrages
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
    
    // Focus initial sur le degré
    if (firstFocusRef.current) {
      setTimeout(() => {
        firstFocusRef.current?.focus()
        currentFocusSection.current = 'degrees'
      }, 100)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, degree, specialRoot, figure, quality, onClose, handleValidate])

  const handleBackdropClick = (e) => {
    // En mode élève, permettre de fermer en cliquant dehors (sans enregistrer)
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
      <div className="chord-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ZONE 1 : RACINES (Haut - Compact) */}
        <div className="chord-zone root-zone-compact">
          <div className="root-selector-compact">
            {/* Altérations */}
            <div className="accidental-group-compact">
              {ACCIDENTALS.map((acc) => (
                <button
                  key={acc.value}
                  className={`accidental-btn-compact ${accidental === acc.value ? 'active' : ''} ${specialRoot ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!specialRoot) {
                      setAccidental(acc.value)
                    }
                  }}
                  title={acc.label}
                  disabled={!!specialRoot}
                >
                  {acc.symbol}
                </button>
              ))}
            </div>

            {/* Degrés classiques */}
            <div className="degree-group-compact">
              {DEGREES.map((deg) => (
                <button
                  key={deg}
                  ref={(el) => {
                    if (deg === (degree || '')) firstFocusRef.current = el
                    degreeRefs.current[deg] = el
                  }}
                  className={`degree-btn-compact ${degree === deg ? 'active' : ''}`}
                  onClick={() => handleDegreeClick(deg)}
                  onFocus={() => currentFocusSection.current = 'degrees'}
                  // Toujours actif, pas de désactivation
                  disabled={false}
                >
                  {deg}
                </button>
              ))}
            </div>

            {/* Racines spéciales */}
            <div className="special-root-group-compact">
              {SPECIAL_ROOTS.map((special) => (
                <button
                  key={special.value}
                  ref={(el) => {
                    specialRootRefs.current[special.value] = el
                  }}
                  className={`special-root-btn-compact ${specialRoot === special.value ? 'active' : ''}`}
                  onClick={() => handleSpecialRootClick(special.value)}
                  onFocus={() => currentFocusSection.current = 'specialRoots'}
                  // Toujours actif, pas de désactivation
                  disabled={false}
                  title={special.description}
                >
                  <span className="special-root-main">{special.value === 'N' ? 'II' : special.label}</span>
                  <span className="special-root-suffix">{special.value === 'N' ? '♭6' : '+6'}</span>
                </button>
              ))}
            </div>

            {/* Qualités de base (dim, aug) et Emprunt */}
            <div className="quality-group-compact">
              <button
                className={`quality-btn-compact ${quality === '°' ? 'active' : ''} ${specialRoot ? 'disabled' : ''}`}
                onClick={() => !specialRoot && setQuality(quality === '°' ? '' : '°')}
                onFocus={() => currentFocusSection.current = 'qualities'}
                disabled={!!specialRoot}
                title="Diminué"
              >
                °
              </button>
              <button
                className={`quality-btn-compact ${quality === '+' ? 'active' : ''} ${specialRoot ? 'disabled' : ''}`}
                onClick={() => !specialRoot && setQuality(quality === '+' ? '' : '+')}
                onFocus={() => currentFocusSection.current = 'qualities'}
                disabled={!!specialRoot}
                title="Augmenté"
              >
                +
              </button>
              <button
                className={`quality-btn-compact borrowed-btn ${isBorrowed ? 'active' : ''} ${specialRoot || !degree ? 'disabled' : ''}`}
                onClick={() => !specialRoot && degree && setIsBorrowed(!isBorrowed)}
                onFocus={() => currentFocusSection.current = 'qualities'}
                disabled={!!specialRoot || !degree}
                title="Emprunt (degré entre parenthèses)"
              >
                ( )
              </button>
            </div>
          </div>
        </div>

        {/* ZONE 2 : CHIFFRAGES ARABES UNIFIÉS (Bas - Grille compacte) */}
        <div className="chord-zone figures-zone-compact">
          <div className="figures-grid-compact">
            {ALL_FIGURES.map((fig) => {
              const isSelected = figure === fig.value
              const isDelay = fig.type === 'delay'
              
              return (
                <button
                  key={fig.value}
                  ref={(el) => {
                    figureRefs.current[fig.value] = el
                  }}
                  className={`figure-btn-compact ${isSelected ? 'active' : ''}`}
                  onClick={() => setFigure(fig.value)}
                  onFocus={() => currentFocusSection.current = 'figures'}
                  title={fig.label}
                >
                  {Array.isArray(fig.display) ? (
                    <span className="stacked-chord-vertical">
                      <span className="chord-top">{fig.display[0]}</span>
                      <span className="chord-bottom">{fig.display[1]}</span>
                    </span>
                  ) : (
                    <span>{fig.display}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ZONE 3 : FOOTER (Cadence + Aperçu + Actions) */}
        <div className="chord-zone footer-zone-compact">
          {/* Raccourcis clavier */}
          <div className="keyboard-shortcuts-compact">
            <span className="shortcuts-label">Raccourcis :</span>
            <span className="shortcuts-list">
              <kbd>←</kbd><kbd>→</kbd> Degrés | <kbd>↑</kbd><kbd>↓</kbd> Chiffrages | <kbd>Entrée</kbd> Valider | <kbd>Échap</kbd> Annuler
            </span>
          </div>
          
          {/* Aperçu */}
          <div className="preview-display-compact">
            <span className="preview-label-compact">Aperçu :</span>
            <div className="preview-value-container-compact">
              <span className="preview-root-compact">
                {specialRoot ? (
                  (() => {
                    const special = SPECIAL_ROOTS.find(s => s.value === specialRoot)
                    if (special) {
                      // Pour les accords spéciaux, afficher le label avec le chiffrage en exposant
                      if (special.value === 'N') {
                        // Napolitaine : "II♭" avec "6" en exposant (le bémol avant le 6)
                        return <>II♭<span className="preview-figure-superscript">6</span></>
                      } else {
                        // Gr+6, Fr+6, It+6 : "Gr", "Fr", "It" avec "+6" en exposant
                        return <>{special.label}<span className="preview-figure-superscript">+6</span></>
                      }
                    }
                    return special?.fullLabel
                  })()
                ) : (
                  <>
                    {accidental === 'b' && '♭'}
                    {accidental === '#' && '#'}
                    {isBorrowed ? `(${degree})` : degree}
                    {quality}
                  </>
                )}
              </span>
              
              {/* Afficher le chiffrage pour les degrés normaux (pas pour les accords spéciaux car le chiffrage est déjà intégré) */}
              {!specialRoot && figure && figure !== '5' && ALL_FIGURES.find(f => f.value === figure)?.display && (
                <span className="preview-figures-compact">
                  {(() => {
                    const fig = ALL_FIGURES.find(f => f.value === figure)
                    if (fig && Array.isArray(fig.display)) {
                      return (
                        <span className="stacked-chord-vertical">
                          <span className="chord-top">{fig.display[0]}</span>
                          <span className="chord-bottom">{fig.display[1]}</span>
                        </span>
                      )
                    } else if (fig && fig.type === 'extension') {
                      // Extensions en exposant
                      return <span className="preview-figure-superscript">{fig.display}</span>
                    } else if (fig && (fig.type === 'triad' || fig.type === 'seventh')) {
                      // Chiffres simples (6, 7, etc.) en exposant
                      return <span className="preview-figure-superscript">{fig.display}</span>
                    }
                    return null
                  })()}
                </span>
              )}
            </div>
          </div>

          {/* Cadence */}
          <div className="cadence-toggle-compact">
            <label className="toggle-label-compact">
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
              <div className="cadence-options-compact">
                {CADENCES.map((cad) => (
                  <label key={cad.value} className="cadence-radio-compact">
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

          {/* Actions */}
          <div className="action-buttons-compact">
            {!studentMode && (
              <button 
                className="action-btn-compact cancel-btn-compact" 
                onClick={onClose}
                onFocus={() => currentFocusSection.current = 'cancel'}
              >
                Annuler
              </button>
            )}
            <button 
              className="action-btn-compact validate-btn-compact" 
              onClick={handleValidate}
              onFocus={() => currentFocusSection.current = 'validate'}
            >
              {studentMode ? 'Valider et continuer' : 'Valider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChordSelectorModal
