# 🎵 Opus Lab

**L'entraînement harmonique intelligent**

Opus Lab est une plateforme web d'entraînement pour les musiciens qui souhaitent perfectionner leur oreille harmonique. Analysez des extraits musicaux depuis YouTube, identifiez les accords avec une notation académique professionnelle, et progressez à votre rythme.

## ✨ Fonctionnalités principales

### 🎹 Pour les professeurs
- **Éditeur d'exercices** : Créez des exercices à partir de vidéos YouTube
- **Marquage temporel précis** : Marquez les changements d'accords en temps réel
- **Sélection d'accords avancée** : Utilisez la notation académique des conservatoires
- **Gestion d'exercices** : Créez, modifiez et publiez vos exercices
- **Dashboard complet** : Visualisez et gérez tous vos exercices

### 👨‍🎓 Pour les élèves
- **Mode invité** : Accédez aux exercices sans connexion
- **Player interactif** : Entraînez-vous sur des extraits musicaux réels
- **Suivi de progression** : Gagnez de l'XP et suivez vos performances
- **Filtres avancés** : Filtrez par compositeur, difficulté ou type d'accord
- **Historique des tentatives** : Consultez vos résultats précédents

### 🎯 Fonctionnalités techniques
- **Intégration YouTube** : Lecture et contrôle de vidéos YouTube
- **Timeline interactive** : Navigation précise dans les extraits musicaux
- **Fade in/out automatique** : Transitions sonores fluides
- **Raccourcis clavier** : Contrôles rapides pour une utilisation efficace
- **Authentification Google** : Connexion sécurisée via Firebase Auth
- **Base de données Firestore** : Stockage cloud des exercices et tentatives

## 🛠️ Technologies utilisées

- **Frontend** :
  - React 19.2.0
  - Vite 7.2.4
  - React Router DOM 7.11.0
  - React YouTube 10.1.0

- **Backend & Services** :
  - Firebase Authentication (Google)
  - Cloud Firestore
  - Firebase Security Rules

- **Outils de développement** :
  - ESLint
  - Vite (build tool)

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
git clone https://github.com/VOTRE_USERNAME/opus-lab.git
cd opus-lab
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

## 📁 Structure du projet

```
opus-lab/
├── public/                 # Fichiers statiques
├── src/
│   ├── assets/            # Images et ressources
│   ├── components/         # Composants réutilisables
│   │   ├── ExerciseSummary.jsx
│   │   ├── ProfileModal.jsx
│   │   ├── PromoteToTeacherModal.jsx
│   │   └── SaveExerciseModal.jsx
│   ├── contexts/           # Contextes React
│   │   └── AuthContext.jsx
│   ├── pages/             # Pages de l'application
│   │   ├── Dashboard.jsx      # Dashboard professeur
│   │   ├── Editor.jsx         # Éditeur d'exercices
│   │   ├── LandingPage.jsx    # Page d'accueil
│   │   ├── Player.jsx         # Lecteur d'exercices
│   │   └── StudentDashboard.jsx # Dashboard élève
│   ├── services/          # Services de données
│   │   ├── attemptService.js
│   │   ├── exerciseService.js
│   │   └── userService.js
│   ├── utils/             # Utilitaires
│   │   └── tagGenerator.js
│   ├── App.jsx            # Composant principal (ancien)
│   ├── AppRouter.jsx      # Routeur de l'application
│   ├── firebase.js        # Configuration Firebase
│   └── main.jsx           # Point d'entrée
├── firebase.json          # Configuration Firebase CLI
├── firestore.rules        # Règles de sécurité Firestore
└── package.json           # Dépendances et scripts
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
   - Accédez au Dashboard Élève
   - Filtrez les exercices par compositeur, difficulté, etc.
   - Lancez un exercice et entraînez-vous
   - Consultez vos tentatives et votre progression

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

- [`FIRESTORE_SETUP.md`](./FIRESTORE_SETUP.md) : Configuration des règles Firestore
- [`SETUP_TEACHERS.md`](./SETUP_TEACHERS.md) : Configuration des professeurs autorisés

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence privée. Tous droits réservés.

## 👤 Auteur

**Louis Absil**

- Email : louis.absil@gmail.com

## 🙏 Remerciements

- Firebase pour l'infrastructure backend
- React et la communauté open source
- YouTube pour l'API de lecture vidéo

---

**Opus Lab** - L'entraînement harmonique intelligent 🎵
