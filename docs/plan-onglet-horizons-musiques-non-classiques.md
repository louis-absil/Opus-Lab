# Plan : onglet « Horizons » (musiques non classiques)

## 1. Nom de l’onglet et option B (filtre)

- **Nom retenu pour l’onglet** : **« Nouveaux Horizons »** (recommandé) ou « Horizons ».  
  - **Nouveaux Horizons** : met l’accent sur la découverte et le contenu débloqué ; un peu plus long mais plus explicite.  
  - **Horizons** : plus court, déjà évocateur.  
  Dans ce plan on utilise **Nouveaux Horizons** pour l’affichage utilisateur ; l’id technique peut rester `horizons` (routes, états).
- **Option B** : En Mode Libre, un **bouton** (ex. « Découvrir Nouveaux Horizons » ou icône dédiée) mène vers l’onglet **Nouveaux Horizons**. Cet onglet affiche **uniquement** les exercices « non musique classique ». Les **styles** (film, JV, anime, variété, pop) sont présentés sous forme de **cartes** façon Parcours (voir § 4.2) ; seuls les styles déjà débloqués sont cliquables / exploitables.

---

## 2. Données et marquage des exercices

- **Champ dédié** : `metadata.section = 'horizons'` (ou `metadata.musicCategory` seul si on ne veut pas de champ `section`).
- **Style** : `metadata.musicCategory` avec valeurs normalisées, par exemple :
  - `film` — Musique de film
  - `game` — Musique de jeu vidéo
  - `anime` — Musique d’anime
  - `variety` — Variété
  - `pop` — Pop
- Les exercices sans `musicCategory` (ou avec un tag réservé « classique ») restent **uniquement** dans le Mode Libre et le parcours ; ils ne sont jamais renvoyés par la recherche « Horizons ».

### 2.1 Création par le prof : exercice « non académique » (style spécial)

**Objectif** : quand un professeur crée un exercice en choisissant un style « non classique » (film, JV, anime, variété, pop), les **tags** et le **marquage section Horizons** doivent être **générés automatiquement**. Pas de saisie manuelle de « section secrète » ni de tags Horizons.

**Faisabilité : oui.** Le flux actuel le permet :

- **[SaveExerciseModal.jsx](src/components/SaveExerciseModal.jsx)** : aujourd’hui le modal a Compositeur, Titre de l’œuvre, Difficulté, Confidentialité, Tags (pré-remplis par `generateAutoTags(markers, chordData, composer)`). On ajoute :
  - Un champ **« Type d’exercice »** (ou « Public cible ») : **« Musique classique »** (défaut) | **« Horizons »**.
  - Si « Horizons » est choisi : un sous-sélecteur **« Style »** : Film | Jeu vidéo | Anime | Variété | Pop.
- **Comportement quand « Horizons » + style sont sélectionnés** :
  1. **Métadonnées** : au moment du `onSave`, le modal envoie en plus `section: 'horizons'` et `musicCategory: 'film'` (ou `game`, `anime`, `variety`, `pop`).
  2. **Tags automatiques** : on **fusionne** avec les tags existants les tags Horizons correspondants. Par exemple :
     - Exporter dans [tagGenerator.js](src/utils/tagGenerator.js) une fonction **`getHorizonsTagsForCategory(musicCategory)`** qui retourne `['Horizons', 'Film']` pour `film`, `['Horizons', 'JeuVideo']` pour `game`, `['Horizons', 'Anime']` pour `anime`, etc. (noms de tags cohérents avec les pastilles / filtres côté élève).
     - Dans SaveExerciseModal : quand l’utilisateur choisit « Horizons » + un style, **ajouter** ces tags à `manualTags` (sans doublon). Au « Réinitialiser les tags auto », si un style Horizons est sélectionné : `manualTags = [...getHorizonsTagsForCategory(musicCategory), ...generateAutoTags(markers, chordData, composer)]` — les tags harmoniques restent générés ; on préfixe par les tags Horizons.
  3. **Section Horizons** : dans [Editor.jsx](src/pages/Editor.jsx), `handleSaveExercise` doit inclure dans `exerciseData.metadata` les champs **`section`** et **`musicCategory`** issus de `metadata` (passés par le modal). Ainsi, l’exercice est bien enregistré avec `metadata.section = 'horizons'` et `metadata.musicCategory = 'film'` (etc.), et les `autoTags` contiennent déjà « Horizons » + le tag du style.

**Résumé** :
- **tagGenerator.js** : ajouter `getHorizonsTagsForCategory(musicCategory)` (et éventuellement un 4ᵉ paramètre optionnel `musicCategory` à `generateAutoTags` pour inclure ces tags dans le résultat si on préfère tout centraliser dans le générateur).
- **SaveExerciseModal.jsx** : champ « Type d’exercice » (Classique | Horizons) + sous-champ « Style » si Horizons ; passage de `section` et `musicCategory` dans l’objet passé à `onSave` ; fusion des tags Horizons dans les tags envoyés.
- **Editor.jsx** : dans `exerciseData.metadata`, ajouter `section` et `musicCategory` à partir de `metadata` renvoyé par le modal.

Ainsi, le prof n’a qu’à choisir « Horizons » et le style ; le reste (tags + section secrète) est appliqué automatiquement.

---

## 3. Plan de déblocage par style (logique et complet, rythme plus long)

Ordre proposé : du plus « proche » du classique / accessible (film, JV) vers le plus « grand public » (variété, pop). Chaque style se débloque via **un ou plusieurs critères** (badges ou accomplissements). Les seuils ci‑dessous sont **volontairement plus longs** pour que la découverte des sections reste motivante et progressive.

| Style | Id technique | Déblocage proposé | Badges / critères utilisés |
|-------|--------------|-------------------|----------------------------|
| **Musique de film** | `film` | Premier style débloqué | **25 exercices** complétés (`exercises_25`) OU **Série de 7** (`streak_7`) OU **Niveau 10** (`level_10`). Un seul suffit. |
| **Jeu vidéo** | `game` | Après avoir pratiqué le style film | **10 exercices Nouveaux Horizons** (tentatives avec `musicCategory` = film) OU **50 exercices** au total (`exercises_50`). |
| **Anime** | `anime` | Après JV ou film | **20 exercices Nouveaux Horizons** (film + game confondus) OU **Niveau 15** (`level_15`). |
| **Variété** | `variety` | Après anime | **3 styles Nouveaux Horizons** pratiqués (film, game, anime : au moins 1 exercice complété dans chacun) OU **100 exercices** au total (`exercises_100`). |
| **Pop** | `pop` | Dernier | **10 exercices dans 3 styles Nouveaux Horizons différents** (au moins 1 par style parmi film/game/anime/variety) OU **Niveau 25** (`level_25`) + **50 exercices Nouveaux Horizons** au total. |

Résumé des **nouveaux critères** à implémenter côté badges / déblocage :

- Nombre d’exercices **Nouveaux Horizons** complétés (total ou par style).
- Nombre de **styles Nouveaux Horizons** différents pratiqués (au moins 1 exercice par style).
- Optionnel : badges dédiés « Premier exercice Film », « 5 / 10 exercices JV », etc., pour la motivation (affichés dans l’onglet Progression, section Nouveaux Horizons).

**Stockage du déblocage** : soit dans les badges existants (`unlocks: { type: 'horizonsStyle', styleId: 'film' }`), soit une collection ou un champ utilisateur `unlockedHorizonsStyles: ['film', 'game', ...]` mis à jour quand les critères sont atteints (au même moment que la vérification des badges).

---

## 4. Adaptations dans le reste de l’app

### 4.1 Mode Libre ([FreeMode.jsx](src/pages/FreeMode.jsx))

- Ajouter un **bouton** visible (ex. en haut ou en bas de la barre de filtres) : **« Découvrir Nouveaux Horizons »** (ou icône + libellé).
- Ce bouton :
  - Si **aucun style n’est débloqué** : désactivé ou cliquable mais redirige vers l’onglet Nouveaux Horizons avec message « Débloque ton premier style : 25 exercices, Série de 7, ou Niveau 10 » (selon critère retenu).
  - Si **au moins un style est débloqué** : `setActiveTab('horizons')` (ou navigation vers la route/onglet Nouveaux Horizons).
- Le Mode Libre **ne charge jamais** les exercices Horizons (`searchPublicExercises` sans `includeHorizons` ou équivalent). Aucun filtre « classique » à cocher : la liste reste 100 % classique.

### 4.2 Nouvel onglet « Nouveaux Horizons » (StudentDashboard) — cartes façon Parcours

- **Onglet** dans la bottom nav : **« Nouveaux Horizons »** (visible pour tous ; contenu « verrouillé » avec explication si aucun style débloqué).
- **Contenu** :
  - Si **aucun style débloqué** : écran « Débloque ton premier style » avec les critères (ex. 25 exercices, Série de 7, Niveau 10) et lien vers Parcours / Mode Libre.
  - Si **au moins un style est débloqué** : **présentation en cartes**, inspirée du [Parcours](src/components/CampaignMap.jsx) (CampaignMap), pour montrer les différents styles de musique.
    - **Cartes par style** : une carte par style (Film, Jeu vidéo, Anime, Variété, Pop), avec état **verrouillé** / **débloqué** / **en cours** (optionnel), comme les nœuds du Parcours.
    - **Visuel** : même principe que CampaignMap — cartes avec fond (image ou dégradé par style), libellé court (ex. « Film », « JV »), sous-titre (ex. « Musique de film »), et indicateur visuel (cadenas / check / badge) selon l’état. Les styles non débloqués restent visibles mais non cliquables (ou clic ouvre une modale « Débloque ce style en… »).
    - **Interaction** : clic sur une carte **débloquée** ouvre soit une **liste d’exercices** filtrée à ce style (réutiliser [ExerciseCard](src/components/ExerciseCard.jsx)), soit une modale « Lancer un exercice » (aléatoire dans ce style) puis redirection vers le Player. On peut combiner : carte → liste d’exercices du style avec possibilité de lancer un exercice au hasard en en-tête.
  - Données : `searchPublicExercises({ onlyHorizons: true })` puis filtrage par `metadata.musicCategory` ; les cartes n’affichent que les styles pour lesquels l’utilisateur a le déblocage (et éventuellement les styles verrouillés en grisé avec critère affiché).
- **Faisabilité** : oui, et **approprié** — la cohérence avec le Parcours renforce le sentiment de progression et rend l’onglet lisible sans liste plate de filtres. Réutiliser la structure CSS / layout de CampaignMap (sections, cartes) et adapter les états (locked / unlocked / completed) et les données (styles au lieu de nœuds parcours).

### 4.3 Services

- **[exerciseService.js](src/services/exerciseService.js)**  
  - `searchPublicExercises(filters)` :  
    - Si `filters.onlyHorizons === true` : ne renvoyer que les exercices avec `metadata.section === 'horizons'` (ou `metadata.musicCategory` dans la liste des styles).  
    - Comportement par défaut (Mode Libre, parcours, suggestions) : **exclure** les exercices Horizons (ex. filtre côté client après requête, ou champ `metadata.classicalOnly !== false` selon modèle retenu).  
  - `getExercisesForNode` : n’utiliser que des exercices **non Horizons** (même exclusion que Mode Libre).

- **[badgeService.js](src/services/badgeService.js)**  
  - Définir les **déblocages Horizons** : soit nouveaux badges (ex. `horizons_unlock_film`, `horizons_unlock_game`, …) avec `unlocks: { type: 'horizonsStyle', styleId: 'film' }`, soit une fonction `getUnlockedHorizonsStyles(userId, attempts)` qui calcule les styles débloqués à partir des critères (nombre d’exercices, nombre de styles pratiqués, badges existants).  
  - Pour les **badges « accomplissements Horizons »** (voir 4.5), ajouter des entrées dans `BADGE_DEFINITIONS` (ex. premier exercice film, 5 exercices JV, 10 exercices Horizons, 3 styles explorés, etc.).

- **[attemptService.js](src/services/attemptService.js)**  
  - Lors de la sauvegarde d’une tentative, enregistrer **musicCategory** (et éventuellement `section`) dans les métadonnées de la tentative si l’exercice vient d’Horizons, pour que les badges et stats puissent filtrer « tentatives Horizons » / « tentatives par style ».

### 4.4 Player ([Player.jsx](src/pages/Player.jsx))

- Lors du lancement d’un exercice **depuis l’onglet Horizons**, passer un contexte (ex. `source: 'horizons'`) pour que, à la fin de l’exercice, `saveAttempt` reçoive `exerciseMetadata.musicCategory` (et `section: 'horizons'`) afin que les tentatives soient comptabilisées pour les déblocages et badges Horizons.

### 4.5 Onglet Progression ([StudentDashboard.jsx](src/pages/StudentDashboard.jsx) — onglet « progress »)

- **Nouvelle section en bas** : **« Nouveaux Horizons »** (bloc dédié sous Accomplissements / Suggestions).
  - Contenu :
    - **Styles débloqués** : liste des styles (Film, JV, Anime, Variété, Pop) avec statut débloqué / verrouillé et critère pour débloquer le suivant.
    - **Badges / accomplissements Nouveaux Horizons** : ex. « Premier exercice Film », « 5 / 10 exercices Jeu vidéo », « 20 exercices Nouveaux Horizons », « 3 styles explorés », « Éclectique » (10 exercices dans 3 styles), etc.
  - Données : calcul à partir de `attempts` filtrés par `musicCategory` ou `section === 'horizons'`, et de `getUnlockedHorizonsStyles(userId, attempts)`.

### 4.6 Accomplissements (badges) spécifiques Horizons

- **Nouveaux badges** (à ajouter dans [badgeService.js](src/services/badgeService.js)) :  
  - Premier exercice Film / JV / Anime / Variété / Pop (optionnel par style).  
  - 5 exercices Film, 5 exercices JV, … (optionnel).  
  - 10 exercices Horizons (tous styles), 25 exercices Horizons.  
  - 3 styles Horizons explorés (au moins 1 exercice dans 3 styles différents).  
  - 5 exercices dans 3 styles différents (« Éclectique Horizons »).  
- Ces badges peuvent avoir `unlocks: { type: 'profileTitle', value: '…' }` ou rester purement décoratifs ; ils sont affichés dans [AchievementsDashboard](src/components/AchievementsDashboard.jsx) avec les autres (éventuellement dans une sous-section « Horizons » ou un filtre « Tous / Classique / Horizons »).

### 4.7 Suggestions d’exercices ([ExerciseSuggestions.jsx](src/components/ExerciseSuggestions.jsx))

- **Comportement actuel** : `searchPublicExercises()` sans filtre → uniquement classique si on exclut Horizons par défaut dans le service.  
- **Recommandation** : garder les suggestions **100 % classique** dans l’onglet Progression (pas de mélange Horizons dans les suggestions « Ma progression »). Si plus tard on ajoute une section « Suggestions Horizons » dans l’onglet Horizons, on pourra appeler `searchPublicExercises({ onlyHorizons: true })` et appliquer la même logique de scoring sur les exercices Horizons uniquement.

### 4.8 Profil / Stats globales

- **Optionnel** : dans le Profil (ou l’onglet Progression), afficher une ligne ou un bloc « Horizons » : nombre d’exercices Horizons complétés, par style (Film: 5, JV: 3, …). Cela implique de filtrer `attempts` par `musicCategory` ou `section` si ces champs sont bien persistés en base.

### 4.9 Parcours (CampaignMap, getExercisesForNode)

- **Aucun changement** côté UI. [getExercisesForNode](src/services/exerciseService.js) doit **exclure** les exercices Horizons pour ne proposer que du classique dans le parcours.

### 4.10 Navigation et routing

- **Onglet** : `activeTab === 'horizons'` dans [StudentDashboard.jsx](src/pages/StudentDashboard.jsx), avec un bouton dans la bottom nav **« Nouveaux Horizons »** (icône à définir : ex. boussole, globe, ou étoiles).
- Pas obligatoire d’ajouter une route dédiée (`/horizons`) dans [AppRouter.jsx](src/AppRouter.jsx) si tout reste dans le dashboard à onglets ; possible d’ajouter une route plus tard pour deep-linking.

---

## 5. Récapitulatif des fichiers à modifier / créer

| Fichier | Action |
|---------|--------|
| `src/services/exerciseService.js` | Paramètre `onlyHorizons` / exclusion Horizons par défaut ; exclusion dans `getExercisesForNode`. |
| `src/services/badgeService.js` | Critères de déblocage par style ; nouveaux badges Horizons ; `getUnlockedHorizonsStyles` ou équivalent. |
| `src/services/attemptService.js` | Persister `musicCategory` (et `section`) dans les tentatives quand exercice Horizons. |
| `src/pages/StudentDashboard.jsx` | Onglet « Nouveaux Horizons », bouton Mode Libre → onglet, section Progression « Nouveaux Horizons », cartes styles façon Parcours. |
| `src/pages/FreeMode.jsx` | Bouton « Découvrir Nouveaux Horizons » vers onglet. |
| `src/pages/Player.jsx` | Contexte source Horizons et passage de `musicCategory` / `section` à `saveAttempt`. |
| **`src/pages/Editor.jsx`** | Dans `handleSaveExercise`, ajouter `metadata.section` et `metadata.musicCategory` dans `exerciseData.metadata`. |
| **`src/components/SaveExerciseModal.jsx`** | Champ « Type d’exercice » (Classique | Horizons) + sous-champ « Style » si Horizons ; passer `section` et `musicCategory` à `onSave` ; fusion des tags Horizons dans les tags envoyés ; « Réinitialiser tags auto » qui préfixe par `getHorizonsTagsForCategory` si style Horizons. |
| **`src/utils/tagGenerator.js`** | Ajouter `getHorizonsTagsForCategory(musicCategory)` retournant `['Horizons', 'Film']` (etc.) selon le style. |
| Nouveau composant type CampaignMap | **Cartes par style** (Film, JV, Anime, Variété, Pop) : états verrouillé/débloqué, clic → liste d’exercices du style ou lancement exercice ; réutiliser structure/layout de [CampaignMap](src/components/CampaignMap.jsx) et [ExerciseCard](src/components/ExerciseCard.jsx). |
| `src/components/AchievementsDashboard.jsx` | Optionnel : filtre ou sous-section « Nouveaux Horizons » pour les badges. |

---

## 6. Ordre de déblocage (résumé, rythme long)

1. **Film** : 25 exercices OU Série de 7 OU Niveau 10.  
2. **Game** : 10 exercices Nouveaux Horizons (film) OU 50 exercices (global).  
3. **Anime** : 20 exercices Nouveaux Horizons OU Niveau 15.  
4. **Variety** : 3 styles pratiqués (film + game + anime) OU 100 exercices.  
5. **Pop** : 10 exercices dans 3 styles Nouveaux Horizons OU (Niveau 25 + 50 exercices Nouveaux Horizons).

Ce plan reste cohérent avec un déblocage **progressif** et **plus long** : la découverte des sections reste motivante sans être trop rapide.
