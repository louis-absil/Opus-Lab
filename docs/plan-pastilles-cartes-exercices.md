# Pastilles notions globales et difficulté sur les cartes d'exercices

## Contexte et objectif

Remplacer sur les cartes d'exercices les marqueurs et tags techniques par des **pastilles « notions globales » + difficulté**, pour que l'élève voie en un coup d'œil le niveau et le type de travail sans spoiler le contenu.

---

## Notions globales retenues (sans « Fonctions »)

- **Cadences** — si au moins un : CadenceParfaite, CadenceImparfaite, CadencePlagale, CadenceRompue, DemiCadence, Cadence6/4  
- **Renversements** — PremierRenversement, SecondRenversement, Septième*Renversement, RenversementsMultiples  
- **Accords de 7e** — Septième, Septième*Renversement  
- **Couleurs** — Diminué, Augmenté, Napolitaine, SixteAugmentée, Allemande/Française/Italienne, EmpruntModal  
- **Structure** — StructureComplexe, MultiplesCadences  
- **Style** — Baroque, Classique, Romantique, Moderne (déjà dans autoTags via compositeur)  

*(Pastille « Fonctions » retirée : tous les exercices ont des fonctions, donc non discriminante.)*

---

## Affichage des pastilles (choix retenus)

### 1. Ordre : difficulté en premier

- **Desktop et mobile** : la pastille **difficulté** est toujours affichée **en première position**.
- **Évaluation** : l’élève voit tout de suite « facile / difficile » puis le type de contenu ; cohérent sur tous les écrans, pas d’inconvénient.

### 2. Desktop : max 3 pastilles visibles + reste au survol

- **Visible par défaut** : **difficulté** + **2 pastilles notions** (soit 3 pastilles au total). Si l’exercice a plus de 2 notions, seules les 2 premières (ordre de priorité) sont affichées.
- **Au survol de la souris** : un élément apparaît (tooltip / popover) qui affiche **toutes** les pastilles (difficulté + toutes les notions).
- **Évaluation** : carte lisible, utilisateurs avancés voient le détail au survol ; implémentation propre avec `position: relative` sur la zone pastilles, tooltip/popover en `position: absolute` ou portail, déclenché au `hover` (ou `focus-visible` pour l’accessibilité).

### 3. Mobile : scroll horizontal sans scrollbar

- **Une ligne** avec **toutes** les pastilles (difficulté en premier, puis toutes les notions), dans un conteneur en **scroll horizontal**.
- **Scroll au doigt** possible, **sans scrollbar visible** (`overflow-x: auto` + `scrollbar-width: none` et `-webkit-scrollbar { display: none }`, comme l’actuelle zone tags).
- **Évaluation** : pattern déjà utilisé dans le projet (`.exercise-card-tags-scroll`), réutilisable ; pas de tooltip au doigt (évite la complexité du hover sur tactile), l’utilisateur fait défiler pour tout voir.

---

## Détail par breakpoint

### Desktop

- Zone pastilles : **difficulté** (toujours) + **2 notions** max visibles.
- Si plus de 2 notions : au **survol** de cette zone (ou de la carte), afficher un **tooltip / popover** listant toutes les pastilles (difficulté + toutes les notions), style cohérent (mêmes pastilles, en wrap si besoin).
- Taille : pastilles compactes (padding `0.25rem 0.5rem`, `font-size` ~0.75rem, `border-radius` 8–10px). La pastille difficulté garde ses couleurs actuelles.

### Mobile

- Zone pastilles : **une seule ligne**, ordre **difficulté** puis **toutes les notions**, dans un conteneur en **overflow-x: auto**.
- **Scroll horizontal** au doigt, **scrollbar masquée** (CSS : `scrollbar-width: none` ; `-ms-overflow-style: none` ; `::-webkit-scrollbar { display: none }`).
- Même style de pastilles, éventuellement légèrement plus petit en media query si besoin.

---

## Implémentation technique (résumé)

- **Utilitaire** `getGlobalNotionsFromAutoTags(autoTags)` : retourne la liste **complète** des notions (ordre de priorité : ex. Style > Cadences > Renversements > 7e > Couleurs > Structure). Pas de limite côté utilitaire ; la limite « 3 pastilles visibles » (difficulté + 2 notions) est gérée uniquement en **desktop** dans le composant.
- **ExerciseCard.jsx** :
  - **Desktop** : afficher difficulté + 2 premières notions ; si `notions.length > 2`, rendre un tooltip/popover au survol (sur la zone pastilles ou la carte) contenant difficulté + toutes les notions.
  - **Mobile** : afficher une seule ligne scrollable (difficulté + toutes les notions), scrollbar cachée.
  - Détection desktop/mobile : media query CSS (ex. `.exercise-card-pills--desktop` / `--mobile`) ou `useMediaQuery` pour conditionner le rendu (zone fixe 3 pastilles + tooltip vs zone scroll).
- **CSS** : `.exercise-card-pills`, `.exercise-card-pill`, `.exercise-card-pill--notion`, `.exercise-card-pill--difficulty` ; conteneur mobile avec `overflow-x: auto`, scrollbar masquée ; styles du tooltip/popover (position, z-index, fond, bordure).

---

## Récap implémentation

1. **Nouveau** `src/utils/globalNotions.js` : mapping autoTags → notions (sans Fonctions), fonction retournant la liste **complète** ordonnée (priorité : Style > Cadences > Renversements > 7e > Couleurs > Structure).
2. **ExerciseCard.jsx** : supprimer autoTags et "X marqueur(s)". Afficher toujours la pastille **difficulté en premier**. Desktop : difficulté + 2 notions visibles, tooltip/popover au survol avec toutes les pastilles. Mobile : ligne scrollable (difficulté + toutes les notions), scrollbar cachée.
3. **ExerciseCard.css** : styles compacts pour les pastilles ; conteneur scroll horizontal (mobile) avec scrollbar masquée ; styles pour le tooltip/popover (desktop).
4. **Dashboard prof / ExerciseSuggestions** : selon choix, soit mêmes pastilles globales, soit garder le détail (tags / marqueurs) pour le prof uniquement.
