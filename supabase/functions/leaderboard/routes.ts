import * as utils from "./utils.ts";
import { PostBody, ScoreRow, TopPlayer } from "./types.ts";
import { createClient } from "@supabase/supabase-js";
const MAX_NAME_LENGTH = 64;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// GET `/functions/v1/leaderboard?playerName=<player name>&count=<number of scores>`
// GET `/functions/v1/leaderboard?playerName=count=<number of scores>`
// GET `/functions/v1/leaderboard`
export const handleGet = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const playerName = utils.isValidString(url.searchParams.get("playerName"));
  const itemCount = utils.parseCount(url.searchParams.get("count"));

  if (playerName) {
    return await getPlayerScores(playerName, itemCount);
  }

  return await getTopN(itemCount);
};

// POST `/functions/v1/leaderboard?playerName=<current player name>`
// body: { "playerScore": number or string }
export const handlePost = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const playerName = utils.isValidString(url.searchParams.get("playerName"));

  const body: Partial<PostBody> = await req.json();
  const { playerScore } = body;

  if (
    !playerName
  ) {
    return utils.json({
      error: "`playerName` is required and must be a non-empty string.",
    }, 400);
  }

  if (playerName.length > MAX_NAME_LENGTH) {
    return utils.json(
      { error: "`playerName` must not exceed 64 characters." },
      400,
    );
  }

  let _score: string;
  try {
    _score = utils.parseScore(playerScore);
  } catch (err: unknown) {
    return utils.json({
      error: err instanceof Error ? err.message : JSON.stringify(err),
    }, 400);
  }

  const { data, error } = await supabase.from("leaderboard").insert({
    player_name: playerName,
    score: _score,
  }).select("id, player_name, score::text, created_at").single<ScoreRow>();

  if (error) throw error;

  return utils.json({ data }, 201);
};

// PATCH `/functions/v1/leaderboard?playerName=<current player name>`
// body: { "newPlayerName": "new name to change" }
export const handlePatch = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const playerName = utils.isValidString(
    url.searchParams.get("playerName")?.trim(),
  );

  if (!playerName) {
    return utils.json({
      error: "`playerName` is required and must be a non-empty string.",
    }, 400);
  }

  let body: { newPlayerName?: unknown };
  try {
    body = await req.json();
  } catch {
    return utils.json({
      error: "Request body is missing or is not valid JSON",
    }, 400);
  }

  const newPlayerName = utils.isValidString(body?.newPlayerName);
  if (!newPlayerName) {
    return utils.json({
      error: "`newPlayerName` is required and must be a non-empty string.",
    }, 400);
  }

  if (
    playerName.length > MAX_NAME_LENGTH ||
    newPlayerName.length > MAX_NAME_LENGTH
  ) {
    return utils.json(
      { error: "`playerName` must not exceed 64 characters." },
      400,
    );
  }

  if (newPlayerName === playerName) {
    return utils.json(
      {
        error:
          "`newPlayerName` must be different from the current player name.",
      },
      400,
    );
  }

  const { data: existing, error: lookupError } = await supabase.from(
    "leaderboard",
  ).select("id").eq("player_name", newPlayerName).limit(1).maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    return utils.json({
      error: `Player name "${newPlayerName}" is already taken.`,
    }, 409);
  }

  const { data, error } = await supabase.from("leaderboard").update({
    player_name: newPlayerName,
  }).eq("player_name", playerName).select("id");

  if (error) throw error;

  if (!data || data.length === 0) {
    return utils.json(
      { error: `Player "${playerName}" not found.` },
      404,
    );
  }

  return utils.json({
    message:
      `Player "${playerName}" successfully renamed to "${newPlayerName}".`,
    updated_entries: data.length,
  });
};

// DELETE `/functions/v1/leaderboard?playerName=<player to delete>`
export const handleDelete = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const playerName = utils.isValidString(url.searchParams.get("playerName"));

  if (!playerName) {
    return utils.json({
      error: "`playerName` query param is required.",
    }, 400);
  }

  if (playerName.length > MAX_NAME_LENGTH) {
    return utils.json(
      { error: "`playerName` must not exceed 64 characters." },
      400,
    );
  }

  const { data, error } = await supabase.from("leaderboard").delete().eq(
    "player_name",
    playerName,
  ).select("id");

  if (error) throw error;

  if (!data || data.length === 0) {
    return utils.json(
      { error: `Player "${playerName}" not found.` },
      404,
    );
  }

  return utils.json({
    message: `Player "${playerName}" and all their scores have been removed.`,
    deleted_entries: data.length,
  });
};

const getPlayerScores = async (
  playerName: string,
  count: number,
): Promise<Response> => {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, score::text, created_at")
    .eq("player_name", playerName)
    .order("created_at", { ascending: false })
    .limit(count);

  if (error) throw error;

  if (!data || data.length === 0) {
    return utils.json(
      { error: `No scores found for player "${playerName}".` },
      404,
    );
  }

  return utils.json({
    player_name: playerName,
    count,
    total_entries: data.length,
    scores: data as ScoreRow[],
  });
};

const getTopN = async (count: number): Promise<Response> => {
  const { data, error } = await supabase.rpc("get_top_n_players", { n: count });

  if (error) throw error;

  return utils.json({ count, top_players: data as TopPlayer[] });
};
