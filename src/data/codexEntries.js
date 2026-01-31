/**
 * Fiches du Codex – cours et référence pour l'analyse harmonique.
 * Chaque fiche : id, title, shortDescription, content, relatedNodeIds, relatedTags, category, order.
 */

export const CODEX_CATEGORIES = {
  fonctions: 'Fonctions',
  cadences: 'Cadences',
  enchainements: 'Enchaînements',
  renversements: 'Renversements',
  couleurs: 'Couleurs',
  parcours: 'Parcours'
}

/** Ordre d'affichage des catégories dans la liste */
export const CODEX_CATEGORY_ORDER = ['fonctions', 'cadences', 'enchainements', 'renversements', 'couleurs', 'parcours']

export const CODEX_ENTRIES = [
  // --- Fonctions ---
  {
    id: 'fiche-fonctions-tsd-d',
    title: 'Les fonctions T, SD et D',
    shortDescription: 'Tonique, Sous-Dominante et Dominante : le socle de l\'analyse harmonique.',
    content: `En analyse fonctionnelle (Riemann), chaque accord est lu selon sa **fonction** dans la phrase. Voir les sections ci-dessous.
- **T (Tonique)** : stabilité, point d’arrivée. Degrés principaux : I ; parallèles : III, VI.
- **SD (Sous-Dominante)** : prépare la dominante. Degrés principaux : IV ; parallèles : II, VI.
- **D (Dominante)** : tension, attente de résolution. Degrés principaux : V ; parallèles : VII, III.

La chaîne **T → SD → D → T** résume le parcours harmonique de la plupart des phrases tonales. En exercice, on vous demande d’identifier la fonction (T, SD ou D) de chaque accord.`,
    relatedNodeIds: ['1.1', '1.2'],
    relatedTags: ['Tonique', 'Dominante', 'SousDominante'],
    category: 'fonctions',
    order: 1,
    sections: [
      { id: 'definition', title: 'Définition', content: `- **T (Tonique)** : stabilité, point d'arrivée. Degrés principaux : I ; parallèles : III, VI.\n- **SD (Sous-Dominante)** : prépare la dominante. Degrés principaux : IV ; parallèles : II, VI.\n- **D (Dominante)** : tension, attente de résolution. Degrés principaux : V ; parallèles : VII, III.` },
      { id: 'parcours', title: 'Parcours harmonique', content: `La chaîne **T → SD → D → T** résume le parcours harmonique de la plupart des phrases tonales.` },
      { id: 'exercice', title: 'En exercice', content: `On vous demande d'identifier la fonction (T, SD ou D) de chaque accord.` }
    ]
  },
  {
    id: 'fiche-tonique',
    title: 'La fonction Tonique (T)',
    shortDescription: 'Stabilité et point d’ancrage : I, I6, et parallèles.',
    content: `La **Tonique** donne la stabilité. Elle ouvre et conclut les phrases.
- **Degré principal** : I (accord de tonique à l’état fondamental).
- **Renversement** : I6 garde la fonction tonique ; c’est la basse qui change.
- **Parallèles** : III et VI peuvent avoir une couleur de tonique selon le contexte.

En exercice : si l’accord « sonne » comme un point d’arrivée ou de départ, pensez T.`,
    relatedNodeIds: ['1.1', '2.1'],
    relatedTags: ['Tonique'],
    category: 'fonctions',
    order: 2
  },
  {
    id: 'fiche-sous-dominante',
    title: 'La fonction Sous-Dominante (SD)',
    shortDescription: 'IV, II et parallèles : préparer la dominante.',
    content: `La **Sous-Dominante** prépare la dominante. Elle renforce la direction vers V.
- **Degrés principaux** : IV (le plus courant), II (et II6) comme substituts.
- En exercice : entre T et D, un accord qui « mène » vers V est souvent SD.

II et II6 ont la même fonction que IV, avec une couleur différente (plus mineure pour ii).`,
    relatedNodeIds: ['1.2', '3.1'],
    relatedTags: ['SousDominante'],
    category: 'fonctions',
    order: 3
  },
  {
    id: 'fiche-dominante',
    title: 'La fonction Dominante (D)',
    shortDescription: 'V, V7 et renversements : la tension qui attire la tonique.',
    content: `La **Dominante** crée la tension. Elle attire la tonique (I).
- **Degrés** : V (triade), V7 (septième de dominante), et renversements V6, V6/5, V4/3, V2.
- **VII°** (accord de sensible) : dominante sans fondamentale, même tension que V7.

En phrase : tout accord qui « demande » une résolution vers I est typiquement D. La cadence parfaite V→I est la conclusion type.`,
    relatedNodeIds: ['1.1', '2.3', '3.2'],
    relatedTags: ['Dominante', 'Septième'],
    category: 'fonctions',
    order: 4
  },
  // --- Cadences ---
  {
    id: 'fiche-demi-cadence-parfaite',
    title: 'Demi-cadence et cadence parfaite',
    shortDescription: 'Fin sur V (suspens) vs V→I (conclusion).',
    content: `**Demi-cadence** : la phrase se termine sur V. La phrase reste en suspens (on attend la suite).
**Cadence parfaite** : V → I. C’est la conclusion type ; la phrase est close.

En exercice, on vous demande parfois d’identifier la **cadence** en plus de la fonction de chaque accord. Une demi-cadence = fin sur D (V) ; une cadence parfaite = enchaînement V puis I.`,
    relatedNodeIds: ['1.1', 'cadence-demi', 'cadence-parfaite', 'cadence-demi-et-parfaite'],
    relatedTags: ['DemiCadence', 'CadenceParfaite'],
    category: 'cadences',
    order: 1,
    sections: [
      { id: 'demi-cadence', title: 'Demi-cadence', content: `La phrase se termine sur **V**. La phrase reste en suspens (on attend la suite).` },
      { id: 'cadence-parfaite', title: 'Cadence parfaite', content: `**V → I**. C'est la conclusion type ; la phrase est close.` },
      { id: 'exercice', title: 'En exercice', content: `On vous demande parfois d'identifier la **cadence** en plus de la fonction de chaque accord. Une demi-cadence = fin sur D (V) ; une cadence parfaite = enchaînement V puis I.` }
    ]
  },
  {
    id: 'fiche-cadence-plagale',
    title: 'Cadence plagale (IV→I)',
    shortDescription: 'Conclusion douce IV → I.',
    content: `La **cadence plagale** est l’enchaînement **IV → I**. Elle apporte une conclusion douce, souvent utilisée après la cadence parfaite (V→I) dans les finales.

En exercice : si vous voyez une fin IV puis I (sans V entre les deux), c’est une cadence plagale. La fonction de IV est SD, celle de I est T.`,
    relatedNodeIds: ['1.2', 'cadence-plagale'],
    relatedTags: ['CadencePlagale'],
    category: 'cadences',
    order: 2
  },
  {
    id: 'fiche-cadence-64',
    title: 'Le six-quatre de cadence',
    shortDescription: 'I6/4 avant V : il appartient à la dominante.',
    content: `Le **six-quatre de cadence** est la formule **I6/4 → V → I**. Malgré le chiffrage en I, ce I6/4 est une **appoggiature** : il appartient à la **dominante**, pas à la tonique. En analyse, on le considère comme D (tension vers V).

En exercice : devant un V, un accord 6/4 sur la tonique est en général à classer **D** (cadence 6/4), pas T.`,
    relatedNodeIds: ['2.2', 'cadence-parfaite-composee'],
    relatedTags: ['Cadence6/4'],
    category: 'cadences',
    order: 3
  },
  {
    id: 'fiche-cadence-rompue',
    title: 'Cadence rompue (V→vi)',
    shortDescription: 'V→vi : la fausse résolution.',
    content: `La **cadence rompue** (ou « évitée ») est l’enchaînement **V → vi** au lieu de V → I. La dominante ne résout pas sur la tonique mais sur le **VI** (tonique parallèle), ce qui crée un effet de suspens ou de surprise.

En exercice : après un V, si la résolution est sur vi (et non I), il s’agit d’une cadence rompue.`,
    relatedNodeIds: ['3.3', 'cadence-rompue'],
    relatedTags: ['CadenceRompue'],
    category: 'cadences',
    order: 4
  },
  // --- Enchaînements ---
  {
    id: 'fiche-enchainements-typiques',
    title: 'Enchaînements typiques (T–SD–D–T)',
    shortDescription: 'Le parcours harmonique de la phrase tonale.',
    content: `La plupart des phrases tonales suivent un parcours du type :
**T → (SD) → D → T**
- T donne la stabilité au départ.
- SD prépare D (optionnel mais très fréquent).
- D crée la tension.
- T conclut (résolution).

En exercice : repérez d’abord les cadences (demi-cadence = fin sur D ; cadence parfaite = D puis T), puis remplissez les fonctions des accords entre les deux.`,
    relatedNodeIds: ['1.1', '1.2', 'revision-etage-1'],
    relatedTags: ['ProgressionII-V-I'],
    category: 'enchainements',
    order: 1
  },
  // --- Renversements ---
  {
    id: 'fiche-renversements',
    title: 'Renversements',
    shortDescription: 'Même fonction, autre position de la basse.',
    content: `Un **renversement** change la note à la basse, pas la fonction. Par exemple :
- **I6** : tonique avec tierce à la basse (même fonction T que I).
- **V6**, **V6/5**, **V4/3**, **V2** : tous restent **D** (dominante).

En exercice : dès que la basse n’est plus la fondamentale de l’accord, vous devez identifier le renversement (6, 6/4, 7, 6/5, 4/3, 2) tout en gardant la bonne fonction.`,
    relatedNodeIds: ['2.1', '2.2', '2.3', '3.2'],
    relatedTags: ['PremierRenversement', 'SecondRenversement', 'SeptièmePremierRenversement', 'SeptièmeSecondRenversement', 'SeptièmeTroisièmeRenversement'],
    category: 'renversements',
    order: 1
  },
  // --- Couleurs (résumé pour étage 4) ---
  {
    id: 'fiche-sixte-napolitaine',
    title: 'Sixte napolitaine (N6)',
    shortDescription: 'II♭6 dans la fonction SD.',
    content: `La **sixte napolitaine** est un accord de **sous-dominante** : **II♭ à l’état de premier renversement** (N6 ou II♭6). Il ne faut pas le confondre avec IV ou ii6. Il apporte une couleur sombre, souvent avant V.

En exercice : dans le menu SD, choisir N6 (ou II♭6) quand l’accord a cette couleur caractéristique.`,
    relatedNodeIds: ['4.1'],
    relatedTags: ['Napolitaine'],
    category: 'couleurs',
    order: 1
  },
  {
    id: 'fiche-dominante-dominante',
    title: 'Dominante de la dominante (V/V)',
    shortDescription: 'V7 de V : renforcer la tension vers V.',
    content: `La **dominante de la dominante** (V/V ou V7/V) est un accord qui « prépare » V en le traitant comme une tonique temporaire. C’est une couleur chromatique très courante.

En exercice : un accord de septième qui résout sur V (et non sur I) peut être V7/V. Les renversements (V6/5/V, etc.) gardent cette fonction.`,
    relatedNodeIds: ['4.2', '4.3', '4.4'],
    relatedTags: [],
    category: 'couleurs',
    order: 2
  }
]
