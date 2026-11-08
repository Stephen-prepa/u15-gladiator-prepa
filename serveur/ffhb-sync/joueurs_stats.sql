-- z40 : stats individuelles des joueurs depuis les feuilles de match FFHandball
-- Un joueur est identifié par son numéro de licence (présent sur la feuille). On ne garde QUE les joueurs de notre club.

-- 1) Les joueurs vus sur les feuilles (licence -> nom, numéro) + le lien vers ta fiche joueur de l'appli (à valider une fois dans l'écran)
create table public.ffhb_joueurs (
  licence     text primary key,
  nom         text not null,
  numero      smallint,
  player_code text references public.players(code) on delete set null,
  created_at  timestamptz not null default now()
);

-- 2) Une ligne par joueur et par match
create table public.player_match_stats (
  id                uuid primary key default gen_random_uuid(),
  fdm_code          text not null,
  ext_rencontre_id  text,
  match_date        timestamptz,
  equipe            smallint,
  licence           text not null references public.ffhb_joueurs(licence) on delete cascade,
  numero            smallint,
  buts              int not null default 0,
  buts_7m           int not null default 0,
  tirs              int not null default 0,   -- total des tirs, buts compris (tirs manqués = tirs - buts)
  arrets            int not null default 0,
  avertissements    int not null default 0,
  deux_min          int not null default 0,
  disqualifications int not null default 0,
  commotions        int not null default 0,
  autres            jsonb,                     -- actions non classées (à vérifier)
  updated_at        timestamptz not null default now(),
  unique (fdm_code, licence)
);
create index player_match_stats_licence_idx on public.player_match_stats (licence);

-- 3) Marqueur « stats des joueurs lues » sur chaque match de poule
alter table public.poule_matches add column joueurs_done boolean not null default false;

-- 4) Sécurité : réservé aux coachs connectés (comme ffhb_sources)
alter table public.ffhb_joueurs enable row level security;
alter table public.player_match_stats enable row level security;
create policy ffhb_joueurs_coach_all on public.ffhb_joueurs for all to authenticated
  using (auth.uid() in (select id from public.coaches)) with check (auth.uid() in (select id from public.coaches));
create policy player_match_stats_coach_all on public.player_match_stats for all to authenticated
  using (auth.uid() in (select id from public.coaches)) with check (auth.uid() in (select id from public.coaches));
revoke all on public.ffhb_joueurs from anon;
revoke all on public.player_match_stats from anon;

-- Retour en arrière (si besoin) :
--   drop table public.player_match_stats; drop table public.ffhb_joueurs; alter table public.poule_matches drop column joueurs_done;
