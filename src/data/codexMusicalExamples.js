/**
 * Exemples musicaux du Codex : accords et progressions jouables (partition, clavier, audio).
 * Chaque exemple : id, type, tonality, mode, chords, abc?, description, ficheIds?.
 */

export const CODEX_MUSICAL_EXAMPLES = [
  {
    id: 'ex-cadence-parfaite-c',
    type: 'progression',
    tonality: 'C',
    mode: 'major',
    description: 'Cadence parfaite en Do (V → I)',
    chords: [
      { degree: 'V', figure: '5' },
      { degree: 'I', figure: '5' }
    ],
    abc: `X:1
M:4/4
L:1/4
K:C
V:1 clef=treble
[G, G B d] [C E G c]|
`,
    ficheIds: ['fiche-demi-cadence-parfaite', 'fiche-dominante']
  },
  {
    id: 'ex-demi-cadence-c',
    type: 'progression',
    tonality: 'C',
    mode: 'major',
    description: 'Demi-cadence (fin sur V)',
    chords: [
      { degree: 'I', figure: '5' },
      { degree: 'V', figure: '5' }
    ],
    abc: `X:1
M:4/4
L:1/4
K:C
V:1 clef=treble
[C E G c] [G, B d g]|
`,
    ficheIds: ['fiche-demi-cadence-parfaite']
  },
  {
    id: 'ex-tsd-t-c',
    type: 'progression',
    tonality: 'C',
    mode: 'major',
    description: 'Parcours T – SD – D – T en Do',
    chords: [
      { degree: 'I', figure: '5' },
      { degree: 'IV', figure: '5' },
      { degree: 'V', figure: '5' },
      { degree: 'I', figure: '5' }
    ],
    abc: `X:1
M:4/4
L:1/4
K:C
V:1 clef=treble
[C E G] [F A c] [G B d] [C E G]|
`,
    ficheIds: ['fiche-fonctions-tsd-d', 'fiche-enchainements-typiques']
  },
  {
    id: 'ex-cadence-plagale-c',
    type: 'progression',
    tonality: 'C',
    mode: 'major',
    description: 'Cadence plagale (IV → I) en Do',
    chords: [
      { degree: 'IV', figure: '5' },
      { degree: 'I', figure: '5' }
    ],
    abc: `X:1
M:4/4
L:1/4
K:C
V:1 clef=treble
[F A c] [C E G c]|
`,
    ficheIds: ['fiche-cadence-plagale']
  },
  {
    id: 'ex-cadence-rompue-c',
    type: 'progression',
    tonality: 'C',
    mode: 'major',
    description: 'Cadence rompue (V → vi) en Do',
    chords: [
      { degree: 'V', figure: '5' },
      { degree: 'VI', figure: '5', quality: 'm' }
    ],
    abc: `X:1
M:4/4
L:1/4
K:C
V:1 clef=treble
[G, B d g] [A, C E A]|
`,
    ficheIds: ['fiche-cadence-rompue']
  },
  {
    id: 'ex-tonique-i',
    type: 'chord',
    tonality: 'C',
    mode: 'major',
    description: 'Accord de tonique (I) en Do',
    chords: [{ degree: 'I', figure: '5' }],
    abc: `X:1
M:4/4
L:1/2
K:C
V:1 clef=treble
[C E G c]|
`,
    ficheIds: ['fiche-tonique']
  },
  {
    id: 'ex-dominante-v7',
    type: 'chord',
    tonality: 'C',
    mode: 'major',
    description: 'Septième de dominante (V7) en Do',
    chords: [{ degree: 'V', figure: '7' }],
    abc: `X:1
M:4/4
L:1/2
K:C
V:1 clef=treble
[G, B d f]|
`,
    ficheIds: ['fiche-dominante', 'fiche-renversements']
  }
]

/**
 * Retourne les exemples liés à une fiche.
 * @param {string} ficheId - ID de la fiche Codex
 * @returns {Object[]}
 */
export function getExamplesForFiche(ficheId) {
  if (!ficheId || typeof ficheId !== 'string') return []
  return CODEX_MUSICAL_EXAMPLES.filter(
    (ex) => Array.isArray(ex.ficheIds) && ex.ficheIds.includes(ficheId)
  )
}

/**
 * Retourne un exemple par ID.
 * @param {string} exampleId
 * @returns {Object|null}
 */
export function getExampleById(exampleId) {
  if (!exampleId || typeof exampleId !== 'string') return null
  return CODEX_MUSICAL_EXAMPLES.find((ex) => ex.id === exampleId) || null
}
