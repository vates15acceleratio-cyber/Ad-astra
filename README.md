# Ad-astra — v1.0.0
Préparation physique perso

App perso de suivi de reprise sportive. Single-page PWA installable, données 100 % locales (localStorage), pas de serveur, pas de traceur, fonctionne hors ligne.

## Nouveautés v1.0.0

Première version publiée : l'appli passe au niveau de qualité de Muscu.

- **Installable sur le téléphone** : manifeste, icônes (dont icône adaptative), service worker. Elle s'ouvre en plein écran et hors ligne. Appui long sur l'icône : raccourcis vers la routine du matin, le journal et le programme.
- **Mises à jour sûres** : la nouvelle version s'installe en arrière-plan et attend ; une bannière propose de relancer. Vérification au lancement, au retour au premier plan et toutes les heures (au plus une fois par 30 min).
- **Import strict** : le fichier est entièrement vérifié (dates, nombres, structure) avant de toucher aux données. Un fichier invalide affiche « Fichier invalide (séances) » et rien ne change. Une copie de sécurité est gardée avant chaque import et chaque effacement.
- **Migration** : les données des versions précédentes sont complétées sans jamais supprimer de champ. Si les données locales sont illisibles, une copie brute est conservée et une alerte s'affiche.
- **Sauvegardes** : rappel si aucune sauvegarde depuis 14 jours, demande de stockage persistant au navigateur pour éviter l'effacement automatique.
- **Sécurité** : politique CSP stricte (aucun script en ligne, aucune connexion externe).
- **Accessibilité** : étiquettes liées aux champs, boutons nommés, cibles tactiles de 44 px, focus visible, zones sûres des téléphones, animations désactivées si le téléphone le demande.
- **Écran d'erreur** : une erreur d'affichage ne bloque plus l'appli et propose d'exporter les données.
- **Tests** : 30 contrôles automatiques (`tests/`).
- **Données** : format 2 (ajout de `morning`, `mobility`, `lastExport`). Aucune action nécessaire : migration automatique. Une sauvegarde reste une bonne idée.

## Contenu de l'appli

- **Aujourd'hui** : séance suggérée, alertes (genou, régularité, sauvegarde), notes du coach.
- **Routine matin** : version express (8-10 min) ou complète (20 min, avec Baduanjin), série de jours consécutifs.
- **Journal**, **Progrès** (tractions, pompes, VMA, genou, souplesse, poids), **Programme** (12 semaines, abdos, séance de souplesse), **Corps & tests**, **Données**.
- Programme détaillé : `docs/PROGRAMME.md`.

## Installer sur le téléphone

Adresse : `https://vates15acceleratio-cyber.github.io/Ad-astra/`

**Android (Chrome / Vanadium)** : menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
**iPhone (Safari)** : **Partager** → **Sur l'écran d'accueil**.

Si l'appli semble bloquée sur une ancienne version : ferme-la complètement (retire-la des applications récentes) puis rouvre-la ; sinon désinstalle-la, rouvre l'adresse dans le navigateur et réinstalle.

## Déploiement sur GitHub Pages (première fois)

1. Le dépôt doit être **Public** (Pages gratuit).
2. **Settings** → **Pages** → Source : **Deploy from a branch** → branche `main`, dossier `/ (root)`.
3. Attendre 1 à 2 minutes : l'adresse ci-dessus apparaît.

## Confidentialité

Le dépôt est public : le code de l'appli, le programme, les agents et un journal **fictif** (`data/exemples/`). Vos vraies données ne le quittent jamais : elles restent dans le navigateur du téléphone. Le `.gitignore` empêche d'ajouter par erreur `data/journal.json`, `data/coach-notes.json`, les audits et les rapports réels.

## Agents Claude Code

Ouvrir Claude Code dans ce dossier :

- `/bilan-hebdo` : audit, recherche si nécessaire, rapport de suivi et notes du coach.
- Ou appeler un agent : `audit-programme`, `recherche-sport`, `suivi-progression`.

Avant le bilan, exporter le journal depuis l'appli (onglet Données) vers `data/journal.json`. Après le bilan, importer `data/coach-notes.json` dans l'appli.

## Développement

```bash
cd tests && npm install && npm test    # code 0 = tout passe
```

Structure : `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, icônes, `docs/`, `.claude/`, `data/`, `tests/`.
Convention de version : `majeur.mineur.correctif`. Voir `CLAUDE.md`.
