import { DEGREE_TO_FUNCTIONS } from './riemannFunctions'

/**
 * Mapping des compositeurs vers leurs périodes stylistiques
 * Structure extensible pour ajouter facilement de nouveaux compositeurs
 */
const COMPOSER_STYLE_MAP = {
  // Baroque (1600-1750)
  'Bach': 'Baroque',
  'J.S. Bach': 'Baroque',
  'Johann Sebastian Bach': 'Baroque',
  'Vivaldi': 'Baroque',
  'Handel': 'Baroque',
  'Händel': 'Baroque',
  'Telemann': 'Baroque',
  'Purcell': 'Baroque',
  'Scarlatti': 'Baroque',
  'D. Scarlatti': 'Baroque',
  'Corelli': 'Baroque',
  'Couperin': 'Baroque',
  
  // Classique (1750-1820)
  'Mozart': 'Classique',
  'W.A. Mozart': 'Classique',
  'Wolfgang Amadeus Mozart': 'Classique',
  'Haydn': 'Classique',
  'F.J. Haydn': 'Classique',
  'Franz Joseph Haydn': 'Classique',
  'Beethoven': 'Classique', // Transition Classique/Romantique
  'L. van Beethoven': 'Classique',
  'Ludwig van Beethoven': 'Classique',
  'Clementi': 'Classique',
  'Gluck': 'Classique',
  'Salieri': 'Classique',
  
  // Romantique (1820-1900)
  'Chopin': 'Romantique',
  'F. Chopin': 'Romantique',
  'Frédéric Chopin': 'Romantique',
  'Schumann': 'Romantique',
  'R. Schumann': 'Romantique',
  'Robert Schumann': 'Romantique',
  'Liszt': 'Romantique',
  'F. Liszt': 'Romantique',
  'Franz Liszt': 'Romantique',
  'Brahms': 'Romantique',
  'J. Brahms': 'Romantique',
  'Johannes Brahms': 'Romantique',
  'Wagner': 'Romantique',
  'R. Wagner': 'Romantique',
  'Richard Wagner': 'Romantique',
  'Tchaikovsky': 'Romantique',
  'Tchaïkovski': 'Romantique',
  'P.I. Tchaikovsky': 'Romantique',
  'Dvořák': 'Romantique',
  'A. Dvořák': 'Romantique',
  'Antonín Dvořák': 'Romantique',
  'Mendelssohn': 'Romantique',
  'F. Mendelssohn': 'Romantique',
  'Felix Mendelssohn': 'Romantique',
  'Schubert': 'Romantique',
  'F. Schubert': 'Romantique',
  'Franz Schubert': 'Romantique',
  'Verdi': 'Romantique',
  'G. Verdi': 'Romantique',
  'Giuseppe Verdi': 'Romantique',
  
  // Moderne (1900+)
  'Debussy': 'Moderne',
  'C. Debussy': 'Moderne',
  'Claude Debussy': 'Moderne',
  'Ravel': 'Moderne',
  'M. Ravel': 'Moderne',
  'Maurice Ravel': 'Moderne',
  'Stravinsky': 'Moderne',
  'I. Stravinsky': 'Moderne',
  'Igor Stravinsky': 'Moderne',
  'Schoenberg': 'Moderne',
  'A. Schoenberg': 'Moderne',
  'Arnold Schoenberg': 'Moderne',
  'Bartók': 'Moderne',
  'B. Bartók': 'Moderne',
  'Béla Bartók': 'Moderne',
  'Prokofiev': 'Moderne',
  'S. Prokofiev': 'Moderne',
  'Shostakovich': 'Moderne',
  'D. Shostakovich': 'Moderne',
  'Dmitri Shostakovich': 'Moderne'
}

/**
 * Détermine le style musical d'un compositeur
 * @param {string} composer - Le nom du compositeur
 * @returns {string|null} - Le style (Baroque, Classique, Romantique, Moderne) ou null si inconnu
 */
export function getComposerStyle(composer) {
  if (!composer) return null
  
  const normalizedComposer = composer.trim()
  
  // Recherche exacte d'abord
  if (COMPOSER_STYLE_MAP[normalizedComposer]) {
    return COMPOSER_STYLE_MAP[normalizedComposer]
  }
  
  // Recherche partielle (pour gérer les variations de nommage)
  for (const [key, style] of Object.entries(COMPOSER_STYLE_MAP)) {
    if (normalizedComposer.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalizedComposer.toLowerCase())) {
      return style
    }
  }
  
  // TODO: Intégration future avec une API externe pour les compositeurs non mappés
  // Pour l'instant, retourner null si non trouvé
  return null
}

/**
 * Normalise un degré pour la comparaison (enlève les altérations)
 * @param {string} degree - Le degré (peut contenir des altérations)
 * @returns {string} - Le degré normalisé (I, II, III, etc.)
 */
function normalizeDegree(degree) {
  if (!degree) return null
  // Enlever les altérations et normaliser en majuscules
  return degree.toString().replace(/[♭#b]/g, '').toUpperCase()
}

/**
 * Détecte les progressions harmoniques dans une séquence d'accords
 * @param {Array} chordData - Tableau des données d'accords
 * @returns {Array} - Tableau des tags de progression détectés
 */
function detectProgressions(chordData) {
  const progressions = []
  if (!chordData || chordData.length < 2) return progressions
  
  // Extraire les degrés normalisés
  const degrees = chordData.map(chord => {
    if (!chord) return null
    return normalizeDegree(chord.degree || chord.root)
  }).filter(d => d !== null)
  
  if (degrees.length < 2) return progressions
  
  // Détecter II-V-I (ou variations)
  for (let i = 0; i < degrees.length - 2; i++) {
    const seq = [degrees[i], degrees[i + 1], degrees[i + 2]].join('-')
    if (seq === 'II-V-I' || seq === 'II-VI-I' || seq === 'II-V-VI') {
      progressions.push('ProgressionII-V-I')
      break // Ne détecter qu'une fois
    }
  }
  
  // Détecter Circle of Fifths (progression par quintes)
  // Ordre: I → IV → VII → III → VI → II → V → I
  const circleOfFifths = ['I', 'IV', 'VII', 'III', 'VI', 'II', 'V', 'I']
  for (let i = 0; i < degrees.length - 2; i++) {
    let circleMatch = true
    for (let j = 0; j < Math.min(3, circleOfFifths.length - 1); j++) {
      const currentIdx = circleOfFifths.indexOf(degrees[i + j])
      const nextIdx = circleOfFifths.indexOf(degrees[i + j + 1])
      if (currentIdx === -1 || nextIdx === -1 || 
          (nextIdx !== (currentIdx + 1) % circleOfFifths.length && 
           nextIdx !== currentIdx)) {
        circleMatch = false
        break
      }
    }
    if (circleMatch) {
      progressions.push('ProgressionCircleOfFifths')
      break
    }
  }
  
  // Détecter progression chromatique (mouvements par demi-tons)
  // Ex: I → ♭II → II → ♭III ou variations
  let chromaticCount = 0
  for (let i = 0; i < degrees.length - 1; i++) {
    const deg1 = degrees[i]
    const deg2 = degrees[i + 1]
    // Vérifier si les degrés sont adjacents (peut indiquer un mouvement chromatique)
    const degreeOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
    const idx1 = degreeOrder.indexOf(deg1)
    const idx2 = degreeOrder.indexOf(deg2)
    if (idx1 !== -1 && idx2 !== -1 && Math.abs(idx2 - idx1) === 1) {
      chromaticCount++
    }
  }
  if (chromaticCount >= 2 && degrees.length >= 3) {
    progressions.push('ProgressionChromatic')
  }
  
  // Détecter progression descendante (degrés qui descendent)
  let descendingCount = 0
  for (let i = 0; i < degrees.length - 1; i++) {
    const deg1 = degrees[i]
    const deg2 = degrees[i + 1]
    const degreeOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
    const idx1 = degreeOrder.indexOf(deg1)
    const idx2 = degreeOrder.indexOf(deg2)
    if (idx1 !== -1 && idx2 !== -1 && idx2 < idx1) {
      descendingCount++
    }
  }
  if (descendingCount >= 2 && descendingCount > degrees.length / 2) {
    progressions.push('ProgressionDescendante')
  }
  
  // Détecter progression ascendante (degrés qui montent)
  let ascendingCount = 0
  for (let i = 0; i < degrees.length - 1; i++) {
    const deg1 = degrees[i]
    const deg2 = degrees[i + 1]
    const degreeOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
    const idx1 = degreeOrder.indexOf(deg1)
    const idx2 = degreeOrder.indexOf(deg2)
    if (idx1 !== -1 && idx2 !== -1 && idx2 > idx1) {
      ascendingCount++
    }
  }
  if (ascendingCount >= 2 && ascendingCount > degrees.length / 2) {
    progressions.push('ProgressionAscendante')
  }
  
  return [...new Set(progressions)]
}

/**
 * Génère des tags automatiques à partir des marqueurs d'accords
 * @param {Array} markers - Tableau des marqueurs temporels
 * @param {Object} chordData - Objet contenant les données d'accords par index
 * @param {string|null} composer - Nom du compositeur (optionnel, pour tags stylistiques)
 * @returns {Array} - Tableau des tags générés
 */
export function generateAutoTags(markers, chordData, composer = null) {
  const tags = []
  const chordTypes = new Set()
  const cadences = new Set()
  const roots = new Set()
  const qualities = new Set()
  const inversions = new Set()
  const extensions = new Set()
  const specialChords = new Set()
  const functions = new Set() // Pour les fonctions harmoniques
  const modes = { major: 0, minor: 0 } // Pour compter les modes

  // Analyser chaque marqueur
  markers.forEach((marker, index) => {
    const chord = chordData[index]
    if (!chord) return

    // Racine et degré
    if (chord.root) {
      roots.add(chord.root)
    }
    if (chord.degree) {
      chordTypes.add(`Degré ${chord.degree}`)
    }
    
    // Détection des fonctions harmoniques
    if (chord.selectedFunction) {
      if (chord.selectedFunction === 'T') {
        functions.add('T')
        tags.push('Tonique')
      } else if (chord.selectedFunction === 'D') {
        functions.add('D')
        tags.push('Dominante')
      } else if (chord.selectedFunction === 'SD') {
        functions.add('SD')
        tags.push('SousDominante')
      }
    } else if (chord.degree) {
      // Inférer la fonction depuis le degré si selectedFunction n'est pas présent
      const degreeNormalized = normalizeDegree(chord.degree)
      const chordFunctions = DEGREE_TO_FUNCTIONS[degreeNormalized] || []
      chordFunctions.forEach(func => {
        functions.add(func)
        if (func === 'T' && !tags.includes('Tonique')) {
          tags.push('Tonique')
        } else if (func === 'D' && !tags.includes('Dominante')) {
          tags.push('Dominante')
        } else if (func === 'SD' && !tags.includes('SousDominante')) {
          tags.push('SousDominante')
        }
      })
    }
    
    // Détection des emprunts modaux
    if (chord.isBorrowed) {
      tags.push('EmpruntModal')
    }
    
    // Détection du contexte modal
    if (chord.degreeMode) {
      if (chord.degreeMode === 'major') {
        modes.major++
      } else if (chord.degreeMode === 'minor') {
        modes.minor++
      }
    }

    // Accords spéciaux
    if (chord.specialRoot) {
      specialChords.add(chord.specialRoot)
      if (chord.specialRoot === 'Gr') {
        tags.push('SixteAugmentée')
        tags.push('Allemande')
      } else if (chord.specialRoot === 'Fr') {
        tags.push('SixteAugmentée')
        tags.push('Française')
      } else if (chord.specialRoot === 'It') {
        tags.push('SixteAugmentée')
        tags.push('Italienne')
      } else if (chord.specialRoot === 'N' || chord.specialRoot === 'IIb') {
        tags.push('Napolitaine')
      }
    }

    // Qualités
    if (chord.quality) {
      if (chord.quality === '°') {
        qualities.add('Diminué')
        tags.push('Diminué')
      } else if (chord.quality === '+') {
        qualities.add('Augmenté')
        tags.push('Augmenté')
      }
    }

    // Renversements
    if (chord.inversion) {
      inversions.add(chord.inversion)
      if (chord.inversion === '6') {
        tags.push('PremierRenversement')
      } else if (chord.inversion === '64') {
        tags.push('SecondRenversement')
      } else if (chord.inversion === '65') {
        tags.push('SeptièmePremierRenversement')
      } else if (chord.inversion === '43') {
        tags.push('SeptièmeSecondRenversement')
      } else if (chord.inversion === '2' || chord.inversion === '42') {
        tags.push('SeptièmeTroisièmeRenversement')
      }
    }

    // Extensions
    if (chord.extension) {
      extensions.add(chord.extension)
      if (chord.extension === '7') {
        tags.push('Septième')
      } else if (chord.extension === '9') {
        tags.push('Neuvième')
      } else if (chord.extension === '11') {
        tags.push('Onzième')
      } else if (chord.extension === '13') {
        tags.push('Treizième')
      }
    }

    // Retards
    if (chord.delay) {
      tags.push('Retard')
      if (chord.delay === '54') {
        tags.push('RetardTierce')
      }
    }

    // Cadences
    if (chord.cadence) {
      cadences.add(chord.cadence)
      if (chord.cadence === 'perfect') {
        tags.push('CadenceParfaite')
      } else if (chord.cadence === 'imperfect') {
        tags.push('CadenceImparfaite')
      } else if (chord.cadence === 'plagal') {
        tags.push('CadencePlagale')
      } else if (chord.cadence === 'deceptive') {
        tags.push('CadenceRompue')
      } else if (chord.cadence === 'half') {
        tags.push('DemiCadence')
      }
    }
  })

  // Ajouter les tags de structure
  if (markers.length > 0) {
    tags.push(`Marqueurs:${markers.length}`)
    
    // Détecter des patterns communs
    if (markers.length >= 4) {
      tags.push('StructureComplexe')
    }
    
    // Détecter si beaucoup de cadences
    if (cadences.size >= 2) {
      tags.push('MultiplesCadences')
    }
    
    // Détecter si beaucoup de renversements
    if (inversions.size >= 2) {
      tags.push('RenversementsMultiples')
    }
  }

  // Ajouter les degrés utilisés
  roots.forEach(root => {
    if (root.match(/^[IVX]+$/)) {
      tags.push(`Degré${root}`)
    }
  })
  
  // Détecter les progressions harmoniques
  // Convertir chordData (objet) en tableau pour l'analyse
  const chordArray = markers.map((_, index) => chordData[index]).filter(c => c !== null && c !== undefined)
  if (chordArray.length >= 2) {
    const detectedProgressions = detectProgressions(chordArray)
    tags.push(...detectedProgressions)
  }
  
  // Détecter le contexte modal
  const totalModes = modes.major + modes.minor
  if (totalModes > 0) {
    const majorRatio = modes.major / totalModes
    const minorRatio = modes.minor / totalModes
    // Si > 60% en majeur ou mineur, ajouter le tag correspondant
    if (majorRatio > 0.6) {
      tags.push('Majeur')
    } else if (minorRatio > 0.6) {
      tags.push('Mineur')
    }
  }
  
  // Tags stylistiques basés sur le compositeur
  if (composer) {
    const style = getComposerStyle(composer)
    if (style) {
      tags.push(style)
    }
  }

  // Retirer les doublons et retourner
  return [...new Set(tags)]
}

/**
 * Parse le titre YouTube pour extraire compositeur et titre
 */
export function parseYouTubeTitle(youtubeTitle) {
  if (!youtubeTitle) {
    return { composer: null, workTitle: null }
  }

  // Patterns communs : "Compositeur - Titre" ou "Compositeur: Titre"
  const patterns = [
    /^(.+?)\s*[-–—]\s*(.+)$/,  // "Mozart - Symphonie 40"
    /^(.+?)\s*:\s*(.+)$/,       // "Mozart: Symphonie 40"
    /^(.+?)\s*–\s*(.+)$/,       // "Mozart – Symphonie 40" (tiret long)
  ]

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    const match = youtubeTitle.match(pattern)
    if (match) {
      let workTitle = match[2].trim()
      
      // Nettoyer le titre de l'œuvre : arrêter au "/" ou "·" pour enlever les infos supplémentaires
      // Ex: "Symphony No. 40 / Rattle · Berliner Philharmoniker" -> "Symphony No. 40"
      const cleanMatch = workTitle.match(/^([^/·]+?)(?:\s*[\/·].*)?$/)
      if (cleanMatch) {
        workTitle = cleanMatch[1].trim()
      }
      
      return {
        composer: match[1].trim(),
        workTitle: workTitle
      }
    }
  }

  // Si aucun pattern ne correspond, retourner le titre complet comme workTitle
  return {
    composer: null,
    workTitle: youtubeTitle.trim()
  }
}

