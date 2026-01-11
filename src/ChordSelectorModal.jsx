import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FUNCTION_TO_DEGREES, FUNCTION_COLORS, DEGREE_TO_FUNCTIONS } from './utils/riemannFunctions'

/* --- 1. CONSTANTES & CONFIGURATION --- */
const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

const FUNCTIONS = [
  { value: 'T', label: 'T', fullLabel: 'Tonique', color: 'blue' },
  { value: 'SD', label: 'SD', fullLabel: 'Sous-Dominante', color: 'amber' },
  { value: 'D', label: 'D', fullLabel: 'Dominante', color: 'rose' }
]

const ACCIDENTALS = [
  { value: 'b', symbol: '♭', label: 'Bémol' },
  { value: '#', symbol: '♯', label: 'Dièse' },
  { value: 'natural', symbol: '♮', label: 'Bécarre' }
]

const FIGURES = [
  { value: '5', label: 'Quinte', display: '5' },
  { value: '6', label: 'Sixte', display: '6' },
  { value: '64', label: 'Quarte-sixte', display: '6/4', isStacked: true, displayArray: ['6', '4'] },
  { value: '7', label: 'Septième', display: '7' },
  { value: '65', label: 'Sixte-quinte', display: '6/5', isStacked: true, displayArray: ['6', '5'] },
  { value: '43', label: 'Quarte-tierce', display: '4/3', isStacked: true, displayArray: ['4', '3'] },
  { value: '2', label: 'Seconde', display: '2' },
  { value: '9', label: 'Neuvième', display: '9' },
  { value: '11', label: 'Onzième', display: '11' },
  { value: '13', label: 'Treizième', display: '13' },
  { value: '54', label: 'Quinte-quarte', display: '5/4', isStacked: true, displayArray: ['5', '4'] }
]

const SPECIAL_ROOTS = [
  { value: 'N', label: 'II', sub: '♭', sup: '6', description: 'Sixte napolitaine' },
  { value: 'It', label: 'It', sup: '+6', description: 'Sixte italienne' },
  { value: 'Fr', label: 'Fr', sup: '+6', description: 'Sixte française' },
  { value: 'Gr', label: 'Gr', sup: '+6', description: 'Sixte allemande' }
]

const CADENCES = [
  { value: 'perfect', label: 'Parfaite' },
  { value: 'imperfect', label: 'Imparfaite' },
  { value: 'plagal', label: 'Plagale' },
  { value: 'rompue', label: 'Rompue' },
  { value: 'évitée', label: 'Évitée' },
  { value: 'demi-cadence', label: 'Demi-cadence' }
]

/* --- 2. SOUS-COMPOSANTS UI (Look Hardware) --- */

/**
 * Bouton Pad style "Ableton Push"
 * Gère les états: Inactif (gris), Actif (Lumineux), Highlight (Indice)
 */
const Pad = ({ 
  label, 
  subLabel,
  active, 
  highlighted, 
  onClick, 
  color = 'indigo', 
  disabled, 
  className = '', 
  stackedTop, 
  stackedBottom 
}) => {
  // Mapping des couleurs pour l'effet "néon"
  const colorMap = {
    blue: 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-400',
    amber: 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.5)] border-amber-400',
    rose: 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.5)] border-rose-400',
    indigo: 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] border-indigo-400',
    gray: 'bg-zinc-600 shadow-none border-zinc-500'
  }

  const activeClass = active ? `${colorMap[color]} text-white scale-[0.98] border-2` : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
  const highlightClass = (!active && highlighted) ? 'ring-1 ring-white/30 bg-white/5 text-zinc-200' : ''
  
  // Extraire les classes de taille de texte de className
  const textSizeMatch = className.match(/\b(text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)(?:\s+md:text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl))?)\b/)
  const textSizeClass = textSizeMatch ? textSizeMatch[1] : (subLabel ? 'text-lg md:text-xl' : 'text-lg md:text-xl')
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`
        relative flex flex-col items-center justify-center rounded-lg transition-all duration-150
        disabled:opacity-20 disabled:cursor-not-allowed select-none
        !p-0 !m-0 !font-inherit
        ${activeClass} ${highlightClass} ${className}
      `}
    >
      {stackedTop ? (
        <div className="flex flex-col items-center justify-center h-full w-full relative">
          <div className="flex flex-col items-center leading-none -mt-0.5">
            <span className="text-base font-bold opacity-90">{stackedTop}</span>
            <span className="text-base font-bold opacity-90 -mt-1">{stackedBottom}</span>
          </div>
          {subLabel && (
            <span className="text-[10px] font-bold opacity-70 absolute top-0.5 right-1 leading-none">
              {subLabel.includes('o7') && !subLabel.includes('o7̸') ? (
                <span>
                  o<span style={{ position: 'relative', display: 'inline-block' }}>
                    7
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '0',
                      right: '0',
                      height: '1.5px',
                      background: 'currentColor',
                      transform: 'rotate(-15deg)',
                      transformOrigin: 'center'
                    }}></span>
                  </span>
                </span>
              ) : (
                subLabel
              )}
            </span>
          )}
        </div>
      ) : (
        <>
          <span className={`font-semibold ${textSizeClass}`}>{label}</span>
          {subLabel && (
            <span className="text-[10px] font-bold opacity-70 absolute top-0.5 right-1 leading-none">
              {subLabel.includes('o7') && !subLabel.includes('o7̸') ? (
                <span>
                  o<span style={{ position: 'relative', display: 'inline-block' }}>
                    7
                    <span style={{
                      position: 'absolute',
                      top: '50%',
                      left: '0',
                      right: '0',
                      height: '1.5px',
                      background: 'currentColor',
                      transform: 'rotate(-15deg)',
                      transformOrigin: 'center'
                    }}></span>
                  </span>
                </span>
              ) : (
                subLabel
              )}
            </span>
          )}
        </>
      )}
    </button>
  )
}

/**
 * Écran LCD style Hardware
 * Affiche le résultat de l'accord construit
 */
const ChordDisplay = ({ data, degreeMode = 'generic' }) => {
  const { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction } = data

  // Fonction pour obtenir le label d'un degré selon le mode
  const getDegreeLabel = (deg, mode) => {
    const degreeMap = {
      'I': {
        generic: 'I',
        major: 'I',
        minor: 'i'
      },
      'II': {
        generic: 'II',
        major: 'ii',
        minor: 'ii°'
      },
      'III': {
        generic: 'III',
        major: 'iii',
        minor: 'III'
      },
      'IV': {
        generic: 'IV',
        major: 'IV',
        minor: 'iv'
      },
      'V': {
        generic: 'V',
        major: 'V',
        minor: 'V'
      },
      'VI': {
        generic: 'VI',
        major: 'vi',
        minor: 'VI'
      },
      'VII': {
        generic: 'VII',
        major: 'vii°',
        minor: 'vii°'
      }
    }
    return degreeMap[deg]?.[mode] || deg
  }

  const renderContent = () => {
    if (specialRoot) {
      const spec = SPECIAL_ROOTS.find(s => s.value === specialRoot)
      if (!spec) return null
      // Cas particulier Napolitaine
      if (spec.value === 'N') {
        // Pour la napolitaine, adapter selon le mode
        const napolitaineLabel = getDegreeLabel('II', degreeMode)
        // Extraire le symbole ° si présent
        const hasDiminished = napolitaineLabel.includes('°')
        const degreeWithoutSymbol = napolitaineLabel.replace('°', '')
        return (
          <div className="flex items-baseline font-serif">
            <span className="text-6xl text-white font-bold">{degreeWithoutSymbol}</span>
            {hasDiminished && <span className="text-4xl text-zinc-300 ml-1">°</span>}
            <div className="flex flex-col -mt-4 ml-1">
              <span className="text-2xl text-amber-400">♭</span>
              <span className="text-2xl text-white">6</span>
            </div>
          </div>
        )
      }
      return (
        <div className="flex items-baseline font-serif">
          <span className="text-6xl text-white font-bold">{spec.label}</span>
          <span className="text-3xl text-white align-super ml-1 relative -top-6">{spec.sup}</span>
        </div>
      )
    }

    // Si une fonction est sélectionnée sans degré, afficher la fonction
    if (selectedFunction && !degree) {
      const func = FUNCTIONS.find(f => f.value === selectedFunction)
      if (func) {
        return (
          <div className="flex items-center justify-center font-serif text-white">
            {isBorrowed && <span className="text-5xl text-zinc-500 font-light">(</span>}
            <span className={`text-7xl font-bold tracking-tight shadow-black drop-shadow-lg ${
              func.color === 'blue' ? 'text-blue-400' : 
              func.color === 'amber' ? 'text-amber-400' : 
              'text-rose-400'
            }`}>
              {func.value}
            </span>
            {isBorrowed && <span className="text-5xl text-zinc-500 font-light">)</span>}
          </div>
        )
      }
    }

    if (!degree) return <span className="text-zinc-600 italic font-light tracking-widest text-lg">EN ATTENTE...</span>

    const figObj = FIGURES.find(f => f.value === figure)
    // Utiliser getDegreeLabel pour adapter l'affichage selon le mode
    const displayDegree = getDegreeLabel(degree, degreeMode)
    // Extraire le symbole ° si présent dans le label (pour les modes major/minor)
    const hasDiminished = displayDegree.includes('°')
    const degreeWithoutSymbol = displayDegree.replace('°', '')

    return (
      <div className="flex items-baseline gap-1 font-serif text-white">
        {isBorrowed && <span className="text-5xl text-zinc-500 font-light">(</span>}
        
        {accidental && <span className="text-4xl text-amber-400 font-light mr-1">{accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '♮'}</span>}
        
        <span className="text-7xl font-bold tracking-tight shadow-black drop-shadow-lg">{degreeWithoutSymbol}</span>
        
        {/* Afficher le symbole ° si présent dans le label adapté OU si quality contient ° */}
        {(hasDiminished || quality === '°') && <span className="text-4xl text-zinc-300 ml-1">°</span>}
        {quality && quality !== '°' && <span className="text-4xl text-zinc-300 ml-1">{quality}</span>}

        {figObj && (
          <div className="ml-2 relative -top-4 font-sans font-medium text-zinc-300">
            {figObj.isStacked ? (
              <div className="flex flex-col text-xl leading-none gap-0.5">
                <span>{figObj.displayArray[0]}</span>
                <span>{figObj.displayArray[1]}</span>
              </div>
            ) : (
              <span className="text-3xl">{figObj.display}</span>
            )}
          </div>
        )}
        
        {isBorrowed && <span className="text-5xl text-zinc-500 font-light">)</span>}
      </div>
    )
  }

  return (
    <div className="w-full h-40 md:h-52 bg-black rounded-xl border-4 border-zinc-800 shadow-inner relative overflow-hidden flex items-center justify-center mb-3 md:mb-0 group">
      {/* Reflets vitrés */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
      
      {/* Scanlines subtiles */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiLz4KPC9zdmc+')] opacity-20 pointer-events-none z-0" />
      
      <div className="relative z-20 scale-100 transition-transform duration-300 group-hover:scale-105">
        {renderContent()}
      </div>
    </div>
  )
}

/* --- 3. COMPOSANT PRINCIPAL --- */

function ChordSelectorModal({ 
  isOpen, 
  onClose, 
  onValidate, 
  initialChord = null,
  embedded = false,
  studentMode = false
}) {
  // --- STATE ---
  const [degree, setDegree] = useState('')
  const [accidental, setAccidental] = useState('')
  const [quality, setQuality] = useState('')
  const [figure, setFigure] = useState('')
  const [isBorrowed, setIsBorrowed] = useState(false)
  const [specialRoot, setSpecialRoot] = useState(null)
  const [selectedFunction, setSelectedFunction] = useState(null)
  const [cadence, setCadence] = useState(null)
  // Initialiser le mode depuis localStorage, avec 'generic' comme défaut
  // En mode élève, utiliser un localStorage séparé et toujours 'generic' par défaut
  const [degreeMode, setDegreeMode] = useState(() => {
    if (studentMode) {
      const savedMode = localStorage.getItem('chordSelectorDegreeModeStudent')
      return savedMode || 'generic'
    } else {
      const savedMode = localStorage.getItem('chordSelectorDegreeMode')
      return savedMode || 'generic'
    }
  })
  // Sauvegarder le mode initial pour pouvoir le restaurer si on ferme sans valider
  const [initialDegreeMode, setInitialDegreeMode] = useState(null)
  
  // --- EFFECTS ---
  // Réinitialiser l'état quand la modale s'ouvre sans initialChord (nouvel accord)
  useEffect(() => {
    if (isOpen && !initialChord) {
      setDegree('')
      setAccidental('')
      setQuality('')
      setFigure('')
      setIsBorrowed(false)
      setSpecialRoot(null)
      setSelectedFunction(null)
      setCadence(null)
      // Charger le mode sauvegardé pour les nouveaux accords
      // En mode élève, utiliser le localStorage séparé
      let modeToUse
      if (studentMode) {
        const savedMode = localStorage.getItem('chordSelectorDegreeModeStudent')
        modeToUse = savedMode || 'generic'
      } else {
        const savedMode = localStorage.getItem('chordSelectorDegreeMode')
        modeToUse = savedMode || 'generic'
      }
      setDegreeMode(modeToUse)
      setInitialDegreeMode(modeToUse) // Sauvegarder le mode initial
    }
  }, [isOpen, initialChord, studentMode])

  // Charger les données de initialChord quand il change
  useEffect(() => {
    if (initialChord) {
      setDegree(initialChord.degree || '')
      setAccidental(initialChord.accidental || '')
      setQuality(initialChord.quality || '')
      setFigure(initialChord.figure || '')
      setIsBorrowed(initialChord.isBorrowed || false)
      setSpecialRoot(initialChord.specialRoot || null)
      setSelectedFunction(initialChord.selectedFunction || null)
      setCadence(initialChord.cadence || null)
      // En mode élève : NE JAMAIS charger le mode depuis initialChord (pour ne pas donner la réponse)
      // Toujours utiliser le mode depuis localStorage (ou 'generic' par défaut)
      // En mode prof : garder le comportement actuel
      let modeToUse
      if (studentMode) {
        // Mode élève : ignorer initialChord.degreeMode et utiliser le localStorage élève
        const savedMode = localStorage.getItem('chordSelectorDegreeModeStudent')
        modeToUse = savedMode || 'generic'
      } else {
        // Mode prof : comportement normal
        if (initialChord.degreeMode) {
          modeToUse = initialChord.degreeMode
        } else {
          // Pour les accords non édités, utiliser le mode actuel depuis localStorage
          const savedMode = localStorage.getItem('chordSelectorDegreeMode')
          modeToUse = savedMode || 'generic'
        }
      }
      setDegreeMode(modeToUse)
      setInitialDegreeMode(modeToUse) // Sauvegarder le mode initial pour pouvoir le restaurer
    }
  }, [initialChord, studentMode])
  
  // Restaurer le mode initial si on ferme la modale sans valider
  useEffect(() => {
    if (!isOpen && initialDegreeMode !== null) {
      // Restaurer le mode initial si on a fermé sans valider
      if (degreeMode !== initialDegreeMode) {
        setDegreeMode(initialDegreeMode)
      }
      setInitialDegreeMode(null) // Réinitialiser
    }
  }, [isOpen, initialDegreeMode, degreeMode])

  // --- HANDLERS ---
  const handleDegreeModeChange = (mode) => {
    setDegreeMode(mode)
    // Ne PAS sauvegarder dans localStorage immédiatement
    // Le mode sera sauvegardé seulement lors de la validation
  }

  const handleDegreeClick = (deg) => {
    setDegree(deg)
    setSpecialRoot(null)
    // Annuler la fonction si un degré est sélectionné
    setSelectedFunction(null)
  }

  const handleSpecialRootClick = (val) => {
    if (specialRoot === val) {
      setSpecialRoot(null)
    } else {
      setSpecialRoot(val)
      setDegree('')
      setAccidental('')
      setQuality('')
      setFigure('')
      // Annuler la fonction si une racine spéciale est sélectionnée
      setSelectedFunction(null)
    }
  }

  const handleValidate = () => {
    // Sauvegarder le mode dans localStorage pour les accords suivants
    // En mode élève, utiliser le localStorage séparé
    if (studentMode) {
      localStorage.setItem('chordSelectorDegreeModeStudent', degreeMode)
    } else {
      localStorage.setItem('chordSelectorDegreeMode', degreeMode)
    }
    
    // Construire les données de l'accord
    const chordData = {
      degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, cadence
    }
    
    // En mode élève : toujours sauvegarder le mode dans la réponse de l'élève
    // En mode prof : comportement normal (sauvegarder seulement si nouvel accord ou accord avec degreeMode)
    if (studentMode) {
      // Mode élève : toujours sauvegarder le mode dans la réponse
      chordData.degreeMode = degreeMode
    } else {
      // Mode prof : comportement normal
      if (!initialChord || initialChord.degreeMode) {
        // Nouvel accord OU accord existant avec degreeMode déjà sauvegardé
        chordData.degreeMode = degreeMode
      }
      // Si initialChord existe mais n'a pas de degreeMode, on ne sauvegarde pas le mode
      // (l'accord reste "non édité" au niveau du mode)
    }
    
    // Réinitialiser initialDegreeMode car on a validé
    setInitialDegreeMode(null)
    
    onValidate(chordData)
  }

  // --- RENDER HELPERS ---
  // Fonction pour obtenir le label d'un degré selon le mode
  const getDegreeLabel = (deg, mode) => {
    const degreeMap = {
      'I': {
        generic: 'I',
        major: 'I',
        minor: 'i'
      },
      'II': {
        generic: 'II',
        major: 'ii',
        minor: 'ii°'
      },
      'III': {
        generic: 'III',
        major: 'iii',
        minor: 'III'
      },
      'IV': {
        generic: 'IV',
        major: 'IV',
        minor: 'iv'
      },
      'V': {
        generic: 'V',
        major: 'V',
        minor: 'V'
      },
      'VI': {
        generic: 'VI',
        major: 'vi',
        minor: 'VI'
      },
      'VII': {
        generic: 'VII',
        major: 'vii°',
        minor: 'vii°'
      }
    }
    return degreeMap[deg]?.[mode] || deg
  }

  // Fonction pour obtenir la nature de l'accord (sous-label) selon le mode
  const getDegreeNature = (deg, mode) => {
    if (mode === 'generic') return null
    
    const natureMap = {
      'I': {
        major: 'Maj',
        minor: 'min'
      },
      'II': {
        major: 'min',
        minor: 'dim'
      },
      'III': {
        major: 'min',
        minor: 'Maj'
      },
      'IV': {
        major: 'Maj',
        minor: 'min'
      },
      'V': {
        major: 'Maj',
        minor: 'Maj'
      },
      'VI': {
        major: 'min',
        minor: 'Maj'
      },
      'VII': {
        major: 'dim',
        minor: 'dim'
      }
    }
    return natureMap[deg]?.[mode] || null
  }

  // Fonction pour obtenir l'indice contextuel d'un chiffrage selon le degré et le mode
  // Retourne un symbole abrégé en haut à droite
  const getFigureHint = (figureValue, deg, mode) => {
    // Si pas de degré sélectionné ou mode générique, pas d'indice
    if (!deg || mode === 'generic') return null
    
    // Pour les triades (5, 6, 64)
    if (figureValue === '5' || figureValue === '6' || figureValue === '64') {
      if (mode === 'major') {
        // Mode MAJEUR
        if (deg === 'I' || deg === 'IV') {
          return 'M' // Majeur
        } else if (deg === 'II' || deg === 'III' || deg === 'VI') {
          return 'm' // Mineur
        } else if (deg === 'V') {
          return 'M' // Majeur
        } else if (deg === 'VII') {
          return 'o' // Diminué
        }
      } else if (mode === 'minor') {
        // Mode MINEUR
        if (deg === 'I' || deg === 'IV') {
          return 'm' // Mineur
        } else if (deg === 'II') {
          return 'o' // Diminué
        } else if (deg === 'III' || deg === 'VI') {
          return 'M' // Majeur
        } else if (deg === 'V') {
          return 'M' // Majeur
        } else if (deg === 'VII') {
          return 'o' // Diminué
        }
      }
    }
    
    // Pour les 7èmes (7, 65, 43, 2)
    if (figureValue === '7' || figureValue === '65' || figureValue === '43' || figureValue === '2') {
      if (mode === 'major') {
        // Mode MAJEUR
        if (deg === 'I' || deg === 'IV') {
          return 'M7' // 7ème majeure (Maj7)
        } else if (deg === 'II' || deg === 'III' || deg === 'VI') {
          return 'm7' // 7ème mineure (min7)
        } else if (deg === 'V') {
          return '7' // Dominante 7ème (Dom7)
        } else if (deg === 'VII') {
          return 'Ø' // Semidiminué
        }
      } else if (mode === 'minor') {
        // Mode MINEUR
        if (deg === 'I') {
          return 'mM7' // Mineur majeur (mMaj7) - 1er degré en mode mineur
        } else if (deg === 'IV') {
          return 'm7' // 7ème mineure (min7)
        } else if (deg === 'II') {
          return 'Ø' // Semidiminué
        } else if (deg === 'III' || deg === 'VI') {
          return 'M7' // 7ème majeure (Maj7)
        } else if (deg === 'V') {
          return '7' // Dominante 7ème (Dom7)
        } else if (deg === 'VII') {
          return 'o7' // Diminué complet (o7 barré - le barré sera appliqué via CSS)
        }
      }
    }
    
    // Pour les autres chiffrages (9, 11, 13, 54), pas d'indice pour l'instant
    return null
  }

  // Distinction fonctions principales vs parallèles (théorie riemannienne)
  const PRIMARY_DEGREES = {
    'T': ['I'],
    'SD': ['IV'],
    'D': ['V']
  }
  
  const PARALLEL_DEGREES = {
    'T': ['III', 'VI'],
    'SD': ['II', 'VI'],
    'D': ['VII', 'III']  // III est aussi Dp, mais VI n'est que Tp et SDp
  }

  const PRIMARY_SPECIAL_ROOTS = {
    'SD': [] // Pas de racine spéciale principale pour SD
  }

  const PARALLEL_SPECIAL_ROOTS = {
    'SD': ['N'],  // Sixte napolitaine = SD parallèle
    'D': ['It', 'Fr', 'Gr']  // Sixtes augmentées = D parallèles
  }

  const highlightedDegrees = useMemo(() => 
    selectedFunction ? FUNCTION_TO_DEGREES[selectedFunction] || [] : []
  , [selectedFunction])

  // Degrés principaux vs parallèles pour une fonction donnée
  const getDegreeType = (deg, func) => {
    if (PRIMARY_DEGREES[func]?.includes(deg)) return 'primary'
    if (PARALLEL_DEGREES[func]?.includes(deg)) return 'parallel'
    return null
  }

  // Racines spéciales principales vs parallèles
  const getSpecialRootType = (root, func) => {
    if (PRIMARY_SPECIAL_ROOTS[func]?.includes(root)) return 'primary'
    if (PARALLEL_SPECIAL_ROOTS[func]?.includes(root)) return 'parallel'
    return null
  }

  // Mapping des racines spéciales vers les fonctions
  const SPECIAL_ROOT_TO_FUNCTION = {
    'N': 'SD',   // Sixte napolitaine → Sous-Dominante
    'It': 'D',   // Sixte italienne → Dominante
    'Fr': 'D',   // Sixte française → Dominante
    'Gr': 'D'    // Sixte allemande → Dominante
  }

  // Racines spéciales correspondant à chaque fonction
  const FUNCTION_TO_SPECIAL_ROOTS = {
    'SD': ['N'],
    'D': ['It', 'Fr', 'Gr']
  }

  // Fonctions correspondant au degré sélectionné (coloration inverse)
  // Un degré peut appartenir à plusieurs fonctions
  const degreeFunctions = useMemo(() => {
    if (degree && !selectedFunction && !specialRoot) {
      const functions = DEGREE_TO_FUNCTIONS[degree] || []
      // Les fonctions sont déjà correctement définies dans DEGREE_TO_FUNCTIONS
      // III = ['T', 'D'], VI = ['T', 'SD']
      return functions
    }
    return []
  }, [degree, selectedFunction, specialRoot])

  // Fonction correspondant à la racine spéciale sélectionnée
  const specialRootFunction = useMemo(() => {
    if (specialRoot && !selectedFunction && !degree) {
      return SPECIAL_ROOT_TO_FUNCTION[specialRoot] || null
    }
    return null
  }, [specialRoot, selectedFunction, degree])

  // Racines spéciales à illuminer selon la fonction sélectionnée
  const highlightedSpecialRoots = useMemo(() => {
    if (selectedFunction) {
      return FUNCTION_TO_SPECIAL_ROOTS[selectedFunction] || []
    }
    return []
  }, [selectedFunction])

  const chordData = { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, degreeMode }
  // Valide si on a un degré, une racine spéciale, OU une fonction sélectionnée
  const isValid = !!degree || !!specialRoot || !!selectedFunction

  // --- JSX STRUCTURE ---
  const modalContent = (
    <div className="flex flex-col w-full h-full max-w-4xl bg-zinc-900 md:rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 animate-zoom-in">
      
      {/* HEADER: Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setDegree('')
              setAccidental('')
              setQuality('')
              setFigure('')
              setIsBorrowed(false)
              setSpecialRoot(null)
              setSelectedFunction(null)
              setCadence(null)
            }}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1.5 rounded hover:bg-zinc-800"
            title="Réinitialiser"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
          <span className="ml-3 text-zinc-400 text-xs font-bold tracking-widest uppercase">Editeur de Fonction Tonale</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#18181b]">
        {/* CONTROL GRID */}
        <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          
          {/* LEFT COLUMN: CHORD DISPLAY + CADENCE/VALIDER (3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-4 md:gap-6">
            {/* CHORD DISPLAY - Sticky */}
            <div className="sticky top-4 z-10">
              <ChordDisplay data={chordData} degreeMode={degreeMode} />
            </div>
            
            {/* MODE SELECTOR - Desktop uniquement */}
            <div className="hidden md:block bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex-shrink-0">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Mode</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { value: 'generic', shortLabel: 'STD' },
                        { value: 'major', shortLabel: 'MAJ' },
                        { value: 'minor', shortLabel: 'MIN' }
                    ].map(mode => (
                        <button
                            key={mode.value}
                            onClick={() => handleDegreeModeChange(mode.value)}
                            className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all ${
                                degreeMode === mode.value 
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            {mode.shortLabel}
                        </button>
                    ))}
                </div>
            </div>

            {/* CADENCE & VALIDER - Desktop uniquement */}
            <div className="hidden md:block bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex flex-col flex-grow min-h-0">
                <div className="flex-grow flex flex-col justify-center mb-4 min-h-0">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block flex-shrink-0">Cadence (Optionnel)</label>
                    <div className="flex flex-wrap gap-1.5 items-start overflow-auto">
                        {CADENCES.map(cad => (
                            <button
                                key={cad.value}
                                onClick={() => setCadence(cadence === cad.value ? null : cad.value)}
                                className={`px-2 py-1 rounded-full font-bold transition-all flex-shrink-0 ${
                                    cadence === cad.value 
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                                style={{ fontSize: 'clamp(0.625rem, 1.2vw + 0.3rem, 0.75rem)' }}
                            >
                                {cad.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-shrink-0">
                    <button
                        onClick={handleValidate}
                        disabled={!isValid}
                        className={`
                            w-full h-16 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200
                            ${isValid 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/40 transform hover:-translate-y-1 hover:scale-[1.02] ring-2 ring-indigo-400/30' 
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                            }
                        `}
                    >
                        <span className="text-xl font-extrabold tracking-wide">VALIDER</span>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CONTROLS (9 cols) - Par ordre d'importance */}
          <div className="md:col-span-9 flex flex-col gap-4 md:gap-6">
            
            {/* 1. FONCTIONS TONALES - Le plus important */}
            <div className="bg-zinc-950/50 p-3 md:p-4 rounded-xl border border-white/5">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Fonction Tonale</label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {FUNCTIONS.map(f => {
                  // Illuminer si le degré sélectionné appartient à cette fonction
                  const isHighlighted = (degreeFunctions.includes(f.value) || specialRootFunction === f.value) && !selectedFunction
                  // Si plusieurs fonctions sont possibles pour le degré sélectionné
                  const isMultiFunctionHighlight = degree === degree && degreeFunctions.length > 1 && degreeFunctions.includes(f.value)
                  return (
                    <Pad 
                      key={f.value} 
                      label={f.label}
                      subLabel={f.fullLabel} 
                      color={f.color}
                      active={selectedFunction === f.value} 
                      highlighted={isHighlighted}
                      onClick={() => {
                        if (selectedFunction === f.value) {
                          setSelectedFunction(null)
                        } else {
                          setSelectedFunction(f.value)
                          // Annuler le degré et autres éléments si une fonction est sélectionnée
                          setDegree('')
                          setAccidental('')
                          setQuality('')
                          setFigure('')
                          setIsBorrowed(false)
                          setSpecialRoot(null)
                        }
                      }}
                      className={`h-14 md:h-16 text-xl ${
                        isHighlighted 
                          ? isMultiFunctionHighlight
                            ? 'ring-1 ring-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.3)] border border-purple-400/40'
                            : f.value === 'T' 
                            ? 'ring-2 ring-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                            : f.value === 'SD' 
                            ? 'ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                            : 'ring-2 ring-rose-400/50 shadow-[0_0_10px_rgba(225,29,72,0.3)]'
                          : ''
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* 2. DEGRES */}
            <div className={`bg-zinc-950/50 p-3 md:p-4 rounded-xl border transition-all duration-300 ${
              selectedFunction === 'T' || degreeFunctions.includes('T') || specialRootFunction === 'T'
                ? selectedFunction === 'SD' || degreeFunctions.includes('SD') || specialRootFunction === 'SD' || selectedFunction === 'D' || degreeFunctions.includes('D') || specialRootFunction === 'D'
                  ? 'border-purple-500/50 bg-purple-950/20' // Plusieurs fonctions possibles
                  : 'border-blue-500/50 bg-blue-950/20'
                : selectedFunction === 'SD' || degreeFunctions.includes('SD') || specialRootFunction === 'SD'
                ? selectedFunction === 'D' || degreeFunctions.includes('D') || specialRootFunction === 'D'
                  ? 'border-purple-500/50 bg-purple-950/20' // Plusieurs fonctions possibles
                  : 'border-amber-500/50 bg-amber-950/20'
                : selectedFunction === 'D' || degreeFunctions.includes('D') || specialRootFunction === 'D'
                ? 'border-rose-500/50 bg-rose-950/20'
                : 'border-white/5'
            }`}>
              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Degré</label>
              <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                {DEGREES.map(deg => {
                  // Fonctions possibles pour ce degré (peut être plusieurs)
                  const degFunctions = DEGREE_TO_FUNCTIONS[deg] || []
                  const degHasMultipleFunctions = deg === 'III' || deg === 'VI'
                  // Les fonctions sont déjà correctement définies dans DEGREE_TO_FUNCTIONS
                  const allDegFunctions = degFunctions
                  
                  // Couleur basée sur selectedFunction OU degreeFunctions OU specialRootFunction
                  const activeFunction = selectedFunction || (degree === deg ? allDegFunctions[0] : null) || specialRootFunction
                  const funcColor = activeFunction ? FUNCTIONS.find(f => f.value === activeFunction)?.color : null
                  // Highlight uniquement si une fonction est sélectionnée (pas si juste un degré)
                  const isFunctionDegree = selectedFunction ? highlightedDegrees.includes(deg) : false
                  // Type de degré (principal ou parallèle) pour chaque fonction
                  const isPrimaryForT = selectedFunction === 'T' && PRIMARY_DEGREES['T']?.includes(deg)
                  const isParallelForT = selectedFunction === 'T' && PARALLEL_DEGREES['T']?.includes(deg)
                  const isPrimaryForSD = selectedFunction === 'SD' && PRIMARY_DEGREES['SD']?.includes(deg)
                  const isParallelForSD = selectedFunction === 'SD' && PARALLEL_DEGREES['SD']?.includes(deg)
                  const isPrimaryForD = selectedFunction === 'D' && PRIMARY_DEGREES['D']?.includes(deg)
                  const isParallelForD = selectedFunction === 'D' && PARALLEL_DEGREES['D']?.includes(deg)
                  
                  // Si le degré appartient à plusieurs fonctions (sans fonction sélectionnée)
                  const isMultiFunction = !selectedFunction && degree === deg && degHasMultipleFunctions
                  
                  const degreeLabel = getDegreeLabel(deg, degreeMode)
                  const degreeNature = getDegreeNature(deg, degreeMode)
                  
                  return (
                    <Pad 
                      key={deg} 
                      label={degreeLabel}
                      subLabel={degreeNature}
                      active={degree === deg}
                      highlighted={isFunctionDegree}
                      color={funcColor || 'indigo'} // Adapte la couleur à la fonction
                      onClick={() => handleDegreeClick(deg)}
                      className={`h-14 md:h-16 text-xl font-serif ${
                        isFunctionDegree && selectedFunction 
                          ? isPrimaryForT || isPrimaryForSD || isPrimaryForD
                            ? selectedFunction === 'T' 
                              ? 'ring-2 ring-blue-400/80 shadow-[0_0_30px_rgba(59,130,246,0.8),0_0_60px_rgba(59,130,246,0.4),inset_0_0_30px_rgba(59,130,246,0.2)] border-2 border-blue-400/60 bg-gradient-to-br from-blue-400/45 via-blue-400/25 to-blue-400/10' 
                              : selectedFunction === 'SD' 
                              ? 'ring-2 ring-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.8),0_0_60px_rgba(245,158,11,0.4),inset_0_0_30px_rgba(245,158,11,0.2)] border-2 border-amber-400/60 bg-gradient-to-br from-amber-400/45 via-amber-400/25 to-amber-400/10' 
                              : 'ring-2 ring-rose-400/80 shadow-[0_0_30px_rgba(225,29,72,0.8),0_0_60px_rgba(225,29,72,0.4),inset_0_0_30px_rgba(225,29,72,0.2)] border-2 border-rose-400/60 bg-gradient-to-br from-rose-400/45 via-rose-400/25 to-rose-400/10'
                            : isParallelForT || isParallelForSD || isParallelForD
                            ? selectedFunction === 'T' 
                              ? 'ring-2 ring-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.4)] border border-blue-400/40' 
                              : selectedFunction === 'SD' 
                              ? 'ring-2 ring-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-amber-400/40' 
                              : 'ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(225,29,72,0.4)] border border-rose-400/40'
                            : ''
                          : isMultiFunction
                          ? 'ring-1 ring-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-400/40'
                          : ''
                      }`}
                    />
                  )
                })}
              </div>
              
              {/* SPECIAL ROOTS */}
              <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/5">
                {SPECIAL_ROOTS.map(spec => {
                  const specFunction = SPECIAL_ROOT_TO_FUNCTION[spec.value]
                  const funcColor = specFunction ? FUNCTIONS.find(f => f.value === specFunction)?.color : null
                  const isHighlighted = highlightedSpecialRoots.includes(spec.value)
                  // Toutes les racines spéciales sont parallèles (pas de principales)
                  const isParallel = isHighlighted && selectedFunction
                  
                  return (
                    <Pad 
                      key={spec.value}
                      label={spec.label}
                      stackedTop={spec.value === 'N' ? 'II' : spec.label}
                      stackedBottom={spec.value === 'N' ? '♭6' : spec.sup}
                      active={specialRoot === spec.value}
                      highlighted={isHighlighted}
                      onClick={() => handleSpecialRootClick(spec.value)}
                      className={`h-12 font-serif ${
                        isParallel
                          ? selectedFunction === 'SD'
                            ? 'ring-2 ring-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] border-2 border-amber-400/40'
                            : 'ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(225,29,72,0.4)] border-2 border-rose-400/40'
                          : ''
                      }`}
                      color={funcColor || 'rose'}
                    />
                  )
                })}
              </div>
            </div>

            {/* 3. ALTERATIONS & CHIFFRAGES - Sur la même ligne */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
              {/* CHIFFRAGES - 3/5 de la largeur (plus important) - En premier sur mobile */}
              <div className="md:col-span-3 order-1 md:order-2 bg-zinc-950/50 p-3 md:p-4 rounded-xl border border-white/5">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Chiffrage</label>
                <div className="grid grid-cols-4 gap-2">
                  {FIGURES.map(fig => {
                    // Obtenir l'indice contextuel pour ce chiffrage
                    const figureHint = getFigureHint(fig.value, degree, degreeMode)
                    
                    return (
                      <Pad 
                        key={fig.value}
                        label={fig.isStacked ? null : fig.display}
                        subLabel={figureHint}
                        stackedTop={fig.isStacked ? fig.displayArray[0] : null}
                        stackedBottom={fig.isStacked ? fig.displayArray[1] : null}
                        active={figure === fig.value}
                        disabled={!!selectedFunction}
                        onClick={() => setFigure(figure === fig.value ? '' : fig.value)}
                        className="h-12 font-sans"
                      />
                    )
                  })}
                </div>
              </div>

              {/* ALTERATIONS - 2/5 de la largeur - En deuxième sur mobile */}
              <div className="md:col-span-2 order-2 md:order-1 bg-zinc-950/50 p-3 md:p-4 rounded-xl border border-white/5">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Altérations</label>
                {/* EMPRUNT - En haut, plus important */}
                <div className="mb-3">
                   <Pad label="Emprunt" active={isBorrowed} disabled={(!degree && !selectedFunction) || !!specialRoot} onClick={() => setIsBorrowed(!isBorrowed)} className="w-full h-12 text-sm font-semibold" color="gray" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ACCIDENTALS.map(acc => (
                    <Pad 
                      key={acc.value}
                      label={acc.symbol}
                      active={accidental === acc.value}
                      disabled={!!specialRoot || !!selectedFunction}
                      onClick={() => setAccidental(accidental === acc.value ? '' : acc.value)}
                      className="h-12 text-lg"
                      color="amber"
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <Pad label="o" active={quality === '°'} disabled={!!specialRoot || !!selectedFunction} onClick={() => setQuality(quality === '°' ? '' : '°')} className="h-12 text-2xl" />
                    <Pad label="+" active={quality === '+'} disabled={!!specialRoot || !!selectedFunction} onClick={() => setQuality(quality === '+' ? '' : '+')} className="h-12" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER: MODE, CADENCES & ACTIONS - Mobile uniquement en bas */}
        <div className="md:hidden mt-4 space-y-4">
            {/* MODE SELECTOR - Mobile */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Mode</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { value: 'generic', label: 'STANDARD' },
                        { value: 'major', label: 'MAJEUR' },
                        { value: 'minor', label: 'MINEUR' }
                    ].map(mode => (
                        <button
                            key={mode.value}
                            onClick={() => handleDegreeModeChange(mode.value)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                degreeMode === mode.value 
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex flex-col items-start gap-4">
            <div className="w-full">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Cadence (Optionnel)</label>
                <div className="flex flex-wrap gap-2">
                    {CADENCES.map(cad => (
                        <button
                            key={cad.value}
                            onClick={() => setCadence(cadence === cad.value ? null : cad.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                cadence === cad.value 
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            {cad.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full">
                <button
                    onClick={handleValidate}
                    disabled={!isValid}
                    className={`
                        w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200
                        ${isValid 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                        }
                    `}
                >
                    <span>VALIDER</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
            </div>
            </div>
        </div>
        </div>

      </div>
    </div>
  )

  if (!isOpen) return null

  // Wrapper pour le backdrop si non-embedded
  const wrapper = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-4xl h-[90vh]">
        {modalContent}
      </div>
    </div>
  )

  if (embedded) return wrapper // Si embedded, on retourne juste le wrapper (ou content selon ton besoin exact)
  return createPortal(wrapper, document.body)
}

export default ChordSelectorModal