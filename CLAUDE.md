# CLAUDE.md — Prépa U15 HBCCS (PWA des coachs et des joueurs U15)

Ce fichier est lu automatiquement au début de chaque session. Il donne le cadre pour travailler **seul, sans que Stephen ait à tout réexpliquer**. Le détail technique complet est dans `LISEZ-MOI.md` (carnet du projet : carte des fichiers, règles, historique des versions zNN) : le lire en entier avant de coder.

## 1. Qui est Stephen, comment travailler avec lui
- Ostéopathe et coach HBCCS (U15, équipes 1 et 2). **Aucune compétence en code** : tu es son « prof de développeur ». Explique en mots simples (analogies avec son appli), il doit pouvoir comprendre et vérifier.
- **Réponses en français, directes, concises, honnêtes et critiques** (pas de validation complaisante : dis ce qui est fragile, incertain ou inutile).
- **Jamais de Terminal ni de ligne de commande à lui demander** : uniquement des clics (GitHub, Netlify, Supabase, l'appli).
- Appareils : iPhone 15, iPad 13", MacBook Pro, vieille Galaxy Tab A (Android 8.1). Tout doit marcher sur ces quatre.
- 4 comptes coachs : stephen, sandrine, arthur, nicolas.

## 2. Règles de travail (non négociables)
1. **Plan d'abord, code après son « go ».** Pour toute modification de code : propose un plan court (ce qui change, ce qui ne change pas, risques) et attends son accord. Les aperçus visuels (maquette) se valident avant de coder l'interface.
2. **SQL : « ok sql » plus exigé (décision de Stephen, 18/11/2026)** : il valide ce que je code et corrigera en cas d'erreur. Je peux donc appliquer les migrations, mais : vérifier l'identifiant du projet Supabase avant d'écrire (`cponudkorfxtwptwtulq`), tester dans une transaction annulée (`rollback`) quand c'est possible, **demander quand même avant tout ce qui est destructif ou irréversible** (suppression de données, `drop table`, écrasement), et résumer en une phrase simple ce qui a été fait. Lectures (SELECT) libres.
3. **Branche `dev` uniquement. Ne jamais toucher `main`.** Netlify déploie `dev` (`dev--u15-gladiator-prepa.netlify.app`).
4. **Aucun secret** (mots de passe, clés de service) dans le code, dans ce fichier ou dans le LISEZ-MOI. La clé « publishable » Supabase du code est publique par conception ; la sécurité repose sur les règles RLS (données de mineurs : prudence).
5. **Une livraison = une version** : changer `js/00-version.js` (`APP_VERSION` zNN + date), ajouter l'entrée dans `LISEZ-MOI.md` (journal + ligne du tableau des fichiers), ajouter le fichier en tête de modification (« dernière modification : version zNN (jj/mm/aaaa) »).
6. **Tester avant de livrer** (voir § 6) et dire honnêtement ce qui n'a pas pu être testé (vrai appareil, vraies données FFHB).
7. Après chaque livraison, dire à Stephen en 3 lignes : ce qui change, ce qu'il doit faire (ex. « Mettre à jour » dans Analyse), les limites connues.

### Comment livrer maintenant
- Depuis le 16/11/2026 l'appli GitHub de Claude est autorisée : **pousser directement sur `dev`** (commit + push) au lieu d'envoyer un zip. Message de commit en français, court, `zNN — sujet`.
- Stephen vérifie ensuite : attendre 1-2 min (build Netlify), recharger de force (Cmd+Maj+R), contrôler la version affichée en bas à droite de l'accueil.
- Si le push est impossible, repli : zip cumulatif `prepa-u15-zNN.zip` envoyé à Stephen (index.html, sw.js si modifié, css/, js/, LISEZ-MOI.md), qu'il dépose par GitHub › Add file › Upload files sur `dev` (vérifier l'absence de `.DS_Store`).
- Les fichiers parasites à la racine du dépôt (`style.css`, `00-version.js`, `05-espace-coachs.js`, `22-questions-joueurs.js`) sont d'anciens doublons : ne pas s'en servir, ne les supprimer qu'avec son accord.

## 3. Architecture en bref
- PWA sans compilation : `index.html` + `css/style.css` + `js/NN-nom.js` (scripts **classiques**, pas de modules), chargés dans l'ordre de `index.html`. **`19-init.js` reste le dernier.** Tout nouveau script : balise dans `index.html` **et** chemin dans `APP_SHELL` de `sw.js` (`CACHE_NAME 'prepa-u15-hbccs-v2'`).
- Les boutons appellent des fonctions globales (`onclick="..."`). Préfixer ses fonctions (`an…` pour Analyse, `ms…` Matchs & Stats, `home…` accueil) pour éviter les collisions : **vérifier avec Grep qu'un nom n'existe pas déjà** (une collision `anKey` a déjà failli casser Analyse).
- **Vieux navigateurs (Galaxy Tab)** dans le code nouveau : pas de `?.`, `??`, `replaceAll`, `.at(`, ni de propriété CSS `inset:`. Écrire en concaténation de chaînes ; `Object.assign` autorisé.
- Couleurs : variables CSS (`--jaune`, `--bleu`, `--gris-fonce`, `--noir`…), pas de couleur écrite en dur. Textes d'interface compréhensibles par un enfant de 10 ans.
- Dates : `dateStr()` / `monthFirstStr()` (heure locale), jamais `.toISOString()` pour un jour.
- Échapper tout texte inséré en HTML (`msEsc`) ; texte dans un SVG : `escapeSvgText()`. Dans un `onclick`, ne jamais passer de nom d'équipe (apostrophes : L'ISLE-JOURDAIN) : passer un index ou un identifiant.
- Session coach : `coachSession`, `ensureCoachSession()`, `coachAuthHeaders()` pour tout appel Supabase réservé aux coachs. Lecture publique : `SB_HEADERS`. Réglages d'appli : table `app_settings` (écriture coach avec `Prefer: resolution=merge-duplicates` et `on_conflict=key`).
- Page **Réglages** : toute option nouvelle va dans une catégorie existante (`<details class="rg-cat">`) ; chaque option est un interrupteur.

## 4. Supabase (projet `cponudkorfxtwptwtulq`)
- Outils MCP Supabase disponibles : `execute_sql` (renvoie seulement le résultat de la **dernière** requête : une requête par appel), `apply_migration` (DDL, après « ok sql »), `list_tables`, `get_advisors`, `query_logs` (paramètre `sql`), `get_edge_function`, `deploy_edge_function`.
- PostgREST plafonne à **1000 lignes** par réponse : paginer (`limit`/`offset`) pour `adv_player_match_stats` (~1700+ lignes).
- Tables d'analyse : `ffhb_sources` (id, equipe 1/2 ou null, url, label, active, role `nous`/`analyse`, last_sync_*), `poule_matches` (matchs de toutes les poules lues : scores, mi-temps, tiers-temps `t1_1…t3_2`, `fdm_code`, `forfait`, `tiers_done`, `joueurs_done`), `adv_player_match_stats` (joueurs ADVERSES par feuille : buts, 7 m, tirs, arrêts, sanctions), `match_notes` (notes forts/faibles des coachs : team_key, cote eux/nous, type fort/faible, tag, texte, auteur). Nos joueurs : `player_match_stats` + `ffhb_joueurs` (écran « Stats des matchs », inchangé). RLS : `auth.uid() in (select id from coaches)`.
- Matchs du calendrier de l'appli : `matches` (`debut` et `ics_uid` NOT NULL). Journal de synchro : `sync_log` (`ran_at`).
- **Fonction serveur `ffhb-sync`** (version 7 déployée, `verify_jwt` true, coachs seulement). **La version déployée dans Supabase fait foi** : la copie de `serveur/ffhb-sync/` dans ce dépôt est à jour en z65 (copie fidèle de la v7). Avant toute modification, la relire avec `get_edge_function`, et au redéploiement renvoyer **tous** les fichiers (`index.ts` + `lib.ts`). Modes : `{mode:'preview', url}` et `{mode:'sync', equipe?, source_id?, feuilles?:false, feuilles_only?:true, refaire_joueurs?}`.
- **Erreur 546** = temps processeur dépassé (~2 s) : c'est pourquoi la synchro lit une poule par appel puis les feuilles PDF par petits lots (`PDF_BUDGET=16`, `CPU_BUDGET_MS=900`), enchaînés par le client (`msSync`, `anSync`).
- Ni le shell ni WebFetch n'atteignent ffhandball.fr : seule la fonction serveur lit la FFHB. Pour tester un lien de poule, passer par l'écran (Analyse › poules de suivi : contrôle « preview »).
- Les identifiants d'équipe FFHB **changent d'une phase à l'autre** : rapprocher les équipes par nom normalisé (majuscules, sans accents ni parenthèses).

## 5. État du produit (au 16/11/2026 — version z65 déployée)
- Phase 2 : équipe 1 = « 2e phase — D2 — poule A » (poule-201265) ; équipe 2 = « 2e phase — D4 — poule F » (poule-201278). Poules de **suivi** (role analyse) = phase 1 des adversaires, pour connaître leur niveau (D1 poule C, D2 poules D et F, D3 poule C, D3 poule de Saleilles poule-193508…).
- **Matchs & Stats** : seulement nos équipes 1 et 2. **Analyse** (carte 🔬 sur l'accueil, visible par le coach qui l'a cochée dans Réglages › Analyse ; clé `analyse_card_<login>` dans `app_settings`) : **une seule page** (cartes équipe 1/2 → prochain adversaire, bande d'écussons de la poule, duel nous/eux avec probabilités, tuiles) puis **fiche équipe** (onglets Vue d'ensemble / Joueurs / Calendrier / Face à nous / Notes), page « Notre équipe ». Code : `js/25-analyse.js` (modèle `anBuild`/`anStats`, vues, notes).
- Accueil coach : cartes « prochain match » lisent aussi les poules de phase 2 (matchs datés puis « Date à confirmer · Jn »), seulement CLERMONT SALAGOU de l'équipe 1/2.
- Caveats à toujours rappeler : équipes sans données (ex. la plupart de la poule F) = « pas de données » ; niveaux D1/D2/D3 mélangés dans les comparaisons ; sous 4 matchs lus = peu fiable ; réussite aux 7 m et « buts de 1re vague » non calculables (un 7 m manqué est écrit « Tir »).

## 6. Tester (méthode éprouvée)
- Playwright + Chromium sont préinstallés (`NODE_PATH=$(npm root -g)`). Servir le dossier du site avec `python3 -m http.server <port>` (un **nouveau port à chaque essai**, puis `pkill -f "http.server <port>"`).
- Simuler Supabase par `page.route('**/*')` (renvoyer du JSON pour `/rest/v1/...`, répondre aux OPTIONS avec les en-têtes CORS) ; ouvrir une session coach par `page.evaluate` : `coachSession={access_token:'x',refresh_token:'y',expires_at:Date.now()+3600000,login:'stephen',name:'Stephen',id:'u1'}; saveCoachSession(); loadAppSettings();`.
- Vérifier : aucune erreur JS (`pageerror`), rendu **ordinateur (1280 px) et téléphone (390 px)** avec captures (`deviceScaleFactor` 2 pour celles qu'on montre à Stephen), et relire la capture avant de livrer.
- Syntaxe rapide d'un script : `node -e "new Function(require('fs').readFileSync('js/25-analyse.js','utf8').replace(/^const /m,'var '))"`.
- Pas de test sur vrai appareil possible : le dire.

## 7. Feuille de route et chantiers en attente
**Analyse (prochains)**
- **Fait en z58** : probabilités de victoire (cotes en buts reliées entre poules, confiance peu fiable/moyenne/correcte), Analyse réorganisée, un seul bouton « Mettre à jour » par écran. À surveiller : réglage de `AN_LAMBDA` / écart-type si les pourcentages paraissent trop tranchés une fois la phase 2 avancée.
- Onglets Joueurs / Comparatif / Historique (nous vs eux côte à côte), clés du match plus fines, liens de poules de phase 1 manquants (poule F), synchro automatique quotidienne (recommandée).
**Dette / backlog**
- Refonte de la carte « Mes matchs » ; plantage non diagnostiqué sur la Galaxy Tab ; politiques publiques de `completions` à retirer ; vues SECURITY DEFINER à auditer ; fichiers parasites à la racine ; `.gitignore` ; taille de la poignée de rotation sur vrai téléphone ; barre flottante iPhone non vérifiée ; copie de `serveur/ffhb-sync/` à remettre à jour dans le dépôt ; deux migrations Supabase préparées jamais appliquées (voir LISEZ-MOI § 7).

## 8. Autre dépôt lié
`Stephen-prepa/analyse-handball` : outil personnel d'**analyse vidéo** (autre projet, autre `CLAUDE.md`). Il lit les matchs et effectifs de la même base Supabase (même projet : une modification de structure ici peut casser là-bas — prévenir Stephen).
