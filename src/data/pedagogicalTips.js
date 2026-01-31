/**
 * Conseils pédagogiques (théorie Riemann, degrés, cadences).
 * Affichés dans le bloc "Conseil du jour" sur l'accueil élève.
 * Chaque conseil est tagué pour une sélection personnalisée (difficultés, parcours, niveau).
 *
 * Tags : degree (I, IV, V, II, VI, VII, III), cadence (demi, parfaite, plagale, 64, rompue),
 * parcoursTheme (id nœud parcoursTree), level (beginner | advanced).
 */

/** @typedef {{ id: string, text: string, degree?: string, cadence?: string, parcoursTheme?: string | string[], level?: 'beginner' | 'advanced' }} TaggedTip */

export const TAGGED_TIPS = [
  // --- V (dominante) ---
  { id: 'v-tension', text: 'La dominante (V) attire la tonique (I) : c\'est la tension qui se résout.', degree: 'V', parcoursTheme: '1.1', level: 'beginner' },
  { id: 'v7-sensible', text: 'V7 contient la sensible : la septième renforce l\'attraction vers la tonique.', degree: 'V', level: 'advanced' },
  { id: 'vii-dominante', text: 'VII° est une dominante sans fondamentale : même tension que V7, résolution similaire.', degree: 'VII', level: 'advanced' },
  // --- I (tonique) ---
  { id: 'i6-fonction', text: 'Le renversement I6 garde la fonction tonique : c\'est la basse qui change, pas le rôle harmonique.', degree: 'I', parcoursTheme: '2.1', level: 'advanced' },
  { id: 'i64-appoggiature', text: 'Le six-quatre de cadence (I64–V–I) est une appoggiature : il appartient à la dominante, pas à la tonique.', degree: 'I', cadence: '64', parcoursTheme: '2.2', level: 'advanced' },
  // --- IV / SD ---
  { id: 'iv-vers-v', text: 'Le degré IV (sous-dominante) prépare la dominante : il renforce la direction vers V.', degree: 'IV', parcoursTheme: '1.2', level: 'beginner' },
  { id: 'ii-substitut', text: 'II et II6 sont des substituts de IV : même fonction sous-dominante, couleur différente.', degree: 'II', parcoursTheme: '1.2', level: 'advanced' },
  // --- VI / III (contexte) ---
  { id: 'vi-double', text: 'Un accord peut avoir plusieurs fonctions selon le contexte : le VI peut être T ou relatif de SD.', degree: 'VI', level: 'advanced' },
  { id: 'degres-fonctions', text: 'I, III et VI sont des fonctions de tonique ; IV et II de sous-dominante ; V et VII° de dominante.', degree: 'III', level: 'beginner' },
  // --- Cadences ---
  { id: 'demi-vs-parfaite', text: 'La demi-cadence termine sur V : la phrase reste en suspens. La cadence parfaite V→I conclut.', cadence: 'demi', parcoursTheme: ['cadence-demi', 'cadence-parfaite', 'cadence-demi-et-parfaite'], level: 'beginner' },
  { id: 'cadence-parfaite-type', text: 'La cadence parfaite (V→I) est la conclusion type ; la demi-cadence (…→V) laisse la phrase ouverte.', cadence: 'parfaite', parcoursTheme: ['cadence-parfaite', 'cadence-demi-et-parfaite'], level: 'beginner' },
  { id: 'plagale', text: 'La cadence plagale (IV→I) apporte une conclusion douce, souvent utilisée après la cadence parfaite.', cadence: 'plagale', parcoursTheme: 'cadence-plagale', level: 'beginner' },
  { id: 'cadence-64-composee', text: 'En cadence parfaite composée (I64–V–I), le 6/4 est une tension vers V : compte-le comme D.', cadence: '64', parcoursTheme: ['2.2', 'cadence-parfaite-composee'], level: 'advanced' },
  { id: 'rompue', text: 'La cadence rompue (V→vi) crée un effet de surprise : la tonique attendue est remplacée par son parallèle.', cadence: 'rompue', parcoursTheme: 'cadence-rompue', level: 'advanced' },
  // --- Général Riemann / T-SD-D ---
  { id: 'phrase-tsd-d', text: 'En analyse fonctionnelle, on lit la phrase : T donne la stabilité, D la tension, SD prépare D.', parcoursTheme: '1.1', level: 'beginner' },
  { id: 'riemann-fonctions', text: 'En Riemann, on pense par fonctions T, SD, D plutôt que par accords isolés : ça simplifie l\'analyse.', level: 'beginner' },
  { id: 'chaine-tsd-d-t', text: 'T–SD–D–T : cette chaîne résume le parcours harmonique de la plupart des phrases tonales.', level: 'beginner' },
]

/**
 * Liste plate des textes (pour getTipOfTheDay, même ordre que TAGGED_TIPS).
 */
export const PEDAGOGICAL_TIPS = TAGGED_TIPS.map((t) => t.text)

/**
 * Retourne le conseil du jour (index stable par jour de l'année). Fallback quand pas de personnalisation.
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
