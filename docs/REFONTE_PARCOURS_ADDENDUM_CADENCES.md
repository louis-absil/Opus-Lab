# Addendum Phase 2 : Cadences obligatoires (Mode Libre + Mode Parcours)

À inclure dans la **deuxième phase de développement** (Interface adaptative) de la refonte Parcours & Gameplay.

---

## Contexte actuel

- Les cadences ne font pas partie de la réponse obligatoire : le champ est affiché comme « Cadence (Optionnel) » dans [ChordSelectorModal.jsx](src/ChordSelectorModal.jsx).
- En validation ([riemannFunctions.js](src/utils/riemannFunctions.js)), une cadence correcte donne un **bonus** (+10) mais l’absence de cadence n’est pas pénalisée même quand la solution en contient une.
- Il n’y a pas d’indication claire dans l’interface quand un marqueur attend une cadence.

---

## Objectifs

1. **Réponse cadence obligatoire** : lorsqu’un marqueur (accord) a une cadence dans la solution (`marker.chord.cadence`), la réponse doit inclure une cadence pour que la validation soit complète (et pour pouvoir terminer / valider l’accord).
2. **Mode Libre et Mode Parcours** : cette règle s’applique dans les deux modes.
3. **Interface claire** : l’interface de réponse doit indiquer explicitement quand une cadence est attendue (ex. « Cadence requise » ou « Si cadence il y a, il faut le préciser ») et adapter le libellé selon que le marqueur courant a une cadence ou non.

---

## Modifications à prévoir (Phase 2)

### 1. Données passées au sélecteur

- Le Player (ou le composant parent) doit passer au **ChordSelectorModal** une indication « ce marqueur attend-il une cadence ? » :
  - Prop du type `expectedCadence: boolean` ou `markerHasCadence: boolean`, dérivée de `marker.chord?.cadence` pour le marqueur courant.
- Optionnel : passer la liste des cadences attendues ou la valeur attendue pour pré-remplir ou afficher un rappel (ex. « Ce passage contient une cadence. Laquelle ? »).

### 2. ChordSelectorModal – Interface

- **Quand le marqueur n’a pas de cadence** (`expectedCadence === false`) :
  - Afficher par exemple : « Cadence (optionnel) » ou laisser le libellé actuel.
- **Quand le marqueur a une cadence** (`expectedCadence === true`) :
  - Changer le libellé en **« Cadence (requise) »** ou **« Si cadence il y a, il faut le préciser »** / **« Indiquez la cadence »**.
  - Mettre en évidence visuelle la zone cadence (bordure, icône, ou court texte explicatif) pour que l’élève comprenne qu’il doit répondre.
- **Validation (bouton VALIDER)** :
  - Si `expectedCadence === true` et que l’utilisateur n’a pas choisi de cadence (`cadence === null`), considérer la réponse comme incomplète : **désactiver le bouton Valider** ou afficher un message du type « Indiquez la cadence pour valider » jusqu’à sélection d’une cadence.
  - Ainsi, en Mode Libre comme en Mode Parcours, on ne peut pas valider un accord « avec cadence attendue » sans avoir renseigné la cadence.

### 3. Logique de validation (riemannFunctions ou Player)

- **Option A (recommandée)** : garder la logique actuelle (bonus si cadence correcte, pas de pénalité si absente) mais **bloquer côté UI** la validation tant qu’une cadence n’est pas choisie quand elle est attendue. La « complétude » de la réponse est donc gérée par l’interface.
- **Option B** : en plus du blocage UI, introduire une **pénalité** dans le score si `correctAnswer.cadence` est défini et `userAnswer.cadence` est absent (ex. −10 ou score plafonné). À trancher selon la politique pédagogique souhaitée.

### 4. Mode Parcours – Nœuds cadence

- Les nœuds « cadence » (Demi-Cadence, Cadence Parfaite, etc.) dans l’arbre peuvent exiger que les exercices proposés contiennent des marqueurs avec cadence ; la règle « cadence obligatoire si présente dans le marqueur » s’applique alors naturellement en Phase 2.

### 5. Récapitulatif des fichiers impactés

| Fichier | Modification |
|--------|--------------|
| [src/pages/Player.jsx](src/pages/Player.jsx) | Calculer `markerHasCadence` (ou `expectedCadence`) pour le marqueur courant à partir de `marker.chord?.cadence` et le passer au ChordSelectorModal (et au ChordQCM si affichage cadence en Phase 2 QCM). |
| [src/ChordSelectorModal.jsx](src/ChordSelectorModal.jsx) | Accepter une prop `expectedCadence` (ou équivalent). Adapter le libellé et le style de la zone « Cadence » (requise vs optionnel). Désactiver le bouton Valider si cadence attendue et `cadence === null`. |
| [src/utils/riemannFunctions.js](src/utils/riemannFunctions.js) | Optionnel : pénalité ou plafond de score si cadence attendue et non fournie. Sinon, inchangé (bonus uniquement). |

---

## Résumé

- **Cadence obligatoire** lorsque le marqueur a une cadence : applicable en **Mode Libre** et **Mode Parcours**.
- **Interface** : indiquer clairement quand une cadence est requise et bloquer la validation tant qu’elle n’est pas renseignée.
- Cette évolution fait partie de la **Phase 2 (Interface adaptative)** de la refonte et doit être implémentée en même temps que les autres évolutions du sélecteur (phases Intuition / Précision / Maîtrise, double correction, etc.).
