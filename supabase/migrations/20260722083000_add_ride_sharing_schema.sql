create table if not exists public.ride_sharing_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  rental_transaction_id uuid unique references public.rental_transactions (id) on delete set null,
  bike_id text references public.bikes (id) on delete set null,
  host_profile_id uuid references public.profiles (id) on delete set null,
  share_token uuid not null unique default extensions.gen_random_uuid(),
  session_state text not null default 'draft'
    check (session_state in ('draft', 'active', 'paused', 'completed', 'cancelled', 'expired')),
  visibility text not null default 'private'
    check (visibility in ('private', 'link_only', 'station_only')),
  participant_limit integer not null default 2
    check (participant_limit >= 1 and participant_limit <= 8),
  started_at timestamptz,
  ended_at timestamptz,
  share_expires_at timestamptz,
  notes text,
  source_system text not null default 'app'
    check (source_system in ('app', 'admin_dashboard', 'google_form', 'manual_import', 'system')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists ride_sharing_sessions_rental_transaction_id_idx
  on public.ride_sharing_sessions (rental_transaction_id);

create index if not exists ride_sharing_sessions_bike_id_idx
  on public.ride_sharing_sessions (bike_id);

create index if not exists ride_sharing_sessions_host_profile_id_idx
  on public.ride_sharing_sessions (host_profile_id);

create index if not exists ride_sharing_sessions_session_state_idx
  on public.ride_sharing_sessions (session_state);

create table if not exists public.ride_sharing_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  ride_sharing_session_id uuid not null references public.ride_sharing_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  participant_role text not null
    check (participant_role in ('host', 'passenger', 'viewer')),
  participant_status text not null default 'invited'
    check (participant_status in ('invited', 'joined', 'declined', 'left', 'removed')),
  invitation_channel text
    check (invitation_channel is null or invitation_channel in ('link', 'qr', 'app', 'staff')),
  invited_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  source_system text not null default 'app'
    check (source_system in ('app', 'admin_dashboard', 'google_form', 'manual_import', 'system')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (ride_sharing_session_id, profile_id)
);

create index if not exists ride_sharing_participants_session_id_idx
  on public.ride_sharing_participants (ride_sharing_session_id);

create index if not exists ride_sharing_participants_profile_id_idx
  on public.ride_sharing_participants (profile_id);

create index if not exists ride_sharing_participants_status_idx
  on public.ride_sharing_participants (participant_status);

alter table public.rental_transactions
  add column if not exists ride_sharing_session_id uuid references public.ride_sharing_sessions (id) on delete set null;

create index if not exists rental_transactions_ride_sharing_session_id_idx
  on public.rental_transactions (ride_sharing_session_id);

alter table public.bike_ride_history
  add column if not exists ride_sharing_session_id uuid references public.ride_sharing_sessions (id) on delete set null;

create index if not exists bike_ride_history_ride_sharing_session_id_idx
  on public.bike_ride_history (ride_sharing_session_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_ride_sharing_sessions_updated_at'
      and tgrelid = 'public.ride_sharing_sessions'::regclass
  ) then
    create trigger handle_ride_sharing_sessions_updated_at
      before update on public.ride_sharing_sessions
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_ride_sharing_participants_updated_at'
      and tgrelid = 'public.ride_sharing_participants'::regclass
  ) then
    create trigger handle_ride_sharing_participants_updated_at
      before update on public.ride_sharing_participants
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;
end $$;

alter table public.ride_sharing_sessions enable row level security;
alter table public.ride_sharing_participants enable row level security;

drop policy if exists "ride_sharing_sessions_select_participant_or_admin" on public.ride_sharing_sessions;
create policy "ride_sharing_sessions_select_participant_or_admin"
on public.ride_sharing_sessions
for select
to authenticated
using (
  private.is_admin()
  or host_profile_id = (select auth.uid())
  or exists (
    select 1
    from public.ride_sharing_participants rsp
    where rsp.ride_sharing_session_id = public.ride_sharing_sessions.id
      and rsp.profile_id = (select auth.uid())
  )
);

drop policy if exists "ride_sharing_sessions_insert_host_or_admin" on public.ride_sharing_sessions;
create policy "ride_sharing_sessions_insert_host_or_admin"
on public.ride_sharing_sessions
for insert
to authenticated
with check (
  private.is_admin()
  or host_profile_id = (select auth.uid())
);

drop policy if exists "ride_sharing_sessions_update_host_or_admin" on public.ride_sharing_sessions;
create policy "ride_sharing_sessions_update_host_or_admin"
on public.ride_sharing_sessions
for update
to authenticated
using (
  private.is_admin()
  or host_profile_id = (select auth.uid())
)
with check (
  private.is_admin()
  or host_profile_id = (select auth.uid())
);

drop policy if exists "ride_sharing_sessions_delete_admin" on public.ride_sharing_sessions;
create policy "ride_sharing_sessions_delete_admin"
on public.ride_sharing_sessions
for delete
to authenticated
using (private.is_admin());

drop policy if exists "ride_sharing_participants_select_self_or_session_host_or_admin" on public.ride_sharing_participants;
create policy "ride_sharing_participants_select_self_or_session_host_or_admin"
on public.ride_sharing_participants
for select
to authenticated
using (
  private.is_admin()
  or profile_id = (select auth.uid())
  or exists (
    select 1
    from public.ride_sharing_sessions rss
    where rss.id = public.ride_sharing_participants.ride_sharing_session_id
      and rss.host_profile_id = (select auth.uid())
  )
);

drop policy if exists "ride_sharing_participants_insert_session_host_or_admin" on public.ride_sharing_participants;
create policy "ride_sharing_participants_insert_session_host_or_admin"
on public.ride_sharing_participants
for insert
to authenticated
with check (
  private.is_admin()
  or exists (
    select 1
    from public.ride_sharing_sessions rss
    where rss.id = ride_sharing_session_id
      and rss.host_profile_id = (select auth.uid())
  )
);

drop policy if exists "ride_sharing_participants_update_self_or_session_host_or_admin" on public.ride_sharing_participants;
create policy "ride_sharing_participants_update_self_or_session_host_or_admin"
on public.ride_sharing_participants
for update
to authenticated
using (
  private.is_admin()
  or profile_id = (select auth.uid())
  or exists (
    select 1
    from public.ride_sharing_sessions rss
    where rss.id = public.ride_sharing_participants.ride_sharing_session_id
      and rss.host_profile_id = (select auth.uid())
  )
)
with check (
  private.is_admin()
  or profile_id = (select auth.uid())
  or exists (
    select 1
    from public.ride_sharing_sessions rss
    where rss.id = public.ride_sharing_participants.ride_sharing_session_id
      and rss.host_profile_id = (select auth.uid())
  )
);

drop policy if exists "ride_sharing_participants_delete_self_or_session_host_or_admin" on public.ride_sharing_participants;
create policy "ride_sharing_participants_delete_self_or_session_host_or_admin"
on public.ride_sharing_participants
for delete
to authenticated
using (
  private.is_admin()
  or profile_id = (select auth.uid())
  or exists (
    select 1
    from public.ride_sharing_sessions rss
    where rss.id = public.ride_sharing_participants.ride_sharing_session_id
      and rss.host_profile_id = (select auth.uid())
  )
);
