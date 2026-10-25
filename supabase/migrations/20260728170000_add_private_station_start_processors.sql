-- Internal registration/start rehearsal only: NOT full API05/06.
-- No approved notice, pricing, TTL, evidence policy or public execute grant is
-- supplied here. Deployment must not expose these functions until policy,
-- evidence processing and ledger/reporting parity are separately approved.
begin;
create table if not exists private.station_approved_notices (
 kind text not null check(kind in ('pdpa','rental')),
 version text not null check(length(btrim(version))>0),
 approval_reference text not null check(length(btrim(approval_reference))>0),
 primary key(kind,version)
);
revoke all on private.station_approved_notices from public,anon,authenticated,service_role;

create or replace function private.station_actor(p_device uuid)
returns public.staff_profiles language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; d public.tablet_devices; t public.stations;
begin
 if auth.uid() is null then raise exception 'STATION_AUTH_REQUIRED' using errcode='42501'; end if;
 select * into s from public.staff_profiles where profile_id=auth.uid() for share;
 if s.id is null or s.status<>'active' or s.role not in ('station_admin','admin','operations_manager','assistant_operations_manager') then
 raise exception 'STATION_STAFF_DENIED' using errcode='42501'; end if;
 select * into d from public.tablet_devices where id=p_device for update;
 if d.id is null or d.device_status<>'active' or d.station_id is distinct from s.station_id then
 raise exception 'STATION_DEVICE_DENIED' using errcode='42501'; end if;
 select * into t from public.stations where id=d.station_id for share;
 if t.id is null or t.operating_status<>'active' then raise exception 'STATION_INACTIVE' using errcode='42501'; end if;
 return s;
end $$;

create or replace function private.station_notice(p_kind text,p_version text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from private.station_approved_notices where kind=p_kind and version=p_version for share;
 if not found then raise exception 'STATION_APPROVED_NOTICE_REQUIRED' using errcode='55000'; end if;
end $$;

create or replace function private.station_register_rider(p_device uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; r public.station_assisted_riders; n jsonb;
begin
 s:=private.station_actor(p_device); n:=p_payload->'pdpaConsent';
 if jsonb_typeof(p_payload) is distinct from 'object' or
 (n->>'staffId')::uuid is distinct from s.id or (n->>'stationId')::uuid is distinct from s.station_id or
 n->>'method' is distinct from 'staff_tablet' or
 nullif(p_payload->>'riderLocalId','') is null or nullif(n->>'acceptedAtDevice','') is null then
 raise exception 'STATION_REGISTRATION_INVALID' using errcode='22023'; end if;
 select * into r from public.station_assisted_riders where device_id=p_device and rider_local_id=(p_payload->>'riderLocalId')::uuid;
 if found then
 if r.registration_payload is distinct from p_payload or r.registered_by_staff_id<>s.id or r.station_id<>s.station_id then
 raise exception 'STATION_PAYLOAD_CONFLICT' using errcode='23505'; end if;
 return r.id; end if;
 perform private.station_notice('pdpa',n->>'noticeVersion');
 insert into public.station_assisted_riders(device_id,rider_local_id,station_id,registered_by_staff_id,name,phone,user_type,email,pdpa_notice_version,pdpa_accepted_at_device,registration_payload)
 values(p_device,(p_payload->>'riderLocalId')::uuid,s.station_id,s.id,p_payload->>'name',p_payload->>'phone',p_payload->>'userType',p_payload->>'email',n->>'noticeVersion',(n->>'acceptedAtDevice')::timestamptz,p_payload) returning * into r;
 insert into public.audit_logs(actor_profile_id,actor_staff_id,action_performed,entity_table,entity_id)
 values(auth.uid(),s.id,'station_rider_registered','station_assisted_riders',r.id::text);
 return r.id;
end $$;

create or replace function private.station_start_rental(p_device uuid,p_local uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; r public.station_assisted_riders; v public.station_assisted_rentals; b public.bikes; i jsonb; k text;
begin
 s:=private.station_actor(p_device);
 if p_local is null or jsonb_typeof(p_payload) is distinct from 'object' or
 (p_payload->>'staffId')::uuid is distinct from s.id or (p_payload->>'stationId')::uuid is distinct from s.station_id or
 nullif(btrim(p_payload->>'rentalId'),'') is null or nullif(p_payload->>'startedAtDevice','') is null then
 raise exception 'STATION_START_INVALID' using errcode='22023'; end if;
 -- Serialize global business identity even for different devices/bikes.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payload->>'rentalId',1700));
 select * into v from public.station_assisted_rentals where rental_id=p_payload->>'rentalId' or (device_id=p_device and start_local_id=p_local) limit 1;
 if found then
 if v.device_id<>p_device or v.start_local_id<>p_local or v.started_by_staff_id<>s.id or v.start_station_id<>s.station_id or v.start_payload is distinct from p_payload then
 raise exception 'STATION_PAYLOAD_CONFLICT' using errcode='23505'; end if;
 return v.id; end if;
 select * into r from public.station_assisted_riders where device_id=p_device and rider_local_id=(p_payload->>'riderLocalId')::uuid for share;
 if r.id is null or r.station_id<>s.station_id or (p_payload ? 'riderServerId' and (p_payload->>'riderServerId')::uuid is distinct from r.id) then
 raise exception 'STATION_RIDER_INVALID' using errcode='23503'; end if;
 if p_payload->>'pdpaNoticeVersion' is distinct from r.pdpa_notice_version then raise exception 'STATION_CONSENT_MISMATCH' using errcode='22023'; end if;
 perform private.station_notice('pdpa',p_payload->>'pdpaNoticeVersion');
 perform private.station_notice('rental',p_payload->>'rentalNoticeVersion');
 i:=p_payload->'preUseInspection';
 if i->>'checkType' is distinct from 'pre_use' or i->>'outcome' is distinct from 'pass' or
 coalesce(i->>'nextStatus','') not in ('ready_to_rent','in_use') or
 jsonb_typeof(i->'evidenceLocalIds') is distinct from 'array' or p_payload ? 'manualOverride' then raise exception 'STATION_INSPECTION_REQUIRED' using errcode='23514'; end if;
 foreach k in array array['brakes','tires','lights','frameHandlebarSeat','battery','qrVehicleIdReadable'] loop
 if i->'checklist'->>k is distinct from 'pass' then raise exception 'STATION_INSPECTION_FAILED' using errcode='23514'; end if;
 end loop;
 if i->'checklist'->>'visibleDamage' is distinct from 'none' then raise exception 'STATION_INSPECTION_FAILED' using errcode='23514'; end if;
 if p_payload ? 'paymentReference' and (jsonb_typeof(p_payload->'paymentReference') is distinct from 'object' or
 p_payload->'paymentReference'->>'verificationState' is distinct from 'pending' or
 p_payload->'paymentReference'->>'rentalId' is distinct from p_payload->>'rentalId' or
 p_payload->'paymentReference'->>'currencyCode' is distinct from 'THB' or
 coalesce(p_payload->'paymentReference'->>'method','') not in ('promptpay','thai_qr','digital_wallet','credit_card','cash','manual_reference') or
 jsonb_typeof(p_payload->'paymentReference'->'evidenceLocalIds') is distinct from 'array' or
 jsonb_typeof(p_payload->'paymentReference'->'amount') is distinct from 'number' or
 coalesce(p_payload->'paymentReference'->>'amount','') !~ '^[0-9]+$') then
 raise exception 'STATION_PAYMENT_MUST_BE_PENDING' using errcode='23514'; end if;
 select * into b from public.bikes where id=p_payload->>'vehicleId' for update;
 if b.id is null or b.station_id is distinct from s.station_id or b.status<>'ready_to_rent' or b.active_rider_id is not null or b.active_ride_started_at is not null or b.active_ride_start_location is not null or exists(select 1 from public.station_assisted_rentals where bike_id=b.id and returned_at_server is null) then
 raise exception 'STATION_BIKE_UNAVAILABLE' using errcode='40001'; end if;
 -- Use the canonical bike lock shared by supported mobile status/completion RPCs.
 update public.bikes set status='in_use' where id=b.id;
 insert into public.station_assisted_rentals(rental_id,rider_id,bike_id,device_id,start_local_id,start_station_id,started_by_staff_id,started_at_device,pdpa_notice_version,rental_notice_version,start_payload)
 values(p_payload->>'rentalId',r.id,b.id,p_device,p_local,s.station_id,s.id,(p_payload->>'startedAtDevice')::timestamptz,p_payload->>'pdpaNoticeVersion',p_payload->>'rentalNoticeVersion',p_payload) returning * into v;
 insert into public.bike_status_events(actor_id,bike_id,context,from_status,to_status,transition_kind)
 values(auth.uid(),b.id,jsonb_build_object('stationRentalId',v.id),b.status,'in_use','station_rental_start');
 insert into public.audit_logs(actor_profile_id,actor_staff_id,action_performed,entity_table,entity_id)
 values(auth.uid(),s.id,'station_rental_started','station_assisted_rentals',v.id::text);
 return v.id;
end $$;

create or replace function private.station_rider_immutable()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'STATION_REGISTRATION_IMMUTABLE' using errcode='55000'; end $$;
drop trigger if exists station_rider_immutable on public.station_assisted_riders;
create trigger station_rider_immutable before update on public.station_assisted_riders for each row execute function private.station_rider_immutable();

create or replace function private.station_active_bike_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.status,new.active_rider_id,new.active_ride_started_at,new.active_ride_start_location) is distinct from
    (old.status,old.active_rider_id,old.active_ride_started_at,old.active_ride_start_location)
 and exists(select 1 from public.station_assisted_rentals where bike_id=old.id and returned_at_server is null) then
 -- Retain explicit admin safety quarantine; never let it create mobile ownership.
 if not (private.is_admin() and new.status in ('maintenance_required','out_of_service') and new.active_rider_id is null and new.active_ride_started_at is null and new.active_ride_start_location is null) then
 raise exception 'STATION_RENTAL_ACTIVE' using errcode='40001'; end if;
 end if;
 return new;
end $$;
drop trigger if exists station_active_bike_guard on public.bikes;
create trigger station_active_bike_guard before update on public.bikes for each row execute function private.station_active_bike_guard();
revoke all on function private.station_actor(uuid),private.station_notice(text,text),private.station_register_rider(uuid,jsonb),private.station_start_rental(uuid,uuid,jsonb),private.station_rider_immutable(),private.station_active_bike_guard() from public,anon,authenticated,service_role;
commit;
