export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const json = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

const DEFAULT_COUNT = 5;
const MAX_COUNT = 50;



export const parseCount = (raw: string | null): number => {
  const n = raw !== null ? parseInt(raw, 10) : DEFAULT_COUNT;
  if (isNaN(n) || n < 1) return DEFAULT_COUNT;
  return Math.min(n, MAX_COUNT);
};

export const isValidString = (input: unknown): string | false => {
  if (input && typeof input === "string" && input.trim() !== "") {
    return input.trim();
  }
  return false;
}

// PostgreSQL bigint range: -9223372036854775808 to 9223372036854775807
const BIGINT_MAX = 9223372036854775807n;
const BIGINT_MIN = -9223372036854775808n;

export const parseScore = (raw: unknown): string => {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      throw new Error("`playerScore` must be a finite number.")
    }
    if (!Number.isInteger(raw)) {
      throw new Error("`playerScore` must be an integer, not a float");

    }
    if (!Number.isSafeInteger(raw)){
      throw new Error(
        `\`playerScore\` exceeds Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}). ` +
        `Pass it as a numeric string instead to avoid precision loss.`,
      );
    }
    return String(raw);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error(
        "`playerScore` string must contain only digits (with an optional leading minus sign).",
      );
    }

    const asBigInt = BigInt(trimmed);

    if (asBigInt > BIGINT_MAX || asBigInt < BIGINT_MIN) {
      throw new Error(
        `\`playerScore\` is outside the PostgreSQL bigint range (${BIGINT_MIN} to ${BIGINT_MAX}).`,
      )
    }

    return trimmed;
  }

  throw new Error("`playerScore` is required and must be a number or numeric string.")
}