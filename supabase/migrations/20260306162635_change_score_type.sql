drop function if exists "public"."get_top_n_players"(n integer);

alter table "public"."leaderboard" alter column "score" set data type bigint using "score"::bigint;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_n_players(n integer DEFAULT 5)
 RETURNS TABLE(player_name text, best_score bigint)
 LANGUAGE sql
 STABLE
AS $function$
  select
    l.player_name,
    max(l.score) as best_score
  from leaderboard l
  group by l.player_name
  order by best_score desc
  limit n;
$function$
;


