# Guide de déploiement sur GitHub Pages

Ce guide vous explique comment publier Opus Lab sur GitHub Pages.

## 📋 Prérequis

- Un dépôt GitHub créé et le code poussé
- Les permissions d'administration sur le dépôt

## 🚀 Étapes de configuration

### 1. Activer GitHub Pages dans les paramètres du dépôt

1. Allez sur votre dépôt GitHub
2. Cliquez sur **Settings** (Paramètres) en haut du dépôt
3. Dans le menu de gauche, cliquez sur **Pages**
4. Sous **Source**, sélectionnez :
   - **Source** : `GitHub Actions` (recommandé)
   - OU **Source** : `Deploy from a branch` → `main` → `/ (root)` → `Save`
5. GitHub Pages est maintenant activé !

### 2. Vérifier le workflow GitHub Actions

Le workflow de déploiement automatique est déjà configuré dans `.github/workflows/deploy.yml`.

Il se déclenche automatiquement :
- À chaque push sur la branche `main`
- Manuellement via l'onglet **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### 3. Premier déploiement

1. **Poussez le code** sur GitHub (si ce n'est pas déjà fait) :
   ```bash
   git add .
   git commit -m "feat: Configuration pour GitHub Pages"
   git push origin main
   ```

2. **Vérifiez le déploiement** :
   - Allez dans l'onglet **Actions** de votre dépôt
   - Vous devriez voir le workflow "Deploy to GitHub Pages" en cours
   - Attendez qu'il se termine (environ 2-3 minutes)

3. **Accédez à votre site** :
   - Une fois le déploiement terminé, allez dans **Settings** → **Pages**
   - Votre site sera accessible à l'URL : `https://VOTRE_USERNAME.github.io/opus-lab/`
   - Note : La première fois, cela peut prendre quelques minutes pour être accessible

## 🔄 Déploiements automatiques

À chaque fois que vous poussez du code sur la branche `main`, le site sera automatiquement reconstruit et redéployé.

## 🔧 Configuration personnalisée

### Changer l'URL du site

Par défaut, votre site sera accessible à :
- `https://VOTRE_USERNAME.github.io/opus-lab/`

Si vous voulez utiliser un domaine personnalisé :
1. Allez dans **Settings** → **Pages**
2. Sous **Custom domain**, entrez votre domaine
3. Suivez les instructions pour configurer le DNS

### Variables d'environnement Firebase

⚠️ **Important** : Les variables d'environnement Firebase doivent être configurées comme secrets GitHub pour que le build fonctionne.

#### Configuration des secrets GitHub

1. **Récupérez vos clés Firebase** :
   - Allez dans la [Console Firebase](https://console.firebase.google.com)
   - Sélectionnez votre projet
   - Allez dans **Paramètres du projet** (icône ⚙️) → **Vos applications**
   - Si vous n'avez pas encore d'application web, cliquez sur **Ajouter une application** → **Web** (icône `</>`)
   - Copiez les valeurs de configuration

2. **Ajoutez les secrets dans GitHub** :
   - Allez sur votre dépôt GitHub
   - Cliquez sur **Settings** → **Secrets and variables** → **Actions**
   - Cliquez sur **New repository secret** pour chaque variable :
     - `VITE_FIREBASE_API_KEY` : Votre clé API Firebase
     - `VITE_FIREBASE_AUTH_DOMAIN` : `votre-projet.firebaseapp.com`
     - `VITE_FIREBASE_PROJECT_ID` : L'ID de votre projet Firebase
     - `VITE_FIREBASE_STORAGE_BUCKET` : `votre-projet.appspot.com`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID` : Votre ID d'expéditeur
     - `VITE_FIREBASE_APP_ID` : Votre ID d'application

3. **Le workflow utilisera automatiquement ces secrets** lors du build

**Note** : Les clés Firebase côté client sont normalement publiques (elles apparaissent dans le code compilé), mais utiliser des secrets GitHub est une bonne pratique pour la gestion de la configuration.

## 🐛 Dépannage

### Le site ne se déploie pas

1. Vérifiez les **Actions** pour voir les erreurs
2. Vérifiez que le workflow est bien activé
3. Vérifiez que GitHub Pages est activé dans **Settings** → **Pages**

### Le site ne fonctionne pas correctement

1. Vérifiez la console du navigateur pour les erreurs
2. Vérifiez que les variables d'environnement Firebase sont correctement configurées
3. Vérifiez que les règles Firestore autorisent les requêtes depuis votre domaine GitHub Pages

### Les routes ne fonctionnent pas

L'application utilise `HashRouter`, ce qui évite les problèmes de routing sur GitHub Pages. Si vous avez des problèmes :
- Vérifiez que vous utilisez bien `HashRouter` (déjà configuré)
- Les URLs seront de la forme : `https://username.github.io/opus-lab/#/route`

## 📝 Notes importantes

- ⚠️ **Firebase Configuration** : Assurez-vous que votre configuration Firebase autorise les requêtes depuis `https://VOTRE_USERNAME.github.io`
- ⚠️ **Firestore Rules** : Vérifiez que vos règles Firestore fonctionnent avec le domaine GitHub Pages
- ⚠️ **HTTPS** : GitHub Pages utilise HTTPS par défaut, ce qui est nécessaire pour Firebase

## 🔗 Ressources

- [Documentation GitHub Pages](https://docs.github.com/en/pages)
- [GitHub Actions pour Pages](https://github.com/actions/deploy-pages)
- [Vite Guide - Déploiement](https://vitejs.dev/guide/static-deploy.html#github-pages)

