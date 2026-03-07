create table if not exists "leaderboard" (
    "id" bigint generated always as identity primary key,
    "player_name" text not null,
    "score" bigint not null default 0,
    "created_at" timestamptz not null default now()
);

create index if not exists idx_leaderboard_player
    on "leaderboard" (player_name);

create index if not exists idx_leaderboard_score
    on "leaderboard" (score desc);


alter table "leaderboard" enable row level security;

create policy "Public read leaderboard"
    on "leaderboard" for select
    using (true);

alter table "leaderboard"
    alter column "score" type bigint using score::bigint;

create or replace function get_player_scores(
    p_player_name text,
    p_count integer default 5
)
returns table (
    id bigint,
    score text,
    rank bigint,
    created_at timestamptz
)
language sql
stable
as $$
    with globally_ranked as (
        select
            id,
            player_name,
            score::text as score,
            rank() over (order by score desc) as rank,
            created_at
        from leaderboard
    )
    select
        id,
        score,
        rank,
        created_at
    from globally_ranked
    where player_name = p_player_name
    order by created_at desc
    limit p_count;
$$;

-- get top n players
create or replace function get_top_n_players(n integer default 5)
returns table (player_name text, best_score bigint)
language sql
stable
as $$
  select
    l.player_name,
    max(l.score) as best_score
  from leaderboard l
  group by l.player_name
  order by best_score desc
  limit n;
$$;
