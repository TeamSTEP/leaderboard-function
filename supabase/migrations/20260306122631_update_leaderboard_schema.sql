set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_five_players()
 RETURNS TABLE(player_name text, best_score integer)
 LANGUAGE sql
 STABLE
AS $function$
  select
    l.player_name,
    max(l.score) as best_score
  from leaderboard l
  group by l.player_name
  order by best_score desc
  limit 5;
$function$
;


