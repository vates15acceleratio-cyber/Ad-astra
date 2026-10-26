# Ad-astra
Préparation physique perso


## Démarrage
1. Ouvrir `index.html` dans un navigateur (aucune installation).
2. Onglet Données : régler la date de début du cycle.
3. Onglet Corps et tests : faire le test de 6 minutes en semaine 1 pour obtenir VMA et allures.
4. Après chaque séance : onglet Journal.

## Agents (Claude Code)
Ouvrir Claude Code dans ce dossier, puis :

- `/bilan-hebdo` : audit, recherche si nécessaire, rapport de suivi et notes du coach.
- Ou appeler un agent directement : `audit-programme`, `recherche-sport`, `suivi-progression`.

Avant le bilan, exporter le journal depuis l'appli (onglet Données) vers `data/journal.json`. Après le bilan, importer `data/coach-notes.json` dans la même page pour afficher les conseils.

## Limites
- Les données restent dans le navigateur utilisé : exporter régulièrement.
- Le programme est un cadre général de reprise, pas un avis médical.
