-- Native schema-only gate. No operational processor is exposed by this slice.
begin;
do $$
declare t text;
begin
  foreach t in array array['station_assisted_riders','station_assisted_rentals'] loop
    if to_regclass('public.' || t) is null then
      raise exception 'missing canonical station identity table: %', t;
    end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.'||t)) then
      raise exception 'RLS missing: %', t;
    end if;
    if has_table_privilege('authenticated','public.'||t,'INSERT') or
       has_table_privilege('anon','public.'||t,'SELECT') or
       has_table_privilege('service_role','public.'||t,'INSERT') then
      raise exception 'schema-only slice must not expose direct client writes: %', t;
    end if;
  end loop;
  if exists (select 1 from pg_constraint where conrelid='public.station_assisted_riders'::regclass
    and confrelid in ('auth.users'::regclass,'public.profiles'::regclass)) then
    raise exception 'station rider must not require Auth identity';
  end if;
  if (select count(*) from pg_constraint where conrelid='public.station_assisted_rentals'::regclass and contype='u') < 2 then
    raise exception 'missing business/local identity uniqueness';
  end if;
end $$;
-- Owner-only fixtures exercise durable constraints; these are NOT launch APIs.
insert into auth.users(id,email) values ('93000000-0000-0000-0000-000000000001','station-staff@example.invalid');
insert into public.stations(id,station_name) values ('93000000-0000-0000-0000-000000000002','Native station');
insert into public.staff_profiles(id,profile_id,staff_name,role,station_id) values
 ('93000000-0000-0000-0000-000000000003','93000000-0000-0000-0000-000000000001','Staff','station_admin','93000000-0000-0000-0000-000000000002');
insert into public.tablet_devices(id,device_identifier,station_id) values
 ('93000000-0000-0000-0000-000000000004','native-station-identity','93000000-0000-0000-0000-000000000002');
insert into public.station_assisted_riders(id,device_id,rider_local_id,station_id,registered_by_staff_id,name,phone,user_type,pdpa_notice_version,pdpa_accepted_at_device,registration_payload)
 values ('93000000-0000-0000-0000-000000000005','93000000-0000-0000-0000-000000000004','93000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000003','Walk-in','test-only','local','TEST-NOT-APPROVED',now(),'{}');
insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude)
 values ('station-identity-bike','probe',10,25,'test',2,'ready_to_rent','Station',0,0);
insert into public.station_assisted_rentals(id,rental_id,rider_id,bike_id,device_id,start_local_id,start_station_id,started_by_staff_id,started_at_device,pdpa_notice_version,rental_notice_version,start_payload)
 values ('93000000-0000-0000-0000-000000000007','EXACT Rental ID','93000000-0000-0000-0000-000000000005','station-identity-bike','93000000-0000-0000-0000-000000000004','93000000-0000-0000-0000-000000000008','93000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000003',now(),'TEST-NOT-APPROVED','TEST-NOT-APPROVED','{}');
do $$
declare code text;
begin
 if exists(select 1 from auth.users where id='93000000-0000-0000-0000-000000000005') then raise exception 'fake Auth rider'; end if;
 if exists(select 1 from public.rental_transactions where bike_id='station-identity-bike') then raise exception 'fabricated completed ledger'; end if;
 begin
  insert into public.station_assisted_rentals select extensions.gen_random_uuid(), rental_id,rider_id,bike_id,device_id,extensions.gen_random_uuid(),start_station_id,started_by_staff_id,started_at_device,started_at_server,pdpa_notice_version,rental_notice_version,start_payload,returned_at_device,returned_at_server,return_station_id,returned_by_staff_id,return_device_id,return_local_id,return_payload from public.station_assisted_rentals;
 exception when others then code:=sqlstate; end;
 if code is distinct from '23505' then raise exception 'duplicate business ID not rejected: %',code; end if;
 code:=null;
 begin update public.station_assisted_rentals set returned_at_server=now(); exception when others then code:=sqlstate; end;
 if code is distinct from '23514' then raise exception 'partial return not rejected: %',code; end if;
end $$;
rollback;
\echo PASS station canonical identity and sealed access
