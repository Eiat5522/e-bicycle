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
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','native-test-only'),('rental','SYNTHETIC','native-test-only');
update request set rider=private.station_register_rider('94000000-0000-0000-0000-000000000004',reg);
update request set rental=private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000006',start);
alter table request add column ret jsonb;
update request set ret=jsonb_build_object('rentalId','Exact Rental ID','vehicleId','station-start-bike','staffId','94000000-0000-0000-0000-000000000003','returnStationId','94000000-0000-0000-0000-000000000002','returnedAtDevice','2026-07-28T11:00:00Z','paymentState','pending','bikeOutcome','returned_pending_inspection','returnInspection',(start->'preUseInspection')||'{"checkType":"return","nextStatus":"returned_pending_inspection"}');
