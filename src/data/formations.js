/**
 * Formations (instrumentation uniquement) et Genres pour les exercices.
 * Formation = instrumentation (piano, orchestre, etc.) — peut être multiple (ex. piano + orchestre pour concerto).
 * Genre = type d'œuvre (concerto, trio, symphonie, etc.).
 */

/** Instrumentation — musique classique (formation = ce qui joue) */
export const CLASSICAL_FORMATIONS = [
  { id: 'piano', label: 'Piano' },
  { id: 'violon', label: 'Violon' },
  { id: 'clavecin', label: 'Clavecin' },
  { id: 'orgue', label: 'Orgue' },
  { id: 'violoncelle', label: 'Violoncelle' },
  { id: 'flute', label: 'Flûte' },
  { id: 'chant', label: 'Chant' },
  { id: 'orchestre_chambre', label: 'Orchestre de chambre' },
  { id: 'orchestre_symphonique', label: 'Orchestre symphonique' },
  { id: 'choeur', label: 'Chœur' },
  { id: 'autre_solo', label: 'Autre instrument soliste' },
  { id: 'autre', label: 'Autre' }
]

/** Instrumentation — Nouveaux Horizons */
export const HORIZONS_FORMATIONS = [
  { id: 'piano_clavier', label: 'Piano / clavier' },
  { id: 'chant', label: 'Chant' },
  { id: 'guitare', label: 'Guitare' },
  { id: 'groupe_band', label: 'Groupe / band (rock, pop)' },
  { id: 'big_band', label: 'Big band' },
  { id: 'orchestre', label: 'Orchestre (BO, symphonique)' },
  { id: 'orchestre_chant', label: 'Orchestre + chant / chœur' },
  { id: 'electronique_synthe', label: 'Électronique / synthé' },
  { id: 'combo_jazz', label: 'Combo jazz' },
  { id: 'petit_ensemble', label: 'Petit ensemble' },
  { id: 'autre', label: 'Autre' }
]

/** Genres (type d'œuvre) — classique : concerto, trio, symphonie, etc. */
export const CLASSICAL_GENRES = [
  { id: 'symphonie', label: 'Symphonie' },
  { id: 'concerto', label: 'Concerto' },
  { id: 'sonate', label: 'Sonate' },
  { id: 'trio', label: 'Trio' },
  { id: 'quatuor_cordes', label: 'Quatuor à cordes' },
  { id: 'quatuor_piano', label: 'Quatuor avec piano' },
  { id: 'quintette', label: 'Quintette' },
  { id: 'lied_melodie', label: 'Lied / Mélodie' },
  { id: 'opera', label: 'Opéra' },
  { id: 'ouverture', label: 'Ouverture' },
  { id: 'prelude', label: 'Prélude' },
  { id: 'nocturne', label: 'Nocturne' },
  { id: 'ballade', label: 'Ballade' },
  { id: 'sextuor_septuor_octuor', label: 'Sextuor, septuor, octuor' },
  { id: 'autre', label: 'Autre' }
]

const FORMATION_TAG_PREFIX = 'Formation'
const GENRE_TAG_PREFIX = 'Genre'

/**
 * Tag autoTags pour une formation (instrumentation).
 */
export function getFormationTag(formationId) {
  if (!formationId) return null
  const parts = formationId.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
  return FORMATION_TAG_PREFIX + parts.join('')
}

/**
 * Tag autoTags pour un genre.
 */
export function getGenreTag(genreId) {
  if (!genreId) return null
  const parts = genreId.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
  return GENRE_TAG_PREFIX + parts.join('')
}

/**
 * Infère les instrumentations depuis le titre (pour suggestion / rétrocompat).
 * Retourne un tableau d'ids (ex. concerto → ['piano', 'orchestre_symphonique']).
 */
export function inferFormationsFromWorkTitle(workTitle, section = null) {
  if (!workTitle || typeof workTitle !== 'string') return []
  const t = workTitle.toLowerCase().trim()
  const result = []
  if (section === 'horizons') {
    if (/\borchestre\b|\bsymphonique\b|\bbo\b|\bsoundtrack\b/.test(t)) result.push('orchestre')
    if (/\bbig\s*band\b|\bjazz\s*orchestra\b/.test(t)) result.push('big_band')
    if (/\bchant\b.*\bpiano\b|\bpiano\b.*\bchant\b|\bballad\b/.test(t)) { result.push('chant'); result.push('piano_clavier') }
    if (/\bchant\b.*\bguitar|\bguitar\b.*\bchant\b|\bacoustic\b/.test(t)) { result.push('chant'); result.push('guitare') }
    if (/\bband\b|\bgroupe\b|\brock\b|\bpop\b/.test(t)) result.push('groupe_band')
    if (/\belectronique\b|\bsynth\b|\bedm\b|\bsynthwave\b|\bchiptune\b/.test(t)) result.push('electronique_synthe')
    if (/\bcombo\b|\bjazz\s*trio\b|\btrio\s*jazz\b/.test(t)) result.push('combo_jazz')
    return [...new Set(result)]
  }
  // Classique : instrumentation uniquement
  if (/\bsymphonie\b|\bsymphony\b|\bsinfonia\b/.test(t)) result.push('orchestre_symphonique')
  if (/\bconcerto\b/.test(t)) { result.push('orchestre_symphonique'); result.push('piano') } // par défaut concerto piano
  if (/\bquatuor\b|\bquartet\b|\bquartett\b/.test(t)) result.push('orchestre_chambre') // approximation
  if (/\btrio\b/.test(t)) result.push('piano') // approximation
  if (/\blied\b|\bmélodie\b|\bmelodie\b|\bsong\s*cycle\b/.test(t)) { result.push('chant'); result.push('piano') }
  if (/\bsonate\b|\ssonata\b/.test(t) && (/\bpiano\b|\bclavecin\b|\bkeyboard\b/.test(t) || !/\bviolon\b|\bviolin\b|\bcello\b|\bflute\b/.test(t))) result.push('piano')
  if (/\bprélude\b|\bprelude\b|\bnocturne\b|\bballade\b|\bétude\b|\betude\b/.test(t) && /\bpiano\b|^piano\s/i.test(workTitle)) result.push('piano')
  if (/\bopéra\b|\bopera\b|\bop\.\s*\d/.test(t)) { result.push('chant'); result.push('orchestre_symphonique') }
  if (/\bchœur\b|\bchoir\b|\bchorus\b/.test(t)) result.push('choeur')
  if (/\bviolon\b|\bviolin\b/.test(t) && !/\bquatuor\b|\bquartet\b|\btrio\b|\bduo\b/.test(t)) result.push('violon')
  if (/\bclavecin\b|\bharpsichord\b/.test(t)) result.push('clavecin')
  if (/\borgue\b|\borgan\b/.test(t)) result.push('orgue')
  if (/\bvioloncelle\b|\bcello\b/.test(t) && !/\bquatuor\b|\bquartet\b|\btrio\b|\bduo\b/.test(t)) result.push('violoncelle')
  if (/\bflûte\b|\bflute\b/.test(t) && !/\bquatuor\b|\bquartet\b/.test(t)) result.push('flute')
  return [...new Set(result)]
}

/**
 * Inférence genre depuis le titre (pour suggestion / rétrocompat).
 */
export function inferGenreFromWorkTitle(workTitle) {
  if (!workTitle || typeof workTitle !== 'string') return null
  const t = workTitle.toLowerCase().trim()
  if (/\bsymphonie\b|\bsymphony\b|\bsinfonia\b/.test(t)) return 'symphonie'
  if (/\bconcerto\b/.test(t)) return 'concerto'
  if (/\bquatuor\b|\bquartet\b|\bquartett\b/.test(t)) return 'quatuor_cordes'
  if (/\btrio\b/.test(t)) return 'trio'
  if (/\bquintette\b|\bquintet\b|\bquintett\b/.test(t)) return 'quintette'
  if (/\blied\b|\bmélodie\b|\bmelodie\b|\bsong\s*cycle\b/.test(t)) return 'lied_melodie'
  if (/\bsonate\b|\ssonata\b/.test(t)) return 'sonate'
  if (/\bopéra\b|\bopera\b|\bop\.\s*\d/.test(t)) return 'opera'
  if (/\bouverture\b|\boverture\b/.test(t)) return 'ouverture'
  if (/\bprélude\b|\bprelude\b/.test(t)) return 'prelude'
  if (/\bnocturne\b/.test(t)) return 'nocturne'
  if (/\bballade\b|\bballad\b/.test(t)) return 'ballade'
  if (/\bsextuor\b|\bseptuor\b|\boctuor\b|\bsextet\b|\boctet\b/.test(t)) return 'sextuor_septuor_octuor'
  return null
}

/** @deprecated Utiliser inferFormationsFromWorkTitle (retourne un tableau). Gardé pour compat. */
export function inferFormationFromWorkTitle(workTitle, section = null) {
  const arr = inferFormationsFromWorkTitle(workTitle, section)
  return arr.length > 0 ? arr[0] : null
}
