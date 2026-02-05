# Notes de mise à jour – Opus Lab

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [1.2.1] – 2026-02-05

### Modifié

#### Player et panneau de correction (mode review)
- **ReviewDetailPanel** : carte de feedback unifiée avec le mode libre (`player-feedback-card`), mini‑player (Jouer / Pause, Boucle, Début), affichage cadence / XP / lien Codex ; message pour accord verrouillé ; appels sécurisés au lecteur YouTube et nettoyage des intervalles.
- **Player** : mode review (split et intégré), timeline avec segments et accolades de cadences, cartes de feedback cohérentes, responsive (mobile / desktop).
- **Player.css**, **ReviewDetailPanel.css** : styles zone vidéo, timeline, mode review, cartes feedback, mini‑player, responsive.

Détail : [UPDATE_v1.2.1.md](./UPDATE_v1.2.1.md).

---

## [1.2.0] – 2026-02-05

### Ajouté

#### Éditeur d’images du parcours
- **ParcoursImagesEditor** : page dédiée pour gérer les illustrations des nœuds du parcours (route `/parcours-images`, accès admin).
- **ParcoursImagesContext** : chargement et mise à jour des images (Firestore / Storage).
- **parcoursImagesService** : lecture/écriture des métadonnées et URLs des images.
- **cropBackgroundStyle** : utilitaire pour l’aperçu des images (ratio, zoom, recadrage).
- **CampaignMap** et **HorizonsMap** : affichage des images gérées via le contexte (aperçu, ratio, mobile).

#### Données et configuration
- **chordDifficulties.js** : référentiel des difficultés par type d’accord.
- **formations.js** : données des formations pour catalogues et établissements.
- **tagCategories.js** : catégorisation des tags pour filtres et affichage.
- **adminAllowlist.js** : liste des emails autorisés pour l’accès admin.
- **exerciseDisplay.js** : helpers pour l’affichage des exercices (cartés, listes).

### Modifié

- **firestore.rules** : règles pour les images du parcours et droits par rôle.
- **AppRouter** : route `/parcours-images` ; **main.jsx** : provider ParcoursImagesContext.
- **Dashboard** : accès à l’éditeur d’images du parcours pour les admins.
- **Composants** : ChordLabel, ExerciseCard, ExerciseSummary, SaveExerciseModal, ReviewDetailPanel, AssignToClassModal, EditTagsModal, ProfileModal ; styles CampaignMap, HorizonsMap.
- **Pages** : Editor, FreeMode, Player (affichage, filtres, feedback).
- **Données** : parcoursTree, parcoursIllustrations, knownTags.
- **Services** : exerciseService.
- **Utils** : difficultyFromContent, nodeCriteria, previewScenarios, qcmOptions, tagGenerator.

Détail complet : [UPDATE_v1.2.0.md](./UPDATE_v1.2.0.md).

---

## [1.1.1] – 2026-02-01

### Amélioré

#### Sélecteur et affichage des accords
- **ChordSelectorModal** : refonte de l’interface et de la logique de sélection des accords (notation Riemann / académique).
- **ChordLabel** : amélioration de l’affichage des accords et des styles (CSS).

#### Éditeur et Player
- **Editor** : ajustements mineurs.
- **Player** : améliorations de l’affichage et du comportement des accords pendant l’exercice.

#### Utilitaires harmonie et parcours
- **chordFormatter** : évolution du formatage des accords.
- **riemannFunctions** : ajouts et corrections pour la notation Riemann.
- **nodeCriteria** : critères des nœuds du parcours enrichis.
- **qcmOptions** : options des QCM mises à jour.

#### Styles
- **index.css** : ajustements globaux.

---

## [1.1.0] – 2026-01-31

### Nouveautés

#### Nouveaux Horizons (musiques non classiques)
- **Carte Horizons** : composant `HorizonsMap.jsx`, styles Film, Jeu vidéo, Anime, Variété, Pop.
- **Données** : `horizonsIllustrations.js`, plan dans `docs/plan-onglet-horizons-musiques-non-classiques.md`.

#### Codex
- **CodexView** : consultation des entrées pédagogiques avec notation et exemples.
- **Composants** : `CodexView.jsx`, `CodexNotation.jsx`, `CodexAudioPlayer.jsx`, `CodexExampleBlock.jsx`.
- **Données** : `codexEntries.js`, `codexMusicalExamples.js`, `codexIllustrations.js`, utilitaires `codexHelpers.js`.

#### Côté enseignant
- **Catalogues** : `TeacherCatalogue.jsx`, `TeacherClasses.jsx`, `TeacherAssignments.jsx`.
- **Modales** : `TeacherDetailModal`, `AssignToClassModal`, `RequestEstablishmentModal`, `StudentDetailModal`.
- **Services** : `teacherClassService.js`, `assignmentService.js`, `referenceDataService.js`.
- **Données** : `establishments.js`, `classes.js`, `teacherSubjects.js`.

#### Côté élève
- **StudentCatalogue.jsx** : catalogue élève et détail.
- **StudentDetailModal.jsx** : détail élève.

#### Authentification et divers
- **Connexion par email** : `EmailLoginModal.jsx` en plus de Google.
- **Avatar** : `avatarService.js`.
- **Utilitaires** : `chordToNotes.js`, `personalizedTipSelector.js`, `profileStats.js`.
- **Documentation** : `.gitattributes` pour fins de ligne LF ; note README sur encodage UTF-8 des messages de commit pour l’affichage correct sur GitHub Actions.

### Modifié

- **AchievementsDashboard** : évolution (BadgeSystem supprimé ou fusionné).
- **ReviewDashboard**, **ReviewDetailPanel**, **SaveExerciseModal** et autres composants mis à jour.
- **AppRouter** : routes pour catalogues, Codex, Horizons selon la structure actuelle.
- **Firebase / Firestore** : règles et index si nécessaire pour les nouvelles fonctionnalités.

---

## [1.0.0] – 2025-01-30

### 🎉 Version majeure – Parcours guidé et expérience élève

Cette version introduit un **parcours pédagogique structuré**, un **tableau de bord élève** enrichi et de nombreuses améliorations UX pour les professeurs et les élèves.

### ✨ Ajouté

#### Parcours et progression
- **Carte de parcours (Campaign Map)** : vue des étages (Intuition, Précision, Couleur SD, Chromatisme) avec nœuds d’apprentissage et points de contrôle (cadences).
- **Progression par nœuds** : déblocage des briques selon les prérequis ; phases Intuition / Précision / Maîtrise par nœud.
- **Illustrations par thème** : visuels par nœud (foundation, path, home, color, summit, etc.) pour une navigation visuelle du parcours.
- **Service de progression** : `progressionService` pour débloquer les nœuds et enregistrer la maîtrise (Firestore).
- **Données parcours** : `parcoursTree.js` (arbre des nœuds), `parcoursIllustrations.js`, critères et options QCM dans `nodeCriteria.js`, `qcmOptions.js`.

#### Tableau de bord élève
- **Onglets** : Accueil, Parcours, Mode libre, Progression, Profil.
- **Bloc d’apprentissage du jour** : objectif quotidien et accès rapide au parcours ou au mode libre.
- **Graphique de progression** : évolution du score (Recharts) sur les derniers exercices.
- **Statistiques hebdomadaires** : `WeeklyStats`, objectifs hebdo (`WeeklyObjectives`, `objectiveService`).
- **Indicateurs de tendance** : `TrendIndicators` (hausse/baisse, séries).
- **Comparaison de périodes** : `PeriodComparison` pour comparer deux périodes.
- **Suggestions d’exercices** : `ExerciseSuggestions` selon le niveau et les objectifs.
- **Cartes d’exercices** : composant `ExerciseCard` avec pastilles difficulté/tags et lien vers le player.
- **Historique et détails** : liste des tentatives, `PerformanceDetails`, `ReviewDashboard`, `ReviewDetailPanel`.
- **Code exercice** : accès par code pour rejoindre un exercice partagé par le professeur.

#### Badges et gamification
- **Système de badges** : `BadgeSystem`, `badgeService` (Firestore).
- **Badges** : Premier Pas, Séries (3/7/30 jours), Score parfait, 10/50/100 exercices, etc.
- **Tableau des succès** : `AchievementsDashboard` pour visualiser tous les badges.
- **Célébrations de jalons** : `MilestoneCelebrations` pour les étapes importantes.

#### Mode libre
- **Page Mode libre** : `FreeMode` – liste d’exercices avec filtres par difficulté, tag, compositeur.
- **Filtres initiaux** : ouverture du mode libre avec un filtre pré-rempli depuis une pastille (difficulté ou tag) du dashboard.

#### Éditeur et professeurs
- **Modal d’édition des tags** : `EditTagsModal` pour gérer les tags d’un exercice.
- **Résumé d’exercice** : `ExerciseSummary` amélioré.
- **Modal de sauvegarde** : `SaveExerciseModal` avec champs métadonnées (difficulté, tags, compositeur).
- **Sélecteur d’accords** : `ChordSelectorModal` et notation Riemann / académique.
- **Utilitaires** : `chordFormatter`, `riemannFunctions`, `tagFormatter`, `tagGenerator`, `difficultyFromContent`, `globalNotions`, `previewScenarios`.

#### Données et services
- **Index Firestore** : `firestore.indexes.json` pour les requêtes (exercices, tentatives, progression).
- **Règles Firestore** : mises à jour pour progression, badges, objectifs.
- **Scénarios de prévisualisation** : simulation du parcours pour les professeurs (`previewScenarios.js`).

#### UI et accessibilité
- **Composant ChordLabel** : affichage des accords avec style cohérent.
- **Design** : refonte couleurs et pastilles (docs : `couleurs-refonte-checklist.md`, `plan-pastilles-cartes-exercices.md`).
- **Documentation design** : `REFONTE_PARCOURS_*.md` dans `docs/`.

#### Autres
- **Recharts** : ajout pour les graphiques (progression, stats).
- **Tailwind** : configuration et styles (y compris composants dédiés).
- **PWA / réseau** : `NetworkContext`, indicateurs hors-ligne si présents.
- **Instructions iOS** : composant pour le plein écran vidéo sur iOS.

### 🔧 Modifié

- **Dashboard élève** : réorganisé en onglets, intégration Parcours / Mode libre / Progression / Profil.
- **Dashboard professeur** : intégration des nouveaux modales et du flux de création/édition.
- **Player** : calcul de score aligné avec le mode libre (accords + cadences), meilleur feedback.
- **Services** : `attemptService`, `exerciseService` étendus pour progression, objectifs, badges.
- **Pages** : `StudentDashboard`, `Dashboard`, `Editor`, `Player`, `FreeMode` – CSS et structure mis à jour.
- **Workflow GitHub** : `.github/workflows/deploy.yml` et `firebase.json` pour le déploiement.
- **Configuration** : `index.html`, `tailwind.config.js`, `firestore.rules`.

### 📚 Documentation

- **README** : mis à jour avec parcours, badges, mode libre, structure des composants.
- **CHANGELOG** : ce fichier.
- **Docs** : `docs/` avec guides de refonte parcours et design.

---

## [0.x] – Versions initiales

- Éditeur d’exercices (YouTube, marqueurs, notation académique).
- Player interactif pour les élèves.
- Authentification Google (Firebase Auth).
- Firestore pour exercices et tentatives.
- Dashboard professeur et élève de base.
- Déploiement GitHub Pages.

---

[1.2.0]: https://github.com/louis-absil/Opus-Lab/releases/tag/v1.2.0
[1.1.1]: https://github.com/louis-absil/Opus-Lab/releases/tag/v1.1.1
[1.1.0]: https://github.com/louis-absil/Opus-Lab/releases/tag/v1.1.0
[1.0.0]: https://github.com/louis-absil/Opus-Lab/releases/tag/v1.0.0
