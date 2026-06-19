-- 0010 — Lock down SECURITY DEFINER RPCs to the service role.
--
-- Earlier migrations did `revoke all ... from public`, but Supabase's default
-- privileges ALSO grant EXECUTE directly to `anon` and `authenticated`. Revoking
-- from PUBLIC therefore left these SECURITY DEFINER functions callable straight
-- from the browser via PostgREST (/rest/v1/rpc/<fn>), bypassing the app's
-- server-side, service-role-only call path. A signed-in user could, e.g., call
-- create_order() with an arbitrary p_user_id, or advance_order_status() to skip
-- the lifecycle. Close that by revoking the direct anon/authenticated grants.
--
-- Deliberately NOT touched (they must remain callable by signed-in users):
--   is_admin(), is_staff()                       -- referenced inside RLS policies
--   admin_list_team/admin_assign_role/_revoke    -- intended authenticated entry
--                                                   points, gated by is_admin()
--                                                   internally (see 0006)
--
-- Replay-safe: each revoke is guarded so a fresh `supabase db push` does not fail
-- on functions that may not exist on a clean DB (e.g. transition_order_status and
-- rls_auto_enable exist in the production DB as drift not captured by an earlier
-- committed migration).

do $$
declare
  fn text;
  fns text[] := array[
    'public.create_order(uuid, jsonb, public.pickup_type, timestamptz)',
    'public.advance_order_status(bigint, public.order_status)',
    'public.transition_order_status(bigint, public.order_status, public.order_status)',
    'public.rate_limit_hit(text, integer, integer)',
    'public.adjust_inventory(bigint, integer, text, uuid)',
    'public.consume_order_inventory(bigint)',
    'public.restock_order_inventory(bigint)',
    'public.sync_menu_availability_for_inventory(bigint)',
    'public.handle_new_user()',
    'public.rls_auto_enable()'
  ];
begin
  foreach fn in array fns loop
    begin
      execute format('revoke execute on function %s from anon, authenticated', fn);
    exception
      when undefined_function then
        raise notice 'skipping revoke on missing function: %', fn;
    end;
  end loop;
end $$;

-- Re-affirm the only intended caller (service_role bypasses RLS).
grant execute on function public.create_order(uuid, jsonb, public.pickup_type, timestamptz) to service_role;
grant execute on function public.advance_order_status(bigint, public.order_status) to service_role;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.adjust_inventory(bigint, integer, text, uuid) to service_role;
