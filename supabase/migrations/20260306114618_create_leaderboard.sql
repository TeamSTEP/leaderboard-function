
  create table "public"."leaderboard" (
    "id" bigint generated always as identity not null,
    "player_name" text not null,
    "score" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."leaderboard" enable row level security;

CREATE INDEX idx_leaderboard_score ON public.leaderboard USING btree (score DESC);

CREATE UNIQUE INDEX leaderboard_pkey ON public.leaderboard USING btree (id);

CREATE UNIQUE INDEX leaderboard_player_name_key ON public.leaderboard USING btree (player_name);

alter table "public"."leaderboard" add constraint "leaderboard_pkey" PRIMARY KEY using index "leaderboard_pkey";

alter table "public"."leaderboard" add constraint "leaderboard_player_name_key" UNIQUE using index "leaderboard_player_name_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.upsert_score(p_name text, p_score integer)
 RETURNS TABLE(player_name text, score integer)
 LANGUAGE sql
AS $function$
    insert into leaderboard (player_name, score, updated_at)
    values (p_name, p_score, now())
    on conflict (player_name)
    do update
        set score = greatest(leaderboard.score, excluded.score),
            updated_at = now()
    returning leaderboard.player_name, leaderboard.score;
$function$
;

grant delete on table "public"."leaderboard" to "anon";

grant insert on table "public"."leaderboard" to "anon";

grant references on table "public"."leaderboard" to "anon";

grant select on table "public"."leaderboard" to "anon";

grant trigger on table "public"."leaderboard" to "anon";

grant truncate on table "public"."leaderboard" to "anon";

grant update on table "public"."leaderboard" to "anon";

grant delete on table "public"."leaderboard" to "authenticated";

grant insert on table "public"."leaderboard" to "authenticated";

grant references on table "public"."leaderboard" to "authenticated";

grant select on table "public"."leaderboard" to "authenticated";

grant trigger on table "public"."leaderboard" to "authenticated";

grant truncate on table "public"."leaderboard" to "authenticated";

grant update on table "public"."leaderboard" to "authenticated";

grant delete on table "public"."leaderboard" to "service_role";

grant insert on table "public"."leaderboard" to "service_role";

grant references on table "public"."leaderboard" to "service_role";

grant select on table "public"."leaderboard" to "service_role";

grant trigger on table "public"."leaderboard" to "service_role";

grant truncate on table "public"."leaderboard" to "service_role";

grant update on table "public"."leaderboard" to "service_role";


  create policy "Public read leaderboard"
  on "public"."leaderboard"
  as permissive
  for select
  to public
using (true);



