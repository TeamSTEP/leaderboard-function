# Simple Leaderboard Function

This is a basic online leaderboard function made with Supabase.
This code is mainly meant to be used with our project, Meltdown.

## Usage

Use any API clients, or curl like the following:

```bash
curl -X POST <PUBLIC_URL>/functions/v1/leaderboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <LOCAL_ANON_KEY>" \
  -d '{"playerScore": 4200}' # payload body in JSON
```

## Leaderboard API

Base URL: `/functions/v1/leaderboard`

All responses are JSON. All error responses follow the shape `{ "error": string }`.

---

## Endpoints

### `GET /` — Get top N players

Returns the top players on the leaderboard, ranked by their best (highest) score.

**Query Parameters**

| Parameter | Type    | Required | Default | Constraints      | Description                        |
|-----------|---------|----------|---------|------------------|------------------------------------|
| `count`   | integer | No       | `5`     | Min: 1, Max: 50  | Number of top players to return    |

**Responses**

| Status | Description        |
|--------|--------------------|
| `200`  | Success            |
| `500`  | Internal server error |

**`200` Response**
```json
{
  "count": 5,
  "top_players": [
    {
      "player_name": "Alice",
      "best_score": "98000"
    }
  ]
}
```

**`top_players` entry shape**

| Field         | Type   | Description                               |
|---------------|--------|-------------------------------------------|
| `player_name` | string | Player's name                             |
| `best_score`  | string | Player's all-time highest score (numeric string) |

---

### `GET /?playerName=` — Get scores for a player

Returns a list of score entries for a specific player, ordered newest first. Each entry includes the score's global rank across all leaderboard entries.

**Query Parameters**

| Parameter    | Type    | Required | Default | Constraints           | Description                            |
|--------------|---------|----------|---------|-----------------------|----------------------------------------|
| `playerName` | string  | Yes      | —       | Max: 64 chars         | The player's name to look up           |
| `count`      | integer | No       | `5`     | Min: 1, Max: 50       | Number of score entries to return      |

**Responses**

| Status | Description              |
|--------|--------------------------|
| `200`  | Success                  |
| `404`  | Player not found         |
| `500`  | Internal server error    |

**`200` Response**
```json
{
  "player_name": "Alice",
  "count": 5,
  "total_entries": 3,
  "scores": [
    {
      "id": 12,
      "score": "98000",
      "rank": 1,
      "created_at": "2026-03-07T09:00:00Z"
    }
  ]
}
```

**`scores` entry shape**

| Field        | Type   | Description                                        |
|--------------|--------|----------------------------------------------------|
| `id`         | number | Unique score entry ID                              |
| `score`      | string | Score value as a numeric string                    |
| `rank`       | number | Global rank of this score across all players       |
| `created_at` | string | ISO 8601 timestamp of when the score was recorded  |

---

### `POST /?playerName=` — Submit a score

Inserts a new score entry for a player.

**Query Parameters**

| Parameter    | Type   | Required | Constraints   | Description              |
|--------------|--------|----------|---------------|--------------------------|
| `playerName` | string | Yes      | Max: 64 chars | The player's name        |

**Request Body** (`application/json`)

| Field         | Type             | Required | Description                                                                                     |
|---------------|------------------|----------|-------------------------------------------------------------------------------------------------|
| `playerScore` | number \| string | Yes      | The score to record. Use a `number` for values ≤ `9007199254740991`. Use a numeric `string` for larger values to avoid precision loss. |

```json
{ "playerScore": 15000 }
```

```json
{ "playerScore": "99999999999999999999" }
```

**Responses**

| Status | Description                  |
|--------|------------------------------|
| `201`  | Score created successfully   |
| `400`  | Validation error             |
| `500`  | Internal server error        |

**`201` Response**

```json
{
  "data": {
    "id": 42,
    "player_name": "Alice",
    "score": "15000",
    "created_at": "2026-03-07T11:00:00Z"
  }
}
```

**`400` Error cases**

| Cause                                              | Error message                                                                             |
|----------------------------------------------------|-------------------------------------------------------------------------------------------|
| `playerName` missing or empty                      | `` `playerName` is required and must be a non-empty string. ``                            |
| `playerName` too long                              | `` `playerName` must not exceed 64 characters. ``                                         |
| `playerScore` missing or wrong type                | `` `playerScore` is required and must be a number or numeric string. ``                   |
| `playerScore` is a float                           | `` `playerScore` must be an integer, not a float. ``                                      |
| `playerScore` is a `number` above MAX_SAFE_INTEGER | `` `playerScore` exceeds Number.MAX_SAFE_INTEGER. Pass it as a numeric string instead. `` |
| `playerScore` is outside PostgreSQL `bigint` range | `` `playerScore` is outside the PostgreSQL bigint range. ``                               |

---

### `PATCH /?playerName=` — Rename a player

Renames a player across all their score entries.

**Query Parameters**

| Parameter    | Type   | Required | Constraints   | Description                        |
|--------------|--------|----------|---------------|------------------------------------|
| `playerName` | string | Yes      | Max: 64 chars | The player's current name          |

**Request Body** (`application/json`)

| Field           | Type   | Required | Constraints   | Description                  |
|-----------------|--------|----------|---------------|------------------------------|
| `newPlayerName` | string | Yes      | Max: 64 chars | The new name for the player  |

```json
{ "newPlayerName": "Bob" }
```

**Responses**

| Status | Description                              |
|--------|------------------------------------------|
| `200`  | Player successfully renamed              |
| `400`  | Validation error                         |
| `404`  | Player not found                         |
| `409`  | New name is already taken                |
| `500`  | Internal server error                    |

**`200` Response**

```json
{
  "message": "Player \"Alice\" successfully renamed to \"Bob\".",
  "updated_entries": 3
}
```

**`400` Error cases**

| Cause                                          | Error message                                                                  |
|------------------------------------------------|--------------------------------------------------------------------------------|
| `playerName` missing or empty                  | `` `playerName` is required and must be a non-empty string. ``                 |
| Either name exceeds 64 characters              | `` `playerName` must not exceed 64 characters. ``                              |
| Body is missing or not valid JSON              | `Request body is missing or is not valid JSON`                                 |
| `newPlayerName` missing or empty               | `` `newPlayerName` is required and must be a non-empty string. ``              |
| `newPlayerName` is the same as `playerName`    | `` `newPlayerName` must be different from the current player name. ``          |

---

### `DELETE /?playerName=` — Remove a player

Permanently deletes a player and all their score entries.

**Query Parameters**

| Parameter    | Type   | Required | Constraints   | Description                      |
|--------------|--------|----------|---------------|----------------------------------|
| `playerName` | string | Yes      | Max: 64 chars | The name of the player to remove |

**Responses**

| Status | Description                  |
|--------|------------------------------|
| `200`  | Player successfully removed  |
| `400`  | Validation error             |
| `404`  | Player not found             |
| `500`  | Internal server error        |

**`200` Response**

```json
{
  "message": "Player \"Alice\" and all their scores have been removed.",
  "deleted_entries": 3
}
```

**`400` Error cases**

| Cause                         | Error message                                         |
|-------------------------------|-------------------------------------------------------|
| `playerName` missing or empty | `` `playerName` query param is required. ``           |
| `playerName` too long         | `` `playerName` must not exceed 64 characters. ``     |

---

## Common error shapes

**`404` Not Found**

```json
{ "error": "Player \"Alice\" not found." }
```

**`409` Conflict** *(PATCH only)*

```json
{ "error": "Player name \"Bob\" is already taken." }
```

**`500` Internal Server Error**

```json
{ "error": "Unexpected error message" }
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
