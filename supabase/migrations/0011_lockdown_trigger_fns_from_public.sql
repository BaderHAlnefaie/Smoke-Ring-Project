-- 0011 — Remove the default PUBLIC EXECUTE grant from the trigger / event-trigger
-- functions. They are fired by the system (the on_auth_user_created trigger and
-- the ensure_rls event trigger), never called via PostgREST, so no role needs a
-- direct EXECUTE grant. 0010 revoked anon/authenticated explicitly, but the
-- inherited PUBLIC grant kept them reachable; this closes that.
--
-- Replay-safe: guarded so a fresh `supabase db push` does not fail if the
-- function is absent on a clean DB.

do $$
begin
  begin
    execute 'revoke execute on function public.handle_new_user() from public';
  exception when undefined_function then
    raise notice 'skipping: public.handle_new_user() not present';
  end;
  begin
    execute 'revoke execute on function public.rls_auto_enable() from public';
  exception when undefined_function then
    raise notice 'skipping: public.rls_auto_enable() not present';
  end;
end $$;
