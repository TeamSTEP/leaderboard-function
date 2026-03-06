create table if not exists "leaderboard" (
    "id" bigint generated always as identity primary key,
    "player_name" text not null,
    "score" integer not null default 0,
    "created_at" timestamptz not null default now()
);

create index if not exists idx_leaderboard_player
    on "leaderboard" (player_name);

create index if not exists idx_leaderboard_score
    on "leaderboard" (score desc);


alter table "leaderboard" enable row level security;

create policy "Public read leaderboard"
    on "leaderboard"
    for select
    using (true);

create or replace function get_top_five_players()
returns table (player_name text, best_score integer)
language sql
stable
as $$
  select
    l.player_name,
    max(l.score) as best_score
  from leaderboard l
  group by l.player_name
  order by best_score desc
  limit 5;
$$;
