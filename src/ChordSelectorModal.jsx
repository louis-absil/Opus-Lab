import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FUNCTION_TO_DEGREES, FUNCTION_COLORS } from './utils/riemannFunctions'

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
  { value: 'deceptive', label: 'Déceptive' },
  { value: 'half', label: 'Demi' }
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
        <div className="flex flex-col items-center leading-none gap-0.5">
          <span className="text-xs font-bold opacity-90">{stackedTop}</span>
          <span className="text-xs font-bold opacity-90">{stackedBottom}</span>
        </div>
      ) : (
        <>
          <span className={`font-semibold ${subLabel ? 'text-lg' : 'text-sm'}`}>{label}</span>
          {subLabel && <span className="text-[10px] uppercase tracking-wider opacity-60 absolute bottom-1">{subLabel}</span>}
        </>
      )}
    </button>
  )
}

/**
 * Écran LCD style Hardware
 * Affiche le résultat de l'accord construit
 */
const ChordDisplay = ({ data }) => {
  const { degree, accidental, quality, figure, isBorrowed, specialRoot } = data

  const renderContent = () => {
    if (specialRoot) {
      const spec = SPECIAL_ROOTS.find(s => s.value === specialRoot)
      if (!spec) return null
      // Cas particulier Napolitaine
      if (spec.value === 'N') {
        return (
          <div className="flex items-baseline font-serif">
            <span className="text-6xl text-white font-bold">II</span>
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

    if (!degree) return <span className="text-zinc-600 italic font-light tracking-widest text-lg">WAITING INPUT...</span>

    const figObj = FIGURES.find(f => f.value === figure)

    return (
      <div className="flex items-baseline gap-1 font-serif text-white">
        {accidental && <span className="text-4xl text-amber-400 font-light mr-1">{accidental === 'b' ? '♭' : accidental === '#' ? '♯' : '♮'}</span>}
        
        <div className="flex items-baseline">
          {isBorrowed && <span className="text-5xl text-zinc-500 font-light">(</span>}
          <span className="text-7xl font-bold tracking-tight shadow-black drop-shadow-lg">{degree}</span>
          {isBorrowed && <span className="text-5xl text-zinc-500 font-light">)</span>}
        </div>

        {quality && <span className="text-4xl text-zinc-300 ml-1">{quality}</span>}

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
      </div>
    )
  }

  return (
    <div className="w-full h-40 bg-black rounded-xl border-4 border-zinc-800 shadow-inner relative overflow-hidden flex items-center justify-center mb-6 group">
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
  embedded = false 
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
  
  // --- EFFECTS ---
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
    }
  }, [initialChord])

  // --- HANDLERS ---
  const handleDegreeClick = (deg) => {
    setDegree(deg)
    setSpecialRoot(null)
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
    }
  }

  const handleValidate = () => {
    onValidate({
      degree, accidental, quality, figure, isBorrowed, specialRoot, selectedFunction, cadence
    })
  }

  // --- RENDER HELPERS ---
  const highlightedDegrees = useMemo(() => 
    selectedFunction ? FUNCTION_TO_DEGREES[selectedFunction] || [] : []
  , [selectedFunction])

  const chordData = { degree, accidental, quality, figure, isBorrowed, specialRoot }
  const isValid = !!degree || !!specialRoot

  // --- JSX STRUCTURE ---
  const modalContent = (
    <div className="flex flex-col w-full h-full max-w-4xl bg-zinc-900 md:rounded-3xl shadow-2xl overflow-hidden border border-zinc-800 animate-zoom-in">
      
      {/* HEADER: Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-zinc-400 text-xs font-bold tracking-widest uppercase">Chord Generator</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#18181b]">
        
        {/* SECTION 1: VISUALISATION */}
        <ChordDisplay data={chordData} />

        {/* CONTROL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: FUNCTIONS & DEGREES (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-6">
            
            {/* FONCTIONS */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Fonction Tonale</label>
              <div className="grid grid-cols-3 gap-3">
                {FUNCTIONS.map(f => (
                  <Pad 
                    key={f.value} 
                    label={f.label}
                    subLabel={f.fullLabel} 
                    color={f.color}
                    active={selectedFunction === f.value} 
                    onClick={() => setSelectedFunction(selectedFunction === f.value ? null : f.value)}
                    className="h-16"
                  />
                ))}
              </div>
            </div>

            {/* DEGRES */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Degré</label>
              <div className="grid grid-cols-7 gap-2">
                {DEGREES.map(deg => (
                  <Pad 
                    key={deg} 
                    label={deg} 
                    active={degree === deg}
                    highlighted={highlightedDegrees.includes(deg)}
                    color={selectedFunction ? FUNCTION_COLORS[selectedFunction] : 'indigo'} // Adapte la couleur à la fonction
                    onClick={() => handleDegreeClick(deg)}
                    className="h-20 text-xl font-serif"
                  />
                ))}
              </div>
              
              {/* SPECIAL ROOTS */}
              <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/5">
                {SPECIAL_ROOTS.map(spec => (
                  <Pad 
                    key={spec.value}
                    label={spec.label}
                    stackedTop={spec.value === 'N' ? 'II' : spec.label}
                    stackedBottom={spec.value === 'N' ? '♭6' : spec.sup}
                    active={specialRoot === spec.value}
                    onClick={() => handleSpecialRootClick(spec.value)}
                    className="h-14 font-serif"
                    color="rose"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: MODIFIERS (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-6">
            
            {/* ALTERATIONS */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Altérations</label>
              <div className="grid grid-cols-3 gap-2">
                {ACCIDENTALS.map(acc => (
                  <Pad 
                    key={acc.value}
                    label={acc.symbol}
                    active={accidental === acc.value}
                    disabled={!!specialRoot}
                    onClick={() => setAccidental(accidental === acc.value ? '' : acc.value)}
                    className="h-12 text-xl"
                    color="amber"
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                  <Pad label="°" active={quality === '°'} disabled={!!specialRoot} onClick={() => setQuality(quality === '°' ? '' : '°')} className="h-12" />
                  <Pad label="+" active={quality === '+'} disabled={!!specialRoot} onClick={() => setQuality(quality === '+' ? '' : '+')} className="h-12" />
              </div>
              <div className="mt-2">
                 <Pad label="Emprunt ( )" active={isBorrowed} disabled={!degree || !!specialRoot} onClick={() => setIsBorrowed(!isBorrowed)} className="h-10 text-xs" color="gray" />
              </div>
            </div>

            {/* CHIFFRAGES */}
            <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex-1">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Chiffrage</label>
              <div className="grid grid-cols-4 gap-2">
                {FIGURES.map(fig => (
                   <Pad 
                    key={fig.value}
                    label={fig.isStacked ? null : fig.display}
                    stackedTop={fig.isStacked ? fig.displayArray[0] : null}
                    stackedBottom={fig.isStacked ? fig.displayArray[1] : null}
                    active={figure === fig.value}
                    onClick={() => setFigure(figure === fig.value ? '' : fig.value)}
                    className="h-12 font-sans"
                   />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER: CADENCES & ACTIONS */}
        <div className="mt-6 bg-zinc-950/50 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-3 block">Cadence (Optionnel)</label>
                <div className="flex flex-wrap gap-2">
                    {CADENCES.map(cad => (
                        <button
                            key={cad.value}
                            onClick={() => setCadence(cadence === cad.value ? null : cad.value)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
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

            <div className="w-full md:w-auto min-w-[200px]">
                <button
                    onClick={handleValidate}
                    disabled={!isValid}
                    className={`
                        w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200
                        ${isValid 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                        }
                    `}
                >
                    <span>VALIDER</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
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