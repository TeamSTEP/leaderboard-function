// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as utils from "./utils.ts";
import { PostBody, ScoreRow, TopPlayer } from "./types.ts";

console.log("Hello from Functions!");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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
      default:
        return utils.json({ error: "Method not allowed" }, 405);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return utils.json({ error: message }, 500);
  }
});

const handlePost = async (req: Request): Promise<Response> => {
  const body: Partial<PostBody> = await req.json();
  const { playerName, playerScore } = body;

  if (
    !playerName || typeof playerName !== "string" || playerName.trim() === ""
  ) {
    return utils.json({
      error: "`playerName` is required and must be a non-empty string.",
    }, 400);
  }
  if (playerScore === undefined || typeof playerScore !== "number") {
    return utils.json({
      error: "`playerScore` is required and must be a number.",
    }, 400);
  }

  const { data, error } = await supabase.from("leaderboard").insert({
    player_name: playerName.trim(),
    score: playerScore,
  }).select("id, player_name, score, created_at").single<ScoreRow>();

  if (error) throw error;

  return utils.json({ data }, 201);
};

const handleGet = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const playerName = url.searchParams.get("playerName")?.trim();

  if (playerName) {
    return await getPlayerScores(playerName);
  }

  return await getTopFive();
};

const getPlayerScores = async (playerName: string): Promise<Response> => {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, score, created_at")
    .eq("player_name", playerName)
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!data || data.length === 0) {
    return utils.json(
      { error: `No scores found for player "${playerName}".` },
      404,
    );
  }

  return utils.json({
    player_name: playerName,
    total_entries: data.length,
    scores: data,
  });
};

const getTopFive = async (): Promise<Response> => {
  const { data, error } = await supabase.rpc("get_top_five_players");

  if (error) throw error;

  return utils.json({ top_five: data as TopPlayer[] });
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/leaderboard' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
