# Configuration des Règles Firestore

Ce guide explique comment configurer et déployer les règles de sécurité Firestore pour Opus Lab.

## 📋 Prérequis

- Un projet Firebase configuré
- Firebase CLI installé (`npm install -g firebase-tools`)
- Authentification Firebase CLI (`firebase login`)

## 📁 Fichiers créés

- `firestore.rules` : Règles de sécurité Firestore
- `firebase.json` : Configuration Firebase pour le déploiement

## 🔒 Règles de sécurité implémentées

### Collection `users`
- ✅ Lecture : Uniquement son propre document
- ✅ Création : Uniquement son propre document avec champs requis
- ✅ Mise à jour : Uniquement son propre document (sauf le champ `role`)
- ❌ Suppression : Interdite

### Collection `exercises`
- ✅ Lecture : 
  - Exercices publiés (`status === 'published'`) : Lecture publique
  - Exercices draft : Uniquement par l'auteur
- ✅ Création : Uniquement pour les professeurs (`role === 'teacher'`)
- ✅ Mise à jour : Uniquement par l'auteur
- ✅ Suppression : Uniquement par l'auteur

### Collection `attempts`
- ✅ Lecture : Uniquement ses propres tentatives
- ✅ Création : Uniquement avec son propre `userId`
- ❌ Mise à jour : Interdite (immuable)
- ❌ Suppression : Interdite

### Collection `authorizedTeachers`
- ✅ Lecture : Publique (pour vérifier les emails autorisés)
- ❌ Écriture : Interdite côté client (uniquement via console Firebase)

## 🚀 Déploiement des règles

### Option 1 : Via Firebase Console (Recommandé pour débuter)

1. Ouvrez la [Console Firebase](https://console.firebase.google.com)
2. Sélectionnez votre projet
3. Allez dans **Firestore Database** > **Règles**
4. Copiez le contenu de `firestore.rules`
5. Collez-le dans l'éditeur de règles
6. Cliquez sur **Publier**

### Option 2 : Via Firebase CLI

1. **Initialiser Firebase** (si pas déjà fait) :
   ```bash
   firebase init firestore
   ```
   - Sélectionnez votre projet Firebase
   - Utilisez le fichier `firestore.rules` existant

2. **Déployer les règles** :
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Vérifier le déploiement** :
   ```bash
   firebase firestore:rules:get
   ```

## 🧪 Test des règles

### En développement local

Les règles fonctionnent automatiquement avec votre application en développement (`npm run dev`). Firebase utilise les règles déployées en production.

### Avec Firebase Emulator (Optionnel)

Pour tester les règles localement avec l'émulateur :

1. **Installer Firebase Tools** (si pas déjà fait) :
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialiser l'émulateur** :
   ```bash
   firebase init emulators
   ```
   - Sélectionnez Firestore Emulator
   - Choisissez un port (par défaut : 8080)

3. **Démarrer l'émulateur** :
   ```bash
   firebase emulators:start
   ```

4. **Configurer votre application** pour utiliser l'émulateur (voir `src/firebase.js`)

## ⚠️ Notes importantes

### Développement local vs Production

- **En développement** (`npm run dev`) : Les règles déployées en production s'appliquent automatiquement
- **Avec Firebase Emulator** : Les règles du fichier `firestore.rules` sont utilisées

### Sécurité

- Les règles sont **déployées immédiatement** après publication
- Testez toujours les règles avant de les déployer en production
- Utilisez la console Firebase pour surveiller les erreurs de règles

### Vérification des règles

Pour vérifier que les règles fonctionnent correctement :

1. **Console Firebase** > **Firestore Database** > **Règles**
2. Utilisez le **Simulateur de règles** pour tester différents scénarios
3. Vérifiez les logs dans la console pour les erreurs de permissions

## 🔍 Dépannage

### Erreur : "Missing or insufficient permissions"

- Vérifiez que l'utilisateur est authentifié (`request.auth != null`)
- Vérifiez que l'utilisateur a les permissions nécessaires (propriétaire, professeur, etc.)
- Vérifiez que les règles sont bien déployées

### Erreur : "Permission denied"

- Vérifiez que les champs requis sont présents lors de la création
- Vérifiez que l'utilisateur modifie uniquement ses propres documents
- Vérifiez que le rôle de l'utilisateur est correct (pour les professeurs)

### Les règles ne s'appliquent pas

- Vérifiez que les règles sont bien déployées (`firebase deploy --only firestore:rules`)
- Attendez quelques secondes après le déploiement
- Videz le cache du navigateur

## 📚 Ressources

- [Documentation Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Rules Playground](https://firebase.google.com/docs/firestore/security/test-rules)

## ✅ Checklist de déploiement

- [ ] Fichier `firestore.rules` créé et vérifié
- [ ] Fichier `firebase.json` créé
- [ ] Règles testées avec le simulateur Firebase
- [ ] Règles déployées en production
- [ ] Application testée avec les nouvelles règles
- [ ] Aucune erreur de permissions dans les logs

## 🎯 Fonctionnalités protégées

### Mode invité
- ✅ Lecture des exercices publiés (sans authentification)
- ✅ Accès au Player public (`/play/:exerciseId`)

### Utilisateurs authentifiés (Élèves)
- ✅ Lecture/écriture de leur propre profil
- ✅ Création de tentatives d'exercices
- ✅ Lecture de leurs propres tentatives
- ✅ Lecture des exercices publiés

### Professeurs
- ✅ Toutes les permissions des élèves
- ✅ Création d'exercices
- ✅ Modification/suppression de leurs exercices
- ✅ Lecture de leurs exercices draft

### Sécurité
- ❌ Modification du rôle utilisateur (géré uniquement par le système)
- ❌ Modification/suppression des tentatives (immuables)
- ❌ Écriture dans `authorizedTeachers` (admin uniquement)

