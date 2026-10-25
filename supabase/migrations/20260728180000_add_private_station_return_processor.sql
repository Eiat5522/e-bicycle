-- Bounded owner-only rehearsal, NOT API06 delivery. No release, payment,
-- cross-station override or evidence-policy authority is introduced.
begin;
create table if not exists private.station_return_blocks (
 rental_id uuid primary key references public.station_assisted_rentals(id),
 actor_profile_id uuid not null references public.profiles(id),
 actor_staff_id uuid not null references public.staff_profiles(id),
 station_id uuid not null references public.stations(id),
 device_id uuid not null references public.tablet_devices(id),
 inspection jsonb not null,
 reason text not null check(length(btrim(reason))>0),
 incident_local_id text,
 created_at timestamptz not null default now()
);
revoke all on private.station_return_blocks from public,anon,authenticated,service_role;
create or replace function private.station_return_rental(p_device uuid,p_local uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; v public.station_assisted_rentals; b public.bikes; i jsonb; k text; failed boolean:=false; target text;
begin
 s:=private.station_actor(p_device);
 if p_local is null or jsonb_typeof(p_payload) is distinct from 'object' or
 (p_payload->>'staffId')::uuid is distinct from s.id or
 (p_payload->>'returnStationId')::uuid is distinct from s.station_id or
 nullif(btrim(p_payload->>'rentalId'),'') is null or nullif(p_payload->>'returnedAtDevice','') is null or
 p_payload ? 'manualOverride' or p_payload->>'paymentState' is distinct from 'pending' then
 raise exception 'STATION_RETURN_INVALID' using errcode='22023'; end if;
 -- Same device lock as start, then same business-identity advisory lock and
 -- canonical bike lock. Never accept a guessed latest rental for this bike.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payload->>'rentalId',1700));
 select * into v from public.station_assisted_rentals where return_device_id=p_device and return_local_id=p_local;
 if found then
 if v.return_payload is distinct from p_payload or v.returned_by_staff_id<>s.id then
 raise exception 'STATION_PAYLOAD_CONFLICT' using errcode='23505'; end if;
 return v.id; end if;
 select * into v from public.station_assisted_rentals where rental_id=p_payload->>'rentalId';
 if v.id is null or v.bike_id is distinct from p_payload->>'vehicleId' or v.start_station_id<>s.station_id then
 raise exception 'STATION_RETURN_UNMATCHED' using errcode='40001'; end if;
 select * into b from public.bikes where id=v.bike_id for update;
 select * into v from public.station_assisted_rentals where id=v.id for update;
 if v.returned_at_server is not null then raise exception 'STATION_RETURN_STALE' using errcode='40001'; end if;
 if b.station_id is distinct from s.station_id or b.status not in ('in_use','maintenance_required','out_of_service') or
 b.active_rider_id is not null or b.active_ride_started_at is not null or b.active_ride_start_location is not null then
 raise exception 'STATION_RETURN_BIKE_CONFLICT' using errcode='40001'; end if;
 if (p_payload->>'returnedAtDevice')::timestamptz<v.started_at_device then raise exception 'STATION_RETURN_TIME_INVALID' using errcode='22023'; end if;
 i:=p_payload->'returnInspection';
 if i->>'checkType' is distinct from 'return' or coalesce(i->>'outcome','') not in ('pass','minor_issue','critical_fail') or
 jsonb_typeof(i->'checklist') is distinct from 'object' or jsonb_typeof(i->'evidenceLocalIds') is distinct from 'array' then
 raise exception 'STATION_RETURN_INSPECTION_REQUIRED' using errcode='23514'; end if;
 foreach k in array array['brakes','tires','lights','frameHandlebarSeat','battery','qrVehicleIdReadable'] loop
 if coalesce(i->'checklist'->>k,'') not in ('pass','fail') then raise exception 'STATION_RETURN_CHECK_REQUIRED' using errcode='23514'; end if;
 failed:=failed or i->'checklist'->>k='fail';
 end loop;
 if coalesce(i->'checklist'->>'visibleDamage','') not in ('none','minor','critical') then raise exception 'STATION_RETURN_CHECK_REQUIRED' using errcode='23514'; end if;
 failed:=failed or i->'checklist'->>'visibleDamage'<>'none' or i->>'outcome'<>'pass' or
 coalesce(i->'checklist'->>'accessoriesPresent','pass')<>'pass' or coalesce(i->'checklist'->>'riderDispute','false')<>'false';
 target:=case when failed then 'maintenance_required' else 'returned_pending_inspection' end;
 if b.status in ('maintenance_required','out_of_service') then target:=b.status; end if;
 if p_payload->>'bikeOutcome' is distinct from target or i->>'nextStatus' is distinct from target or
 (failed and nullif(btrim(i->>'notes'),'') is null) then raise exception 'STATION_RETURN_BLOCK_REQUIRED' using errcode='23514'; end if;
 -- Close ledger before bike update so existing active-rental guard remains
 -- unchanged. All writes (including late block/audit failure) are atomic.
 update public.station_assisted_rentals set returned_at_device=(p_payload->>'returnedAtDevice')::timestamptz,
 returned_at_server=now(),return_station_id=s.station_id,returned_by_staff_id=s.id,
 return_device_id=p_device,return_local_id=p_local,return_payload=p_payload where id=v.id;
 update public.bikes set status=target::public.bike_status where id=b.id;
 insert into public.bike_status_events(actor_id,bike_id,context,from_status,to_status,transition_kind)
 values(auth.uid(),b.id,jsonb_build_object('stationRentalId',v.id,'inspection',i),b.status,target::public.bike_status,'station_rental_return');
 if failed then
 insert into private.station_return_blocks(rental_id,actor_profile_id,actor_staff_id,station_id,device_id,inspection,reason,incident_local_id)
 values(v.id,auth.uid(),s.id,s.station_id,p_device,i,i->>'notes',p_payload->>'incidentLocalId');
 end if;
 insert into public.audit_logs(actor_profile_id,actor_staff_id,action_performed,entity_table,entity_id)
 values(auth.uid(),s.id,'station_rental_returned','station_assisted_rentals',v.id::text);
 return v.id;
end $$;
revoke all on function private.station_return_rental(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
commit;
