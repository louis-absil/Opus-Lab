# Design du mode Parcours – Accueil élève (dernière étape du plan)

Cette étape établit le design du **Parcours de progression** visible sur l’**Accueil** du mode élève (onglet Home, [StudentDashboard.jsx](src/pages/StudentDashboard.jsx), section où [CampaignMap](src/components/CampaignMap.jsx) est affiché). Objectifs : **clair et pédagogique**, **aux standards d’apps pro**, **moderne et stylisé**.

---

## 1. Contexte d’affichage

- **Emplacement** : Accueil mode élève → onglet « Accueil » → section « Parcours de Progression » (sous la carte gamification niveau/XP/série, au-dessus de « Code Exercice »).
- **Composant** : `CampaignMap` (arbre de nœuds + modale détail).
- **Contraintes** : cohérence avec le reste du dashboard (fond `#f8f9fa`, cartes arrondies, typo système/Inter), responsive (mobile first), accessibilité (contraste, focus, labels).

---

## 2. Principes de design

| Principe | Application |
|----------|-------------|
| **Clarté pédagogique** | L’élève comprend en un coup d’œil : où il en est, ce qui est débloqué, ce qui est verrouillé, et quelle est la prochaine étape. Hiérarchie visuelle nette (étages, nœuds, cadences). |
| **Standards pro** | Espacements et grille réguliers, typographie lisible et hiérarchisée, états (hover, focus, disabled) explicites, feedback visuel sur les actions. |
| **Moderne et stylisé** | Light mode chaleureux (blanc / gris très pâle), formes douces (bords arrondis), ombres légères, lignes de connexion épaisses et courbes. Pas de style « jeu vidéo sombre ». |

---

## 3. Direction visuelle globale

### 3.1 Ambiance

- **Mode** : Light uniquement pour cette vue (aligné avec le reste de l’accueil).
- **Fond** : Blanc (`#ffffff`) ou gris très pâle (`#f8fafc`, `#f1f5f9`) pour le bloc Parcours ; léger contraste avec le fond de la page (`#f8f9fa`) pour délimiter la section.
- **Références** : type Duolingo / Airbnb / apps SaaS éducatives : propre, aéré, sérieux mais accueillant.

### 3.2 Arbre de progression

- **Vue** : verticale descendante (généalogique), lecture de haut en bas. Étages (1 → 4) clairement séparés.
- **Connexions** : lignes **épaisses** (3–4 px) et **courbes** (courbes de Bézier ou arcs) type « tuyaux », pas uniquement des segments droits. Couleur active : violet cohérent avec la charte ; verrouillé : gris clair, éventuellement pointillés.
- **Nœuds** :
  - **Briques (learning)** : jetons **blancs**, **bordure épaisse** (2–3 px). Actif = bordure **violette** ; Verrouillé = bordure **grise** ; Complété = fond violet (ou blanc + bordure violette + icône check).
  - **Cadences** : nœuds **plus gros** et/ou **style doré/ambre** (bordure ou fond discret) pour les distinguer des briques.
- **Labels** : symbole court dans le jeton (I, V, T, Cad.), sous-titre sous le jeton (ex. « Tonique », « Cadence Parfaite »), lisible même sur mobile.

### 3.3 Modale détail nœud

- **Style** : carte blanche, ombre portée, bords arrondis (16–20 px), padding généreux. Bouton fermer visible. Titre + description + stats (mode, score moyen, niveau) + actions (Lancer un exercice, Voir le cours). Nœud verrouillé : message explicite (« Débloque ce nœud en maîtrisant les prérequis »).

---

## 4. Design tokens proposés (à intégrer en CSS / variables)

- **Couleurs**
  - Fond section Parcours : `#ffffff` ou `#f8fafc`
  - Bordure / lignes actives : `#5b21b6` / `#7c3aed` (violet)
  - Bordure / lignes verrouillées : `#cbd5e1` / `#94a3b8`
  - Nœud complété : fond `#5b21b6` ou blanc + bordure violette + check
  - Cadences : accent ambre/doré `#d97706` / `#f59e0b` (bordures ou fond léger)
  - Texte principal : `#1e293b`, secondaire : `#475569`, tertiaire : `#64748b`
- **Espacements**
  - Section : padding 1.5–2 rem
  - Entre étages : 2–2.5 rem
  - Entre nœuds (horizontal) : 1–1.5 rem
- **Typographie**
  - Titre section : 1.5–2 rem, font-weight 700, couleur titre
  - Sous-titre section : 1 rem, couleur secondaire
  - Label nœud : 1–1.25 rem, font-weight 700
  - Sous-titre nœud : 0.75–0.85 rem, couleur secondaire
- **Formes**
  - Nœuds : cercles (briques 64–80 px, sous-nœuds 48–56 px ; cadences plus gros)
  - Bordures : 2–3 px, radius cohérents (16 px cartes, 10–12 px boutons)
- **Ombres**
  - Carte section : `0 1px 3px rgba(0,0,0,0.06)` à `0 4px 12px rgba(0,0,0,0.08)`
  - Nœud actif : légère glow violette
  - Modale : `0 20px 40px rgba(0,0,0,0.12)`

---

## 5. Pédagogie et lisibilité

- **Titre de section** : « Parcours » ou « Ton parcours » avec sous-titre explicatif (ex. « Débloque les étapes pour progresser »).
- **Étages** : si utile, étiquettes d’étage visibles (Étape 1, 2, 3, 4) ou séparateurs visuels.
- **États des nœuds** :
  - **Verrouillé** : icône cadenas + gris, sous-titre « Débloque en maîtrisant les prérequis » (ou court).
  - **Actif** : bordure violette, sous-titre du type « À toi de jouer » ou nom du nœud.
  - **Complété** : check + violet, sous-titre optionnel « Maîtrisé » ou score.
- **Modale** : description courte et pédagogique du nœud ; bouton principal « Lancer un exercice » mis en avant ; lien « Voir le cours (Codex) » secondaire.

---

## 6. Standards pro et accessibilité

- **Contraste** : texte sur fond clair ≥ 4.5:1 (WCAG AA).
- **Focus** : outline visible au clavier (boutons, nœuds cliquables).
- **Touch** : zones cliquables ≥ 44 px (nœuds + padding si besoin).
- **Responsive** : arbre lisible sur mobile (nœuds plus petits, espacements réduits, scroll vertical fluide) ; modale pleine largeur avec padding sur petit écran.
- **Chargement** : état loading (spinner ou skeleton) pour la section Parcours tant que la progression n’est pas chargée.

---

## 7. Moderne et stylisé (détails)

- **Lignes de connexion** : préférer des courbes (SVG path avec courbe de Bézier) plutôt que des segments droits ; épaisseur 3 px (actif), 2 px (verrouillé), transition courte au déblocage.
- **Micro-interactions** : au survol d’un nœud débloqué, léger scale (1.05) et ombre/glow ; au clic, feedback immédiat (ouverture modale). Pas d’animation lourde.
- **Cohérence** : réutiliser les mêmes violets et gris que le reste du dashboard (niveau/XP, boutons) pour une identité unifiée.

---

## 8. Fichiers à adapter

| Fichier | Rôle |
|--------|------|
| [src/components/CampaignMap.css](src/components/CampaignMap.css) | Appliquer les tokens (couleurs, espacements, ombres), connexions courbes, états nœuds/cadences, responsive. |
| [src/components/CampaignMap.jsx](src/components/CampaignMap.jsx) | Rendu des connexions en courbes (SVG path), distinction visuelle nœuds cadence, libellés et états selon parcoursTree. |
| [src/pages/StudentDashboard.css](src/pages/StudentDashboard.css) | Si besoin : espacement ou fond de la section Parcours pour intégration harmonieuse avec la carte gamification et le code exercice. |

---

## 9. Ordre dans le plan global

Cette étape **« Design du mode Parcours (accueil élève) »** intervient en **dernière phase** de la refonte :

1. **Partie 1** : Structure de données (arbre, critères, progression, exercices).
2. **Partie 2** : Interface adaptative (sélecteur, QCM, double correction, cadences obligatoires).
3. **Partie 3** : **Design du Parcours sur l’accueil** – appliquer ce brief (CampaignMap + CSS + intégration dashboard) pour un rendu clair, pédagogique, pro et moderne.

Une fois les données et la logique en place, l’implémentation du design peut s’appuyer sur ce document pour un rendu cohérent et soigné.
