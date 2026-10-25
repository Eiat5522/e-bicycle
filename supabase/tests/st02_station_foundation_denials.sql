-- Durable regression for sealed foundation grants and actual FK rejection.
begin;
create function pg_temp.denied(q text,want text) returns void language plpgsql as $$
declare got text; begin
 begin execute q; exception when others then got:=sqlstate; end;
 if got is distinct from want then raise exception 'expected %, got %: %',want,got,q; end if;
end $$;
do $$ declare r text; t text; q text; begin
 foreach r in array array['anon','authenticated','service_role'] loop
 foreach t in array array['station_assisted_riders','station_assisted_rentals'] loop
 foreach q in array array['select * from public.'||t,'delete from public.'||t,'update public.'||t||' set device_id=null','insert into public.'||t||' default values'] loop
 perform pg_temp.denied('set local role '||r||'; '||q,'42501');
 end loop; end loop; end loop;
end $$;
select pg_temp.denied($q$insert into public.station_assisted_riders(device_id,rider_local_id,station_id,registered_by_staff_id,name,phone,user_type,pdpa_notice_version,pdpa_accepted_at_device,registration_payload) values ('95000000-0000-0000-0000-000000000001','95000000-0000-0000-0000-000000000002','95000000-0000-0000-0000-000000000003','95000000-0000-0000-0000-000000000004','test','test','local','NOT-APPROVED',now(),'{}')$q$,'23503');
select pg_temp.denied($q$insert into public.station_assisted_rentals(rental_id,rider_id,bike_id,device_id,start_local_id,start_station_id,started_by_staff_id,started_at_device,pdpa_notice_version,rental_notice_version,start_payload) values ('fk-probe','95000000-0000-0000-0000-000000000001','missing-bike','95000000-0000-0000-0000-000000000002','95000000-0000-0000-0000-000000000003','95000000-0000-0000-0000-000000000004','95000000-0000-0000-0000-000000000005',now(),'NOT-APPROVED','NOT-APPROVED','{}')$q$,'23503');
rollback;
\echo PASS actual foundation role denials and FK rejection
