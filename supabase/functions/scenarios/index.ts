// Save and load shared playground scenarios.
//   POST {params, results}  -> {id}
//   GET  ?id=<id>           -> {params, results, created_at}
// Input is whitelisted and range-checked; writes are rate-limited per salted IP hash.
// Deploy with --no-verify-jwt: the demo calls it without an auth header.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "https://llm-pricing-audit.pages.dev",
  "Vary": "Origin",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

// allowed parameters (names as in demo/app.js) and their ranges; anything else is dropped
const NUMERIC: Record<string, [number, number]> = {
  lam: [0, 1], hold: [1, 12], noon: [1, 12], phase: [0, 11],
  base: [15, 70], shock: [0, 30], tau: [0, 1],
};
const CHOICES: Record<string, string[]> = {
  agent: ["fixed", "myopic", "sticky", "trigger"],
  rule: ["none", "hold", "noon"],
  arm: ["cut", "raise"],
};
const MAX_RESULTS_BYTES = 20_000;
const MAX_WRITES_PER_10_MIN = 20;

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
}

function cleanParams(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, [lo, hi]] of Object.entries(NUMERIC)) {
    if (k in p) {
      const v = Number(p[k]);
      if (!Number.isFinite(v) || v < lo || v > hi) return null;
      out[k] = v;
    }
  }
  for (const [k, opts] of Object.entries(CHOICES)) {
    if (k in p) {
      if (typeof p[k] !== "string" || !opts.includes(p[k] as string)) return null;
      out[k] = p[k];
    }
  }
  return Object.keys(out).length ? out : null;
}

async function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const salt = Deno.env.get("IP_SALT") ?? "scenarios";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ip));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newId() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[a-z2-9]{8}$/.test(id)) return json({ error: "Scenario id must be 8 letters or digits." }, 400);
    const { data, error } = await db.from("scenarios").select("params, results, created_at").eq("id", id).maybeSingle();
    if (error) return json({ error: "Could not load the scenario. Try again." }, 500);
    if (!data) return json({ error: "No scenario with that id." }, 404);
    return json(data);
  }

  if (req.method !== "POST") return json({ error: "Use GET to load or POST to save." }, 405);

  let body: { params?: unknown; results?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON with a params object." }, 400);
  }
  const params = cleanParams(body.params);
  if (!params) return json({ error: "params missing or out of range." }, 400);
  const results = body.results ?? null;
  if (JSON.stringify(results).length > MAX_RESULTS_BYTES) return json({ error: "results too large." }, 413);

  const hash = await ipHash(req);
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("scenarios").select("id", { count: "exact", head: true })
    .eq("ip_hash", hash).gte("created_at", since);
  if ((count ?? 0) >= MAX_WRITES_PER_10_MIN) return json({ error: "Too many saves. Wait ten minutes." }, 429);

  const id = newId();
  const { error } = await db.from("scenarios").insert({ id, params, results, ip_hash: hash });
  if (error) return json({ error: "Could not save the scenario. Try again." }, 500);
  return json({ id }, 201);
});
