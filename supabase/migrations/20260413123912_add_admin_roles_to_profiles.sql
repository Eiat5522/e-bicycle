create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function private.is_admin()
returns boolean
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$ language sql stable security definer;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (
  ((select auth.uid()) is not null and (select auth.uid()) = id)
  or private.is_admin()
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  ((select auth.uid()) is not null and (select auth.uid()) = id)
  or private.is_admin()
)
with check (
  ((select auth.uid()) is not null and (select auth.uid()) = id)
  or private.is_admin()
);
