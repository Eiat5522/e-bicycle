-- Native tests use explicitly synthetic approvals, rolled back; not policy.
begin;
create function pg_temp.denied(q text,want text) returns void language plpgsql as $$
declare got text; begin
 begin execute q; exception when others then got:=sqlstate; end;
 if got is distinct from want then raise exception 'expected %, got % for %',want,got,q; end if;
end $$;
select pg_temp.denied('select 1','00000') where false;
do $$ declare caught boolean:=false; begin
 begin perform pg_temp.denied('select 1','42501'); exception when raise_exception then caught:=true; end;
 if not caught then raise exception 'denial helper accepts success'; end if;
end $$;
insert into auth.users(id,email) values ('94000000-0000-0000-0000-000000000001','start-staff@example.invalid'),('94000000-0000-0000-0000-000000000011','start-rider@example.invalid');
insert into public.stations(id,station_name) values ('94000000-0000-0000-0000-000000000002','Start test'),('94000000-0000-0000-0000-000000000012','Other test');
insert into public.staff_profiles(id,profile_id,staff_name,role,station_id) values ('94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000001','Staff','station_admin','94000000-0000-0000-0000-000000000002');
insert into public.tablet_devices(id,device_identifier,station_id) values ('94000000-0000-0000-0000-000000000004','native-start','94000000-0000-0000-0000-000000000002');
insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude,station_id)
 values ('station-start-bike','probe',10,25,'test',2,'ready_to_rent','Station',0,0,'94000000-0000-0000-0000-000000000002');
create temp table request(reg jsonb,start jsonb,rider uuid,rental uuid);
insert into request(reg,start) values (
'{"riderLocalId":"94000000-0000-0000-0000-000000000005","name":"Walk in","phone":"test","userType":"local","pdpaConsent":{"staffId":"94000000-0000-0000-0000-000000000003","stationId":"94000000-0000-0000-0000-000000000002","method":"staff_tablet","noticeVersion":"SYNTHETIC","acceptedAtDevice":"2026-07-28T10:00:00Z"}}',
'{"rentalId":"Exact Rental ID","riderLocalId":"94000000-0000-0000-0000-000000000005","vehicleId":"station-start-bike","staffId":"94000000-0000-0000-0000-000000000003","stationId":"94000000-0000-0000-0000-000000000002","startedAtDevice":"2026-07-28T10:00:00Z","pdpaNoticeVersion":"SYNTHETIC","rentalNoticeVersion":"SYNTHETIC","preUseInspection":{"checkType":"pre_use","outcome":"pass","nextStatus":"in_use","evidenceLocalIds":[],"checklist":{"brakes":"pass","tires":"pass","lights":"pass","frameHandlebarSeat":"pass","battery":"pass","qrVehicleIdReadable":"pass","visibleDamage":"none"}},"paymentReference":{"rentalId":"Exact Rental ID","method":"manual_reference","amount":0,"currencyCode":"THB","evidenceLocalIds":[],"verificationState":"pending","reference":"test-only"}}');
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg) from request$q$,'42501');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg) from request$q$,'55000');
-- Public gate remains closed, including service-role direct execution.
do $$ declare role_name text; begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
 if has_function_privilege(role_name,'private.station_register_rider(uuid,jsonb)','EXECUTE') or has_function_privilege(role_name,'private.station_start_rental(uuid,uuid,jsonb)','EXECUTE') then raise exception 'public exposure'; end if;
 end loop;
end $$;
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','native-test-only'),('rental','SYNTHETIC','native-test-only');
update public.staff_profiles set status='inactive' where id='94000000-0000-0000-0000-000000000003';
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg) from request$q$,'42501');
update public.staff_profiles set status='active' where id='94000000-0000-0000-0000-000000000003';
update public.tablet_devices set device_status='disabled' where id='94000000-0000-0000-0000-000000000004';
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg) from request$q$,'42501');
update public.tablet_devices set device_status='active' where id='94000000-0000-0000-0000-000000000004';
insert into public.tablet_devices(id,device_identifier,station_id) values ('94000000-0000-0000-0000-000000000014','native-other-start','94000000-0000-0000-0000-000000000012');
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000014',reg) from request$q$,'42501');
update public.stations set operating_status='inactive' where id='94000000-0000-0000-0000-000000000002';
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg) from request$q$,'42501');
update public.stations set operating_status='active' where id='94000000-0000-0000-0000-000000000002';
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',jsonb_set(reg,'{pdpaConsent,staffId}','"94000000-0000-0000-0000-000000000011"')) from request$q$,'22023');
update request set rider=private.station_register_rider('94000000-0000-0000-0000-000000000004',reg);
do $$ begin if (select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg)<>rider from request) then raise exception 'registration replay'; end if; end $$;
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',reg||'{"name":"changed"}') from request$q$,'23505');
select pg_temp.denied($q$update public.station_assisted_riders set phone='changed' where device_id='94000000-0000-0000-0000-000000000004'$q$,'55000');
-- Forbidden start inputs cannot mutate availability or create receipts.
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start||'{"staffId":"94000000-0000-0000-0000-000000000011"}') from request$q$,'22023');
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start||'{"stationId":"94000000-0000-0000-0000-000000000012"}') from request$q$,'22023');
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',jsonb_set(start,'{preUseInspection,checklist,brakes}','"fail"')) from request$q$,'23514');
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',jsonb_set(start,'{paymentReference,verificationState}','"verified"')) from request$q$,'23514');
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start||'{"rentalNoticeVersion":"NOT-APPROVED"}') from request$q$,'55000');
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start||'{"riderLocalId":"94000000-0000-0000-0000-000000000015"}') from request$q$,'23503');
update public.staff_profiles set status='inactive' where id='94000000-0000-0000-0000-000000000003';
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start) from request$q$,'42501');
update public.staff_profiles set status='active' where id='94000000-0000-0000-0000-000000000003';
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',jsonb_set(start,'{preUseInspection,outcome}','"critical_fail"')) from request$q$,'23514');
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',jsonb_set(start,'{paymentReference,amount}','-1')) from request$q$,'23514');
-- Mobile already owns it: station start must fail without a ledger/audit write.
update public.bikes set status='reserved',active_rider_id='94000000-0000-0000-0000-000000000011' where id='station-start-bike';
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start) from request$q$,'40001');
update public.bikes set status='ready_to_rent',active_rider_id=null where id='station-start-bike';
-- Force a late audit failure: bike, rental and status event must all roll back.
create function pg_temp.fail_audit() returns trigger language plpgsql as $$ begin raise exception 'forced audit failure'; end $$;
create trigger native_fail_audit before insert on public.audit_logs for each row execute function pg_temp.fail_audit();
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start) from request$q$,'P0001');
do $$ begin
 if exists(select 1 from public.station_assisted_rentals where bike_id='station-start-bike') or exists(select 1 from public.bike_status_events where bike_id='station-start-bike') or (select status<>'ready_to_rent' from public.bikes where id='station-start-bike') then raise exception 'partial start'; end if;
end $$;
-- Registration failure also leaves no rider/audit row.
select pg_temp.denied($q$select private.station_register_rider('94000000-0000-0000-0000-000000000004',jsonb_set(reg,'{riderLocalId}','"94000000-0000-0000-0000-000000000015"')) from request$q$,'P0001');
do $$ begin if exists(select 1 from public.station_assisted_riders where rider_local_id='94000000-0000-0000-0000-000000000015') then raise exception 'partial registration'; end if; end $$;
drop trigger native_fail_audit on public.audit_logs;
update request set rental=private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start);
do $$ begin if (select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start)<>rental from request) then raise exception 'start replay'; end if; end $$;
select pg_temp.denied($q$select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start||'{"rentalNoticeVersion":"changed"}') from request$q$,'23505');
select pg_temp.denied($q$update public.bikes set active_rider_id='94000000-0000-0000-0000-000000000011' where id='station-start-bike'$q$,'40001');
select pg_temp.denied($q$update public.bikes set status='ready_to_rent' where id='station-start-bike'$q$,'40001');
do $$ begin
 if (select count(*) from public.audit_logs where actor_staff_id='94000000-0000-0000-0000-000000000003')<>2 or (select count(*) from public.bike_status_events where bike_id='station-start-bike')<>1 or (select count(*) from public.station_assisted_rentals where bike_id='station-start-bike')<>1 then raise exception 'duplicate writes'; end if;
 if exists(select 1 from public.rental_transactions where bike_id='station-start-bike') or exists(select 1 from public.profiles where id=(select rider from request)) or exists(select 1 from public.bikes where id='station-start-bike' and active_rider_id is not null) then raise exception 'fabricated mobile rider/ledger'; end if;
end $$;
-- Telemetry-only updates and explicit admin safety quarantine remain supported.
update public.bikes set latitude=1 where id='station-start-bike';
update public.profiles set is_admin=true where id='94000000-0000-0000-0000-000000000001';
update public.bikes set status='maintenance_required' where id='station-start-bike';
select pg_temp.denied($q$update public.bikes set status='ready_to_rent' where id='station-start-bike'$q$,'40001');
rollback;
\echo PASS station authorization, policy gate, immutable registration, replay, ownership and atomic failure
