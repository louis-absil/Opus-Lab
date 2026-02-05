# Détail de la mise à jour v1.2.0 – Opus Lab

**Date** : 5 février 2026

Ce document détaille les changements inclus dans la version 1.2.0.

---

## Nouveautés

### Éditeur d’images du parcours (Parcours Images)

- **Page ParcoursImagesEditor** (`src/pages/ParcoursImagesEditor.jsx` + `.css`) : interface dédiée pour gérer les illustrations associées aux nœuds du parcours.
- **Contexte ParcoursImagesContext** (`src/contexts/ParcoursImagesContext.jsx`) : chargement et mise à jour des images du parcours (Firestore / Storage).
- **Service parcoursImagesService** (`src/services/parcoursImagesService.js`) : lecture/écriture des métadonnées et URLs des images du parcours.
- **Utilitaire cropBackgroundStyle** (`src/utils/cropBackgroundStyle.js`) : calcul des styles d’affichage (position, zoom) pour l’aperçu des images avec ratio et recadrage.
- Route protégée **/parcours-images** dans `AppRouter.jsx` (accès réservé aux professeurs / admins).
- **CampaignMap** et **HorizonsMap** : utilisation des images gérées via le contexte (aperçu, ratio, zoom, mobile).

### Données et configuration

- **chordDifficulties.js** (`src/data/chordDifficulties.js`) : référentiel des difficultés par type d’accord pour le parcours et les exercices.
- **formations.js** (`src/data/formations.js`) : données des formations (conservatoires, etc.) pour les catalogues et établissements.
- **tagCategories.js** (`src/utils/tagCategories.js`) : catégorisation des tags (structure, style, etc.) pour filtres et affichage.
- **adminAllowlist.js** (`src/config/adminAllowlist.js`) : liste des emails autorisés pour l’accès admin (ex. éditeur d’images du parcours).

### Utilitaires

- **exerciseDisplay.js** (`src/utils/exerciseDisplay.js`) : helpers pour l’affichage des exercices (titres, métadonnées, pastilles) dans les cartes et listes.

---

## Fichiers modifiés (résumé)

### Règles et configuration

- **firestore.rules** : règles mises à jour pour les collections/images du parcours et les droits selon le rôle.

### Routing et entrée

- **AppRouter.jsx** : ajout de la route `/parcours-images` et import de `ParcoursImagesEditor`.
- **main.jsx** : intégration de `ParcoursImagesContext` (provider).

### Composants

- **CampaignMap.jsx** / **HorizonsMap.jsx** : utilisation du contexte d’images, styles d’aperçu (ratio, zoom), améliorations CSS (**HorizonsMap.css**).
- **ChordLabel.jsx** / **ChordLabel.css** : affichage des accords et styles.
- **AssignToClassModal.jsx**, **EditTagsModal.jsx**, **ProfileModal.jsx** : ajustements.
- **ExerciseCard.jsx**, **ExerciseSummary.jsx** : utilisation des nouveaux utils d’affichage et des catégories de tags.
- **SaveExerciseModal.jsx** / **SaveExerciseModal.css** : métadonnées et UX.
- **ReviewDetailPanel.css** : styles du panneau de détail.

### Pages

- **Dashboard.jsx** / **Dashboard.css** : lien ou entrée vers l’éditeur d’images du parcours (pour les admins), mise en forme.
- **Editor.jsx** : petits ajustements.
- **FreeMode.jsx** : filtres et affichage des exercices (tags, difficulté).
- **Player.jsx** / **Player.css** : affichage des accords et feedback.

### Données

- **parcoursTree.js** : structure des nœuds et références aux illustrations.
- **parcoursIllustrations.js** : mapping nœuds / images, cohérent avec le service et l’éditeur.
- **knownTags.js** : liste et catégories des tags.

### Services

- **exerciseService.js** : champs ou requêtes liés aux tags, difficulté, formations si nécessaire.

### Utilitaires

- **difficultyFromContent.js** : calcul de la difficulté à partir du contenu (accords, etc.) et du référentiel **chordDifficulties**.
- **nodeCriteria.js** : critères des nœuds du parcours (prérequis, QCM).
- **previewScenarios.js** : scénarios de prévisualisation parcours.
- **qcmOptions.js** : options des QCM.
- **tagGenerator.js** : génération/suggestion de tags.

---

## Fichiers ajoutés (liste)

| Fichier | Description |
|--------|-------------|
| `src/config/adminAllowlist.js` | Liste des emails admins |
| `src/contexts/ParcoursImagesContext.jsx` | Contexte des images du parcours |
| `src/data/chordDifficulties.js` | Difficultés par type d’accord |
| `src/data/formations.js` | Données formations / établissements |
| `src/pages/ParcoursImagesEditor.jsx` | Page éditeur d’images du parcours |
| `src/pages/ParcoursImagesEditor.css` | Styles de l’éditeur |
| `src/services/parcoursImagesService.js` | Service Firestore/Storage images parcours |
| `src/utils/cropBackgroundStyle.js` | Style d’affichage (crop/ratio) des images |
| `src/utils/exerciseDisplay.js` | Helpers affichage exercices |
| `src/utils/tagCategories.js` | Catégories de tags |

---

## Compatibilité

- Aucune rupture d’API publique prévue : les nouveaux champs (images parcours, tags catégorisés) sont optionnels ou rétrocompatibles.
- Firestore : déployer les nouvelles **firestore.rules** avant ou avec cette version.
- Les professeurs/admins doivent figurer dans **adminAllowlist.js** (ou la config équivalente) pour accéder à `/parcours-images`.

---

## Références

- **CHANGELOG.md** : entrée [1.2.0] pour le résumé des versions.
- **README.md** : version du projet et lien vers la doc.
