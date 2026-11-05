# Prépa U15 HBCCS — Carnet technique du projet

Ce fichier est la mémoire du projet. À joindre à toute nouvelle discussion avec Claude (ou à remettre à un développeur) : il suffit de le lire pour retrouver le contexte.

> **Règle d'or : aucun mot de passe, aucun code d'accès, aucune clé secrète dans ce fichier ni dans le code.**
> (La clé « publishable » Supabase visible dans le code est publique par conception.)

---

## 1. À quoi sert l'application

Application web installable (PWA) du HBCCS (Handball Club Clermont Salagou), catégorie U15 masculine.

- **Espace joueurs** : séances de préparation physique autonomes (12 séances, programmes Joueur et Gardien), chronomètre guidé avec voix et sons, suivi de progression. Accès par code personnel.
- **Espace coachs** : connexion par compte (Supabase Auth), présences, compositions d'équipes, match et score en direct, créateur de séances, schémas tactiques animés, statistiques, évaluations.
- **Accueil** : prochains matchs, derniers résultats, agenda.

## 2. Où tout se trouve

| Élément | Où |
|---|---|
| Code | Dépôt GitHub, tout à la racine. Branche de travail : `dev`. |
| Hébergement | Netlify, déploiement automatique à chaque modification de la branche (site de test : `dev--u15-gladiator-prepa.netlify.app`) |
| Base de données | Supabase (projet `cponudkorfxtwptwtulq`) |
| Branche `main` | Version stable. *(À confirmer : la mise en production passe-t-elle toujours par une fusion `dev` → `main` ?)* |

## 3. Carte des fichiers

### Racine
- `index.html` : la structure (écrans `screen-home`, `screen-club`, `screen-app`, panneaux de l'espace coach) et la liste des fichiers JS à charger.
- `css/style.css` : tout le style. Les couleurs de base sont des variables en haut du fichier (`--jaune`, `--bleu`…).
- `sw.js` : mode hors-ligne (service worker). **Doit lister chaque fichier de l'application.**
- `manifest.json` : nom, icônes et couleurs de l'application installée.
- `assets/`, `audio/`, `images/`, `icon-*.png` : ressources.

### JavaScript (`js/`) — l'ordre des numéros est l'ordre de chargement

| Fichier | Contient |
|---|---|
| `00-version.js` | Numéro de version de l'application (source unique) et son affichage sur l'accueil |
| `01-audio-voix.js` | Sons, images d'exercices, voix (fichiers audio + synthèse vocale), annonces de circuit |
| `02-etat-supabase.js` | État local de l'appli, connexion Supabase (URL, codes joueurs, validations, synchro en attente) |
| `03-seances-base.js` | Constructeurs de séances, configurations d'exercices (joueur et gardien), séance maison exceptionnelle, contenu des 12 séances (`buildSessions`) |
| `04-moteur-seance.js` | Moteur de séance (chronomètre, pause), écran maintenu allumé, navigation, bandeau d'installation |
| `05-espace-coachs.js` | Accès à l'espace coachs, matchs FFHB (synchro + affichage), réglages de l'appli pilotés depuis Supabase |
| `06-joueurs-presences.js` | Codes joueurs, présences, ajout manuel de joueur, postes, clavier de composition d'équipes, `TEAM_COLORS` |
| `07-compositions-score.js` | Modes de composition, tableau de score en direct, buteurs, sanctions, synchro vers le résumé de séance |
| `08-createur-seances.js` | Créateur de séances (modèles, édition, sauvegarde de secours, mise à jour auto), fiche A4 / PDF |
| `09-lecture-terrain.js` | Mode « Lire / Terrain », minuterie, page d'exercice, modèle de séance personnalisable |
| `10-types-exercice.js` | Types d'exercice (situation avec schéma, jeu ludique, renforcement), éditeurs, fiche |
| `11-schema-modele.js` | Modèle et rendu des schémas, conversion des anciens dessins, schémas de la bibliothèque |
| `12-editeur-schema-plein-ecran.js` | Éditeur de schéma plein écran, zoom, flèches animées, ballon, trajectoires, images, export GIF. **Contient `CR_BUILD` (numéro de version affiché dans l'appli).** |
| `13-accueil-coach.js` | Partage GIF, scores à saisir, tableau de bord et accueil coach, résumé de séance |
| `14-schemas-tactiques.js` | Module Schémas tactiques (géométrie, terrain, éléments), animation, lecteur plein écran |
| `15-editeur-schemas-base.js` | Éditeur de schémas : synchro Supabase (`exercices_schemas`), état, étapes, enchaînements |
| `16-editeur-schemas-outils.js` | Éditeur de schémas : outils, sélection, gestes, crayon, gomme, panneau d'options, liste d'exercices |
| `17-stats-evaluations.js` | Statistiques, évaluations (référentiel filière), connexion coach, tableau de progression des joueurs |
| `18-reglages-affichage.js` | Rôle joueur/gardien, accordéons, progression globale, enregistrement du service worker, affichage de l'appareil, gestion des mots de passe coachs |
| `19-init.js` | Démarrage de l'application (**doit rester le dernier script** dans `index.html`) |
| `20-espace-joueurs.js` | Espace Joueurs : registre des rubriques (`ejRegister`), affichage/ordre/titres/options choisis par le coach, page Réglages générée. Chargé **avant** `19-init.js` dans `index.html` (donc son numéro n'indique pas l'ordre) |

## 4. Règles à respecter (sinon, ça casse)

1. **Ne pas changer l'ordre des `<script>` dans `index.html`.** Un fichier peut utiliser ce qu'un fichier précédent a défini.
2. **Pas de modules modernes (`import`/`export`).** Le code compte plus de 500 commandes directement dans les boutons (`onclick="…"`) qui appellent des fonctions globales.
3. **Tout nouveau fichier JS ou CSS** : ajouter sa balise dans `index.html` **et** son chemin dans `APP_SHELL` de `sw.js`. Un fichier listé mais absent empêche le mode hors-ligne de s'installer.
4. **Couleurs** : utiliser les variables du style (`var(--jaune)`), pas de code couleur écrit en dur. *(Dette existante : voir § 7.)*
5. **Version** : le numéro de version (`z23`, `z24`…) vit à **un seul endroit**, `js/00-version.js` (`APP_VERSION`). Il s'affiche en bas à droite de l'accueil et dans l'éditeur de schémas. À chaque livraison : (a) changer ce numéro et la date ; (b) mettre à jour la première ligne (« dernière modification : version zNN ») de **chaque fichier modifié** — les fichiers non modifiés gardent l'ancien numéro, ce qui montre d'un coup d'œil dans quelle version ils ont été touchés pour la dernière fois ; (c) livrer uniquement les fichiers modifiés, plus `js/00-version.js` ; (d) pour une livraison complète, nommer le zip `prepa-u15-zNN.zip`. Vérification sur la tablette : le numéro affiché sur l'accueil doit être celui annoncé.
6. **Textes** : écrire « station debout sur un pied » (jamais « unipodal ») ; descriptions d'exercices compréhensibles par un enfant de 10 ans.
7. **Base de données** : toute modification de structure Supabase (tables, colonnes, règles d'accès) est montrée à Stephen **avant** d'être appliquée. Vérifier l'identifiant du projet avant toute écriture.
8. **Méthode de travail** : pour toute modification de code, Claude propose d'abord un plan et attend l'accord de Stephen. Une discussion par sujet, en joignant seulement les fichiers concernés.
9. **Page Réglages** : toute nouvelle option se range dans une catégorie existante (`<details class="rg-cat">` dans `index.html`) ou dans une sous-catégorie générée par `rgSub()` (fichier 18). Elle passe sur deux colonnes à partir de 900 px de large. L'état ouvert/fermé des catégories est mémorisé sur l'appareil (`prepa_reglages_open_v1`).

### Fonctions et conventions à connaître avant de coder

| Sujet | À savoir | Où |
|---|---|---|
| Dates | Utiliser `dateStr()` et `monthFirstStr()` (heure locale). **Jamais `.toISOString()`** pour calculer un jour ou un mois : décalage d'un jour possible. | fichier 06 |
| Matchs | `homeParseOpponent()` lit le titre d'un match : formats « A vs B » (officiel FFHB) et « A - B » (saisie manuelle). Le club est reconnu par le mot « CLERMONT ». | fichier 05 |
| Synchro matchs | Une fonction serveur Supabase (`sync-matches`) importe les calendriers officiels FFHB ; l'accueil la déclenche au chargement. | fichier 05 |
| Compte coach | `ensureCoachSession()` et `coachAuthHeaders()` : à utiliser pour tout appel Supabase réservé aux coachs. | fichier 17 |
| Schémas | `escapeSvgText()` pour tout texte inséré dans un SVG. | fichier 17 |
| Style | Polices : Barlow Condensed (titres, badges, chiffres), Barlow (texte). Paliers d'écran : 700 / 1100 / 1400 px. | `css/style.css` |

## 5. Mode hors-ligne (`sw.js`)

- La page et le code (`.html`, `.js`, `.css`) : **réseau d'abord**, cache en secours. Une mise à jour est donc visible dès le rechargement.
- Images, audio, icônes : **cache d'abord**, rafraîchi en arrière-plan.
- Supabase : jamais mis en cache.
- Après une mise à jour du service worker, recharger l'application deux fois. Sur iPhone / iPad, fermer puis rouvrir l'application installée si l'ancienne version persiste.

## 6. Données (Supabase)

Tables utilisées par le code : `players`, `completions`, `presences`, `matches`, `match_lineup`, `seance_plans`, `session_notes`, `evaluations`, `coaches`, `app_settings`, `outils_composition`, `outils_goals`, `programme_saison`, `objectif_progress`, `exercices_schemas`, ainsi que des vues/fonctions (`objectif_progress_avg`, `presence_stats_global`, `coach_set_password`, `coach_reset_with_code`).

- `exercices_schemas` (bibliothèque de schémas) a été créée le 26 octobre 2026, avec sécurité par ligne activée. `seance_plans` contient les séances du Créateur. `coach_recovery` et `coach_password_log` existent en base (gestion des mots de passe coach, 27 octobre) mais leur création ne figure pas dans la liste des migrations : à documenter.
- Les coachs ont un compte Supabase Auth (identifiant interne de la forme `prénom@hbccs.local`, invisible dans l'interface). La table `coaches` fait le lien.
- La clé présente dans le code est publique : **toute la sécurité des données repose sur les règles d'accès (RLS) de Supabase**. La base contient des données de joueurs mineurs : ces règles sont à contrôler régulièrement.
- Les coachs changent leur mot de passe depuis Réglages dans l'application.

## 7. Dette technique et points ouverts

- Couleurs écrites en dur (environ 70 occurrences du jaune du club hors variable CSS, dont une trentaine dans le JS). Changer `--jaune` ne suffit pas.
- Environ 900 fonctions partagées par tous les fichiers : une modification peut avoir des effets à distance. Pas de tests automatiques.
- **Deux migrations Supabase préparées mais jamais appliquées** : une horloge serveur pour la résolution des conflits de sauvegarde, et une table `coach_prefs` pour synchroniser l'apparence de l'espace coach entre appareils (aujourd'hui, l'apparence ne se règle que par appareil).
- **Aucun test sur vrai appareil.** Tout a été testé sur navigateur simulé. À vérifier sur iPad : bips (premier appui nécessaire, mode silencieux désactivé), vibration, chronomètre écran verrouillé.
- Bibliothèque de jeux et de routines : reportée.
- Audit des règles d'accès Supabase (RLS) à faire, vu la présence de données de mineurs.
- **Version 2 du site** : une idée de branche `v2` (avec son propre site de test Netlify) a été évoquée sans être mise en place. Attention : toutes les branches pointent vers la **même base Supabase** ; un changement de structure des données peut casser le site actuel. Décision à reprendre.
- Claude n'a pas d'accès direct à GitHub ni à Netlify : chaque livraison est déposée à la main par Stephen.
- Supabase est sur l'offre gratuite (Free) ; vérifier ses limites avant d'ajouter de gros volumes ou d'autres usages.
- Si l'application devait être commercialisée : RGPD, CGU, assurance, relecture du code par un développeur.

## 8. Historique résumé (reconstitué à partir des discussions précédentes, à compléter)

- **Juillet 2026** : prépa estivale U15 (12 séances sur 4 semaines), programmes Joueur et Gardien, chronomètre guidé avec voix et sons, connexion par code joueur, appareil verrouillé.
- **Août 2026** : installation en PWA ; déverrouillage autonome après réinstallation ; rôle joueur/gardien synchronisé vers Supabase ; tableau de bord coach (badge gardien) ; ouverture de l'espace coachs.
- **Septembre 2026** : comptes coachs (Supabase Auth) ; accueil refait (matchs, résultats, agenda, fond graphique) ; numéros et postes des joueurs ; onglets Équipes et Match (compositions de 2 à 4 équipes, équilibrage par poste) ; couleurs d'équipe unifiées ; module Évaluations.
- **26 octobre 2026** : naissance du module Schémas (terrain SVG, actions numérotées, lecteur d'animation plein écran, éditeur, bibliothèque synchronisée avec Supabase).
- **27 octobre** : Créateur de séances complet (schémas rattachés aux exercices, fiche PDF A4, page exercice, matériel, sauvegarde JSON) ; réglages d'affichage par appareil ; gestion des mots de passe coachs.
- **28 octobre** : gros chantier de l'éditeur (numérotation automatique, sélection multiple, raccourcis réglables, variantes d'étape, « Reproduire l'enchaînement », corrections iPhone).
- **29-31 octobre** : rotation du terrain, classement par type et thème, dossier « Mes schémas », interface claire, partage en GIF, thèmes personnalisés.
- **1er novembre** : un seul éditeur de schémas (conversion automatique des anciens dessins), synchronisation quasi instantanée entre appareils avec gestion des conflits, modèle de séance personnalisable.
- **2-3 novembre** (z17-z18) : barre du bas réglable, fiche PDF en colonnes, report des modifications sur les étapes suivantes, apparence Clair / Doux / Sombre, bibliothèque en grille de vignettes.
- **4 novembre** (z19-z21) : mode **Lire / Terrain** (la séance se lit dans l'appli, écran allumé), lecture côte à côte en portrait, sauvegarde renforcée (copie locale par séance, copie « (ma version) » en cas de conflit), animation directement dans le schéma.
- **5 novembre** (z22) : types d'exercice (situation avec schéma, jeu ludique, renforcement musculaire), chronomètre de terrain avec bips, vibration et bouton muet, fiche PDF adaptée.
- **5 novembre 2026 (z25)** : Réglages de l'Espace Joueurs : registre des rubriques, interrupteur / ordre / titre par rubrique, options par rubrique, génération automatique des réglages ; Réglages en 2 colonnes dès ~720 px (iPad vertical).
- **5 novembre 2026 (z24)** : page Réglages réorganisée (catégories déroulantes, deux colonnes sur grand écran, état mémorisé).
- **5 novembre 2026** : numéro de version affiché en bas à droite de l'accueil (z23), avec une ligne d'identification en tête de chaque fichier ; découpage du fichier unique en 1 style + 19 fichiers JS ; adaptation de `sw.js`.

## 9. Journal des modifications

| Date | Version (`CR_BUILD`) | Modification | Fichiers touchés |
|---|---|---|---|
| 2026-11-04 | z19-z21 | Mode Lire / Terrain ; sauvegarde renforcée ; animation dans le schéma | (fichier unique, avant découpage) |
| 2026-11-05 | z22 | Types d'exercice (jeu ludique, renforcement) ; chronomètre de terrain ; fiche PDF adaptée | (fichier unique, avant découpage) |
| 2026-11-05 | z25 | Espace Joueurs : registre des rubriques (`js/20-espace-joueurs.js`), réglages générés (visibilité, ordre, titre, options), enregistré dans `app_settings.ej_modules` ; Réglages 2 colonnes dès 720 px | `js/20-espace-joueurs.js` (nouveau), `index.html`, `css/style.css`, `js/05-espace-coachs.js`, `sw.js`, `js/00-version.js` |
| 2026-11-05 | z24 | Page Réglages : 5 catégories déroulantes, sous-catégories pour « Affichage », 2 colonnes ≥ 900 px, boutons Tout ouvrir / Tout fermer | `index.html`, `css/style.css`, `js/18-reglages-affichage.js`, `js/00-version.js` |
| 2026-11-05 | z23 | Numéro de version unique (`js/00-version.js`) affiché sur l'accueil et dans l'éditeur ; ligne d'identification en tête de chaque fichier ; `CR_BUILD` suit désormais `APP_VERSION` | tous les fichiers + `js/00-version.js` (nouveau) |
| 2026-11-05 | z22 | Découpage en fichiers (aucun changement de comportement) ; `sw.js` : liste des nouveaux fichiers, code en « réseau d'abord » ; chemin de l'image de fond adapté dans `css/style.css` | `index.html`, `css/style.css`, `js/*`, `sw.js` |

## 10. Chantier en cours : Espace Joueurs (décisions du 5 novembre 2026)

Objectif : donner aux joueurs, en lecture seule, du contenu lié à l'entraînement (séance du jour pas à pas, animations des enclenchements d'attaque et des principes de fonctionnement, avec les espaces de course), plus la possibilité de poser des questions.

Étapes prévues, une version chacune, avec une pause de test entre deux :
1. **z24** : Réglages lisibles (fait).
2. **z25** (fait) : Réglages de l'Espace Joueurs. Un registre central des rubriques génère la page de réglages : chaque nouvelle rubrique y apparaît toute seule avec son interrupteur (affichée ou non, ordre, titre).
3. **z26** : contenu pour les joueurs. Le coach « publie » depuis la bibliothèque de schémas et les séances. Choix retenu : publier une **copie** (le joueur voit ce qui a été publié ; republier après modification). Le camembert de présence et le programme ne sont plus au centre de l'espace.
4. **z27** : questions des joueurs.

Décisions pour les questions :
- Le joueur ou le coach peut poser une question. Si c'est un joueur, le coach voit son prénom ou son code personnel.
- Le coach **valide chaque question avant publication**, éventuellement de façon anonyme.
- Les joueurs voient les questions publiées, **anonymes**. Les réponses sont visibles par tous *(confirmé le 5 novembre)*.
- Réponse du coach : texte, schéma de la bibliothèque, ou lien YouTube. Pas d'envoi de fichiers vidéo pour l'instant.

Sécurité (accord donné le 5 novembre ; le SQL est montré avant toute application, au plus tard avant l'étape 4) :
- La table `players` est lisible par tout le monde (noms et codes de joueurs) : à restreindre.
- Le code d'accès de l'Espace Joueurs est dans `app_settings`, lisible par tous : à faire vérifier côté serveur.
- `exercices_schemas` et `seance_plans` ne sont lisibles que par les coachs : les joueurs ne liront que les copies publiées.
- Aucun espace de stockage de fichiers n'existe dans Supabase.

### Comment ajouter une rubrique à l'Espace Joueurs (à partir de z25)
1. Dans `index.html`, créer le cadre dans `#ej-modules` avec un `id` (ex. `ej-mod-seance`) et un titre avec un `id` (ex. `ej-mod-seance-title`).
2. Dans `js/20-espace-joueurs.js`, ajouter `ejRegister({ id:'seance', title:'…', desc:'…', box:'ej-mod-seance', titleEl:'ej-mod-seance-title', options:[{id:'anim', label:'…', def:true}] })`.
3. C'est tout : l'interrupteur, l'ordre, le titre modifiable et les options apparaissent seuls dans Réglages › Espace Joueurs. Le code de la rubrique lit ses options avec `ejOpt('seance','anim')`.
