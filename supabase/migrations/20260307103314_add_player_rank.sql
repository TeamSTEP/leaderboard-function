set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_player_scores(p_player_name text, p_count integer DEFAULT 5)
 RETURNS TABLE(id bigint, score text, rank bigint, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
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
$function$
;


