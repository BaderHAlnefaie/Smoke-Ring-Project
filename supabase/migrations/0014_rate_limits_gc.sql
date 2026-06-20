-- 0014 — Garbage-collect the rate_limits table.
--
-- rate_limit_hit() only ever INSERTs/UPDATEs one row per (key, window); the
-- "opportunistic cleanup" promised in 0004 was never implemented, so the table
-- grows forever (one row per user/IP per 60s window). Left alone it bloats the
-- PK index and slows the on-conflict upsert that runs on every order POST.
--
-- Two layers so this works whether or not pg_cron is available on the project:
--   1. A cleanup function anyone with service_role can call.
--   2. A pg_cron schedule (every 10 min) if the extension can be enabled.
-- The rate_limits_window_idx (created in 0004) supports the delete.

create or replace function public.gc_rate_limits(p_older_than interval default interval '1 hour')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.rate_limits where window_start < now() - p_older_than;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.gc_rate_limits(interval) from public, anon, authenticated;
grant execute on function public.gc_rate_limits(interval) to service_role;

-- Schedule it if pg_cron is available. Wrapped so a project without the
-- extension (or without permission to create it) still applies the rest cleanly;
-- in that case, run gc_rate_limits() from an external scheduler instead.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- Replace any prior schedule of the same name to keep this migration idempotent.
    perform cron.unschedule('gc_rate_limits')
      where exists (select 1 from cron.job where jobname = 'gc_rate_limits');
    perform cron.schedule(
      'gc_rate_limits',
      '*/10 * * * *',
      $cron$ select public.gc_rate_limits(interval '1 hour'); $cron$
    );
  else
    raise notice 'pg_cron not available; schedule public.gc_rate_limits() externally';
  end if;
exception
  when insufficient_privilege or feature_not_supported then
    raise notice 'could not schedule pg_cron job; schedule public.gc_rate_limits() externally';
end $$;
