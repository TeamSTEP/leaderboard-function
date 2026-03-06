# Simple Leaderboard Function

This is a basic online leaderboard function made with Supabase.
This code is mainly meant to be used with our project, Meltdown.

## Usage

Submit a new player score:

```bash
curl -X POST <PUBLIC_URL>/functions/v1/leaderboard?playerName=<name of player> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>" \
  -d '{"playerScore": 4200}'
```

Expected response:

```json
{
  "data": {
    "id": 4,
    "player_name": "Alice",
    "score": "4200",
    "created_at": "2026-03-06T12:56:01.586709+00:00"
  }
}
```

Get the list of scores for the given player:

```bash
curl -X GET <PUBLIC_URL>/functions/v1/leaderboard?playerName=Alice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>"
```

Expected response:

```json
{
  "player_name": "Alice",
  "total_entries": 3,
  "scores": [
    {
      "id": 6,
      "score": "3287",
      "created_at": "2026-03-06T12:57:42.687683+00:00"
    },
    {
      "id": 5,
      "score": "5436547",
      "created_at": "2026-03-06T12:57:39.895705+00:00"
    },
    {
      "id": 4,
      "score": "4200",
      "created_at": "2026-03-06T12:56:01.586709+00:00"
    }
  ]
}
```

Get the list of top five player scores:

```bash
curl -X GET <PUBLIC_URL>/functions/v1/leaderboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>"
```

Expected response:

```json
{
  "top_five": [
    {
      "player_name": "Team STEP",
      "best_score": "353465437"
    },
    {
      "player_name": "No U",
      "best_score": "34634572"
    },
    {
      "player_name": "Your mom",
      "best_score": "34621365"
    },
    {
      "player_name": "yoyo",
      "best_score": "10967611"
    },
    {
      "player_name": "Alice",
      "best_score": "5436547"
    }
  ]
}
```

Change the name of the player:

```bash
curl -X PATCH <PUBLIC_URL>/functions/v1/leaderboard?playerName=<name of the player> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>" \
  -d '{"newPlayerName": "Goob"}'
```

Expected response:

```json
{
  "message": "Player \"Hoon\" successfully renamed to \"Goob\".",
  "updated_entries": 1
}
```

Remove a player:

```bash
curl -X PATCH <PUBLIC_URL>/functions/v1/leaderboard?playerName=<name of the player> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>"
```

Expected response:

```json
{
  "message": "Player \"Hoon\" and all their scores have been removed.",
  "deleted_entries": 1
}
```

## Supabase Project Commands

These are some commonly used commands for working with Supabase.

```bash
# login
supabase login

# db schema update
supabase db diff -f name_of_the_change

# start supabase project locally
supabase start

# list access keys
supabase secrets list

# clear all local db
supabase db reset

# apply the db migration locally
supabase migration up

# serve the edge functions locally with logs
supabase functions serve

# deploy the database to production
supabase db push
```