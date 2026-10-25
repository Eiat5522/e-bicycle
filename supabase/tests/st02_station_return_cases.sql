-- Run after fixture st02_station_return.sql in the same session.
select set_config('request.jwt.claim.sub','',true);
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'42501');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
update public.staff_profiles set status='inactive' where id='94000000-0000-0000-0000-000000000003';
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'42501');
update public.staff_profiles set status='active' where id='94000000-0000-0000-0000-000000000003';
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret||'{"vehicleId":"wrong"}') from request$q$,'40001');
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret||'{"rentalId":"unmatched"}') from request$q$,'40001');
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret||'{"returnStationId":"94000000-0000-0000-0000-000000000012"}') from request$q$,'22023');
update public.tablet_devices set device_status='disabled' where id='94000000-0000-0000-0000-000000000004';
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'42501');
update public.tablet_devices set device_status='active' where id='94000000-0000-0000-0000-000000000004';
update public.stations set operating_status='inactive' where id='94000000-0000-0000-0000-000000000002';
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'42501');
update public.stations set operating_status='active' where id='94000000-0000-0000-0000-000000000002';
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret||'{"staffId":"94000000-0000-0000-0000-000000000011"}') from request$q$,'22023');
-- Compare complete rows, not just selected status/count fields. All five tables
-- are transaction-local fixtures; unrelated mutation also fails this invariant.
create function pg_temp.return_state() returns jsonb language sql as $$
 select jsonb_build_object(
  'rentals',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.station_assisted_rentals t),
  'bikes',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.bikes t),
  'events',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.bike_status_events t),
  'audits',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.audit_logs t),
  'blocks',(select coalesce(jsonb_agg(to_jsonb(t) order by rental_id),'[]') from private.station_return_blocks t))
$$;
create temp table return_before as select pg_temp.return_state() as state;
create function pg_temp.assert_return_unchanged(label text) returns void language plpgsql as $$ begin
 if pg_temp.return_state() is distinct from (select state from return_before) then
  raise exception '% changed rental/bike/events/audits/blocks',label;
 end if;
end $$;
-- Explicit manual override rejection, including false: presence is forbidden.
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret||'{"manualOverride":false}') from request$q$,'22023');
select pg_temp.assert_return_unchanged('manual override denial');
savepoint stale_bike;
update public.profiles set is_admin=true where id='94000000-0000-0000-0000-000000000001';
-- Inject a stale legacy canonical state only during fixture setup; restore the
-- guard before calling the processor (normal guarded writes correctly forbid it).
alter table public.bikes disable trigger station_active_bike_guard;
update public.bikes set status='ready_to_rent' where id='station-start-bike';
alter table public.bikes enable trigger station_active_bike_guard;
update return_before set state=pg_temp.return_state();
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'40001');
select pg_temp.assert_return_unchanged('stale canonical bike');
rollback to stale_bike;
create function pg_temp.fail_return() returns trigger language plpgsql as $$ begin raise exception 'forced late failure'; end $$;
create trigger native_fail_return before insert on public.audit_logs for each row execute function pg_temp.fail_return();
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'P0001');
do $$ begin if exists(select 1 from public.station_assisted_rentals where returned_at_server is not null) or (select status<>'in_use' from public.bikes where id='station-start-bike') or exists(select 1 from public.bike_status_events where transition_kind='station_rental_return') then raise exception 'partial return'; end if; end $$;
select pg_temp.assert_return_unchanged('passing audit insertion rollback');
drop trigger native_fail_return on public.audit_logs;
savepoint passing;
select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request;
select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request;
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret||'{"distanceKm":1}') from request$q$,'23505');
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000008',ret) from request$q$,'40001');
do $$ begin
 if (select count(*) from public.audit_logs where action_performed='station_rental_returned')<>1 or (select count(*) from public.bike_status_events where transition_kind='station_rental_return')<>1 or (select status<>'returned_pending_inspection' from public.bikes where id='station-start-bike') then raise exception 'return replay mutated'; end if;
 if exists(select 1 from public.audit_logs where action_performed='station_rental_returned' and (actor_staff_id is distinct from '94000000-0000-0000-0000-000000000003'::uuid or actor_profile_id is distinct from auth.uid())) then raise exception 'actor mismatch'; end if;
end $$;
-- Replay the old receipt during a genuinely newer active station rental.
savepoint newer_rental;
update public.profiles set is_admin=true where id='94000000-0000-0000-0000-000000000001';
update public.bikes set status='ready_to_rent' where id='station-start-bike';
select private.station_start_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000016',(start||'{"rentalId":"Newer active rental"}'::jsonb)-'paymentReference') from request;
do $$ begin
 if (select count(*) from public.station_assisted_rentals where rental_id='Newer active rental' and returned_at_server is null)<>1 or
 (select status<>'in_use' from public.bikes where id='station-start-bike') then raise exception 'newer rental not active'; end if;
end $$;
update return_before set state=pg_temp.return_state();
do $$ declare replayed uuid; begin
 select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) into replayed from request;
 if replayed is distinct from (select rental from request) then raise exception 'old replay returned wrong rental'; end if;
end $$;
select pg_temp.assert_return_unchanged('old return replay with newer active rental');
rollback to newer_rental;
rollback to passing;
update request set ret=jsonb_set(jsonb_set(ret,'{returnInspection}',(ret->'returnInspection')||'{"outcome":"critical_fail","notes":"brake failure","nextStatus":"maintenance_required","checklist":{"brakes":"fail","tires":"pass","lights":"pass","frameHandlebarSeat":"pass","battery":"pass","qrVehicleIdReadable":"pass","visibleDamage":"none"}}'),'{bikeOutcome}','"maintenance_required"');
-- Missing/blank notes must be rejected even with valid failed checklist.
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret#-'{returnInspection,notes}') from request$q$,'23514');
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',jsonb_set(ret,'{returnInspection,notes}','"  "')) from request$q$,'23514');
select pg_temp.assert_return_unchanged('failed inspection missing notes');
-- Audit fails AFTER block insertion: prove the private block also rolls back.
create trigger native_fail_return before insert on public.audit_logs for each row execute function pg_temp.fail_return();
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'P0001');
select pg_temp.assert_return_unchanged('failed inspection audit rollback including block');
drop trigger native_fail_return on public.audit_logs;
create trigger native_fail_block before insert on private.station_return_blocks for each row execute function pg_temp.fail_return();
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'P0001');
do $$ begin if exists(select 1 from public.station_assisted_rentals where returned_at_server is not null) or (select status<>'in_use' from public.bikes where id='station-start-bike') then raise exception 'partial failed inspection'; end if; end $$;
select pg_temp.assert_return_unchanged('maintenance context insertion rollback');
drop trigger native_fail_block on private.station_return_blocks;
select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request;
do $$ begin if (select count(*) from private.station_return_blocks)<>1 or (select status<>'maintenance_required' from public.bikes where id='station-start-bike') then raise exception 'missing safety context'; end if; end $$;
rollback to passing;
update public.profiles set is_admin=true where id='94000000-0000-0000-0000-000000000001';
update public.bikes set status='out_of_service' where id='station-start-bike';
select pg_temp.denied($q$select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request$q$,'23514');
update request set ret=jsonb_set(jsonb_set(ret,'{bikeOutcome}','"out_of_service"'),'{returnInspection,nextStatus}','"out_of_service"');
select private.station_return_rental('94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000007',ret) from request;
do $$ begin if (select status<>'out_of_service' from public.bikes where id='station-start-bike') then raise exception 'quarantine cleared'; end if; end $$;
rollback;
\echo PASS bounded return replay, denials, pending hold, failed inspection block, actor, late rollback
