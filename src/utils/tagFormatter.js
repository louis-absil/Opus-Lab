/**
 * Formate les tags techniques en notation musicale lisible pour l'affichage
 * @param {string} tag - Le tag technique (ex: "SeptièmePremierRenversement")
 * @returns {string} - Le tag formaté pour l'affichage (ex: "7 ⁶₅")
 */
export function formatTagForDisplay(tag) {
  if (!tag) return tag
  
  // Normaliser le tag (gérer underscores, casse et accents)
  // Remplacer les underscores et normaliser la casse
  let normalizedTag = tag.replace(/_/g, '')
  
  // Mapping pour restaurer les accents (tags arrivent sans accents depuis la base)
  const accentMap = {
    'septieme': 'Septième',
    'neuvieme': 'Neuvième',
    'onzieme': 'Onzième',
    'treizieme': 'Treizième',
    'troisieme': 'Troisième',
    'premier': 'Premier',
    'second': 'Second',
    'diminue': 'Diminué',
    'augmente': 'Augmenté',
    'cadenceparfaite': 'CadenceParfaite',
    'cadenceimparfaite': 'CadenceImparfaite',
    'cadenceplagale': 'CadencePlagale',
    'cadencerompue': 'CadenceRompue',
    'demicadence': 'DemiCadence',
    'renversementsmultiples': 'RenversementsMultiples',
    'multiplescadences': 'MultiplesCadences',
    'structurecomplexe': 'StructureComplexe',
    'structuremoyenne': 'StructureMoyenne'
  }
  
  // Mapping pour les tags composés (avec plusieurs mots)
  const compositeMap = {
    'septiemepremierrenversement': 'SeptièmePremierRenversement',
    'septiemesecondrenversement': 'SeptièmeSecondRenversement',
    'septiemetroisiemerenversement': 'SeptièmeTroisièmeRenversement',
    'premierrenversement': 'PremierRenversement',
    'secondrenversement': 'SecondRenversement'
  }
  
  // Essayer d'abord les tags composés
  const tagLower = normalizedTag.toLowerCase()
  if (compositeMap[tagLower]) {
    normalizedTag = compositeMap[tagLower]
  } else if (accentMap[tagLower]) {
    normalizedTag = accentMap[tagLower]
  } else {
    // Sinon, capitaliser la première lettre
    normalizedTag = normalizedTag.charAt(0).toUpperCase() + normalizedTag.slice(1)
  }
  
  // Mapping des tags vers notation musicale
  const tagMap = {
    // Renversements de septièmes (notation baroque superposée)
    'SeptièmePremierRenversement': '⁶₅',
    'SeptièmeSecondRenversement': '⁴₃',
    'SeptièmeTroisièmeRenversement': '²',
    
    // Renversements simples
    'PremierRenversement': '⁶',
    'SecondRenversement': '⁶₄',
    
    // Extensions
    'Septième': '7',
    'Neuvième': '9',
    'Onzième': '11',
    'Treizième': '13',
    
    // Accords spéciaux
    'SixteAugmentée': '⁺⁶',
    'Napolitaine': 'Napolitaine',
    'Allemande': 'Allemande',
    'Française': 'Française',
    'Italienne': 'Italienne',
    
    // Qualités
    'Diminué': '°',
    'Augmenté': '+',
    
    // Cadences
    'CadenceParfaite': 'Cadence Parfaite',
    'CadenceImparfaite': 'Cadence Imparfaite',
    'CadencePlagale': 'Cadence Plagale',
    'CadenceRompue': 'Cadence Rompue',
    'DemiCadence': 'Demi-Cadence',
    
    // Retards
    'Retard': 'Retard',
    'RetardTierce': 'Retard Tierce',
    
    // Structure
    'StructureComplexe': 'Structure Complexe',
    'StructureMoyenne': 'Structure Moyenne',
    'MultiplesCadences': 'Multiples Cadences',
    'RenversementsMultiples': 'Renversements Multiples',
    
    // Fonctions harmoniques
    'Tonique': 'Tonique',
    'Dominante': 'Dominante',
    'SousDominante': 'Sous-Dominante',
    'EmpruntModal': 'Emprunt Modal',
    
    // Progressions
    'ProgressionII-V-I': 'II-V-I',
    'ProgressionCircleOfFifths': 'Cycle des Quintes',
    'ProgressionChromatic': 'Progression Chromatique',
    'ProgressionDescendante': 'Progression Descendante',
    'ProgressionAscendante': 'Progression Ascendante',
    
    // Contexte modal
    'Majeur': 'Majeur',
    'Mineur': 'Mineur',
    
    // Styles
    'Baroque': 'Baroque',
    'Classique': 'Classique',
    'Romantique': 'Romantique',
    'Moderne': 'Moderne',
  }
  
  // Si tag dans le mapping, retourner la valeur formatée
  if (tagMap[tag]) {
    return tagMap[tag]
  }
  
  // Essayer avec le tag normalisé
  if (tagMap[normalizedTag]) {
    return tagMap[normalizedTag]
  }
  
  // Gérer les tags "DegréX" -> "X" (avec ou sans underscore)
  const degreMatch = tag.match(/^degre[_:]?([ivx]+)$/i) || normalizedTag.match(/^Degré([IVX]+)$/);
  if (degreMatch) {
    const degree = degreMatch[1].toUpperCase();
    return degree
  }
  
  // Gérer les tags "Marqueurs:N" -> "N marqueurs" (avec ou sans underscore)
  const marqueursMatch = tag.match(/^marqueurs[_:]?(\d+)$/i);
  if (marqueursMatch) {
    const count = marqueursMatch[1];
    return `${count} marqueur${count !== '1' ? 's' : ''}`
  }
  
  // Appliquer des règles de formatage génériques pour les tags non mappés
  // Gérer les underscores et ajouter des espaces avant les majuscules
  let formatted = tag.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  formatted = formatted.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  
  return formatted
}
