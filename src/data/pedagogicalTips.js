/**
 * Conseils pédagogiques courts (théorie Riemann, degrés, cadences).
 * Affichés en rotation dans le bloc "Conseil du jour" sur l'accueil élève.
 */

export const PEDAGOGICAL_TIPS = [
  'La dominante (V) attire la tonique (I) : c\'est la tension qui se résout.',
  'En analyse fonctionnelle, on lit la phrase : T donne la stabilité, D la tension, SD prépare D.',
  'La demi-cadence termine sur V : la phrase reste en suspens. La cadence parfaite V→I conclut.',
  'Le degré IV (sous-dominante) prépare la dominante : il renforce la direction vers V.',
  'I, III et VI sont des fonctions de tonique ; IV et II de sous-dominante ; V et VII° de dominante.',
  'Le renversement I6 garde la fonction tonique : c\'est la basse qui change, pas le rôle harmonique.',
  'La cadence plagale (IV→I) apporte une conclusion douce, souvent utilisée après la cadence parfaite.',
  'En Riemann, on pense par fonctions T, SD, D plutôt que par accords isolés : ça simplifie l\'analyse.',
  'V7 contient la sensible : la septième renforce l\'attraction vers la tonique.',
  'La cadence parfaite (V→I) est la conclusion type ; la demi-cadence (…→V) laisse la phrase ouverte.',
  'II et II6 sont des substituts de IV : même fonction sous-dominante, couleur différente.',
  'Le six-quatre de cadence (I64–V–I) est une appoggiature : il appartient à la dominante, pas à la tonique.',
  'VII° est une dominante sans fondamentale : même tension que V7, résolution similaire.',
  'T–SD–D–T : cette chaîne résume le parcours harmonique de la plupart des phrases tonales.',
  'Un accord peut avoir plusieurs fonctions selon le contexte : le VI peut être T ou relatif de SD.',
]

/**
 * Retourne le conseil du jour (index stable par jour de l'année).
 * @returns {string}
 */
export function getTipOfTheDay() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  const oneDay = 24 * 60 * 60 * 1000
  const dayOfYear = Math.floor(diff / oneDay)
  const index = dayOfYear % PEDAGOGICAL_TIPS.length
  return PEDAGOGICAL_TIPS[index]
}
