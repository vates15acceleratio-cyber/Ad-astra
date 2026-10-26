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
