---
description: Bilan hebdomadaire de la reprise sportive (audit, recherche si besoin, suivi)
---

Lance le bilan hebdomadaire de la reprise sportive.

1. Vérifie que `data/journal.json` existe. Sinon, demande-moi de l'exporter depuis l'appli (onglet Données) et arrête-toi.
2. Lance l'agent `audit-programme` et attends son rapport dans `data/audits/`.
3. Si l'audit liste des questions de recherche, lance l'agent `recherche-sport` pour chacune (au maximum deux), puis attends les fichiers dans `data/recherches/`.
4. Lance l'agent `suivi-progression` pour produire `data/rapports/semaine-NN.md` et `data/coach-notes.json`.
5. Résume-moi en dix lignes maximum : verdict de l'audit, trajectoire vers 10 tractions et 40 pompes, ajustements proposés pour la semaine suivante. Rappelle-moi d'importer `data/coach-notes.json` dans l'appli.

$ARGUMENTS
