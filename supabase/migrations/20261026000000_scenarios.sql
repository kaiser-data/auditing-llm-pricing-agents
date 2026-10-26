-- Saved demo scenarios: parameter sets people share from the playground.
-- No personal data: only simulation parameters, computed results and a salted IP hash for rate limiting.
create table if not exists public.scenarios (
  id text primary key,
  params jsonb not null,
  results jsonb,
  created_at timestamptz not null default now(),
  ip_hash text not null
);

create index if not exists scenarios_ip_time on public.scenarios (ip_hash, created_at desc);

-- RLS on with no policies: anon and authenticated clients cannot read or write directly.
-- All access goes through the `scenarios` edge function, which uses the service role and validates input.
alter table public.scenarios enable row level security;
