alter table "public"."leaderboard" drop column "updated_at";

alter table "public"."leaderboard" add column "created_at" timestamp with time zone not null default now();

CREATE INDEX idx_leaderboard_player ON public.leaderboard USING btree (player_name);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.upsert_score(p_name text, p_score integer)
 RETURNS TABLE(player_name text, score integer)
 LANGUAGE sql
AS $function$
    insert into leaderboard (player_name, score, created_at)
    values (p_name, p_score, now())
    on conflict (player_name)
    do update
        set score = greatest(leaderboard.score, excluded.score),
            created_at = now()
    returning leaderboard.player_name, leaderboard.score;
$function$
;


