// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import * as utils from "./utils.ts";
import { PostBody, ScoreRow, TopPlayer } from "./types.ts";

console.log("Hello from Functions!");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MAX_NAME_LENGTH = 64;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: utils.corsHeaders });
  }

  try {
    switch (req.method) {
      case "POST":
        return await handlePost(req);
      case "GET":
        return await handleGet(req);
      case "PATCH":
        return await handlePatch(req);
      case "DELETE":
        return await handleDelete(req);
      default:
        return utils.json({ error: "Method not allowed" }, 405);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(message);
    return utils.json({ error: message }, 500);
  }
});

// GET `/functions/v1/leaderboard?playerName=<player name>&count=<number of scores>`
const handleGet = async (req: Request): Promise<Response> => {
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
const handlePost = async (req: Request): Promise<Response> => {
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
const handlePatch = async (req: Request): Promise<Response> => {
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
const handleDelete = async (req: Request): Promise<Response> => {
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/leaderboard' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
