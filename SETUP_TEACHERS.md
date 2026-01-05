# Configuration des Professeurs Autorisés

## Système d'Emails Autorisés

Le système de promotion vers le rôle "professeur" utilise maintenant une liste d'emails autorisés stockée dans Firestore, au lieu d'un code secret en dur dans le code.

## Configuration dans Firestore

### Étape 1 : Créer la collection `authorizedTeachers`

1. Ouvrez la console Firebase : https://console.firebase.google.com
2. Sélectionnez votre projet
3. Allez dans **Firestore Database**
4. Cliquez sur **Commencer** ou **Créer une base de données** si c'est la première fois
5. Créez une nouvelle collection nommée : `authorizedTeachers`

### Étape 2 : Ajouter des emails autorisés

Pour chaque professeur autorisé, créez un document dans la collection `authorizedTeachers` :

**Structure du document :**
- **ID du document** : Peut être l'email ou un ID unique (ex: `prof1`, `prof2`, etc.)
- **Champs** :
  - `email` (string) : L'adresse email du professeur (en minuscules, ex: `professeur@example.com`)
  - `addedAt` (timestamp) : Date d'ajout (optionnel, pour traçabilité)
  - `addedBy` (string) : Email de l'administrateur qui a ajouté (optionnel)

**Exemple de document :**
```json
{
  "email": "professeur@example.com",
  "addedAt": "2024-01-15T10:00:00Z",
  "addedBy": "admin@example.com"
}
```

### Étape 3 : Ajouter un professeur via l'interface Firestore

1. Dans la collection `authorizedTeachers`, cliquez sur **Ajouter un document**
2. Laissez l'ID généré automatiquement ou entrez un ID personnalisé
3. Ajoutez les champs :
   - `email` : type `string`, valeur : l'email du professeur (en minuscules)
   - `addedAt` : type `timestamp`, valeur : maintenant (ou laissez vide)
   - `addedBy` : type `string`, valeur : votre email admin (optionnel)
4. Cliquez sur **Enregistrer**

### Étape 4 : Vérifier la configuration

Pour tester :
1. Connectez-vous avec un email autorisé
2. Allez dans le Dashboard Élève
3. Cliquez sur "Devenir Professeur"
4. La modale devrait afficher "✓ Votre email est autorisé"
5. Cliquez sur "Devenir Professeur"
6. Vous devriez être promu et redirigé vers le Dashboard Professeur

## Gestion des Emails Autorisés

### Ajouter un nouveau professeur

1. Ouvrez Firestore
2. Allez dans la collection `authorizedTeachers`
3. Ajoutez un nouveau document avec l'email du professeur

### Retirer un professeur

1. Ouvrez Firestore
2. Allez dans la collection `authorizedTeachers`
3. Trouvez le document correspondant à l'email
4. Supprimez le document

**Note :** Retirer un email de la liste n'enlève pas automatiquement le rôle "teacher" aux utilisateurs déjà promus. Pour rétrograder un utilisateur, modifiez manuellement son document dans la collection `users` (champ `role` : `student`).

### Rétrograder un professeur existant

1. Ouvrez Firestore
2. Allez dans la collection `users`
3. Trouvez le document de l'utilisateur (ID = userId Firebase)
4. Modifiez le champ `role` de `teacher` à `student`

## Sécurité

- ✅ Les emails sont normalisés en minuscules pour la comparaison
- ✅ La vérification se fait côté client (Firestore rules recommandées pour plus de sécurité)
- ✅ Pas de code secret en dur dans le code source
- ✅ Facile à gérer via l'interface Firestore

## Recommandations de Sécurité Avancées

Pour une sécurité renforcée, vous pouvez :

1. **Ajouter des Firestore Rules** pour protéger la collection `authorizedTeachers` :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Seuls les admins peuvent lire/écrire dans authorizedTeachers
    match /authorizedTeachers/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

2. **Créer une interface admin** pour gérer les emails autorisés sans passer par la console Firebase

3. **Utiliser Firebase Functions** pour automatiser la promotion (optionnel)

## Migration depuis l'ancien système

Si vous aviez des professeurs promus avec l'ancien système (code secret), ils conservent leur rôle. Seuls les nouveaux professeurs doivent avoir leur email dans `authorizedTeachers`.

