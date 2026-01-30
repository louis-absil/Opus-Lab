# Checklist : refonte couleurs (feedback + T/SD/D)

**Choix validés :**
- **Fonctions** : T = bleu, SD = violet, D = rose.
- **Feedback** : rouge = faux, orange = partiel, vert = juste.

---

## A. Feedback (rouge / orange / vert)

### src/pages/Player.css
| Lignes | Élément | Action |
|--------|---------|--------|
| 461-466 | `.player-chord-segment-incorrect` | Garder rouge ; keyframes `chordValidationIncorrect` (563-575) : gris → **rouge** |
| 469-474 | `.player-chord-segment-partial` | Gris → **orange** (border, background, box-shadow) |
| 577-590 | `@keyframes chordValidationPartial` | Vert lime → **orange** (rgba) |
| 1267 | `.player-validation-feedback--level-1` | Garder vert |
| 1268 | `.player-validation-feedback--level-0.5` | Ambre → **orange** |
| 1269-1270 | `.player-validation-feedback--level-2`, `--level-3` | Gris → **orange** |
| 1271 | `.player-validation-feedback--level-0` | Garder rouge |
| 1299-1303 | `.player-segment-tooltip.player-validation-feedback--level-*` | Idem : level-1 vert, 0.5/2/3 orange, 0 rouge |

### src/components/ReviewDetailPanel.css
| Lignes | Élément | Action |
|--------|---------|--------|
| 145-160 | `.review-chord-correct` | Garder vert |
| 162-166 | `.review-chord-partial` | Gris → **orange** (background, border, color) |
| 169-173 | `.review-chord-incorrect` | Garder rouge |

### src/components/ExerciseSummary.css
| Lignes | Élément | Action |
|--------|---------|--------|
| 235-238 | `.result-item.incorrect` | Gris → **rouge** |
| 240-243 | `.result-item.partial` | Vert lime → **orange** |
| 274-276 | `.incorrect-icon` | Gris → **rouge** |
| 278-280 | `.partial-icon` | Vert lime → **orange** |
| 326-330 | `.result-value.incorrect` | Gris → **rouge** |
| 332-336 | `.result-value.partial` | Vert lime → **orange** |

---

## B. Fonctions T / SD / D (bleu / violet / rose)

Teintes : T `#3b82f6`, SD `#7c3aed` ou `#8b5cf6` (violet), D `#e11d48` ou `#ec4899` (rose). RGBA dérivés pour borders/glow.

### src/utils/riemannFunctions.js
| Lignes | Élément | Action |
|--------|---------|--------|
| 41-45 | `FUNCTION_COLORS.T` | Garder bleu |
| 46-50 | `FUNCTION_COLORS.SD` | Orange → **violet** (primary, secondary, glow) |
| 51-55 | `FUNCTION_COLORS.D` | Rouge → **rose** (primary, secondary, glow) |

### src/ChordSelectorModal.jsx
| Lignes | Élément | Action |
|--------|---------|--------|
| 10 | `FUNCTIONS` : SD | `color: 'amber'` → `'violet'` |
| 69-74 | `colorMap` (Pad) | Ajouter `violet: 'bg-violet-600 shadow-[...] border-violet-400'`, garder `rose` |
| 240-241 | Affichage fonction (accord complet) | `func.color === 'amber'` → `'violet'`, `text-amber-400` → `text-violet-400` pour SD |
| 282, 332 | Symbole accidental ♭/♯ | **Ne pas changer** (amber = symbole hauteur, pas fonction) |
| 305-306 | Affichage fonction (sans degré) | Idem : amber → violet pour SD |
| 1293-1294 | Ring fonction (pads T/SD/D) | SD : `ring-amber-*` → `ring-violet-*`, rgba 245,158,11 → violet |
| 1313, 1315 | Bordure section Degré | `border-amber-500/50` → `border-violet-500/50` pour SD |
| 1361-1368 | Highlight degrés (principal / parallèle) | SD : tous `amber` → `violet` (ring, shadow, border, bg) |
| 1400-1401 | Special roots (N, It, Fr, Gr) | SD : `ring-amber-*` → `ring-violet-*` |
| 1404 | `color={funcColor \|\| 'rose'}` | Garder |
| 1450, 1459 | I64 passing / cadential | Garder `bg-rose-600` (D) |
| 1494 | Pad sixFourVariant | `color="amber"` → `color="violet"` si lié à SD ; sinon garder |

### src/components/ChordQCM.css
| Lignes | Élément | Action |
|--------|---------|--------|
| 48-51 | `.chord-qcm-fn-btn-t` | Garder bleu |
| 53-56 | `.chord-qcm-fn-btn-sd` | Ambre → **violet** (ou fallback `var(--fn-primary)` si riemannFunctions à jour) |
| 58-61 | `.chord-qcm-fn-btn-d` | Rouge → **rose** (ou fallback idem) |

### src/pages/Player.css
| Lignes | Élément | Action |
|--------|---------|--------|
| 388-396 | `.player-chord-segment-t` | Garder bleu |
| 398-406 | `.player-chord-segment-sd` | Orange → **violet** (border-color, background, hover) |
| 408-416 | `.player-chord-segment-d` | Rose/rouge actuel → **rose** (teinte cohérente D) |
| 429-441 | `.player-chord-segment-answered.player-chord-segment-*` | SD : orange → violet ; D : rose |
| 652-654 | `.player-chord-function-t` | Garder bleu |
| 656-657 | `.player-chord-function-sd` | `#fbbf24` → **violet** (ex. `#a78bfa` ou `#8b5cf6`) |
| 660-661 | `.player-chord-function-d` | `#fb7185` → **rose** (ex. `#f472b6` ou `#ec4899`) |

### src/pages/Editor.jsx
| Lignes | Élément | Action |
|--------|---------|--------|
| 1341, 1347 | Curseur temps / marqueur | `bg-amber-500` = UI éditeur — garder ou neutre |
| 1382-1383 | Carte accord **SD** (timeline) | `border-amber-500`, `bg-amber-*` → **violet** |
| 1386-1387 | Carte accord **D** | Garder `rose` |
| 1415-1416 | Label fonction dans carte | SD `text-amber-400` → `text-violet-400`, D garder `text-rose-400` |
| 1425 | Accidental dans label | `text-amber-400` = ♭/♯ — garder ou neutre |
| 1469 | Bouton supprimer (rose) | Garder (UI, pas fonction) |
| 1534, 1537 | Indicateur I64 (amber) | Si lié SD → violet ; sinon garder |
| 1886 | État sélectionné (rose) | Garder si D |

### src/components/ReviewDetailPanel.css
| Lignes | Élément | Action |
|--------|---------|--------|
| 243-244, 271 | Bordures / couleurs explication | Si liées à **fonction SD** → violet ; si **feedback partiel** → orange |

---

## C. Fichiers sans modification couleurs T/SD/D ou feedback

- **src/pages/Player.jsx** : utilise seulement des classes CSS (`player-chord-segment-t/sd/d`, `player-chord-function-t/sd/d`).
- **src/components/ChordQCM.jsx** : injecte `FUNCTION_COLORS` via style `--fn-primary` / `--fn-glow` ; mise à jour dans riemannFunctions.js suffit.
- **ConfirmExitModal.css, VideoCockpit.css, VideoImport.css, etc.** : rouge/orange/vert pour boutons danger ou erreurs — hors scope feedback validation.

---

## Ordre suggéré

1. `riemannFunctions.js` (FUNCTION_COLORS)
2. `Player.css` (segments + labels fonction + feedback)
3. `ChordSelectorModal.jsx` (FUNCTIONS + colorMap + toutes les refs SD)
4. `ChordQCM.css` (fallbacks SD/D)
5. `ReviewDetailPanel.css` (partial orange ; SD violet si applicable)
6. `ExerciseSummary.css` (incorrect rouge, partial orange)
7. `Editor.jsx` (SD violet, D rose pour marqueurs/accords)
