# Ad-astra · notes pour Claude

Projet personnel : reprise sportive sur 12 semaines (callisthénie, course, vélo, piscine), sans salle. Objectifs à 3 mois : 10 tractions, 40 pompes, physique de combattant, agilité.

## Contraintes à respecter
- 3 séances par semaine (A, B, C). Ne jamais ajouter de séance intense sans demande explicite.
- Abdominaux : blocs intégrés à A (anti-extension, flexion) et C (rotation, latéral), jamais de série à l'échec sur le tronc.
- Souplesse : routine du matin quotidienne (express 8-10 min ou complète 20 min avec Baduanjin) et séance M optionnelle de 25 min, basse intensité. Les types M et O ne comptent pas dans les 3 séances.
- Genou gauche sensible sur les efforts longs : course continue limitée à 75 min, impacts réduits dès que la douleur monte.
- Aucun diagnostic médical. En cas de douleur persistante, recommander un avis professionnel.
- Toute valeur chiffrée issue de la littérature doit être sourcée par une recherche, pas citée de mémoire.

## Structure
- `index.html` : appli locale (ouvrir dans le navigateur). Données dans le navigateur, export/import JSON.
- `data/journal.json` : export du journal (à déposer ici depuis l'appli, onglet Données).
- `data/audits/`, `data/rapports/`, `data/recherches/` : sorties des agents.
- `data/coach-notes.json` : notes du coach, à réimporter dans l'appli.
- `docs/PROGRAMME.md` : programme de référence.
- `.claude/agents/` : `audit-programme`, `recherche-sport`, `suivi-progression`.
- `.claude/commands/bilan-hebdo.md` : commande `/bilan-hebdo`.

## Flux hebdomadaire
1. Journaliser les séances dans l'appli.
2. Exporter `journal.json` vers `data/`.
3. Lancer `/bilan-hebdo` dans Claude Code depuis ce dossier.
4. Importer `data/coach-notes.json` dans l'appli.

Les agents lisent le journal en lecture seule. Seul `suivi-progression` écrit `coach-notes.json` et les rapports.

## Identité visuelle (depuis 1.1.0) — à conserver
- Thème sombre unique (pas de mode clair), accent or `#f5d76e`, mêmes jetons de couleur que l'appli Muscu (`--bg`, `--surface`, `--accent`…) dans `index.html`. Navigation en bas (barre latérale ≥ 900 px).
- Logo : **étoile filante dorée** (`icon.svg`, PNG dérivés, `figure.svg` pour l'écran de démarrage, `mark.svg` pour l'en-tête). Écran de démarrage `#splash` (CSS dans `index.html`, fermeture dans `splash.js`, indépendant de `app.js`) : 2,5 s ou un appui, sortie par glissement vers le haut, texte « Made by Vates Inc. » fixe, police Cinzel embarquée (`cinzel-700-latin.woff2`, SIL OFL 1.1, copiée de Muscu).
- Aucun clignotement : l'écran ne varie jamais en opacité ; seuls des éléments locaux bougent (transform). Tout est désactivé avec `prefers-reduced-motion`.
- Les PNG se régénèrent depuis les SVG avec Chrome sans interface (`--headless=new --screenshot`).

## Croquis d'exercices (depuis 1.2.0)
- `croquis.js` est **GÉNÉRÉ** (ne pas le modifier à la main) : `node schemas-src/build-bundle.js`. Sources : `schemas-src/schemas-core.js` (moteur de l'appli Muscu), `schemas-src/data/*.js` (poses reprises de Muscu) et `schemas-src/data/adastra.js` (exercices propres, ids `aa-…`).
- Le lien texte du plan → croquis est `CROQUIS_MAP` dans `app.js` (expressions régulières, première correspondance). Un exercice sans correspondance s'affiche sans vignette.
- Contrôle visuel : `node schemas-src/grid.js '^aa-' sortie.html` (planche d'icônes) ou `node schemas-src/sheet.js '^aa-' sortie.html`, puis capture avec Chrome sans interface.

## Illustrations d'exercices (ArtCraft)
- Les illustrations sont produites par Claude : `powershell -File tools/illus3d/build.ps1 <id>` (poses du moteur de schémas, rendu Blender 5.0 en ligne de commande d'un astronaute (combinaison noire, dorures, casque noir brillant ; ou robot doré de style Ultrakill avec `-Style robot`), finition WebP avec `photocraft-cli` ; styles `astro` (astronaute du logo de Muscu : combinaison noire, liserés dorés, casque noir brillant) et `human` disponibles en 5e argument de `render.py` ; style par défaut : `astro`, détaillé ; le propriétaire hésitait entre le robot doré et l'astronaute). L'ArtCraft Launcher ne génère pas d'images. Elles vont dans `img/exo/` (`<id>-<n>.<ext>`, voir `docs/ILLUSTRATIONS.md`). Après tout ajout : `node tools/build-illus.js` (régénère `illustrations.js` et la liste de pré-cache `ILLUS_FILES` de `sw.js`), puis incrémenter la version.
- Une illustration remplace le croquis schématique quand elle existe ; la fiche exercice la montre en boucle animée (glissement, jamais de variation d'opacité, bouton Pause, désactivée avec `prefers-reduced-motion`). Le propriétaire peut aussi y déposer ses propres images.

## Calage et bilans (depuis 1.2.0)
- Chaque séance commence par un test de calage (A : tractions et pompes max ; C : squats bulgares max par jambe, champ `legReps` ; B : FC moyenne et effort perçu). Bilans aux semaines 1, 4, 8, 12 (`BILAN` dans `app.js`).
- La règle de calage (`RATIO`) n'est **pas** issue de la littérature : aucune étude validée trouvée. Ne pas l'afficher comme un fait scientifique ; la documenter avec `recherche-sport` avant d'en parler en termes de preuve.

## Versions
- Format `majeur.mineur.correctif`. Trois endroits toujours identiques : `APP_VERSION` (`app.js`), `CACHE_VERSION` (`sw.js`, préfixe `ad-astra-v`) et le titre du README (`# Ad-astra — vX.Y.Z`). Le test `npm test` le vérifie.
- Un changement de numéro est nécessaire pour qu'une modification de `app.js` atteigne les appareils déjà installés (le JS est servi en cache-first par version).
- Une entrée « Nouveautés » dans le README à chaque version, avec la mention « Données : format inchangé » ou la description du changement.

## Données de l'utilisateur — ne jamais les perdre
- Tout est dans `localStorage` (clé `reprise-sport-v1`). Tout changement de structure s'accompagne de sa migration dans `migrate()` (`app.js`), **sans supprimer de champ existant**, et de `DATA_VERSION` incrémenté.
- L'import est strict (`cleanJournal`) : tout nouveau champ doit y être validé. L'export (`buildExport`) contient toujours tout.
- Avant de pousser une version qui touche aux données : `cd tests && npm test` doit passer. Prévenir le propriétaire dans le message de version.

## Dépôt public : confidentialité
- Le dépôt est public (GitHub Pages). Ne jamais y ajouter de vraies données : `data/journal.json`, `data/coach-notes.json`, audits et rapports réels sont dans `.gitignore`. Les exemples sont fictifs (`data/exemples/`, `data/audits/exemple-*.md`).
- Les messages de commit n'ont pas à contenir de données de santé ou de performance du propriétaire.

## Déroulé habituel
- Une fonctionnalité est proposée, confirmée par le propriétaire, puis codée, testée (`npm test`) et poussée sur `main`. Pas de fonctionnalité ajoutée sans demande : la priorité est la qualité (niveau de l'appli Muscu).
- Pas d'animation avec variation d'opacité ; tout est désactivé avec `prefers-reduced-motion`.
- Zoom autorisé, champs à 16 px minimum, cibles tactiles de 44 px.
