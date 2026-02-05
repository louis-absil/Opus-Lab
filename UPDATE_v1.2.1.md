# Détail de la mise à jour v1.2.1 – Opus Lab

**Date** : 5 février 2026

Ce document détaille les changements inclus dans la version 1.2.1 (Player et panneau de correction).

---

## Résumé

Cette mise à jour améliore l’**interface de correction** (mode review) du Player : unification de la carte de feedback entre le mode libre et le panneau de détail, mini‑lecteur dans le panneau, et renforcement du responsive (mobile / desktop).

---

## Modifications

### ReviewDetailPanel (panneau de détail d’un accord)

- **Carte de feedback unifiée** : le panneau utilise la même structure que le mode libre (`player-feedback-card`) avec niveaux de validation (vert / jaune-orange / rouge), comparaison « Votre réponse » / « Solution », message de feedback, affichage de la cadence si différente, XP et bonus cadence, et lien vers la fiche Codex.
- **Message pour accord verrouillé** : lorsqu’un segment est verrouillé (accord non à remplir dans le niveau), affichage d’un message neutre explicite au lieu du comparateur.
- **Mini‑player** : contrôles **Jouer** / **Pause**, **Boucle** (rejouer le segment en boucle), **Début** (revenir au début de l’extrait et lancer la lecture). Affichage des temps du segment (début – fin).
- **Robustesse** : appels sécurisés au lecteur YouTube (`safePause`, `safeSeekTo`, `safePlayVideo`, `safeGetCurrentTime`) pour éviter les plantages si l’iframe est bloquée ou non prête. Nettoyage des intervalles au démontage du composant et au changement de segment.

### Player (page d’exercice)

- **Mode review** : interface de correction (split view ou intégrée) avec timeline des segments, sélection d’un segment pour afficher le détail dans le panneau (ou la carte feedback en mode intégré).
- **Cartes de feedback** : style et structure communs entre le panneau de détail (ReviewDetailPanel) et le mode review intégré (overlay sur la vidéo) : message, comparaison, cadence, XP, lien Codex.
- **Timeline** : accolades de cadences au‑dessus des cases (mode exercice et mode review), statut correct / incorrect en review, segments « donnés » (grisés) pour les accords non à remplir.
- **Responsive** : ajustements pour mobile (bandes égales, carte feedback plus compacte, bouton d’ouverture du détail accord, positionnement de la carte au‑dessus de la timeline pour ne pas la masquer).

### Styles (Player.css, ReviewDetailPanel.css)

- **Player.css** : zone vidéo, overlay tap (play/pause, quit), timeline avec segments et cadences, mode review (upper zone, timeline, panneau), cartes `player-feedback-card`, mode intégré, responsive (768px, 480px), bouton mobile « ouvrir détail accord ».
- **ReviewDetailPanel.css** : panneau, contenu, mini‑player (boutons, temps segment), réutilisation des classes `player-feedback-card` dans le panneau, explication neutre (accord verrouillé), media queries desktop/mobile.

---

## Fichiers concernés

| Fichier | Modifications |
|--------|----------------|
| `src/components/ReviewDetailPanel.jsx` | Carte feedback unifiée, mini‑player (Jouer/Boucle/Début), appels sécurisés YouTube, nettoyage intervalles, message accord verrouillé |
| `src/components/ReviewDetailPanel.css` | Styles panneau, mini‑player, intégration `player-feedback-card`, responsive |
| `src/pages/Player.jsx` | Mode review, affichage feedback (carte unifiée), timeline, sélection segment |
| `src/pages/Player.css` | Styles zone vidéo, timeline, mode review, cartes feedback, cadences, responsive |

---

## Compatibilité

- Aucune modification des règles Firestore ni des services.
- Comportement rétrocompatible : les exercices et tentatives existants restent inchangés.

Détail des versions : [CHANGELOG.md](./CHANGELOG.md).
