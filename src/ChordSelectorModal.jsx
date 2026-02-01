import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FUNCTION_TO_DEGREES, FUNCTION_COLORS, DEGREE_TO_FUNCTIONS } from './utils/riemannFunctions'
import { ChordLabelFigure } from './components/ChordLabel'
import ChordLabel from './components/ChordLabel'
import { getQcmOptions, getFunctionForOptionLabel, formatChordString as formatChordStringQcm } from './utils/qcmOptions'
import { parseChordDisplayString } from './utils/chordFormatter'

/* --- 1. CONSTANTES & CONFIGURATION --- */
const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

const FUNCTIONS = [
  { value: 'T', label: 'T', fullLabel: 'Tonique', color: 'blue' },
  { value: 'SD', label: 'SD', fullLabel: 'Sous-Dominante', color: 'violet' },
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

export const CADENCES = [
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
  dimmed,
  suppressDefaultHighlight = false,
  className = '', 
  stackedTop, 
  stackedBottom 
}) => {
  // Mapping des couleurs pour l'effet "néon"
  const colorMap = {
    blue: 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-400',
    amber: 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.5)] border-amber-400',
    violet: 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.5)] border-violet-400',
    rose: 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] border-pink-400',
    indigo: 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] border-indigo-400',
    gray: 'bg-zinc-600 shadow-none border-zinc-500'
  }

  const activeClass = active ? `${colorMap[color]} text-white scale-[0.98] border-2` : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
  // Ne pas appliquer le ring gris quand le parent fournit son propre ring coloré (ex. T/SD/D en couleur fonction)
  const highlightClass = (!active && highlighted && !suppressDefaultHighlight) ? 'ring-1 ring-white/30 bg-white/5 text-zinc-200' : ''
  const dimmedClass = dimmed && !active ? 'opacity-45 pointer-events-auto' : ''
  
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
        ${dimmedClass}
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
 * Fonction principale pour un degré (affichage cohérent avec les boutons T/SD/D)
 */
function getPrimaryFunctionForDegree(degree) {
  const map = { I: 'T', II: 'SD', III: 'T', IV: 'SD', V: 'D', VI: 'T', VII: 'D' }
  return map[degree] || (DEGREE_TO_FUNCTIONS[degree]?.[0] ?? null)
}

/**
 * Construit un objet chord-like à partir d'une chaîne d'affichage QCM (ex. "V7", "II♭6", "cad6/4").
 * Utilisé pour alimenter ChordDisplay en mode QCM.
 */
function parseDisplayStringToChordData(displayString, functionKey) {
  if (!displayString || typeof displayString !== 'string') {
    return functionKey ? { selectedFunction: functionKey } : {}
  }
  const { leading, figure } = parseChordDisplayString(displayString)
  const result = { selectedFunction: functionKey || null, degreeMode: 'generic' }
  let figValue = null
  if (figure) {
    if (figure.stacked && figure.digits) {
      const joined = figure.digits.join('/')
      if (joined === '6/4') figValue = '64'
      else if (joined === '6/5') figValue = '65'
      else if (joined === '4/3') figValue = '43'
      else if (joined === '5/4') figValue = '54'
      else figValue = figure.digits[0]
    } else figValue = figure.value || null
  }
  result.figure = figValue || ''
  // Cad. 6/4 : accepter "Cad.", "Cad. ", "cad", etc. (robustesse si espace ou variante)
  const leadingNorm = (leading && typeof leading === 'string') ? leading.trim() : ''
  if (leadingNorm === 'cad' || leadingNorm === 'Cad.') {
    result.degree = 'I'
    result.figure = '64'
    result.sixFourVariant = 'cadential'
    return result
  }
  if (leading === 'It+6' || leading === 'Fr+6' || leading === 'Gr+6') {
    result.specialRoot = leading === 'It+6' ? 'It' : leading === 'Fr+6' ? 'Fr' : 'Gr'
    result.figure = ''
    return result
  }
  let lead = leading
  if (/^[♭#♯]/.test(lead)) {
    result.accidental = lead[0] === '♭' ? 'b' : '#'
    lead = lead.slice(1)
  }
  const romanMatch = lead.match(/^(VII|VI|IV|III|II|I|V)(°?)$/i)
  if (romanMatch) {
    result.degree = romanMatch[1].toUpperCase()
    if (romanMatch[2] === '°') result.quality = '°'
    if (result.degree === 'II' && result.accidental === 'b') result.specialRoot = 'N'
    return result
  }
  if (leading.includes('II') && (leading.includes('♭') || leading.includes('b'))) {
    result.degree = 'II'
    result.accidental = 'b'
    result.specialRoot = 'N'
    return result
  }
  return result
}

/**
 * Dérive la fonction effective pour la coloration (T, SD, D) à partir des données accord.
 */
function getEffectiveFunctionForDisplay(data) {
  const { degree, figure, specialRoot, selectedFunction, sixFourVariant } = data
  if (selectedFunction) return selectedFunction
  if (specialRoot === 'N') return 'SD'
  if (specialRoot === 'It' || specialRoot === 'Fr' || specialRoot === 'Gr') return 'D'
  if (degree === 'I' && figure === '64' && (sixFourVariant === 'passing' || sixFourVariant === 'cadential')) return 'D'
  if (degree) return getPrimaryFunctionForDegree(degree)
  return null
}

/**
 * Écran LCD style Hardware
 * Affiche le résultat de l'accord construit.
 * Si displayAsFunctions=true (mode parcours / mode fonctions), affiche T/SD/D comme les boutons de sélection.
 * size: 'compact' | 'normal' | 'large' pilote la hauteur du conteneur et l'échelle du texte.
 */
const ChordDisplay = ({ data, degreeMode = 'generic', displayAsFunctions = false, compact = false, size }) => {
  const { degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, sixFourVariant, pedalDegree } = data
  const effectiveFunc = getEffectiveFunctionForDisplay(data)
  const funcColorClass = effectiveFunc === 'T' ? 'text-blue-400' : effectiveFunc === 'SD' ? 'text-violet-400' : effectiveFunc === 'D' ? 'text-pink-400' : 'text-white'
  const sizeMode = size || (compact ? 'compact' : 'normal')
  const containerHeightClass = sizeMode === 'compact' ? 'h-28 md:h-32' : sizeMode === 'large' ? 'h-44 md:h-56' : 'h-40 md:h-52'
  const degreeSizeClass = sizeMode === 'compact' ? 'text-5xl' : sizeMode === 'large' ? 'text-8xl' : 'text-7xl'
  const figureSizeClass = sizeMode === 'compact' ? 'text-3xl' : sizeMode === 'large' ? 'text-6xl' : 'text-5xl'

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
    // Affichage en mode fonction (T/SD/D) pour cohérence avec les boutons de sélection (parcours / mode fonctions)
    if (displayAsFunctions) {
      let funcValue = selectedFunction || null
      if (specialRoot) {
        if (specialRoot === 'N') funcValue = 'SD'
        else if (specialRoot === 'It' || specialRoot === 'Fr' || specialRoot === 'Gr') funcValue = 'D'
      } else if (degree) {
        // I64 en passage ou cadence → dominante (V64 / cad64)
        if (degree === 'I' && figure === '64' && (sixFourVariant === 'passing' || sixFourVariant === 'cadential')) {
          funcValue = funcValue || 'D'
        } else {
          funcValue = funcValue || getPrimaryFunctionForDegree(degree)
        }
      }
      if (funcValue) {
        const func = FUNCTIONS.find(f => f.value === funcValue)
        if (func) {
          const figObj = figure ? FIGURES.find(f => f.value === figure) : null
          const funcColor = func.color === 'blue' ? 'text-blue-400' : func.color === 'violet' ? 'text-violet-400' : 'text-pink-400'
          return (
            <div className="flex items-baseline gap-1 font-chord text-white">
              {isBorrowed && <span className="text-5xl text-zinc-500 font-light">(</span>}
              <span className={`${degreeSizeClass} font-bold tracking-tight shadow-black drop-shadow-lg ${funcColor}`}>
                {func.value}
              </span>
              {figObj && figure !== '5' && (
                <ChordLabelFigure
                  figure={figure}
                  className={`ml-2 relative -top-3 font-chord font-medium ${figureSizeClass} ${funcColor}`}
                />
              )}
              {isBorrowed && <span className="text-5xl text-zinc-500 font-light">)</span>}
            </div>
          )
        }
      }
      if (!degree && !selectedFunction && !specialRoot) {
        return <span className="text-zinc-600 italic font-light tracking-widest text-lg">EN ATTENTE...</span>
      }
    }

    if (specialRoot) {
      const spec = SPECIAL_ROOTS.find(s => s.value === specialRoot)
      if (!spec) return null
      // Cas particulier Napolitaine
      if (spec.value === 'N') {
        const napolitaineLabel = getDegreeLabel('II', degreeMode)
        const hasDiminished = napolitaineLabel.includes('°')
        const degreeWithoutSymbol = napolitaineLabel.replace('°', '')
        return (
          <div className={`flex items-baseline font-chord ${funcColorClass}`}>
            <span className={`${degreeSizeClass} font-bold`}>{degreeWithoutSymbol}</span>
            {hasDiminished && <span className="text-4xl text-zinc-300 ml-1">°</span>}
            <span className={`${figureSizeClass} ml-2 relative -top-3`}><span className="text-amber-400">♭</span>6</span>
          </div>
        )
      }
      return (
        <div className={`flex items-baseline font-chord ${funcColorClass}`}>
          <span className={`${degreeSizeClass} font-bold`}>{spec.label}</span>
          <span className={`${figureSizeClass} align-super ml-1 relative -top-5`}>{spec.sup}</span>
        </div>
      )
    }

    // Si une fonction est sélectionnée sans degré, afficher la fonction
    if (selectedFunction && !degree) {
      const func = FUNCTIONS.find(f => f.value === selectedFunction)
      if (func) {
        const funcColor = func.color === 'blue' ? 'text-blue-400' : func.color === 'violet' ? 'text-violet-400' : 'text-pink-400'
        return (
          <div className="flex items-center justify-center font-chord text-white">
            {isBorrowed && <span className="text-5xl text-zinc-500 font-light">(</span>}
            <span className={`${degreeSizeClass} font-bold tracking-tight shadow-black drop-shadow-lg ${funcColor}`}>
              {func.value}
            </span>
            {isBorrowed && <span className="text-5xl text-zinc-500 font-light">)</span>}
          </div>
        )
      }
    }

    if (!degree) return <span className="text-zinc-600 italic font-light tracking-widest text-lg">EN ATTENTE...</span>

    const figObj = FIGURES.find(f => f.value === figure)
    // I64 dépendant du contexte : V64 (passage), cad64 (cadence), ou I64 (avancé)
    const isI64 = degree === 'I' && figure === '64'
    const displayDegreeRaw = isI64 && sixFourVariant === 'passing' ? 'V'
      : isI64 && sixFourVariant === 'cadential' ? 'cad'
      : degree
    const displayDegree = displayDegreeRaw === 'cad' ? 'Cad.' : getDegreeLabel(displayDegreeRaw, degreeMode)
    const hasDiminished = displayDegree.includes('°')
    const degreeWithoutSymbol = displayDegree.replace('°', '')
    const isCad64Display = displayDegreeRaw === 'cad'

    return (
      <div className={`flex items-baseline gap-1 font-chord ${funcColorClass}`}>
        {isBorrowed && <span className="text-5xl text-zinc-500 font-light">(</span>}
        
        {accidental && !isCad64Display && <span className="text-4xl text-amber-400 font-light mr-1">{accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '♮'}</span>}
        
        <span className={`${isCad64Display ? 'text-3xl' : degreeSizeClass} font-bold tracking-tight shadow-black drop-shadow-lg`}>{degreeWithoutSymbol}</span>
        
        {(hasDiminished || (quality === '°' && !isCad64Display)) && <span className="text-4xl text-zinc-300 ml-1">°</span>}
        {quality && quality !== '°' && !isCad64Display && <span className="text-4xl text-zinc-300 ml-1">{quality}</span>}

        {figObj && figure !== '5' && (
          <ChordLabelFigure
            figure={figure}
            className={`ml-2 relative -top-3 font-chord font-medium ${figureSizeClass}`}
          />
        )}
        {pedalDegree && (
          <>
            <span className="text-zinc-500 mx-1 font-light" style={{ fontSize: '0.6em' }}>/</span>
            <span className={`${figureSizeClass} font-bold opacity-90`}>{pedalDegree}</span>
          </>
        )}
        {isBorrowed && <span className="text-5xl text-zinc-500 font-light">)</span>}
      </div>
    )
  }

  return (
    <div className={`w-full bg-black rounded-xl border-4 border-zinc-800 shadow-inner relative overflow-hidden flex items-center justify-center mb-3 md:mb-0 group font-chord ${containerHeightClass}`}>
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
  studentMode = false,
  progressionMode = 'full', // 'functions' | 'qcm' | 'full'
  parcoursContext = null,   // { nodeId, phase, enabledFunctions, unlockedChordKeys } en mode parcours
  expectedCadence = false,   // true si le marqueur attend une cadence (réponse obligatoire)
  // Mode QCM uniquement
  qcmCorrectChord = null,
  qcmAllChords = null,
  qcmQuestionId = null,
  nodeProgress = null,
  currentQuestion = null,
  totalQuestions = null
}) {
  const isQcmMode = progressionMode === 'qcm'
  const enabledFunctions = parcoursContext?.enabledFunctions ?? ['T', 'SD', 'D']
  const cadenceAvailable = parcoursContext?.cadenceAvailable !== false
  const effectiveExpectedCadence = expectedCadence && cadenceAvailable
  // En mode Parcours : n'afficher que les cadences débloquées (une par carte cadence débloquée)
  const cadencesToShow = useMemo(() => {
    const unlocked = parcoursContext?.unlockedCadenceValues
    if (Array.isArray(unlocked) && unlocked.length > 0) return CADENCES.filter(c => unlocked.includes(c.value))
    return CADENCES
  }, [parcoursContext?.unlockedCadenceValues])

  // En mode Parcours : degrés/racines et chiffrages autorisés par unlockedChordKeys (pour raccourcis clavier)
  const FULL_DEGREE_ITEMS = [
    { type: 'degree', value: 'I' }, { type: 'degree', value: 'II' }, { type: 'degree', value: 'III' },
    { type: 'degree', value: 'IV' }, { type: 'degree', value: 'V' }, { type: 'degree', value: 'VI' },
    { type: 'degree', value: 'VII' },
    { type: 'specialRoot', value: 'N' }, { type: 'specialRoot', value: 'It' }, { type: 'specialRoot', value: 'Fr' }, { type: 'specialRoot', value: 'Gr' }
  ]
  const FULL_FIGURES = ['5', '6', '64', '7', '65', '43', '2', '9', '11', '13', '54']
  const { allowedDegreeItems, allowedFigures } = useMemo(() => {
    const keys = parcoursContext?.unlockedChordKeys
    if (!Array.isArray(keys) || keys.length === 0) {
      return { allowedDegreeItems: FULL_DEGREE_ITEMS, allowedFigures: FULL_FIGURES }
    }
    const allowedDegrees = new Set()
    const allowedSpecialRoots = new Set()
    const allowedFigSet = new Set()
    for (const k of keys) {
      if (k === 'N6') { allowedSpecialRoots.add('N'); allowedFigSet.add('6'); continue }
      if (k === 'It' || k === 'Fr' || k === 'Gr') { allowedSpecialRoots.add(k); continue }
      const m = k.match(/^(I|II|III|IV|V|VI|VII)(.*)$/)
      if (m) {
        allowedDegrees.add(m[1])
        const suf = m[2]
        if (suf === '') allowedFigSet.add('5')
        else if (['6', '64', '7', '65', '43', '2', '9', '11', '13', '54'].includes(suf)) allowedFigSet.add(suf)
        else if (suf === '64') allowedFigSet.add('64')
      }
    }
    const allowedDegreeItems = FULL_DEGREE_ITEMS.filter(
      item => item.type === 'degree' ? allowedDegrees.has(item.value) : allowedSpecialRoots.has(item.value)
    )
    const allowedFigures = FULL_FIGURES.filter(f => allowedFigSet.has(f))
    return {
      allowedDegreeItems: allowedDegreeItems.length ? allowedDegreeItems : FULL_DEGREE_ITEMS,
      allowedFigures: allowedFigures.length ? allowedFigures : FULL_FIGURES
    }
  }, [parcoursContext?.unlockedChordKeys])

  // --- STATE ---
  const [degree, setDegree] = useState('')
  const [accidental, setAccidental] = useState('')
  const [quality, setQuality] = useState('')
  const [figure, setFigure] = useState('')
  const [isBorrowed, setIsBorrowed] = useState(false)
  const [specialRoot, setSpecialRoot] = useState(null)
  const [selectedFunction, setSelectedFunction] = useState(null)
  const [cadence, setCadence] = useState(null)
  // I64 dépendant du contexte : 'passing' = V64 (passage I↔I6), 'cadential' = cad64 (résout sur V/V7), null = I64 (harmonies avancées)
  const [sixFourVariant, setSixFourVariant] = useState(null)
  // Note pédale (accord/basse, ex. II/I) : degré optionnel de la basse
  const [pedalDegree, setPedalDegree] = useState(null)
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
  // Mode QCM : option sélectionnée (chaîne affichée)
  const [selectedOption, setSelectedOption] = useState(null)
  const validateButtonRef = useRef(null)

  // Viewport court : adapter ChordDisplay et boutons (QCM/compact)
  const [isShortViewport, setIsShortViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-height: 560px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 560px)')
    const onChange = () => setIsShortViewport(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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
      setSixFourVariant(null)
      setPedalDegree(null)
      if (isQcmMode) setSelectedOption(null)
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
  }, [isOpen, initialChord, studentMode, isQcmMode])

  // En Parcours : annuler la cadence si elle n'est plus dans les cadences débloquées
  const unlockedValues = parcoursContext?.unlockedCadenceValues
  useEffect(() => {
    if (Array.isArray(unlockedValues) && unlockedValues.length > 0 && cadence && !unlockedValues.includes(cadence)) {
      setCadence(null)
    }
  }, [unlockedValues, cadence])

  // Charger les données de initialChord quand il change
  useEffect(() => {
    if (initialChord) {
      if (isQcmMode && 'qcmAnswer' in initialChord) {
        setSelectedOption(initialChord.qcmAnswer ?? null)
        setSelectedFunction(initialChord.function ?? null)
        setCadence(initialChord.cadence ?? null)
      } else if (!isQcmMode) {
        setDegree(initialChord.degree || '')
        setAccidental(initialChord.accidental || '')
        setQuality(initialChord.quality || '')
        setFigure(initialChord.figure || '')
        setIsBorrowed(initialChord.isBorrowed || false)
        setSpecialRoot(initialChord.specialRoot || null)
        setSelectedFunction(initialChord.selectedFunction || null)
        setCadence(initialChord.cadence || null)
        setSixFourVariant(initialChord.sixFourVariant ?? null)
        setPedalDegree(initialChord.pedalDegree ?? null)
      }
      // En mode élève : 
      // - Si l'accord est déjà rempli (a un degreeMode), utiliser ce mode pour ne pas le modifier
      // - Sinon (accord non rempli), utiliser le mode depuis localStorage pour les accords suivants
      // En mode prof : garder le comportement actuel
      let modeToUse
      if (studentMode) {
        // Mode élève : si l'accord a déjà un degreeMode (déjà rempli), l'utiliser
        // Sinon, utiliser le localStorage pour les accords non remplis et suivants
        if (initialChord.degreeMode) {
          // Accord déjà rempli : conserver son mode
          modeToUse = initialChord.degreeMode
        } else {
          // Accord non rempli : utiliser le mode depuis localStorage pour les accords suivants
          const savedMode = localStorage.getItem('chordSelectorDegreeModeStudent')
          modeToUse = savedMode || 'generic'
        }
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
  }, [initialChord, studentMode, isQcmMode])
  
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

  // Calculer isValid avant le useEffect des raccourcis clavier
  const isValid = !!degree || !!specialRoot || !!selectedFunction

  // Mode QCM : options et validité
  const useCloseLures = isQcmMode && nodeProgress && (nodeProgress.attempts ?? 0) >= 3 && (nodeProgress.averageScore ?? 0) >= 75
  const qcmOptions = useMemo(() => {
    if (!isQcmMode || !qcmCorrectChord) return []
    return getQcmOptions(qcmCorrectChord, qcmAllChords || [], useCloseLures, qcmQuestionId ?? 0)
  }, [isQcmMode, qcmCorrectChord, qcmAllChords, useCloseLures, qcmQuestionId])
  const qcmCorrectStr = isQcmMode && qcmCorrectChord ? formatChordStringQcm(qcmCorrectChord) : ''
  const qcmIsValidForMode = isQcmMode && (selectedOption !== null || selectedFunction !== null) && (!effectiveExpectedCadence || !!cadence)

  // --- RACCOURCIS CLAVIER ---
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      // Ignorer si dans un input/textarea ou élément éditable
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.isContentEditable) {
        return
      }

      const key = e.key

      // Mode QCM : flèches pour parcourir les options, Entrée pour valider
      if (isQcmMode && qcmOptions.length > 0) {
        if (key === 'ArrowDown' || key === 'ArrowRight') {
          e.preventDefault()
          const idx = selectedOption !== null ? qcmOptions.indexOf(selectedOption) : -1
          const nextIdx = idx < qcmOptions.length - 1 ? idx + 1 : 0
          setSelectedOption(qcmOptions[nextIdx])
          setSelectedFunction(null)
          setTimeout(() => validateButtonRef.current?.focus(), 0)
          return
        }
        if (key === 'ArrowUp' || key === 'ArrowLeft') {
          e.preventDefault()
          const idx = selectedOption !== null ? qcmOptions.indexOf(selectedOption) : 0
          const prevIdx = idx > 0 ? idx - 1 : qcmOptions.length - 1
          setSelectedOption(qcmOptions[prevIdx])
          setSelectedFunction(null)
          setTimeout(() => validateButtonRef.current?.focus(), 0)
          return
        }
        if (key === 'Enter' && qcmIsValidForMode) {
          e.preventDefault()
          onValidate({ chord: selectedOption ?? null, cadence: cadence ?? null, function: selectedFunction ?? null })
          return
        }
      }

      // Mode intuition : bloquer flèches haut/bas pour éviter d'écrire figure (ex. T64) quand le focus est sur T/SD/D
      if (progressionMode === 'functions' && (key === 'ArrowUp' || key === 'ArrowDown')) {
        e.preventDefault()
        return
      }

      // Mode intuition : flèches gauche/droite = cycler T / SD / D puis focus sur Valider pour qu'Entrée valide
      if (progressionMode === 'functions' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
        e.preventDefault()
        const order = enabledFunctions?.length ? [...enabledFunctions] : ['T', 'SD', 'D']
        const idx = selectedFunction ? order.indexOf(selectedFunction) : -1
        const nextIdx = key === 'ArrowRight'
          ? (idx < order.length - 1 ? idx + 1 : 0)
          : (idx > 0 ? idx - 1 : order.length - 1)
        const nextFunc = order[nextIdx >= 0 ? nextIdx : 0]
        setSelectedFunction(nextFunc)
        setDegree('')
        setAccidental('')
        setQuality('')
        setFigure('')
        setIsBorrowed(false)
        setSpecialRoot(null)
        setTimeout(() => validateButtonRef.current?.focus(), 0)
        return
      }

      // Fonctions principales : T, S, D — en parcours n'activer que les fonctions débloquées
      if (key === 'T' || key === 't') {
        if (parcoursContext && !enabledFunctions?.includes('T')) return
        e.preventDefault()
        if (selectedFunction === 'T') {
          setSelectedFunction(null)
        } else {
          setSelectedFunction('T')
          setDegree('')
          setAccidental('')
          setQuality('')
          setFigure('')
          setIsBorrowed(false)
          setSpecialRoot(null)
        }
        if (progressionMode === 'functions') setTimeout(() => validateButtonRef.current?.focus(), 0)
        return
      }

      if (key === 'S' || key === 's') {
        if (parcoursContext && !enabledFunctions?.includes('SD')) return
        e.preventDefault()
        if (selectedFunction === 'SD') {
          setSelectedFunction(null)
        } else {
          setSelectedFunction('SD')
          setDegree('')
          setAccidental('')
          setQuality('')
          setFigure('')
          setIsBorrowed(false)
          setSpecialRoot(null)
        }
        if (progressionMode === 'functions') setTimeout(() => validateButtonRef.current?.focus(), 0)
        return
      }

      if (key === 'D' || key === 'd') {
        if (parcoursContext && !enabledFunctions?.includes('D')) return
        e.preventDefault()
        if (selectedFunction === 'D') {
          setSelectedFunction(null)
        } else {
          setSelectedFunction('D')
          setDegree('')
          setAccidental('')
          setQuality('')
          setFigure('')
          setIsBorrowed(false)
          setSpecialRoot(null)
        }
        if (progressionMode === 'functions') setTimeout(() => validateButtonRef.current?.focus(), 0)
        return
      }

      // Flèches droite/gauche : Navigation dans les degrés et accords spéciaux
      if (!selectedFunction) {
        if (key === 'ArrowRight') {
          e.preventDefault()
          const items = allowedDegreeItems
          let currentIndex = -1
          if (degree) {
            currentIndex = items.findIndex(item => item.type === 'degree' && item.value === degree)
          } else if (specialRoot) {
            currentIndex = items.findIndex(item => item.type === 'specialRoot' && item.value === specialRoot)
          }
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
          const nextItem = items[nextIndex]
          
          if (nextItem.type === 'degree') {
            setDegree(nextItem.value)
            setSpecialRoot(null)
          } else {
            setSpecialRoot(nextItem.value)
            setDegree('')
            setAccidental('')
            setQuality('')
            setFigure('')
          }
          setSelectedFunction(null)
          return
        }

        if (key === 'ArrowLeft') {
          e.preventDefault()
          const items = allowedDegreeItems
          let currentIndex = -1
          if (degree) {
            currentIndex = items.findIndex(item => item.type === 'degree' && item.value === degree)
          } else if (specialRoot) {
            currentIndex = items.findIndex(item => item.type === 'specialRoot' && item.value === specialRoot)
          }
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
          const prevItem = items[prevIndex]
          
          if (prevItem.type === 'degree') {
            setDegree(prevItem.value)
            setSpecialRoot(null)
          } else {
            setSpecialRoot(prevItem.value)
            setDegree('')
            setAccidental('')
            setQuality('')
            setFigure('')
          }
          setSelectedFunction(null)
          return
        }
      }

      // Flèches haut/bas : Navigation dans les chiffrages
      if (!selectedFunction) {
        if (key === 'ArrowUp') {
          e.preventDefault()
          const figures = allowedFigures
          const currentIndex = figure ? figures.indexOf(figure) : -1
          const nextIndex = currentIndex < figures.length - 1 ? currentIndex + 1 : 0
          setFigure(figures[nextIndex])
          return
        }

        if (key === 'ArrowDown') {
          e.preventDefault()
          const figures = allowedFigures
          const currentIndex = figure ? figures.indexOf(figure) : -1
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : figures.length - 1
          setFigure(figures[prevIndex])
          return
        }
      }

      // C : Cadence (cycle) — en Parcours ne cycle que parmi les cadences débloquées
      if ((key === 'C' || key === 'c') && cadenceAvailable) {
        e.preventDefault()
        const cadenceValues = [null, ...cadencesToShow.map(c => c.value)]
        const currentIndex = cadence ? cadenceValues.indexOf(cadence) : 0
        const nextIndex = currentIndex < cadenceValues.length - 1 ? currentIndex + 1 : 0
        setCadence(cadenceValues[nextIndex])
        return
      }

      // A : Altérations (cycle)
      if (!selectedFunction && !specialRoot) {
        if (key === 'A' || key === 'a') {
          e.preventDefault()
          const accidentals = [null, 'b', '#', 'natural']
          const currentIndex = accidental ? accidentals.indexOf(accidental) : 0
          const nextIndex = currentIndex < accidentals.length - 1 ? currentIndex + 1 : 0
          setAccidental(accidentals[nextIndex])
          return
        }
      }

      // M : Mode (cycle)
      if (key === 'M' || key === 'm') {
        e.preventDefault()
        const modes = ['generic', 'major', 'minor']
        const currentIndex = modes.indexOf(degreeMode)
        const nextIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0
        setDegreeMode(modes[nextIndex])
        return
      }

      // Réinitialiser
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault()
        setDegree('')
        setAccidental('')
        setQuality('')
        setFigure('')
        setIsBorrowed(false)
        setSpecialRoot(null)
        setSelectedFunction(null)
        setCadence(null)
        return
      }

      // Valider (Enter) — cadence obligatoire si effectiveExpectedCadence (et disponible en parcours)
      const cadenceOk = !effectiveExpectedCadence || !!cadence
      const isValidForMode = (progressionMode === 'functions' 
        ? selectedFunction !== null
        : isValid) && cadenceOk
      if (key === 'Enter' && isValidForMode) {
        e.preventDefault()
        // Sauvegarder le mode dans localStorage pour les accords suivants
        if (studentMode) {
          localStorage.setItem('chordSelectorDegreeModeStudent', degreeMode)
        } else {
          localStorage.setItem('chordSelectorDegreeMode', degreeMode)
        }
        
        // Construire les données de l'accord
        const chordData = {
          degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, cadence,
          sixFourVariant: (degree === 'I' && figure === '64') ? sixFourVariant : null,
          pedalDegree: pedalDegree || undefined
        }
        
        // En mode élève : toujours sauvegarder le mode dans la réponse de l'élève
        // En mode prof : comportement normal
        if (studentMode) {
          chordData.degreeMode = degreeMode
        } else {
          if (!initialChord || initialChord.degreeMode) {
            chordData.degreeMode = degreeMode
          }
        }
        
        setInitialDegreeMode(null)
        onValidate(chordData)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isOpen,
    parcoursContext,
    enabledFunctions,
    allowedDegreeItems,
    allowedFigures,
    selectedFunction,
    degree,
    figure,
    accidental,
    cadence,
    sixFourVariant,
    pedalDegree,
    isValid,
    degreeMode,
    studentMode,
    initialChord,
    onValidate,
    progressionMode,
    effectiveExpectedCadence,
    cadenceAvailable,
    isQcmMode,
    qcmOptions,
    selectedOption,
    qcmIsValidForMode
  ])

  // --- HANDLERS ---
  const handleDegreeModeChange = (mode) => {
    setDegreeMode(mode)
    // Ne PAS sauvegarder dans localStorage immédiatement
    // Le mode sera sauvegardé seulement lors de la validation
  }

  const handleDegreeClick = (deg) => {
    if (degree === deg) {
      setDegree('')
      setAccidental('')
      setQuality('')
      setFigure('')
      setSixFourVariant(null)
      setIsBorrowed(false)
    } else {
      setDegree(deg)
      setSpecialRoot(null)
      setSixFourVariant(null)
      setSelectedFunction(null)
    }
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
    if (isQcmMode) {
      onValidate({ chord: selectedOption ?? null, cadence: cadence ?? null, function: selectedFunction ?? null })
      return
    }
    // Sauvegarder le mode dans localStorage pour les accords suivants
    // En mode élève, utiliser le localStorage séparé
    if (studentMode) {
      localStorage.setItem('chordSelectorDegreeModeStudent', degreeMode)
    } else {
      localStorage.setItem('chordSelectorDegreeMode', degreeMode)
    }
    
    // Construire les données de l'accord
    const chordData = {
      degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, cadence,
      sixFourVariant: (degree === 'I' && figure === '64') ? sixFourVariant : null,
      pedalDegree: pedalDegree || undefined
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

  const chordDataForHighlight = useMemo(() => ({
    degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, degreeMode, sixFourVariant, pedalDegree: pedalDegree || undefined
  }), [degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, degreeMode, sixFourVariant, pedalDegree])
  const effectiveDisplayFunction = useMemo(() =>
    selectedFunction || getEffectiveFunctionForDisplay(chordDataForHighlight)
  , [selectedFunction, chordDataForHighlight])

  const highlightedDegrees = useMemo(() =>
    effectiveDisplayFunction ? FUNCTION_TO_DEGREES[effectiveDisplayFunction] || [] : []
  , [effectiveDisplayFunction])

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

  // Racines spéciales à illuminer selon la fonction effective (sélectionnée ou déduite de l'accord, ex. Cad. 6/4 → D)
  const highlightedSpecialRoots = useMemo(() =>
    effectiveDisplayFunction ? FUNCTION_TO_SPECIAL_ROOTS[effectiveDisplayFunction] || [] : []
  , [effectiveDisplayFunction])

  // #region agent log
  if (degree === 'I' && figure === '64' && sixFourVariant === 'cadential') {
    fetch('http://127.0.0.1:7245/ingest/f58eaead-9d56-4c47-b431-17d92bc2da43', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ChordSelectorModal.jsx:displayFunc', message: 'Frame color function', data: { displayFuncComputed: effectiveDisplayFunction, highlightedDegrees, runId: 'post-fix' }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
  }
  // #endregion

  // Quand un accord (degré ou racine) est sélectionné : degrés/racines de la même fonction ne sont pas grisés (fonction effective = D pour Cad. 6/4)
  const { allowedDegreesWhenAccordSelected, allowedSpecialRootsWhenAccordSelected } = useMemo(() => {
    if (selectedFunction || (!degree && !specialRoot)) {
      return { allowedDegreesWhenAccordSelected: [], allowedSpecialRootsWhenAccordSelected: [] }
    }
    const funcs = effectiveDisplayFunction ? [effectiveDisplayFunction] : (degree ? degreeFunctions : (specialRoot ? [specialRootFunction] : []))
    const degSet = new Set()
    const rootSet = new Set()
    for (const f of funcs) {
      if (f && FUNCTION_TO_DEGREES[f]) FUNCTION_TO_DEGREES[f].forEach(d => degSet.add(d))
      if (f && FUNCTION_TO_SPECIAL_ROOTS[f]) FUNCTION_TO_SPECIAL_ROOTS[f].forEach(r => rootSet.add(r))
    }
    // Le degré/racine actuellement sélectionné ne doit jamais être grisé, sauf pour Cad. 6/4 (I reste grisé car fonction réelle = D)
    const isCad64Chord = degree === 'I' && figure === '64' && sixFourVariant === 'cadential'
    if (degree && !isCad64Chord) degSet.add(degree)
    if (specialRoot) rootSet.add(specialRoot)
    return {
      allowedDegreesWhenAccordSelected: Array.from(degSet),
      allowedSpecialRootsWhenAccordSelected: Array.from(rootSet)
    }
  }, [selectedFunction, degree, figure, sixFourVariant, specialRoot, degreeFunctions, specialRootFunction, effectiveDisplayFunction])

  const chordData = chordDataForHighlight
  const chordDataForVisualizer = useMemo(() => {
    if (!isQcmMode) return {}
    if (selectedOption != null) {
      const funcKey = getFunctionForOptionLabel(selectedOption, qcmCorrectChord, qcmCorrectStr)
      return parseDisplayStringToChordData(selectedOption, funcKey)
    }
    if (selectedFunction != null) return { selectedFunction, degreeMode: 'generic' }
    return {}
  }, [isQcmMode, selectedOption, selectedFunction, qcmCorrectChord, qcmCorrectStr, degreeMode])
  const cadenceOk = !effectiveExpectedCadence || !!cadence
  const isValidForMode = isQcmMode
    ? qcmIsValidForMode
    : (progressionMode === 'functions' ? selectedFunction !== null : isValid) && cadenceOk

  // Mode intuitif (T/SD/D uniquement) ou QCM : fenêtre compacte adaptée au contenu
  const isFunctionsOnly = progressionMode === 'functions'
  const isCompactLayout = isFunctionsOnly || isQcmMode

  // --- JSX STRUCTURE ---
  const modalContent = (
    <div className={`flex flex-col w-full bg-zinc-900 md:rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 animate-zoom-in ${isCompactLayout ? 'max-w-lg h-full max-h-full min-h-0' : 'h-full max-w-4xl'}`}>
      
      {/* HEADER: Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {!isQcmMode && (
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
              setSixFourVariant(null)
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
          )}
          {isQcmMode && (
            <button onClick={() => { setSelectedOption(null); setSelectedFunction(null); setCadence(null) }} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1.5 rounded hover:bg-zinc-800" title="Réinitialiser">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
            </button>
          )}
          <span className="ml-3 text-zinc-400 text-xs font-bold tracking-widest uppercase">
            {isQcmMode ? `Question ${currentQuestion ?? '?'}/${totalQuestions ?? '?'}` : 'Editeur de Fonction Tonale'}
          </span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className={`${isCompactLayout ? 'flex-1 min-h-0 overflow-auto chord-modal-compact-scrollbar-hide' : 'flex-1 overflow-y-auto'} bg-[#18181b]`}>
        {/* QCM MODE: layout choix multiples */}
        {isQcmMode && qcmCorrectChord && qcmOptions.length > 0 ? (
        <div className="flex-1 min-h-0 flex flex-col p-[min(1rem,2vh)] md:p-[min(1.5rem,2.5vh)]">
          <div className="grid grid-cols-1 flex-1 min-h-0 gap-[min(0.75rem,2vh)] md:gap-[min(1rem,2.5vh)]">
            {/* Colonne: prévisualisation + cadence + valider (empilés en mode compact) */}
            <div className="flex flex-col gap-[min(0.75rem,2vh)] md:gap-[min(1rem,2.5vh)] min-h-0">
              <div className="flex-shrink-0 z-10">
                <ChordDisplay data={chordDataForVisualizer} degreeMode={degreeMode} displayAsFunctions={false} size={isShortViewport ? 'compact' : 'normal'} />
              </div>
              {effectiveExpectedCadence && cadencesToShow.length > 0 && (
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Cadence</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cadencesToShow.map(cad => (
                      <button
                        key={cad.value}
                        onClick={() => setCadence(cadence === cad.value ? null : cad.value)}
                        className={`px-2 py-1 rounded-full font-bold transition-all flex-shrink-0 ${
                          cadence === cad.value ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        style={{ fontSize: 'clamp(0.625rem, 1.2vw + 0.3rem, 0.75rem)' }}
                      >
                        {cad.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                ref={validateButtonRef}
                onClick={handleValidate}
                disabled={!isValidForMode}
                className={`w-full ${isShortViewport ? 'h-14' : 'h-16'} rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
                  isValidForMode ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/40 transform hover:-translate-y-1 hover:scale-[1.02] ring-2 ring-indigo-400/30' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                <span className="text-xl font-extrabold tracking-wide">VALIDER</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </div>
            {/* T/SD/D + options QCM — même logique couleur / grisonnement / association que le sélecteur complet */}
            <div className="flex flex-col gap-[min(0.75rem,2vh)] md:gap-[min(1rem,2.5vh)] min-h-0">
              {(() => {
                const qcmDisplayFunc = selectedFunction || (selectedOption ? getFunctionForOptionLabel(selectedOption, qcmCorrectChord, qcmCorrectStr) : null)
                const qcmFunctionBorder = qcmDisplayFunc === 'T' ? 'border-blue-500/50 bg-blue-950/20' : qcmDisplayFunc === 'SD' ? 'border-violet-500/50 bg-violet-950/20' : qcmDisplayFunc === 'D' ? 'border-pink-500/50 bg-pink-950/20' : 'border-white/5'
                return (
                  <>
              <div className={`bg-zinc-950/50 p-3 md:p-4 rounded-xl border transition-all duration-300 ${qcmFunctionBorder}`}>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Fonction Tonale</label>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {FUNCTIONS.map(f => {
                    const isEnabled = enabledFunctions.includes(f.value)
                    const optionFunc = selectedOption ? getFunctionForOptionLabel(selectedOption, qcmCorrectChord, qcmCorrectStr) : null
                    const isHighlighted = optionFunc && f.value === optionFunc
                    const isDimmed = optionFunc && f.value !== optionFunc
                    return (
                      <Pad
                        key={f.value}
                        label={f.label}
                        subLabel={f.fullLabel}
                        color={isEnabled ? f.color : 'gray'}
                        active={selectedFunction === f.value}
                        highlighted={isHighlighted}
                        dimmed={isDimmed}
                        suppressDefaultHighlight={isHighlighted}
                        disabled={!isEnabled}
                        onClick={() => {
                          if (!isEnabled) return
                          if (selectedFunction === f.value) {
                            setSelectedFunction(null)
                          } else {
                            setSelectedFunction(f.value)
                            setSelectedOption(null)
                          }
                        }}
                        className={`${isShortViewport ? 'h-12' : 'h-14 md:h-16'} text-xl ${isHighlighted ? f.value === 'T' ? 'ring-2 ring-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.4)] border border-blue-400/50' : f.value === 'SD' ? 'ring-2 ring-violet-400/60 shadow-[0_0_10px_rgba(139,92,246,0.4)] border border-violet-400/50' : 'ring-2 ring-pink-400/60 shadow-[0_0_10px_rgba(236,72,153,0.4)] border border-pink-400/50' : ''}`}
                      />
                    )
                  })}
                </div>
              </div>
              <div className={`bg-zinc-950/50 p-3 md:p-4 rounded-xl border transition-all duration-300 ${qcmFunctionBorder}`}>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Choisissez l&apos;accord correct</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {qcmOptions.map((option, index) => {
                    const functionKey = getFunctionForOptionLabel(option, qcmCorrectChord, qcmCorrectStr)
                    const isActive = selectedOption === option
                    const optionFuncSelected = selectedOption ? getFunctionForOptionLabel(selectedOption, qcmCorrectChord, qcmCorrectStr) : null
                    const dimmedByFunction = selectedFunction && functionKey !== selectedFunction
                    const dimmedByOption = optionFuncSelected && functionKey !== optionFuncSelected
                    const isDimmed = dimmedByFunction || dimmedByOption
                    const highlightedByFunction = selectedFunction && functionKey === selectedFunction
                    const ringByFunction = highlightedByFunction
                      ? selectedFunction === 'T'
                        ? 'ring-2 ring-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.4)] border-2 border-blue-400/50'
                        : selectedFunction === 'SD'
                        ? 'ring-2 ring-violet-400/60 shadow-[0_0_10px_rgba(139,92,246,0.4)] border-2 border-violet-400/50'
                        : 'ring-2 ring-pink-400/60 shadow-[0_0_10px_rgba(236,72,153,0.4)] border-2 border-pink-400/50'
                      : ''
                    const colorMap = {
                      T: 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-400',
                      SD: 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.5)] border-violet-400',
                      D: 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] border-pink-400'
                    }
                    const activeClass = isActive ? `${colorMap[functionKey] || 'bg-indigo-600'} text-white scale-[0.98] border-2` : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedOption(prev => prev === option ? null : option)
                          setSelectedFunction(null)
                        }}
                        className={`relative flex flex-col items-center justify-center rounded-lg transition-all duration-150 select-none ${isShortViewport ? 'h-12' : 'h-14 md:h-16'} ${activeClass} ${isDimmed ? 'opacity-45' : ''} ${ringByFunction}`}
                      >
                        <ChordLabel displayString={option} ariaLabel={option} className="text-lg font-semibold" />
                      </button>
                    )
                  })}
                </div>
              </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
        ) : isQcmMode && (!qcmCorrectChord || qcmOptions.length === 0) ? (
        <div className="p-8 flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
        </div>
        ) : null}

        {!isQcmMode && (
        <>
        {/* CONTROL GRID */}
        <div className="p-4 md:p-6">
        <div className={`grid grid-cols-1 gap-4 md:gap-6 ${isFunctionsOnly ? '' : 'md:grid-cols-12'}`}>
          
          {/* LEFT COLUMN: CHORD DISPLAY + CADENCE/VALIDER (3 cols) - en mode functions: même colonne */}
          <div className={`flex flex-col gap-4 md:gap-6 ${isFunctionsOnly ? '' : 'md:col-span-3'}`}>
            {/* CHORD DISPLAY - Sticky */}
            <div className="sticky top-4 z-10">
              <ChordDisplay data={chordData} degreeMode={degreeMode} displayAsFunctions={progressionMode === 'functions' || !!parcoursContext} compact={isFunctionsOnly} />
            </div>
            
            {/* MODE SELECTOR - Desktop uniquement - Masqué en mode functions */}
            {progressionMode !== 'functions' && (
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
            )}

            {/* CADENCE & VALIDER - Desktop ; sélecteur de cadence uniquement pour l'accord où la cadence est attendue */}
            <div className="hidden md:block bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex flex-col flex-grow min-h-0">
                {effectiveExpectedCadence && cadencesToShow.length > 0 && (
                <div className="flex-grow flex flex-col justify-center mb-4 min-h-0">
                    <div className="flex flex-wrap gap-1.5 items-start overflow-auto">
                        {cadencesToShow.map(cad => (
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
                )}

                <div className="flex-shrink-0">
                    <button
                        ref={validateButtonRef}
                        onClick={handleValidate}
                        disabled={!isValidForMode}
                        className={`
                            w-full h-16 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200
                            ${isValidForMode 
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

          {/* RIGHT COLUMN: CONTROLS (9 cols) - Par ordre d'importance - masqué en mode functions (T/SD/D dans la colonne gauche) */}
          <div className={`flex flex-col gap-4 md:gap-6 ${isFunctionsOnly ? '' : 'md:col-span-9'}`}>
            
            {/* 1. FONCTIONS TONALES - Le plus important (cadre et surlignage selon fonction effective, ex. Cad. 6/4 → D) */}
            <div className={`bg-zinc-950/50 p-3 md:p-4 rounded-xl border transition-all duration-300 ${
              (selectedFunction || effectiveDisplayFunction) === 'T' ? 'border-blue-500/50 bg-blue-950/20' : (selectedFunction || effectiveDisplayFunction) === 'SD' ? 'border-violet-500/50 bg-violet-950/20' : (selectedFunction || effectiveDisplayFunction) === 'D' ? 'border-pink-500/50 bg-pink-950/20' : 'border-white/5'
            }`}>
              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Fonction Tonale</label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {FUNCTIONS.map(f => {
                  const isEnabled = enabledFunctions.includes(f.value)
                  const isHighlighted = isEnabled && effectiveDisplayFunction === f.value && !selectedFunction
                  const isDimmed = (degree || specialRoot) && !selectedFunction && effectiveDisplayFunction !== f.value
                  return (
                    <Pad 
                      key={f.value} 
                      label={f.label}
                      subLabel={f.fullLabel} 
                      color={isEnabled ? f.color : 'gray'}
                      active={selectedFunction === f.value} 
                      highlighted={isHighlighted}
                      disabled={!isEnabled}
                      dimmed={isDimmed}
                      suppressDefaultHighlight={isHighlighted}
                      onClick={() => {
                        if (!isEnabled) return
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
                          ? f.value === 'T' 
                            ? 'ring-2 ring-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.4)] border border-blue-400/50' 
                            : f.value === 'SD' 
                            ? 'ring-2 ring-violet-400/60 shadow-[0_0_10px_rgba(139,92,246,0.4)] border border-violet-400/50' 
                            : 'ring-2 ring-pink-400/60 shadow-[0_0_10px_rgba(236,72,153,0.4)] border border-pink-400/50'
                          : ''
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* 2. DEGRES - Masqué en mode functions */}
            {progressionMode !== 'functions' && (
            <div className={`bg-zinc-950/50 p-3 md:p-4 rounded-xl border transition-all duration-300 ${
              (() => {
                // Couleur du cadre : fonction effective (sélectionnée ou déduite de l'accord, ex. Cad. 6/4 → D)
                const displayFunc = effectiveDisplayFunction
                if (displayFunc === 'T') return 'border-blue-500/50 bg-blue-950/20'
                if (displayFunc === 'SD') return 'border-violet-500/50 bg-violet-950/20'
                if (displayFunc === 'D') return 'border-pink-500/50 bg-pink-950/20'
                return 'border-white/5'
              })()
            }`}>
              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Degré</label>
              <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                {DEGREES.map(deg => {
                  // Fonctions possibles pour ce degré (peut être plusieurs)
                  const degFunctions = DEGREE_TO_FUNCTIONS[deg] || []
                  const degHasMultipleFunctions = deg === 'III' || deg === 'VI'
                  // Les fonctions sont déjà correctement définies dans DEGREE_TO_FUNCTIONS
                  const allDegFunctions = degFunctions
                  
                  // Couleur basée sur fonction effective (sélectionnée ou déduite, ex. Cad. 6/4 → D)
                  const activeFunction = effectiveDisplayFunction || (degree === deg ? (getPrimaryFunctionForDegree(deg) || allDegFunctions[0]) : null)
                  const funcColor = activeFunction ? FUNCTIONS.find(f => f.value === activeFunction)?.color : null
                  // Highlight quand la fonction effective inclut ce degré (ex. D → V, VII, III)
                  const isFunctionDegree = effectiveDisplayFunction ? highlightedDegrees.includes(deg) : false
                  // Type de degré (principal ou parallèle) pour chaque fonction
                  const isPrimaryForT = effectiveDisplayFunction === 'T' && PRIMARY_DEGREES['T']?.includes(deg)
                  const isParallelForT = effectiveDisplayFunction === 'T' && PARALLEL_DEGREES['T']?.includes(deg)
                  const isPrimaryForSD = effectiveDisplayFunction === 'SD' && PRIMARY_DEGREES['SD']?.includes(deg)
                  const isParallelForSD = effectiveDisplayFunction === 'SD' && PARALLEL_DEGREES['SD']?.includes(deg)
                  const isPrimaryForD = effectiveDisplayFunction === 'D' && PRIMARY_DEGREES['D']?.includes(deg)
                  const isParallelForD = effectiveDisplayFunction === 'D' && PARALLEL_DEGREES['D']?.includes(deg)
                  
                  // Si le degré appartient à plusieurs fonctions (sans fonction effective dérivée d'un accord)
                  const isMultiFunction = !effectiveDisplayFunction && degree === deg && degHasMultipleFunctions
                  
                  // Griser (désactiver) les degrés non concernés quand une fonction effective est en vigueur
                  const degreeDisabledByFunction = effectiveDisplayFunction && !highlightedDegrees.includes(deg)
                  // Griser visuellement uniquement les degrés d'une autre fonction (garder les accords de la même fonction lisibles)
                  const degreeDimmed = allowedDegreesWhenAccordSelected.length > 0 && !allowedDegreesWhenAccordSelected.includes(deg)
                  
                  const degreeLabel = getDegreeLabel(deg, degreeMode)
                  const degreeNature = getDegreeNature(deg, degreeMode)
                  const isCad64BassDegree = (degree === 'I' && figure === '64' && sixFourVariant === 'cadential') && deg === 'I'
                  
                  return (
                    <Pad 
                      key={deg} 
                      label={degreeLabel}
                      subLabel={degreeNature}
                      active={degree === deg}
                      highlighted={isFunctionDegree}
                      color={funcColor || 'indigo'}
                      disabled={degreeDisabledByFunction}
                      dimmed={degreeDimmed}
                      suppressDefaultHighlight={!!(isFunctionDegree && effectiveDisplayFunction)}
                      onClick={() => handleDegreeClick(deg)}
                      className={`h-14 md:h-16 text-xl font-serif ${isCad64BassDegree ? 'ring-1 ring-pink-400/25' : ''} ${
                        isFunctionDegree && effectiveDisplayFunction 
                          ? isPrimaryForT || isPrimaryForSD || isPrimaryForD
                            ? effectiveDisplayFunction === 'T' 
                              ? 'ring-2 ring-blue-400/80 shadow-[0_0_30px_rgba(59,130,246,0.8),0_0_60px_rgba(59,130,246,0.4),inset_0_0_30px_rgba(59,130,246,0.2)] border-2 border-blue-400/60 bg-gradient-to-br from-blue-400/45 via-blue-400/25 to-blue-400/10' 
                              : effectiveDisplayFunction === 'SD' 
                              ? 'ring-2 ring-violet-400/80 shadow-[0_0_30px_rgba(139,92,246,0.8),0_0_60px_rgba(139,92,246,0.4),inset_0_0_30px_rgba(139,92,246,0.2)] border-2 border-violet-400/60 bg-gradient-to-br from-violet-400/45 via-violet-400/25 to-violet-400/10' 
                              : 'ring-2 ring-pink-400/80 shadow-[0_0_30px_rgba(236,72,153,0.8),0_0_60px_rgba(236,72,153,0.4),inset_0_0_30px_rgba(236,72,153,0.2)] border-2 border-pink-400/60 bg-gradient-to-br from-pink-400/45 via-pink-400/25 to-pink-400/10'
                            : isParallelForT || isParallelForSD || isParallelForD
                            ? effectiveDisplayFunction === 'T' 
                              ? 'ring-2 ring-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.4)] border border-blue-400/40' 
                              : effectiveDisplayFunction === 'SD' 
                              ? 'ring-2 ring-violet-400/60 shadow-[0_0_12px_rgba(139,92,246,0.4)] border border-violet-400/40' 
                              : 'ring-2 ring-pink-400/60 shadow-[0_0_12px_rgba(236,72,153,0.4)] border border-pink-400/40'
                            : ''
                          : isMultiFunction
                          ? (() => {
                              const primaryFunc = getPrimaryFunctionForDegree(deg)
                              if (primaryFunc === 'T') return 'ring-2 ring-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)] border border-blue-400/50'
                              if (primaryFunc === 'SD') return 'ring-2 ring-violet-400/50 shadow-[0_0_10px_rgba(139,92,246,0.3)] border border-violet-400/50'
                              if (primaryFunc === 'D') return 'ring-2 ring-pink-400/50 shadow-[0_0_10px_rgba(236,72,153,0.3)] border border-pink-400/50'
                              return 'ring-1 ring-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-400/40'
                            })()
                          : ''
                      }`}
                    />
                  )
                })}
              </div>
              
              {/* SPECIAL ROOTS + Cad. 6/4 (à côté des sixtes augmentées et napolitaine) */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2 pt-2 border-t border-white/5">
                {SPECIAL_ROOTS.map(spec => {
                  const specFunction = SPECIAL_ROOT_TO_FUNCTION[spec.value]
                  const funcColor = specFunction ? FUNCTIONS.find(f => f.value === specFunction)?.color : null
                  const isHighlighted = highlightedSpecialRoots.includes(spec.value)
                  // Toutes les racines spéciales sont parallèles (pas de principales)
                  const isParallel = isHighlighted && effectiveDisplayFunction
                  // Griser (désactiver) les racines spéciales non concernées quand une fonction effective est en vigueur
                  const specDisabledByFunction = effectiveDisplayFunction && !highlightedSpecialRoots.includes(spec.value)
                  // Griser visuellement uniquement les racines d'une autre fonction (quand un degré est sélectionné, aucune racine n'est de la même fonction sauf si on avait sélectionné une racine)
                  const specDimmed = allowedSpecialRootsWhenAccordSelected.length > 0 ? !allowedSpecialRootsWhenAccordSelected.includes(spec.value) : (degree ? true : (specialRoot && specialRoot !== spec.value))
                  
                  return (
                    <Pad 
                      key={spec.value}
                      label={spec.label}
                      stackedTop={spec.value === 'N' ? 'II' : spec.label}
                      stackedBottom={spec.value === 'N' ? '♭6' : spec.sup}
                      active={specialRoot === spec.value}
                      highlighted={isHighlighted}
                      disabled={specDisabledByFunction}
                      dimmed={specDimmed}
                      suppressDefaultHighlight={!!(isHighlighted && effectiveDisplayFunction)}
                      onClick={() => handleSpecialRootClick(spec.value)}
                      className={`h-12 font-serif ${
                        isParallel
                          ? effectiveDisplayFunction === 'SD'
                            ? 'ring-2 ring-violet-400/60 shadow-[0_0_12px_rgba(139,92,246,0.4)] border-2 border-violet-400/50'
                            : 'ring-2 ring-pink-400/60 shadow-[0_0_12px_rgba(236,72,153,0.4)] border-2 border-pink-400/50'
                          : ''
                      }`}
                      color={funcColor || 'rose'}
                    />
                  )
                })}
                {/* Bouton dédié 64 de cadence (Cad. 6/4) : fonction D, à côté des racines spéciales */}
                {(() => {
                  const isCad64Selected = degree === 'I' && figure === '64' && sixFourVariant === 'cadential'
                  const cad64Dimmed = (degree || specialRoot) && effectiveDisplayFunction && effectiveDisplayFunction !== 'D'
                  const isCad64Highlighted = effectiveDisplayFunction === 'D' && !isCad64Selected
                  return (
                <button
                  type="button"
                  title="64 de cadence (fonction Dominante)"
                  onClick={() => {
                    if (isCad64Selected) {
                      setDegree('')
                      setFigure('')
                      setSixFourVariant(null)
                      setSpecialRoot(null)
                    } else {
                      setDegree('I')
                      setFigure('64')
                      setSixFourVariant('cadential')
                      setSpecialRoot(null)
                    }
                  }}
                  disabled={selectedFunction != null && selectedFunction !== 'D'}
                  className={`
                    relative flex flex-row items-center justify-center gap-1.5 rounded-lg transition-all duration-150 h-12 font-sans
                    disabled:opacity-20 disabled:cursor-not-allowed select-none !p-0 !m-0
                    ${cad64Dimmed ? 'opacity-45 pointer-events-auto border border-zinc-700 bg-zinc-800 text-zinc-500' : ''}
                    ${isCad64Highlighted && !cad64Dimmed ? 'ring-2 ring-pink-400/60 shadow-[0_0_12px_rgba(236,72,153,0.4)] border-2 border-pink-400/50 bg-zinc-800 text-zinc-400' : ''}
                    ${!cad64Dimmed && !isCad64Highlighted ? (isCad64Selected
                      ? 'bg-pink-500 text-white scale-[0.98] border-2 border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700') : ''}
                  `}
                >
                  <span className="text-xs font-bold opacity-90">Cad.</span>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-base font-bold opacity-90">6</span>
                    <span className="text-base font-bold opacity-90 -mt-1">4</span>
                  </div>
                </button>
                )
                })()}
              </div>
            </div>
            )}

            {/* 3. ALTERATIONS & CHIFFRAGES - Sur la même ligne - Masqué en mode functions */}
            {progressionMode !== 'functions' && (
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
                        disabled={!!selectedFunction || !!specialRoot}
                        onClick={() => {
                          setFigure(figure === fig.value ? '' : fig.value)
                          if (fig.value !== '64') setSixFourVariant(null)
                        }}
                        className="h-12 font-sans"
                      />
                    )
                  })}
                </div>
                {/* I64 dépendant du contexte : V64 (passage I↔I6), cad64 (cadence), I64 (avancé) */}
                {degree === 'I' && figure === '64' && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5 block">Contexte 6/4</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSixFourVariant(sixFourVariant === 'passing' ? null : 'passing')}
                        className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${
                          sixFourVariant === 'passing' ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        V64 (passage)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSixFourVariant(sixFourVariant === 'cadential' ? null : 'cadential')}
                        className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${
                          sixFourVariant === 'cadential' ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        cad64 (cadence)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSixFourVariant(null)}
                        className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${
                          sixFourVariant === null ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        I64 (avancé)
                      </button>
                    </div>
                  </div>
                )}
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
                {/* Note pédale (accord/basse, ex. II/I) */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1.5 block">Note pédale</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPedalDegree(null)}
                      className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${pedalDegree === null ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      —
                    </button>
                    {DEGREES.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setPedalDegree(pedalDegree === d ? null : d)}
                        className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${pedalDegree === d ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}

          </div>
        </div>

        {/* FOOTER: MODE, CADENCES & ACTIONS - Mobile uniquement en bas */}
        <div className="md:hidden mt-4 space-y-4">
            {/* MODE SELECTOR - Mobile - Masqué en mode functions */}
            {progressionMode !== 'functions' && (
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
            )}

            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex flex-col items-start gap-4">
            {effectiveExpectedCadence && cadencesToShow.length > 0 && (
            <div className="w-full">
                <div className="flex flex-wrap gap-2">
                    {cadencesToShow.map(cad => (
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
            )}

            <div className="w-full">
                <button
                    onClick={handleValidate}
                    disabled={!isValidForMode}
                    className={`
                        w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200
                        ${isValidForMode 
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
        </>
        )}

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
      <div onClick={e => e.stopPropagation()} className={`w-full ${isCompactLayout ? 'max-w-lg max-h-[90dvh] h-[90dvh] flex flex-col min-h-0' : 'max-w-4xl h-[90vh]'}`}>
        {modalContent}
      </div>
    </div>
  )

  if (embedded) return wrapper // Si embedded, on retourne juste le wrapper (ou content selon ton besoin exact)
  return createPortal(wrapper, document.body)
}

export default ChordSelectorModal