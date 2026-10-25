-- Owner-only API08 groundwork, not an upload/Storage service or public route.
begin;
create table if not exists private.station_evidence_policy (
 mime text primary key check(length(btrim(mime))>0),
 max_bytes bigint not null check(max_bytes>0),
 approval_reference text not null check(length(btrim(approval_reference))>0)
);
-- Deliberately empty: no invented MIME allowlist or production size limit.
create table if not exists private.station_evidence_reservations (
 id uuid primary key default extensions.gen_random_uuid(),
 device_id uuid not null references public.tablet_devices(id),
 evidence_local_id uuid not null,
 actor_profile_id uuid not null references public.profiles(id),
 staff_id uuid not null references public.staff_profiles(id),
 station_id uuid not null references public.stations(id),
 evidence_kind text not null check(evidence_kind in ('pre_use_photo','return_photo','payment_slip','incident_photo','bike_check_photo','battery_photo','backup_form_photo')),
 parent_local_id uuid not null,
 parent_kind text not null check(parent_kind in ('rider_registration','rental_start','rental_return')),
 raw_request text not null,
 declared_mime text not null,
 declared_size bigint not null check(declared_size>0),
 declared_sha256 text not null check(declared_sha256 ~ '^[0-9a-f]{64}$'),
 object_key uuid not null unique default extensions.gen_random_uuid(),
 observed_size bigint,
 observed_sha256 text,
 byte_state text not null default 'UNCHECKED' check(byte_state in ('UNCHECKED','LOCAL_BYTE_CHECK_ONLY')),
 unique(device_id,evidence_local_id)
);
alter table private.station_evidence_policy enable row level security;
alter table private.station_evidence_reservations enable row level security;

create or replace function private.station_evidence_parent(p_device uuid,p_local uuid,p_kind text,p_required boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; r public.tablet_sync_records; target uuid;
begin
 s:=private.station_actor(p_device);
 select * into r from public.tablet_sync_records where device_id=p_device and local_id=p_local::text for share;
 if not found then
 if p_required then raise exception 'EVIDENCE_PARENT_MISSING' using errcode='55000'; end if;
 return null;
 end if;
 if r.actor_profile_id is distinct from auth.uid() or r.staff_id is distinct from s.id or r.station_id is distinct from s.station_id
 or r.record_type is distinct from p_kind or r.sync_status is distinct from 'accepted' then
 raise exception 'EVIDENCE_PARENT_DENIED' using errcode='42501'; end if;
 if p_kind='rider_registration' and r.server_entity_table='station_assisted_riders' then
 select id into target from public.station_assisted_riders where id::text=r.server_entity_id and device_id=p_device and rider_local_id=p_local and station_id=s.station_id and registered_by_staff_id=s.id for share;
 elsif p_kind='rental_start' and r.server_entity_table='station_assisted_rentals' then
 select id into target from public.station_assisted_rentals where id::text=r.server_entity_id and device_id=p_device and start_local_id=p_local and start_station_id=s.station_id and started_by_staff_id=s.id for share;
 elsif p_kind='rental_return' and r.server_entity_table='station_assisted_rentals' then
 select id into target from public.station_assisted_rentals where id::text=r.server_entity_id and return_device_id=p_device and return_local_id=p_local and return_station_id=s.station_id and returned_by_staff_id=s.id for share;
 end if;
 if target is null then raise exception 'EVIDENCE_PARENT_CANONICAL_MISMATCH' using errcode='42501'; end if;
 return target;
end $$;

create or replace function private.station_evidence_reserve(p_raw text)
returns private.station_evidence_reservations language plpgsql security definer set search_path='' as $$
declare e jsonb; s public.staff_profiles; d uuid; old private.station_evidence_reservations; cap bigint;
begin
 e:=p_raw::jsonb;
 if jsonb_typeof(e) is distinct from 'object' or
 (select array_agg(k order by k) from jsonb_object_keys(e) k) is distinct from array['declaredMime','declaredSha256','declaredSize','deviceId','evidenceLocalId','kind','parentKind','parentLocalId']::text[]
 or exists(select 1 from jsonb_each(e) where jsonb_typeof(value) is distinct from 'string' and key<>'declaredSize')
 or jsonb_typeof(e->'declaredSize') is distinct from 'number'
 or coalesce(e->>'declaredSize','') !~ '^[1-9][0-9]*$'
 or coalesce(e->>'declaredSha256','') !~ '^[0-9a-f]{64}$'
 or coalesce(e->>'kind','') not in ('pre_use_photo','return_photo','payment_slip','incident_photo','bike_check_photo','battery_photo','backup_form_photo')
 or coalesce(e->>'parentKind','') not in ('rider_registration','rental_start','rental_return') then
 raise exception 'EVIDENCE_REQUEST_INVALID' using errcode='22023'; end if;
 d:=(e->>'deviceId')::uuid; s:=private.station_actor(d);
 perform private.station_evidence_parent(d,(e->>'parentLocalId')::uuid,e->>'parentKind',false);
 select * into old from private.station_evidence_reservations where device_id=d and evidence_local_id=(e->>'evidenceLocalId')::uuid;
 if found then
 if old.raw_request is distinct from p_raw or old.actor_profile_id is distinct from auth.uid() or old.staff_id is distinct from s.id or old.station_id is distinct from s.station_id then
 raise exception 'EVIDENCE_PAYLOAD_CONFLICT' using errcode='23505'; end if;
 return old;
 end if;
 select max_bytes into cap from private.station_evidence_policy where mime=e->>'declaredMime' for share;
 if cap is null then raise exception 'EVIDENCE_POLICY_UNAVAILABLE' using errcode='55000'; end if;
 if (e->>'declaredSize')::bigint>cap then raise exception 'EVIDENCE_SIZE_DENIED' using errcode='22023'; end if;
 insert into private.station_evidence_reservations(device_id,evidence_local_id,actor_profile_id,staff_id,station_id,evidence_kind,parent_local_id,parent_kind,raw_request,declared_mime,declared_size,declared_sha256)
 values(d,(e->>'evidenceLocalId')::uuid,auth.uid(),s.id,s.station_id,e->>'kind',(e->>'parentLocalId')::uuid,e->>'parentKind',p_raw,e->>'declaredMime',(e->>'declaredSize')::bigint,e->>'declaredSha256') returning * into old;
 return old;
end $$;

create or replace function private.station_evidence_authorize(p_id uuid)
returns private.station_evidence_reservations language plpgsql security definer set search_path='' as $$
declare r private.station_evidence_reservations; s public.staff_profiles;
begin
 select * into r from private.station_evidence_reservations where id=p_id;
 if not found then raise exception 'EVIDENCE_RESERVATION_MISSING' using errcode='42501'; end if;
 s:=private.station_actor(r.device_id);
 if r.actor_profile_id is distinct from auth.uid() or r.staff_id is distinct from s.id or r.station_id is distinct from s.station_id then
 raise exception 'EVIDENCE_RESERVATION_DENIED' using errcode='42501'; end if;
 select * into r from private.station_evidence_reservations where id=p_id for update;
 return r;
end $$;

create or replace function private.station_evidence_check_bytes(p_id uuid,p_bytes bytea)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.station_evidence_reservations; n bigint; h text;
begin
 r:=private.station_evidence_authorize(p_id);
 perform private.station_evidence_parent(r.device_id,r.parent_local_id,r.parent_kind,false);
 n:=octet_length(p_bytes); h:=encode(extensions.digest(p_bytes,'sha256'),'hex');
 if n is distinct from r.declared_size or h is distinct from r.declared_sha256 then raise exception 'EVIDENCE_BYTES_MISMATCH' using errcode='22023'; end if;
 update private.station_evidence_reservations set observed_size=n,observed_sha256=h,byte_state='LOCAL_BYTE_CHECK_ONLY' where id=r.id;
 return jsonb_build_object('state','LOCAL_BYTE_CHECK_ONLY','observedSize',n,'observedSha256',h);
end $$;

create or replace function private.station_evidence_complete(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare r private.station_evidence_reservations;
begin
 r:=private.station_evidence_authorize(p_id);
 perform private.station_evidence_parent(r.device_id,r.parent_local_id,r.parent_kind,true);
 raise exception 'STORAGE_VERIFIER_UNAVAILABLE' using errcode='55000';
end $$;
create or replace function private.station_evidence_immutable()
returns trigger language plpgsql set search_path='' as $$
begin
 if (to_jsonb(new)-array['observed_size','observed_sha256','byte_state']) is distinct from (to_jsonb(old)-array['observed_size','observed_sha256','byte_state']) then
 raise exception 'EVIDENCE_RESERVATION_IMMUTABLE' using errcode='23514'; end if;
 return new;
end $$;
drop trigger if exists station_evidence_immutable on private.station_evidence_reservations;
create trigger station_evidence_immutable before update on private.station_evidence_reservations for each row execute function private.station_evidence_immutable();
revoke all on function private.station_evidence_immutable() from public,anon,authenticated,service_role;
revoke all on private.station_evidence_policy,private.station_evidence_reservations from public,anon,authenticated,service_role;
revoke all on function private.station_evidence_parent(uuid,uuid,text,boolean),private.station_evidence_reserve(text),private.station_evidence_authorize(uuid),private.station_evidence_check_bytes(uuid,bytea),private.station_evidence_complete(uuid) from public,anon,authenticated,service_role;
commit;
