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
| `21-contenus-joueurs.js` | Contenus publiés aux joueurs : publication (séances, schémas), lecteur de séance côté joueur, gestion dans Réglages › Contenus publiés. Chargé avant `19-init.js` |
| `22-questions-joueurs.js` | Questions des joueurs : poser (fonction serveur `poser_question`), lire les réponses publiées, gestion coach dans Réglages › Questions des joueurs. Chargé avant `19-init.js` |
| `20-espace-joueurs.js` | Espace Joueurs : registre des rubriques (`ejRegister`), affichage/ordre/titres/options choisis par le coach, page Réglages générée. Chargé **avant** `19-init.js` dans `index.html` (donc son numéro n'indique pas l'ordre) |
| `23-matchs-stats.js` | Onglet « Matchs & Stats » du coach : mes matchs (score, mi-temps, tiers-temps, points, feuille PDF), classement de poule par journée, liens FFHandball, barème, bouton « Mettre à jour » (z37) |
| `24-onglets-coach.js` | Organisation des onglets du coach : haut / bas / menu « Plus ▾ », réglée dans Réglages › Organisation des onglets (z37) |

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
- **8 novembre 2026 (z40)** : **stats des joueurs depuis les feuilles de match** (Matchs & Stats › Joueurs). Le bouton « Mettre à jour » lit aussi, sur chaque feuille PDF de NOS matchs, le tableau des joueurs (buts, 7 m, tirs, arrêts, avertissements, 2 min, disqualifications) et le déroulé du match, et signale tout écart entre les deux. Cumul de saison par joueur + détail match par match. Les joueurs sont reliés à leur fiche par la licence (liaison à valider une fois dans l'écran). Seuls NOS joueurs sont enregistrés. Nécessite le SQL `serveur/ffhb-sync/joueurs_stats.sql` + la fonction `ffhb-sync` redéployée.
- **8 novembre 2026 (z41)** : (1) toutes les stats de présence (courbe par joueur, camembert, tendance des compos du week-end) quittent Matchs & Stats › Joueurs et vont dans **Présences › Statistiques** (bascule « Saisie | Statistiques », choix mémorisé). (2) Tableau des stats de match refait : bandeau des leaders, périodes (saison / dernier match / 3 derniers), 3 présentations au choix **Liste / Tableau / Cartes** (mémorisée), tri, joueurs de champ séparés des gardiens, fiche détaillée au toucher. % d'arrêts équipe = arrêts ÷ (arrêts + buts encaissés) ; % par gardien seulement sur les matchs où il est le seul à avoir des arrêts (affiché « ≈ »). Aucun changement de base de données.
- **8 novembre 2026 (z42)** : **grand écran PC/Mac (≥ 1100 px)**. Correctif : depuis z37, les onglets rangés dans la barre du bas ou « Plus » disparaissaient sur PC (la barre du bas est fusionnée en haut) ; `tbApply` (24-onglets-coach.js) place maintenant tous les onglets sur une seule rangée en haut quand `dispBarMerge()` est vrai, et `dispApplyTabs` (18) lui laisse la main. Le module affiché prend toute la largeur (largeur max 1260 px de mise en page, centré) et passe en 2 colonnes : Matchs & Stats (`.ms-cols` : mes matchs | poule + sources ; Joueurs : leaders + joueurs de champ | liaison + gardiens), Présences (saisie | statistiques côte à côte, bascule masquée), accueil de l'appli en 4 colonnes. Sur téléphone / tablette : inchangé.
- **9 novembre 2026 (z43)** : (1) **Forfait (PE)** : nouvelle colonne `poule_matches.forfait` (1 = équipe 1 forfait, 2 = équipe 2) ; colonne « Forfait » dans Matchs & Stats › Poule › Matchs de la journée ; l'équipe forfait marque 0 pt, l'adversaire 3 pts, sans bonus de tiers-temps. La mise à jour FFHandball ne touche pas ce champ. Pas encore géré pour « Mes matchs ». Rollback SQL : `alter table public.poule_matches drop column forfait; drop policy poule_matches_coach_update on public.poule_matches;`. (2) iPhone : barre du bas renforcée (`translateZ(0)`, `html{overflow-x:hidden}`) — correctif préventif non vérifiable hors iPhone.
- **9 novembre 2026 (z44)** : **code couleur des séances** (rouge = défense, bleu = attaque, vert = motricité/manipulation, violet = technique individuelle). Nouvelle colonne `seance_plans.couleur` (rouge/bleu/vert/violet, vide = aucune) — SQL : `alter table public.seance_plans add column if not exists couleur text check (couleur in ('rouge','bleu','vert','violet'));` ; rollback : `alter table public.seance_plans drop column couleur;`. À appliquer AVANT de déposer les fichiers. Choix dans l'éditeur (pastilles « Couleur de la séance »), bande + pastille + titre colorés dans la liste, légende cliquable (= filtre), titres/sous-titres colorés dans la vue Terrain et la fiche PDF. Tons foncés en thème clair/doux, tons vifs en thème sombre (`data-coach`).
- **9 novembre 2026 (z45)** : liste des séances triée par **date de séance**, récentes d'abord (séances sans date à la fin, par dernière modification) ; bouton « Date ▾/▴ » dans la ligne de légende pour inverser, choix mémorisé (`cr_sort_v1`). Aucun SQL.
- **8 novembre 2026 (z39)** : **correction du calcul des points** (z37/z38 donnaient 0 pour une défaite ou un nul). Règlement appliqué : victoire 3, nul 2, défaite 1, + 1 par tiers-temps gagné. Barème : nouvelle ligne « Par défaite ». Le classement de poule suit automatiquement.
- **8 novembre 2026 (z38)** : la fenêtre de détail d'un score (accueil) ouvre directement le **PDF de la feuille de match** quand le code est connu (après « Mettre à jour » dans Matchs & Stats), sinon la page du match.
- **8 novembre 2026 (z37)** : **Matchs & Stats** (U15 uniquement : équipes 1 et 2). L'onglet Stats devient « Matchs & Stats » avec un sélecteur ⚽ Matchs | 👥 Joueurs (la partie Joueurs est l'ancien contenu, inchangé). Matchs : tableau de mes matchs (journée, date, score, mi-temps, tiers-temps, points « nous – eux », feuille de match PDF directe), classement de poule journée par journée, matchs de la journée, points glanés, liens FFHandball modifiables, barème modifiable (1 / 3 / 0 par défaut), bouton « Mettre à jour depuis la FFHandball ». Serveur : fonction `ffhb-sync` (lecture des pages FFHandball, tiers-temps lus dans la feuille de match PDF) ; **ne remplace jamais un score déjà saisi** (les écarts sont signalés). Stats individuelles des joueurs : non faites (feuilles U15 illisibles, et la table `players` n'a pas de licence). **Réglages › Organisation des onglets** : chaque onglet du coach peut être placé en haut, en bas ou dans un menu « Plus ▾ » (ordre modifiable, partagé entre appareils, bouton de remise à zéro). Accueil et Réglages restent toujours visibles.
- **8 novembre 2026 (z36)** : le bloc « 📋 Dernier entraînement » de l'accueil coach est mis de côté (masqué, non supprimé, et plus chargé). Pour le ressortir : dans `index.html`, retirer `display:none;` du bloc `#dash-last-session-box` ; dans `js/13-accueil-coach.js`, remettre `dashboardLastSessionLoad();` dans `dashboardLoad()` (retirer le `//`). Les effectifs « Éq. Match » de l'onglet Équipes ne sont pas touchés.
- **8 novembre 2026 (z35)** : la fenêtre de détail d'un score (clic sur une pastille « Derniers résultats ») s'affiche maintenant à l'accueil : elle était rangée dans l'écran « Prépa estivale » (masqué à l'accueil) et n'apparaissait qu'une fois dans la Prépa, mal placée. Même correction pour l'agrandissement des images d'exercices. Nouveau bouton « 📄 Feuille de match » : ouvre la page du match sur ffhandball.fr (adresse enregistrée par la synchronisation dans la colonne `matches.url_ffhb`). Côté serveur : fonction `sync-matches` v7 (autorisations CORS, décalage d'1 minute des matchs de même heure, enregistrement de l'adresse du match).
- **6 novembre 2026 (z34)** : le compte « stephen » n'est plus soumis au verrou « un seul appareil actif » : connexion possible sur plusieurs appareils en même temps, sans être déconnecté de l'un en se connectant sur l'autre. Les autres coachs gardent le verrou. Liste modifiable : constante `COACH_SANS_VERROU` dans `js/05-espace-coachs.js`.
- **6 novembre 2026 (z33)** : filigrane « S G » (tes initiales) discret et mobile sur les animations vues par les joueurs ; menu clic long désactivé sur le lecteur joueur. Texte modifiable dans `js/14-schemas-tactiques.js` (constante `SCH_WATERMARK`). Il ne bloque pas les captures d'écran : il rend un contenu partagé identifiable comme venant de toi.
- **6 novembre 2026 (z32)** : les joueurs n'ont plus aucun moyen d'exporter un GIF : le bouton est retiré du lecteur d'animation en lecture seule (`schPlayerOpenData(nom, dessins, étape, { readOnly: true })`) et `schShareGif` refuse l'export si le lecteur est en lecture seule. Le coach garde le bouton GIF (bibliothèque et lecteur).
- **6 novembre 2026 (z31)** : bibliothèque de schémas : filtre « Publiés aux joueurs / Non publiés », repère « 📢 publié » sur les cartes, boutons « 🔄 Republier » et « 🚫 Dépublier » sur la fiche ; republier un schéma intégré remplace la copie au lieu de la dupliquer ; suivi des lectures par joueur (nombre de lectures et de relectures) dans Réglages › Contenus publiés et sur la fiche du schéma. Aucune mention aux joueurs (choix du coach).
- **6 novembre 2026 (z30)** : astérisque rouge « ✱ N » sur la carte Coachs de la page d'accueil quand des questions de joueurs sont en attente (visible seulement si une session coach est active) ; comptage relancé au retour à l'accueil.
- **6 novembre 2026 (z29)** : séances faites des joueurs via fonctions serveur `joueur_valider_seance` / `joueur_seances_faites` (vérifient code + appareil) ; écrans coach lisent `completions` avec la connexion coach. Les règles publiques de `completions` sont encore actives (retrait à l'étape 2, après test).
- **6 novembre 2026 (z28c)** : alerte coach pour les questions de joueurs en attente (bannière en haut de l'accueil coach + pastille rouge sur Réglages, mise à jour chaque minute et à chaque changement d'onglet). Pas de notification quand l'appli est fermée (il faudrait des notifications push).
- **6 novembre 2026 (z28b)** : fermeture côté base : suppression des règles publiques « public read players » et « public claim player » ; lecture publique de `app_settings` sans `espace_joueurs_code` ni `coach_cfg_*`. Pas de changement dans l'appli (z28a suffisait).
- **5 novembre 2026 (z28a)** : sécurité des joueurs, étape 1 : la connexion joueur, le changement de rôle et le code d'accès de l'Espace Joueurs passent par des fonctions serveur ; les écrans coach lisent `players` avec la connexion coach. Les anciennes règles publiques sont encore actives (fermeture = z28b).
- **5 novembre 2026 (z27)** : questions des joueurs (poser, valider, répondre en texte / lien YouTube / schéma animé, publier anonymement), rubrique « Questions / réponses », compteur d'attente.
- **5 novembre 2026 (z26)** : contenus publiés aux joueurs en lecture seule : bouton « 📢 Publier aux joueurs » (menu ⋯ d'une séance, fiche d'un schéma), 3 nouvelles rubriques (Séance du jour, Enclenchements d'attaque, Fonctionnement), lecteur de séance exercice par exercice, animation des schémas sans bouton GIF, gestion dans Réglages › Contenus publiés.
- **5 novembre 2026 (z25)** : Réglages de l'Espace Joueurs : registre des rubriques, interrupteur / ordre / titre par rubrique, options par rubrique, génération automatique des réglages ; Réglages en 2 colonnes dès ~720 px (iPad vertical).
- **5 novembre 2026 (z24)** : page Réglages réorganisée (catégories déroulantes, deux colonnes sur grand écran, état mémorisé).
- **5 novembre 2026** : numéro de version affiché en bas à droite de l'accueil (z23), avec une ligne d'identification en tête de chaque fichier ; découpage du fichier unique en 1 style + 19 fichiers JS ; adaptation de `sw.js`.

## 9. Journal des modifications

| Date | Version (`CR_BUILD`) | Modification | Fichiers touchés |
|---|---|---|---|
| 2026-11-04 | z19-z21 | Mode Lire / Terrain ; sauvegarde renforcée ; animation dans le schéma | (fichier unique, avant découpage) |
| 2026-11-05 | z22 | Types d'exercice (jeu ludique, renforcement) ; chronomètre de terrain ; fiche PDF adaptée | (fichier unique, avant découpage) |
| 2026-11-06 | z33 | Filigrane « S G » sur les animations joueur | `js/14-schemas-tactiques.js`, `js/00-version.js` |
| 2026-11-06 | z34 | Compte Stephen exempté du verrou un seul appareil | `js/05-espace-coachs.js`, `js/17-stats-evaluations.js`, `js/00-version.js` |
| 2026-11-08 | z35 | Détail score à l'accueil + feuille de match + sync matchs réparée | `js/05-espace-coachs.js`, `js/01-audio-voix.js`, `js/00-version.js` + SQL `url_ffhb` + fonction sync-matches v7 |
| 2026-11-08 | z36 | Bloc « Dernier entraînement » mis de côté | `index.html`, `js/13-accueil-coach.js`, `js/00-version.js` |
| 2026-11-08 | z37 | Matchs & Stats (mes matchs + poule) + organisation des onglets | `js/23-matchs-stats.js`, `js/24-onglets-coach.js`, `index.html`, `css/style.css`, `sw.js`, `js/05-espace-coachs.js`, `js/00-version.js` + SQL + fonction `ffhb-sync` |
| 2026-11-08 | z40 | Stats individuelles des joueurs (feuilles de match) | `js/23-matchs-stats.js`, `css/style.css`, `index.html`, `serveur/ffhb-sync/*`, `js/00-version.js` |
| 2026-11-08 | z41 | Stats de présence → Présences ; refonte des stats de match (Liste/Tableau/Cartes) | `index.html`, `js/05-espace-coachs.js`, `js/17-stats-evaluations.js`, `js/23-matchs-stats.js`, `css/style.css`, `js/00-version.js` |
| 2026-11-08 | z42 | Grand écran : onglets PC corrigés, pleine largeur, 2 colonnes | `js/24-onglets-coach.js`, `js/18-reglages-affichage.js`, `js/23-matchs-stats.js`, `js/17-stats-evaluations.js`, `css/style.css`, `index.html`, `js/00-version.js` |
| 2026-11-09 | z43 | Forfait (PE) dans le classement de poule ; barre du bas iPhone | `js/23-matchs-stats.js`, `css/style.css`, `js/00-version.js` |
| 2026-11-09 | z44 | Code couleur des séances | `js/08-createur-seances.js`, `index.html`, `css/style.css`, `js/00-version.js` |
| 2026-11-09 | z45 | Tri des séances par date | `js/08-createur-seances.js`, `css/style.css`, `js/00-version.js`, `index.html` |
| 2026-11-08 | z39 | Correction du barème de points (3 / 2 / 1 + 1 par tiers-temps) | `js/23-matchs-stats.js`, `js/00-version.js` |
| 2026-11-08 | z38 | Détail score : lien direct PDF de la feuille de match | `js/05-espace-coachs.js`, `js/00-version.js` |
| 2026-11-06 | z32 | Plus de GIF pour les joueurs (lecteur en lecture seule) | `js/14-schemas-tactiques.js`, `js/13-accueil-coach.js`, `js/21-contenus-joueurs.js`, `js/00-version.js` |
| 2026-11-06 | z31 | Filtre/boutons Publier-Dépublier dans la bibliothèque ; lectures et relectures par joueur (table `vues_contenus`, fonction `joueur_vue_contenu`) | `js/16-editeur-schemas-outils.js`, `js/21-contenus-joueurs.js`, `css/style.css`, `js/00-version.js` |
| 2026-11-06 | z30 | Astérisque « ✱ N » sur la carte Coachs de l'accueil (questions en attente) | `js/22-questions-joueurs.js`, `js/05-espace-coachs.js`, `css/style.css`, `js/00-version.js` |
| 2026-11-06 | z29 | `completions` : fonctions serveur pour enregistrer / relire les séances faites ; lecture coach par la connexion coach | `js/02-etat-supabase.js`, `js/13-accueil-coach.js`, `js/17-stats-evaluations.js`, `js/00-version.js` |
| 2026-11-06 | z28c | Alerte questions en attente (bannière accueil coach + pastille Réglages) | `js/22-questions-joueurs.js`, `js/05-espace-coachs.js`, `css/style.css`, `js/00-version.js` |
| 2026-11-06 | z28b | Fermeture des règles publiques sur `players` et `app_settings` (SQL seulement, migration `z28b_fermeture_players_settings`) | aucun fichier |
| 2026-11-05 | z28a | Fonctions serveur `joueur_*` et `ej_*` ; connexion joueur, rôle et code d'accès via ces fonctions ; écrans coach : lecture de `players` avec la connexion coach | `js/02-etat-supabase.js`, `js/05-espace-coachs.js`, `js/06-joueurs-presences.js`, `js/07-compositions-score.js`, `js/13-accueil-coach.js`, `js/17-stats-evaluations.js`, `js/18-reglages-affichage.js`, `js/00-version.js` |
| 2026-11-05 | z27b | Miniatures des schémas dans les cartes de l'Espace Joueurs (première étape du schéma) | `js/21-contenus-joueurs.js`, `css/style.css`, `js/00-version.js` (+ en-têtes) |
| 2026-11-05 | z27 | Questions des joueurs (table `questions_joueurs`, fonction `poser_question`), rubrique joueur, gestion coach | `js/22-questions-joueurs.js` (nouveau), `index.html`, `css/style.css`, `sw.js`, `js/05-espace-coachs.js`, `js/00-version.js` |
| 2026-11-05 | z26 | Publication aux joueurs (table Supabase `contenus_joueurs`, copie en lecture seule), 3 rubriques, lecteur de séance, gestion des contenus publiés | `js/21-contenus-joueurs.js` (nouveau), `index.html`, `css/style.css`, `sw.js`, `js/05-espace-coachs.js`, `js/08-createur-seances.js`, `js/16-editeur-schemas-outils.js`, `js/00-version.js` |
| 2026-11-05 | z25 | Espace Joueurs : registre des rubriques (`js/20-espace-joueurs.js`), réglages générés (visibilité, ordre, titre, options), enregistré dans `app_settings.ej_modules` ; Réglages 2 colonnes dès 720 px | `js/20-espace-joueurs.js` (nouveau), `index.html`, `css/style.css`, `js/05-espace-coachs.js`, `sw.js`, `js/00-version.js` |
| 2026-11-05 | z24 | Page Réglages : 5 catégories déroulantes, sous-catégories pour « Affichage », 2 colonnes ≥ 900 px, boutons Tout ouvrir / Tout fermer | `index.html`, `css/style.css`, `js/18-reglages-affichage.js`, `js/00-version.js` |
| 2026-11-05 | z23 | Numéro de version unique (`js/00-version.js`) affiché sur l'accueil et dans l'éditeur ; ligne d'identification en tête de chaque fichier ; `CR_BUILD` suit désormais `APP_VERSION` | tous les fichiers + `js/00-version.js` (nouveau) |
| 2026-11-05 | z22 | Découpage en fichiers (aucun changement de comportement) ; `sw.js` : liste des nouveaux fichiers, code en « réseau d'abord » ; chemin de l'image de fond adapté dans `css/style.css` | `index.html`, `css/style.css`, `js/*`, `sw.js` |

## 10. Chantier en cours : Espace Joueurs (décisions du 5 novembre 2026)

Objectif : donner aux joueurs, en lecture seule, du contenu lié à l'entraînement (séance du jour pas à pas, animations des enclenchements d'attaque et des principes de fonctionnement, avec les espaces de course), plus la possibilité de poser des questions.

Étapes prévues, une version chacune, avec une pause de test entre deux :
1. **z24** : Réglages lisibles (fait).
2. **z25** (fait) : Réglages de l'Espace Joueurs. Un registre central des rubriques génère la page de réglages : chaque nouvelle rubrique y apparaît toute seule avec son interrupteur (affichée ou non, ordre, titre).
3. **z26** (fait ; table `contenus_joueurs` créée par migration `z26_contenus_joueurs` : lecture publique des lignes `visible=true`, écriture coachs seulement) : contenu pour les joueurs. Le coach « publie » depuis la bibliothèque de schémas et les séances. Choix retenu : publier une **copie** (le joueur voit ce qui a été publié ; republier après modification). Le camembert de présence et le programme ne sont plus au centre de l'espace.
4. **z27** (fait) : questions des joueurs.
5. **z28a** (fait) puis **z28b** (à faire) : sécurité de `players` (voir ci-dessous).

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

### Table `contenus_joueurs` (z26)
Colonnes : `id`, `kind` (`schema` | `seance`), `rubrique` (`seance` | `enclenchements` | `fonctionnement`, texte libre), `title`, `source_id` (id de l'original, sert à remplacer la copie à la republication), `payload` (copie JSON), `visible`, `sort_order`, `published_at`, `published_by`. Lecture publique : uniquement `visible = true`. Ne rien publier de confidentiel (la table est lisible par quiconque connaît l'adresse de l'appli).
La copie d'une séance ne garde que les rubriques utiles aux joueurs (objectif, fonctionnement, consignes, réalisation, critères de réussite, comportements attendus) et les dessins des schémas ; les notes coach (vigilance, corrections, variantes…) ne sont pas publiées. Les jeux ludiques et le renforcement musculaire ne publient pour l'instant que ces rubriques texte (pas le détail des règles ni des mouvements).

### Questions des joueurs (z27)
Table `questions_joueurs` (migration `z27_questions_joueurs`). Le public ne peut lire que les questions `publiee` et seulement les colonnes : id, question, status, answer_text, answer_youtube, answer_title, answer_drawings, published_at (jamais `player_name` ni `player_code`). Il ne peut pas écrire : une question se pose via la fonction `poser_question(p_code, p_question)` (vérifie que le code joueur existe, max 3 questions en attente, 3 à 300 caractères). Seuls les liens YouTube sont acceptés comme vidéo. Les réponses sont toujours affichées sans nom.

### Chantier z28 : sécurité de `players` (à faire, accord du 5 novembre)
Constat : l'appli lit `players` en accès public à une vingtaine d'endroits (connexion joueur, listes de noms, présences, compositions, stats) et la table expose `device_token`. Fermer la lecture d'un coup casserait la connexion des joueurs. Plan : remplacer chaque lecture publique par des fonctions serveur (connexion par code, liste de noms sans `device_token`, etc.), tester, puis retirer la politique « public read players ». Même chantier : vérifier le code d'accès de l'Espace Joueurs côté serveur (aujourd'hui lisible dans `app_settings`). SQL montré avant application.

### Sécurité joueurs : état après z28a
Migrations appliquées : `z28a_fonctions_joueur` et `z28a_fix_norm`. Fonctions serveur (accessibles au public, elles ne renvoient jamais le `device_token`) : `joueur_connexion(code, token)`, `joueur_reclamer(code, prénom, token)`, `joueur_debloquer(code, prénom, token)` (prénom comparé côté serveur), `joueur_adopter(code, token)`, `joueur_role(code, token, rôle)` (rôles `joueur` / `gb`), `ej_code_requis()`, `ej_verifier_code(code)`. Règle ajoutée : `players_coach_select` (lecture complète pour les coachs connectés). Dans l'appli, l'appel se fait par `sbRpc(nom, arguments)` (`js/02-etat-supabase.js`).
z28b (6 novembre) a fermé : « public read players », « public claim player », et la lecture publique du code d'accès et de `coach_cfg_*`.
Toujours ouvert : la table `completions` (lecture, insertion et modification publiques ; elle contient les codes joueurs) ; les vues `presence_stats_global` et `objectif_progress_avg` (SECURITY DEFINER) ; changer les anciens mots de passe coach.
Retour arrière de z28b si un écran est vide : `create policy "public read players" on public.players for select using (true);` puis, si besoin, `create policy "public claim player" on public.players for update using (claimed_at is null) with check (true);` et, pour `app_settings`, `drop policy app_settings_public_read on public.app_settings; create policy app_settings_public_read on public.app_settings for select using (true);`.
z29, étape 1 (faite, migrations `z29a_fonctions_completions` et `z29a_revoke_helpers`) : fonctions `joueur_valider_seance(code, token, séance, difficulté, modifier_difficulté)` et `joueur_seances_faites(code, token)`, règle `completions_coach_select`. Étape 2 (à faire après test de z29) : `drop policy "public read completions"`, `"public insert completions"`, `"public update completions"` sur `public.completions`. Retour arrière : recréer ces trois règles (`for select using (true)`, `for insert with check (true)`, `for update using (true) with check (true)`). Note : sur Supabase, `revoke ... from public` ne suffit pas à retirer le droit d'`anon` sur une fonction : révoquer aussi `from anon, authenticated` pour les fonctions internes (`_joueur_ok`, `_norm`).

### Suivi des lectures (z31)
Table `vues_contenus(contenu_id, player_code, nb_vues, premiere_vue, derniere_vue)` (migration `z31_vues_contenus`). Une **lecture** = un joueur connecté ouvre un contenu publié ; une **relecture** = toute ouverture après la première par le même joueur (relectures = lectures − 1). Enregistré par la fonction `joueur_vue_contenu(code, token, contenu)` (vérifie code + appareil ; ignore COACHTEST). Lisible par les coachs seulement. Les joueurs sans code ne sont pas comptés. « Dépublier » = `visible = false` (les statistiques sont conservées ; « Republier » remet `visible = true`). Un schéma intégré à l'appli (sans identifiant) est retrouvé par `payload.src_key`, ou par son titre d'origine pour les anciennes copies.


### Retour en arrière z35 (SQL)
`alter table matches drop column url_ffhb;` (la fonction sync-matches v7 enverrait alors une colonne inconnue : redéployer la v6 sans `url_ffhb` si besoin).


### Matchs & Stats (z37) — base de données et serveur
- **Colonnes ajoutées à `matches`** : `ext_rencontre_id`, `fdm_code`, `mi_temps` (`{nous,eux}`), `journee`, `phase`, `tiers_done`. Les tiers-temps sont rangés dans `score_periodes` (`[{nous,eux}×3]`), déjà utilisé par la fenêtre de détail de l'accueil.
- **Tables** : `ffhb_sources` (liens FFHandball par équipe 1 ou 2 ; plusieurs possibles, ex. poule + barrages), `poule_matches` (tous les matchs d'une poule, pour le classement), `sync_log` (journal des mises à jour). Droits : coachs connectés seulement (aucun accès anonyme) ; la fonction serveur écrit avec sa clé de service.
- **Fonction serveur `ffhb-sync`** (copie du code dans `serveur/ffhb-sync/`) : modes `preview` (vérifie un lien) et `sync` (met à jour). Réservée aux coachs connectés. Lit les pages `ffhandball.fr` (balises `smartfire-component`), les journées de la poule, puis les feuilles de match PDF (`fdm.fdme.ffhandball.fr`) pour les tiers-temps : **16 feuilles au maximum par passage** (relancer « Mettre à jour » pour la suite), arrêt propre à 110 s. Notre équipe est reconnue par le nom du club (« CLERMONT SALAGOU ») et le numéro d'équipe.
- **Fonction `sync-matches`** (v7, inchangée dans son rôle) : calendrier de l'appli, lancée à chaque ouverture de l'accueil ; enregistre aussi l'adresse du match (`url_ffhb`).
- **Réglages en base** (non lisibles sans connexion coach) : `coach_cfg_tabs` (organisation des onglets), `coach_cfg_bareme` (barème de points).
- **Règle de points** (corrigée en z39 d'après le règlement FFHandball « -15 ans Régional ») : une seule fonction `msPts` (`js/23-matchs-stats.js`) : victoire 3, nul 2, défaite 1, + 1 par tiers-temps gagné (pas de tiers-temps nul : but en or). Forfait/pénalité (0 pt) non géré. Barème modifiable (clé `coach_cfg_bareme` : tier, win, draw, lose).
- **Stats des joueurs (z40)** : tables `ffhb_joueurs` (licence → nom, numéro, `player_code` = fiche de l'appli, à valider une fois) et `player_match_stats` (une ligne par joueur et par match : buts, buts_7m, tirs = total buts compris, arrets, avertissements, deux_min, disqualifications, commotions, autres = actions non classées). Colonne `poule_matches.joueurs_done`. Lecture : `parseFeuilleJoueurs` dans `serveur/ffhb-sync/lib.ts` (tableau page 1 + déroulé pages suivantes, croisés ; la valeur du tableau est gardée et l'écart signalé). Pour relire toutes les feuilles après une correction du lecteur : appeler la fonction avec `{ "mode": "sync", "refaire_joueurs": true }`. Un 7 m manqué s'écrit « Tir » sur la feuille : il compte comme un tir manqué (le détail « dont X 7 m » ne porte donc que sur les 7 m marqués). Non vérifié faute d'exemple : disqualification, carton rouge/bleu (libellé exact inconnu : ces actions apparaissent dans « non classées »). Retour en arrière : `drop table player_match_stats; drop table ffhb_joueurs; alter table poule_matches drop column joueurs_done;` puis redéployer l'ancienne fonction (z37).
- **Nouveau lien FFHandball** (autre poule, tour suivant) : Matchs & Stats › ⚙️ Liens FFHandball et barème › Ajouter un lien.
- **Retour en arrière (SQL)** : `drop table public.poule_matches, public.sync_log, public.ffhb_sources;` puis `alter table public.matches drop column ext_rencontre_id, drop column fdm_code, drop column mi_temps, drop column journee, drop column phase, drop column tiers_done;`
- **Non vérifié sur de vraies pages** (le réseau de l'espace de travail de développement est bloqué vers ffhandball.fr) : la lecture des pages FFHandball et des PDF. Les fonctions de lecture sont testées sur des données simulées (`serveur/ffhb-sync/`). Premier test réel : « Mettre à jour » dans Matchs & Stats.
- **Ajouter un onglet au coach** : ajouter son bouton dans `index.html` (`cs-subtab-<id>`), son contenu (`cs-box-<id>`), l'entrée dans `coachSubtabSwitch` (`js/05`) et dans `TB_TABS` (`js/24`).
