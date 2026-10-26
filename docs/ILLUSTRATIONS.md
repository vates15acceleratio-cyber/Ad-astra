# Illustrations d'exercices

## Chaîne de production (faite par Claude, avec Blender et PhotoCraft)

Les ids sont ceux de `schemas-src/` (mêmes poses que les croquis schématiques). Une commande produit les images :

```powershell
powershell -File tools/illus3d/build.ps1 dos-tractions        # ou plusieurs ids séparés par des virgules
```

1. `tools/illus3d/export-poses.js` exporte les poses (articulations 3D et matériel) en JSON.
2. `tools/illus3d/render.py` (Blender, en ligne de commande) construit un robot doré (armure facettée, articulations sombres, visière et liserés lumineux ambre, d'après l'esthétique Ultrakill ; option `human` pour un mannequin), cadre automatiquement toutes les positions de l'exercice avec la même caméra, et rend une image par position.
3. **PhotoCraft** (`photocraft-cli convert`) compresse en WebP (qualité 84, environ 10 Ko par image) vers `img/exo/`.
4. `tools/build-illus.js` met à jour le registre et la liste de pré-cache ; il reste à incrémenter la version.

Sources de la suite ArtCraft détectées sur le PC : PhotoCraft, VectorCraft, FigCraft, DesignCraft, EffectCraft, FilmCraft, etc. (éditeurs avec ligne de commande). L'ArtCraft Launcher ne génère pas d'images : c'est le gestionnaire d'installation de ces applications.

La suite de ce document décrit la voie manuelle (images générées à la main, avec des prompts) : elle reste possible pour remplacer un rendu.

## Voie manuelle : guide de génération

L'appli affiche une illustration par exercice quand des images existent dans `img/exo/`, sinon elle retombe sur les croquis schématiques. Une fiche d'exercice montre une **boucle animée douce** (glissement entre les positions, sans variation d'opacité, avec bouton Pause, désactivée si le téléphone réduit les animations) puis les positions fixes.

## Fichiers attendus

- Dossier : `img/exo/`
- Nom : `<id>-<n>.<ext>` avec `n` = 1, 2 ou 3 (l'ordre des positions) et `ext` = `webp`, `png`, `jpg` ou `svg`. Exemple : `dos-tractions-1.webp`, `dos-tractions-2.webp`.
- Même extension pour toutes les images d'un exercice. 2 ou 3 images par exercice (la boucle animée marche pour 2 et 3 ; au-delà, seules les positions fixes s'affichent).
- Taille : carré, 768 × 768 ou 1024 × 1024 pixels, 150 Ko maximum par image de préférence (WebP). Le personnage doit rester centré, avec la même taille et le même cadrage d'une image à l'autre du même exercice : c'est ce qui rend la boucle lisible.
- Ensuite, depuis le dossier du projet : `node tools/build-illus.js`, puis incrémenter la version (voir `CLAUDE.md`).

## Prompt de style (à coller en tête de chaque génération)

```
Clean flat vector-style fitness illustration, one adult athletic person (short dark hair,
fitted dark-grey training clothes with thin gold trim), full body fully visible and centered,
strict side view (profile), anatomically correct proportions, calm neutral face,
solid very dark navy background (#0a0e14), subtle golden accent color (#f5d76e) on
equipment and on the working muscles, soft shading, no text, no watermark, no logo,
no extra people, minimal equipment only, square 1:1 composition.
```

Astuces pour garder le **même personnage** : générer la position 1, puis utiliser cette image comme référence (image-to-image / « variation ») pour la position 2, en ne décrivant que ce qui change. Garder la même graine (seed) si l'outil le permet.

## Pilote : tractions (`dos-tractions`, 2 images)

- `dos-tractions-1` : « …Hanging from a pull-up bar with an overhand shoulder-width grip, arms fully extended, body straight and still, legs slightly bent behind. »
- `dos-tractions-2` : « …Same person, same bar, same framing. Top of a pull-up: chin clearly above the bar, elbows pointing down, chest up, legs slightly bent behind. »

Une fois les deux images déposées, dites-le-moi : je les branche, je règle la boucle et nous jugeons le style avant de produire les autres.

## Liste des exercices à illustrer plus tard

Les `id` ci-dessous sont ceux que l'appli cherche. Les croquis existent déjà pour ceux de la première colonne ; les autres n'ont encore aucune vignette.

| id | Exercice | Images |
|---|---|---|
| `dos-tractions` | Tractions | 2 |
| `aa-negative` | Négatives de traction | 3 |
| `dos-rowing-aus` | Tirage horizontal (table, anneaux) | 2 |
| `pec-pompes` | Pompes | 2 |
| `aa-pompes-claquees` | Pompes claquées | 2 |
| `ab-plank` | Planche | 1 |
| `ab-side-plank` | Gainage latéral | 1 |
| `ab-deadbug` | Dead bug | 2 |
| `aa-bird-dog` | Bird-dog | 2 |
| `aa-body-saw` | Body saw | 2 |
| `ab-hollow` | Hollow body | 1 |
| `aa-releve-genoux` | Relevés de genoux suspendus | 2 |
| `ab-leg-raise-susp` | Relevés de jambes suspendus | 2 |
| `ab-russian` | Russian twist | 2 |
| `cal-lsit` | L-sit | 1 |
| `ab-dragon` | Dragon flag | 2 |
| `q-fentes-bulg` | Squat bulgare | 2 |
| `aa-fente-arriere` | Fente arrière | 2 |
| `aa-squat-pc` | Squat poids du corps | 2 |
| `aa-squat-saute` | Squat sauté | 2 |
| `aa-corde` | Corde à sauter | 2 |
| `cal-pistol`, `cal-pistol-assiste` | Pistol (assisté) | 2 |
| `box-jump` | Saut sur box | 3 |
| `aa-course` | Course | 2 |
| `aa-fente-basse` | Fente basse (fléchisseurs de hanche) | 1 |
| `aa-squat-profond` | Squat profond tenu | 1 |
| `aa-suspension` | Suspension passive | 1 |
| `etir-ischios` | Étirement des ischio-jambiers | 1 |
| `etir-pigeon` | Pigeon | 1 |
| `etir-grenouille` | Grenouille (adducteurs) | 1 |
| `etir-grand-ecart` | Grand écart assisté | 1 |
| `mob-chevilles` | Chevilles, genou vers le mur | 2 |
| `mob-thoracique` | Rotation thoracique à quatre pattes | 2 |
| `mob-poignets` | Poignets | 2 |
| `mob-epaules` | Cercles d'épaules avec bâton | 2 |
| `cat-cow` | Cat-cow | 2 |
| `world-greatest-stretch` | World's greatest stretch | 2 |

Pour les pompes variantes (archer, mains rapprochées, pieds surélevés), les ids prévus sont `pec-pompes-dia`, `cal-archer-pompe` et `pec-pompes-dec` : à ajouter à la table de correspondance (`CROQUIS_MAP` dans `app.js`) quand les images existeront.
