-- Smoke Ring — Phase 4: admin tier + team management by email
--
-- Until now `staff` and `admin` were indistinguishable: is_staff() treated them
-- the same and the app had no admin-only gate. This migration makes `admin` a
-- strict superset of `staff` and adds admin-only RPCs to list/assign/revoke
-- roles BY EMAIL (email lives in auth.users, not public.profiles).
--
-- All mutating functions are SECURITY DEFINER (so they may read auth.users and
-- write public.user_roles) but each one refuses any caller who is not an admin.
-- The app calls them with the signed-in admin's session, so auth.uid() is the
-- acting admin.

-- ---------- Admin helper ----------

-- Does the caller hold the admin role?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- ---------- Team management (admin only) ----------

-- List everyone holding a staff/admin role, with their email. Non-admins get
-- an empty set (the app also gates the page with requireAdmin).
create or replace function public.admin_list_team()
returns table (user_id uuid, email text, roles public.app_role[])
language sql
stable
security definer
set search_path = public
as $$
  select ur.user_id,
         u.email::text as email,
         array_agg(ur.role order by ur.role) as roles
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  where public.is_admin()
  group by ur.user_id, u.email;
$$;

-- Grant a role (staff or admin) to the user with the given email.
create or replace function public.admin_assign_role(p_email text, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_role = 'customer' then
    raise exception 'cannot_assign_customer' using errcode = '22023';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_uid is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid, p_role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- Revoke a role from the user with the given email. Refuses to remove the
-- final admin, so the team can never lock itself out of management.
create or replace function public.admin_revoke_role(p_email text, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_uid is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if p_role = 'admin'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'cannot_remove_last_admin' using errcode = 'P0001';
  end if;

  delete from public.user_roles
  where user_id = v_uid and role = p_role;
end;
$$;

-- Expose to signed-in users only; the is_admin() check inside does the real
-- gating (anon has no auth.uid(), so is_admin() is false for them anyway).
revoke all on function public.admin_list_team() from public, anon;
revoke all on function public.admin_assign_role(text, public.app_role) from public, anon;
revoke all on function public.admin_revoke_role(text, public.app_role) from public, anon;
grant execute on function public.admin_list_team() to authenticated;
grant execute on function public.admin_assign_role(text, public.app_role) to authenticated;
grant execute on function public.admin_revoke_role(text, public.app_role) to authenticated;

-- ---------- Bootstrap the first admin ----------
-- There is no admin yet, so no one can use admin_assign_role. Seed the first
-- admin(s) directly below (they must have signed in at least once so their
-- auth.users row exists). Edit the email(s) and run, then manage the rest in
-- the in-app Team page.
--
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users
--   where lower(email) = lower('you@example.com')
--   on conflict do nothing;
