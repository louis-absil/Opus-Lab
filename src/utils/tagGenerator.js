/**
 * Génère des tags automatiques à partir des marqueurs d'accords
 */
export function generateAutoTags(markers, chordData) {
  const tags = []
  const chordTypes = new Set()
  const cadences = new Set()
  const roots = new Set()
  const qualities = new Set()
  const inversions = new Set()
  const extensions = new Set()
  const specialChords = new Set()

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

