# Reprise sportive · système de suivi

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
