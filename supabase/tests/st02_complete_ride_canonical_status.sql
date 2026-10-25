-- Run against the complete ordered schema as the local database owner.
-- Application calls execute under authenticated, not the database owner.
\set ON_ERROR_STOP on
begin;
set local timezone = 'UTC';
insert into auth.users(id,email) values
 ('90000000-0000-0000-0000-000000000001','complete-owner@example.invalid'),
 ('90000000-0000-0000-0000-000000000002','complete-other@example.invalid');
update public.wallets set balance=1000 where id in
 ('90000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002');
insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude,active_rider_id,active_ride_started_at,active_ride_start_location)
select id,'probe',10,25,'test',2,'in_use','Start',0,0,
 '90000000-0000-0000-0000-000000000001',now()-interval '61 seconds','Start'
from unnest(array['complete-ok','complete-rollback']) id;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
set local role authenticated;
set local request.jwt.claims='{"sub":"90000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$declare msg text; begin
 begin perform public.complete_ride('complete-ok'); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'Ride belongs to a different rider' then raise exception 'Unauthorized completion was not denied: %',msg; end if;
end $$;
reset role;
select pg_temp.assert_true((select balance=1000 from public.wallets where id='90000000-0000-0000-0000-000000000001') and not exists(select 1 from public.bike_ride_history where bike_id='complete-ok'),'unauthorized completion has no effects');
set local role authenticated;
set local request.jwt.claims='{"sub":"90000000-0000-0000-0000-000000000001","role":"authenticated"}';
select (public.complete_ride('complete-ok',0.5,'End','Native return')).id;
reset role;
select pg_temp.assert_true((select status='returned_pending_inspection' and active_rider_id is null and active_ride_started_at is null and active_ride_start_location is null from public.bikes where id='complete-ok'),'return is non-rentable pending inspection with cleared ownership');
select pg_temp.assert_true((select balance=996 from public.wallets where id='90000000-0000-0000-0000-000000000001'),'wallet charged exact ceil-minute fare');
select pg_temp.assert_true((select count(*)=1 from public.bike_ride_history h join public.wallet_transactions w on w.id=h.wallet_transaction_id join public.rental_transactions r on r.id=h.id where h.bike_id='complete-ok' and h.total_cost=4 and h.billable_minutes=2 and w.amount=-4 and w.type='shared_ride' and w.wallet_id=h.profile_id and r.total_cost=h.total_cost and r.wallet_transaction_id=w.id and r.completed_at=h.completed_at),'ride, rental and wallet ledger retain completion linkage');
select pg_temp.assert_true((select count(*)=1 from public.bike_status_events where bike_id='complete-ok' and actor_id='90000000-0000-0000-0000-000000000001' and from_status='in_use' and to_status='returned_pending_inspection' and transition_kind='ride_end'),'return audit records authenticated owner and canonical transition');
create function pg_temp.reject_return_audit() returns trigger language plpgsql as $$begin if new.bike_id='complete-rollback' then raise exception 'native audit failure'; end if; return new; end $$;
create trigger native_reject_return_audit before insert on public.bike_status_events for each row execute function pg_temp.reject_return_audit();
create temp table before_failure as select jsonb_build_object('bike',(select to_jsonb(b) from public.bikes b where id='complete-rollback'),'wallet',(select to_jsonb(w) from public.wallets w where id='90000000-0000-0000-0000-000000000001'),'rides',(select count(*) from public.bike_ride_history),'rentals',(select count(*) from public.rental_transactions),'ledger',(select count(*) from public.wallet_transactions),'audit',(select count(*) from public.bike_status_events)) snapshot;
set local role authenticated;
do $$declare msg text; begin
 begin perform public.complete_ride('complete-rollback'); exception when others then msg:=sqlerrm; end;
 if msg is distinct from 'native audit failure' then raise exception 'Expected audit failure, got %',msg; end if;
end $$;
reset role;
select pg_temp.assert_true((select snapshot=jsonb_build_object('bike',(select to_jsonb(b) from public.bikes b where id='complete-rollback'),'wallet',(select to_jsonb(w) from public.wallets w where id='90000000-0000-0000-0000-000000000001'),'rides',(select count(*) from public.bike_ride_history),'rentals',(select count(*) from public.rental_transactions),'ledger',(select count(*) from public.wallet_transactions),'audit',(select count(*) from public.bike_status_events)) from before_failure),'audit failure atomically rolls back bike wallet ledger ride and rental');
rollback;
