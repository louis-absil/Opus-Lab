# Notes de mise à jour – Opus Lab

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

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

[1.0.0]: https://github.com/louis-absil/Opus-Lab/releases/tag/v1.0.0
