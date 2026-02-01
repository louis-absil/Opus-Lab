# 🎵 Opus Lab

**L'entraînement harmonique intelligent**

**Version** : 1.1.1 — Dernières mises à jour : [CHANGELOG.md](./CHANGELOG.md)

Opus Lab est une plateforme web d'entraînement pour les musiciens qui souhaitent perfectionner leur oreille harmonique. Analysez des extraits musicaux depuis YouTube, identifiez les accords avec une notation académique professionnelle, et progressez à votre rythme.

## ✨ Fonctionnalités principales

### 🎹 Pour les professeurs
- **Éditeur d'exercices** : Créez des exercices à partir de vidéos YouTube
- **Marquage temporel précis** : Marquez les changements d'accords en temps réel
- **Sélection d'accords avancée** : Notation Riemann / académique des conservatoires (ChordSelectorModal)
- **Gestion d'exercices** : Créez, modifiez, publiez ; édition des tags (EditTagsModal)
- **Dashboard complet** : Visualisez et gérez tous vos exercices
- **Catalogues** : Catalogue professeurs (TeacherCatalogue), classes (TeacherClasses), devoirs (TeacherAssignments)
- **Modales** : Détail professeur/élève, affectation à une classe, demande d'établissement (RequestEstablishmentModal)
- **Prévisualisation parcours** : Scénarios simulés pour voir le point de vue élève

### 👨‍🎓 Pour les élèves
- **Parcours guidé** : Carte de progression par étages (Intuition → Précision → Couleur SD → Chromatisme) avec nœuds d'apprentissage et points de contrôle (cadences)
- **Nouveaux Horizons** : Carte des musiques non classiques (Film, Jeu vidéo, Anime, Variété, Pop) avec styles débloqués
- **Codex** : Consultation des entrées pédagogiques avec notation et exemples audio
- **Mode libre** : Liste d'exercices avec filtres par difficulté, tag, compositeur ; accès par pastilles depuis l'accueil
- **Catalogue élève** : StudentCatalogue et détail élève (StudentDetailModal)
- **Tableau de bord** : Onglets Accueil, Parcours, Mode libre, Progression, Profil
- **Bloc d'apprentissage du jour** : Objectif quotidien et accès rapide au parcours ou au mode libre
- **Badges et gamification** : Premier Pas, séries (3/7/30 jours), score parfait, 10/50/100 exercices ; tableau des succès
- **Graphique de progression** : Évolution du score sur les derniers exercices (Recharts)
- **Objectifs hebdo et stats** : WeeklyObjectives, WeeklyStats, comparaison de périodes, indicateurs de tendance
- **Suggestions d'exercices** : Recommandations selon le niveau et les objectifs
- **Code exercice** : Accès par code pour rejoindre un exercice partagé par le professeur
- **Mode invité** : Accédez aux exercices sans connexion
- **Player interactif** : Entraînez-vous sur des extraits musicaux réels
- **Historique et détails** : Liste des tentatives, PerformanceDetails, ReviewDashboard

### 🎯 Fonctionnalités techniques
- **Intégration YouTube** : Lecture et contrôle de vidéos YouTube
- **Timeline interactive** : Navigation précise dans les extraits musicaux
- **Fade in/out automatique** : Transitions sonores fluides
- **Raccourcis clavier** : Contrôles rapides pour une utilisation efficace
- **Authentification** : Connexion Google et par email (Firebase Auth)
- **Base de données Firestore** : Exercices, tentatives, progression, badges, objectifs ; index et règles à jour
- **Recharts** : Graphiques de progression et statistiques
- **Tailwind CSS** : Styles et composants

## 🛠️ Technologies utilisées

- **Frontend** :
  - React 19.2.0
  - Vite 7.2.4
  - React Router DOM 7.11.0
  - React YouTube 10.1.0
  - Recharts (graphiques)
  - Tailwind CSS
  - Lucide React (icônes)

- **Backend & Services** :
  - Firebase Authentication (Google)
  - Cloud Firestore
  - Firebase Security Rules

- **Outils de développement** :
  - ESLint
  - Vite (build tool)
  - PostCSS / Autoprefixer

## 📋 Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn
- Un compte Firebase avec :
  - Authentication activé (Google Provider)
  - Firestore Database créée
  - Un projet Firebase configuré

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/louis-absil/Opus-Lab.git
cd Opus-Lab
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration Firebase

Créez un fichier `.env` à la racine du projet avec vos variables d'environnement Firebase :

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Note** : Remplacez les valeurs par celles de votre projet Firebase (disponibles dans la console Firebase > Paramètres du projet > Vos applications).

### 4. Configuration Firestore

Consultez le fichier [`FIRESTORE_SETUP.md`](./FIRESTORE_SETUP.md) pour configurer les règles de sécurité Firestore.

### 5. Configuration des professeurs

Consultez le fichier [`SETUP_TEACHERS.md`](./SETUP_TEACHERS.md) pour configurer la liste des professeurs autorisés.

### 6. Lancer l'application

```bash
# Mode développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

L'application sera accessible sur `http://localhost:5173` (ou le port indiqué par Vite).

## 🌐 Déploiement sur GitHub Pages

Le projet est configuré pour être déployé automatiquement sur GitHub Pages.

### Déploiement automatique

1. **Activez GitHub Pages** dans les paramètres de votre dépôt :
   - Allez dans **Settings** → **Pages**
   - Sélectionnez **Source** : `GitHub Actions`

2. **Poussez le code** sur la branche `main` :
   ```bash
   git push origin main
   ```

3. **Le déploiement se fait automatiquement** :
   - Le workflow GitHub Actions se déclenche à chaque push sur `main`
   - Le site est en ligne à : **https://louis-absil.github.io/Opus-Lab/**
   - Toutes les mises à jour sont détaillées dans [CHANGELOG.md](./CHANGELOG.md)

### Configuration Firebase pour GitHub Pages

⚠️ **Important** : Assurez-vous que votre configuration Firebase autorise les requêtes depuis votre domaine GitHub Pages.

1. Dans la console Firebase, allez dans **Authentication** → **Settings** → **Authorized domains**
2. Ajoutez : `louis-absil.github.io`

Pour plus de détails, consultez le guide complet : [`GITHUB_PAGES_SETUP.md`](./GITHUB_PAGES_SETUP.md)

## 📁 Structure du projet

```
opus-lab/
├── public/                 # Fichiers statiques
├── docs/                   # Documentation design et refonte
├── src/
│   ├── assets/             # Images et ressources
│   ├── components/         # Composants réutilisables
│   │   ├── AchievementsDashboard.jsx  # Tableau des succès / badges
│   │   ├── CampaignMap.jsx           # Carte du parcours guidé
│   │   ├── CodexView.jsx, CodexNotation.jsx, CodexAudioPlayer.jsx, CodexExampleBlock.jsx
│   │   ├── HorizonsMap.jsx           # Carte Nouveaux Horizons
│   │   ├── ChordLabel.jsx, ChordSelectorModal (src/)
│   │   ├── DailyLearningBlock.jsx, EditTagsModal.jsx
│   │   ├── ExerciseCard.jsx, ExerciseSuggestions.jsx
│   │   ├── ProfileModal.jsx, ReviewDashboard.jsx, ReviewDetailPanel.jsx
│   │   ├── SaveExerciseModal.jsx, WeeklyObjectives.jsx, TrendIndicators.jsx
│   │   ├── AssignToClassModal.jsx, RequestEstablishmentModal.jsx
│   │   ├── TeacherDetailModal.jsx, StudentDetailModal.jsx
│   │   ├── EmailLoginModal.jsx
│   │   └── ...
│   ├── contexts/          # Contextes React
│   │   ├── AuthContext.jsx
│   │   └── NetworkContext.jsx
│   ├── data/              # Données parcours et références
│   │   ├── parcoursTree.js, parcoursIllustrations.js
│   │   ├── codexEntries.js, codexMusicalExamples.js, codexIllustrations.js
│   │   ├── horizonsIllustrations.js
│   │   ├── knownTags.js, pedagogicalTips.js, classes.js, establishments.js, teacherSubjects.js
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.jsx, Editor.jsx, LandingPage.jsx, Player.jsx
│   │   ├── FreeMode.jsx, StudentDashboard.jsx
│   │   ├── TeacherCatalogue.jsx, TeacherClasses.jsx, TeacherAssignments.jsx
│   │   ├── StudentCatalogue.jsx
│   │   └── ...
│   ├── services/
│   │   ├── attemptService.js, badgeService.js, exerciseService.js
│   │   ├── objectiveService.js, progressionService.js, userService.js
│   │   ├── teacherClassService.js, assignmentService.js, referenceDataService.js
│   │   ├── avatarService.js
│   │   └── ...
│   ├── utils/             # Utilitaires (Riemann, tags, difficulté, codex, etc.)
│   ├── App.jsx, AppRouter.jsx, firebase.js, main.jsx
│   └── ...
├── .github/workflows/deploy.yml
├── firebase.json, firestore.rules, firestore.indexes.json
├── .gitattributes         # Fins de ligne LF, encodage cohérent
├── CHANGELOG.md           # Notes de mise à jour
└── package.json
```

## 🎮 Guide d'utilisation

### Pour les professeurs

1. **Créer un exercice** :
   - Connectez-vous avec votre compte Google
   - Allez dans le Dashboard
   - Cliquez sur "Créer un exercice"
   - Collez l'URL d'une vidéo YouTube
   - Définissez la zone de travail (boutons IN/OUT)
   - Marquez les accords en appuyant sur ENTRÉE ou en cliquant sur TAP
   - Cliquez sur chaque marqueur pour définir l'accord
   - Sauvegardez l'exercice avec les métadonnées

2. **Gérer les exercices** :
   - Consultez tous vos exercices dans le Dashboard
   - Modifiez ou supprimez vos exercices
   - Publiez vos exercices pour les rendre accessibles aux élèves

### Pour les élèves

1. **Mode invité** :
   - Cliquez sur "Continuer en mode invité" sur la page d'accueil
   - Accédez aux exercices publiés sans connexion

2. **Mode connecté** :
   - Connectez-vous avec votre compte Google
   - Accédez au Dashboard Élève (onglets : Accueil, Parcours, Mode libre, Progression, Profil)
   - **Parcours** : suivez la carte des étages, débloquez les nœuds et les cadences
   - **Mode libre** : filtrez par difficulté, tag, compositeur et lancez un exercice
   - **Progression** : consultez le graphique, l'historique des tentatives et les détails de performance
   - **Profil** : badges, objectifs hebdo, comparaison de périodes
   - **Code exercice** : entrez un code partagé par le professeur pour accéder à un exercice

## ⌨️ Raccourcis clavier

- **ESPACE** : Play/Pause
- **I** : Définir le point IN (début de la sélection)
- **O** : Définir le point OUT (fin de la sélection)
- **ENTRÉE** : Créer un marqueur d'accord

## 🔒 Sécurité

- Authentification sécurisée via Firebase Auth
- Règles de sécurité Firestore pour protéger les données
- Validation côté client et serveur
- Gestion des rôles (élève/professeur)

Consultez [`FIRESTORE_SETUP.md`](./FIRESTORE_SETUP.md) pour plus de détails sur la configuration de sécurité.

## 📚 Documentation complémentaire

- [`CHANGELOG.md`](./CHANGELOG.md) : Notes de mise à jour (versions et nouveautés)
- [`FIRESTORE_SETUP.md`](./FIRESTORE_SETUP.md) : Configuration des règles Firestore
- [`SETUP_TEACHERS.md`](./SETUP_TEACHERS.md) : Configuration des professeurs autorisés
- [`GITHUB_PAGES_SETUP.md`](./GITHUB_PAGES_SETUP.md) : Déploiement sur GitHub Pages
- Dossier [`docs/`](./docs/) : Refonte parcours, design, pastilles

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

### Affichage correct des messages de commit sur GitHub (Actions, historique)

Sous Windows, les messages de commit avec accents peuvent s'afficher incorrectement sur GitHub (ex. Ã© au lieu de é). Pour que les titres des runs GitHub Actions et l'historique affichent correctement les caractères accentués :

- **Configurer Git en UTF-8** (une fois) :
  ```bash
  git config --global i18n.commitencoding utf-8
  git config --global i18n.logoutputencoding utf-8
  git config --global core.quotepath false
  ```
- **Terminal en UTF-8** : en PowerShell, exécuter `chcp 65001` avant de committer, ou rédiger le message dans l'éditeur (Cursor/VS Code) plutôt qu'en `git commit -m "..."` dans un terminal non configuré en UTF-8.

## 📝 Licence

Ce projet est sous licence **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

### Vous êtes libre de :
- ✅ **Partager** — copier, distribuer et communiquer le matériel par tous moyens et sous tous formats
- ✅ **Adapter** — remixer, transformer et créer à partir du matériel

### Sous les conditions suivantes :
- 📌 **Attribution** — Vous devez créditer l'œuvre et inclure un lien vers la licence
- 📌 **Attribution et lien** — Lorsque vous créez un lien vers ou référencez ce projet, vous devez fournir une attribution appropriée à l'auteur original et inclure un lien vers le dépôt GitHub
- ❌ **NonCommercial** — Vous n'êtes pas autorisé à faire un usage commercial de cette œuvre

Pour plus de détails, consultez le fichier [LICENSE](./LICENSE) ou visitez : https://creativecommons.org/licenses/by-nc/4.0/

## 👤 Auteur

**Louis Absil**

- Email : louis.absil@gmail.com

## 🙏 Remerciements

- Firebase pour l'infrastructure backend
- React et la communauté open source
- YouTube pour l'API de lecture vidéo

---

**Opus Lab** - L'entraînement harmonique intelligent 🎵
