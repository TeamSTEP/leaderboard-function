alter table "public"."leaderboard" drop constraint "leaderboard_player_name_key";

drop function if exists "public"."upsert_score"(p_name text, p_score integer);

drop index if exists "public"."leaderboard_player_name_key";


