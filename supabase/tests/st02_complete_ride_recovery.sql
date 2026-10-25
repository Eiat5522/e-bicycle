-- Authenticated public RPC replay, including exact results and transactional effects.
\set ON_ERROR_STOP on
begin;
set local timezone = 'UTC';
insert into auth.users(id,email) values
 ('91000000-0000-0000-0000-000000000001','recovery-owner@example.invalid'),
 ('91000000-0000-0000-0000-000000000002','recovery-other@example.invalid');
update public.wallets set balance=1000 where id='91000000-0000-0000-0000-000000000001';
insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude,active_rider_id,active_ride_started_at,active_ride_start_location)
values ('recovery-bike','probe',10,25,'test',2,'in_use','Start',0,0,'91000000-0000-0000-0000-000000000001',now()-interval '6 minutes','Start');
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$begin if ok is not true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end$$;
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}';
-- First response deliberately not consumed by the client; later calls use same identity.
select (public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '6 minutes',2)).id;
select pg_temp.assert_true(
 to_jsonb(public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '6 minutes',2)) =
 to_jsonb(public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '6 minutes',2)), 'lost response replay returns exact canonical result');
do $$declare msg text; begin
 begin perform public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '6 minutes',99); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'Completion identity reused with a different request' then raise exception 'Changed request not rejected: %',msg; end if;
 raise notice 'PASS: same identity changed request rejected';
end$$;
set local request.jwt.claims='{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$declare msg text; begin
 begin perform public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '6 minutes',2); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'Bike is not currently in use' then raise exception 'Foreign actor receipt access not denied: %',msg; end if;
 raise notice 'PASS: foreign actor cannot replay receipt';
end$$;
reset role;
select pg_temp.assert_true((select count(*)=1 from public.bike_ride_history where bike_id='recovery-bike') and (select count(*)=1 from public.rental_transactions where bike_id='recovery-bike') and (select count(*)=1 from public.wallet_transactions where wallet_id='91000000-0000-0000-0000-000000000001' and type='shared_ride') and (select count(*)=1 from public.bike_status_events where bike_id='recovery-bike'), 'replay has one fare, ride, rental and audit');
select pg_temp.assert_true((select balance=988 from public.wallets where id='91000000-0000-0000-0000-000000000001'), 'replay never charges twice');
select pg_temp.assert_true((select count(*)=1 from public.wallet_transactions where wallet_id='91000000-0000-0000-0000-000000000001' and type='reward' and title='Milestone unlocked: First completed ride'), 'qualifying reward issued once');
select pg_temp.assert_true(not has_table_privilege('authenticated','private.ride_completion_receipts','select'), 'no direct foreign receipt access');
-- Same actor and bike, but a different authoritative start.
update public.bikes set status='in_use', active_rider_id='91000000-0000-0000-0000-000000000001', active_ride_started_at=now()-interval '1 minute' where id='recovery-bike';
create temp table scoped_before as select jsonb_build_object(
 'bike',(select to_jsonb(b) from public.bikes b where id='recovery-bike'),
 'wallet',(select to_jsonb(w) from public.wallets w where id='91000000-0000-0000-0000-000000000001'),
 'rides',(select count(*) from public.bike_ride_history), 'rentals',(select count(*) from public.rental_transactions),
 'ledger',(select count(*) from public.wallet_transactions), 'audit',(select count(*) from public.bike_status_events),
 'receipts',(select count(*) from private.ride_completion_receipts)) snapshot;
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}';
select pg_temp.assert_true((public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '6 minutes',2)).started_at=now()-interval '6 minutes', 'recorded old receipt replays while new ride active');
do $$declare msg text; begin
 begin perform public.complete_ride_recoverable('never-dispatched-old','recovery-bike',now()-interval '6 minutes',2); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'Active ride identity mismatch' then raise exception 'Delayed old request was not rejected: %',msg; end if;
 raise notice 'PASS: delayed never-recorded request rejected';
 msg:=null;
 begin perform public.complete_ride_recoverable('attempt-1','recovery-bike',now()-interval '1 minute',2); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'Completion identity reused with a different request' then raise exception 'Changed ride identity was not rejected: %',msg; end if;
 raise notice 'PASS: altered expected ride identity rejected';
end$$;
reset role;
select pg_temp.assert_true((select snapshot=jsonb_build_object(
 'bike',(select to_jsonb(b) from public.bikes b where id='recovery-bike'),
 'wallet',(select to_jsonb(w) from public.wallets w where id='91000000-0000-0000-0000-000000000001'),
 'rides',(select count(*) from public.bike_ride_history), 'rentals',(select count(*) from public.rental_transactions),
 'ledger',(select count(*) from public.wallet_transactions), 'audit',(select count(*) from public.bike_status_events),
 'receipts',(select count(*) from private.ride_completion_receipts)) from scoped_before), 'old replay and delayed request leave new ride wallet history ledger audit receipts unchanged');
select pg_temp.assert_true(to_regprocedure('public.complete_ride_recoverable(text,text,numeric,text,text,jsonb,jsonb,numeric)') is null, 'unscoped recoverable overload absent');
select pg_temp.assert_true(has_function_privilege('authenticated','public.complete_ride(text,numeric,text,text,jsonb,jsonb,numeric)','execute'), 'legacy immediate completion compatibility retained');
-- Receipt persistence failure must also roll back the entire canonical mutation.
insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude,active_rider_id,active_ride_started_at,active_ride_start_location)
values ('recovery-rollback','probe',10,25,'test',2,'in_use','Start',0,0,'91000000-0000-0000-0000-000000000001',now()-interval '6 minutes','Start');
create function pg_temp.reject_receipt() returns trigger language plpgsql as $$begin raise exception 'receipt unavailable'; end$$;
create trigger reject_receipt before insert on private.ride_completion_receipts for each row execute function pg_temp.reject_receipt();
create temp table recovery_before as select jsonb_build_object(
 'wallet',(select to_jsonb(w) from public.wallets w where id='91000000-0000-0000-0000-000000000001'),
 'rides',(select count(*) from public.bike_ride_history), 'rentals',(select count(*) from public.rental_transactions),
 'ledger',(select count(*) from public.wallet_transactions), 'audit',(select count(*) from public.bike_status_events),
 'rewards',(select count(*) from public.reward_milestones), 'receipts',(select count(*) from private.ride_completion_receipts)) snapshot;
set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$declare msg text; begin
 begin perform public.complete_ride_recoverable('receipt-failure','recovery-rollback',now()-interval '6 minutes',2); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'receipt unavailable' then raise exception 'Expected receipt failure, got %',msg; end if;
end$$;
reset role;
select pg_temp.assert_true((select snapshot=jsonb_build_object(
 'wallet',(select to_jsonb(w) from public.wallets w where id='91000000-0000-0000-0000-000000000001'),
 'rides',(select count(*) from public.bike_ride_history), 'rentals',(select count(*) from public.rental_transactions),
 'ledger',(select count(*) from public.wallet_transactions), 'audit',(select count(*) from public.bike_status_events),
 'rewards',(select count(*) from public.reward_milestones), 'receipts',(select count(*) from private.ride_completion_receipts)) from recovery_before)
 and (select status='in_use' and active_rider_id='91000000-0000-0000-0000-000000000001' from public.bikes where id='recovery-rollback'),
 'receipt failure rolls back wallet fare rewards rental audit bike and receipt');
rollback;
