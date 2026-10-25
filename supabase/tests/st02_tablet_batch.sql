-- Continues fixture transaction; synthetic approvals are always rolled back.
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'assertion: %',label; end if; end $$;
select pg_temp.denied($q$select private.station_sync_batch(envelope::text) from batch_request$q$,'00000') where false;
-- Empty approval registry fails closed and blocks descendants.
update batch_request set response=private.station_sync_batch(envelope::text);
select pg_temp.assert((select jsonb_array_length(response->'accepted')=0 and jsonb_array_length(response->'rejected')=3 from batch_request),'approval gate');
select pg_temp.assert(not exists(select 1 from public.station_assisted_riders),'no unapproved canonical effect');
-- Roll the failed receipts back independently of fixture setup.
delete from public.tablet_sync_records; delete from public.tablet_sync_batches;
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','native-test-only'),('rental','SYNTHETIC','native-test-only');
-- Auth checks run BEFORE cached receipt lookup.
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000011',true);
select pg_temp.denied($q$select private.station_sync_batch(envelope::text) from batch_request$q$,'42501');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select pg_temp.denied($q$select private.station_sync_batch((envelope||'{"staffId":"94000000-0000-0000-0000-000000000011"}')::text) from batch_request$q$,'42501');
select pg_temp.denied($q$select private.station_sync_batch((envelope||'{"stationId":"94000000-0000-0000-0000-000000000012"}')::text) from batch_request$q$,'42501');
insert into public.tablet_devices(id,device_identifier,station_id) values ('95000000-0000-0000-0000-000000000030','native-foreign-batch','94000000-0000-0000-0000-000000000012');
select pg_temp.denied($q$select private.station_sync_batch((envelope||'{"deviceId":"95000000-0000-0000-0000-000000000030"}')::text) from batch_request$q$,'42501');
update public.staff_profiles set status='inactive';
select pg_temp.denied($q$select private.station_sync_batch(envelope::text) from batch_request$q$,'42501');
update public.staff_profiles set status='active';
update public.tablet_devices set device_status='disabled';
select pg_temp.denied($q$select private.station_sync_batch(envelope::text) from batch_request$q$,'42501');
update public.tablet_devices set device_status='active';
update public.stations set operating_status='inactive';
select pg_temp.denied($q$select private.station_sync_batch(envelope::text) from batch_request$q$,'42501');
update public.stations set operating_status='active';
-- Unexpected late processor failure aborts the entire batch, not just the record.
create function pg_temp.fail_batch_audit() returns trigger language plpgsql as $$ begin if new.action_performed='station_rental_returned' then raise exception 'unexpected audit failure'; end if; return new; end $$;
create trigger native_batch_fail before insert on public.audit_logs for each row execute function pg_temp.fail_batch_audit();
select pg_temp.denied($q$select private.station_sync_batch(envelope::text) from batch_request$q$,'P0001');
select pg_temp.assert(not exists(select 1 from public.tablet_sync_batches) and not exists(select 1 from public.station_assisted_rentals) and not exists(select 1 from public.station_assisted_riders) and not exists(select 1 from public.bike_status_events),'whole unexpected batch rollback');
drop trigger native_batch_fail on public.audit_logs;
-- Reverse dependency order must still register, start, return exactly once.
update batch_request set response=private.station_sync_batch(envelope::text);
select pg_temp.assert((select jsonb_array_length(response->'accepted')=3 and response->'rejected'='[]' and response->'conflicts'='[]' from batch_request),'supported three record flow');
select pg_temp.assert((select status='returned_pending_inspection' from public.bikes where id='station-start-bike'),'canonical return');
select pg_temp.assert((select count(*)=1 from public.station_assisted_rentals) and (select count(*)=3 from public.audit_logs where actor_staff_id='94000000-0000-0000-0000-000000000003') and (select count(*)=2 from public.bike_status_events),'exactly once effects');
select pg_temp.assert((select response=private.station_sync_batch(envelope::text) from batch_request),'response loss retry');
select pg_temp.denied($q$select private.station_sync_batch(envelope::text || ' ') from batch_request$q$,'23505');
select pg_temp.denied($q$select private.station_sync_batch((envelope||'{"appVersion":"changed"}')::text) from batch_request$q$,'23505');
-- New batch / same immutable records returns their previous mappings.
create temp table variants as select envelope||'{"clientBatchId":"95000000-0000-0000-0000-000000000002"}'::jsonb as e from batch_request;
select pg_temp.assert((select (private.station_sync_batch(e::text)->'accepted')=(select response->'accepted' from batch_request) from variants),'cross batch record replay');
update variants set e=jsonb_set(e,'{clientBatchId}','"95000000-0000-0000-0000-000000000003"');
update variants set e=jsonb_set(e,'{records,2,payload,name}','"changed"');
select pg_temp.assert((select jsonb_array_length(private.station_sync_batch(e::text)->'conflicts')=1 from variants),'changed local identity conflict');
select pg_temp.assert((select count(*)=3 from public.tablet_sync_records),'successful receipts immutable');
select pg_temp.assert((select jsonb_array_length(private.station_sync_batch(replace((envelope||'{"clientBatchId":"95000000-0000-0000-0000-000000000009"}')::text,'"payload":','"payload" : '))->'conflicts')=3 from batch_request),'raw local record formatting is immutable');
-- A new independent malformed/unsupported record is durable rejection, no success.
create temp table single as select jsonb_build_object('localId','95000000-0000-0000-0000-000000000010','recordType','bike_check','payload','{}'::jsonb,'evidence','[]'::jsonb,'dependencies','[]'::jsonb,'occurredAtDevice','2026-07-28T12:00:00Z') r;
update variants set e=jsonb_set(jsonb_set(e,'{clientBatchId}','"95000000-0000-0000-0000-000000000004"'),'{records}',(select jsonb_build_array(r) from single));
select pg_temp.assert((select private.station_sync_batch(e::text)->'rejected'->0->>'code'='SYNC_UNSUPPORTED_RECORD' from variants),'undefined bike check rejected');
-- Expected domain conflict after a bike write must roll that record back.
create function pg_temp.domain_fail_audit() returns trigger language plpgsql as $$ begin if new.action_performed='station_rider_registered' then raise exception 'STATION_RETURN_BLOCK_REQUIRED' using errcode='23514'; end if; return new; end $$;
create trigger native_batch_domain_fail before insert on public.audit_logs for each row execute function pg_temp.domain_fail_audit();
update variants set e=jsonb_set(jsonb_set(e,'{clientBatchId}','"95000000-0000-0000-0000-000000000005"'),'{records}',(select jsonb_build_array(jsonb_set(jsonb_set(envelope->'records'->2,'{localId}','"95000000-0000-0000-0000-000000000011"'),'{payload,riderLocalId}','"95000000-0000-0000-0000-000000000011"')) from batch_request));
select pg_temp.assert((select private.station_sync_batch(e::text)->'rejected'->0->>'code'='STATION_RETURN_BLOCK_REQUIRED' from variants),'domain failure recorded');
select pg_temp.assert((select count(*)=1 from public.station_assisted_riders),'domain subtransaction rollback');
drop trigger native_batch_domain_fail on public.audit_logs;
select pg_temp.assert((select response=private.station_sync_batch(envelope::text) from batch_request),'previous batch survives processor failure');
-- Required evidence must not be passed through to unimplemented policy.
update variants set e=jsonb_set(jsonb_set(jsonb_set(e,'{clientBatchId}','"95000000-0000-0000-0000-000000000006"'),'{records,0,localId}','"95000000-0000-0000-0000-000000000012"'),'{records,0,evidence}','[{"required":true,"evidenceLocalId":"missing"}]');
select pg_temp.assert((select private.station_sync_batch(e::text)->'rejected'->0->>'code'='SYNC_EVIDENCE_NOT_IMPLEMENTED' from variants),'evidence fail closed');
-- Partial batch: independent registration survives unavailable-bike conflict;
-- dependent return never dispatches. Retrying keeps these exact outcomes.
create temp table partial_case as select envelope||'{"clientBatchId":"95000000-0000-0000-0000-000000000020"}'::jsonb e, null::jsonb response from batch_request;
update partial_case set e=jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(e,
'{records,2,localId}','"95000000-0000-0000-0000-000000000021"'),
'{records,2,payload,riderLocalId}','"95000000-0000-0000-0000-000000000021"'),
'{records,1,localId}','"95000000-0000-0000-0000-000000000022"'),
'{records,1,payload,riderLocalId}','"95000000-0000-0000-0000-000000000021"'),
'{records,1,payload,rentalId}','"new unavailable bike rental"'),
'{records,1,dependencies}','["95000000-0000-0000-0000-000000000021"]');
update partial_case set e=jsonb_set(jsonb_set(e,'{records,0,localId}','"95000000-0000-0000-0000-000000000023"'),'{records,0,dependencies}','["95000000-0000-0000-0000-000000000022"]');
update partial_case set e=e #- '{records,1,payload,paymentReference}';
update partial_case set response=private.station_sync_batch(e::text);
select pg_temp.assert((select jsonb_array_length(response->'accepted')=1 and jsonb_array_length(response->'conflicts')=1 and response->'rejected'->0->>'code'='SYNC_DEPENDENCY_FAILED' from partial_case),'partial batch dependency failure');
select pg_temp.assert((select response=private.station_sync_batch(e::text) from partial_case),'partial receipt retry stable');
select pg_temp.assert((select count(*)=1 from public.station_assisted_rentals) and (select count(*)=2 from public.station_assisted_riders),'partial canonical outcome');
-- Missing predecessor and cycles cannot produce canonical records.
update variants set e=jsonb_set(jsonb_set(jsonb_set(e,'{clientBatchId}','"95000000-0000-0000-0000-000000000007"'),'{records,0,localId}','"95000000-0000-0000-0000-000000000013"'),'{records,0,dependencies}','["absent"]');
select pg_temp.assert((select private.station_sync_batch(e::text)->'rejected'->0->>'code'='SYNC_DEPENDENCY_FAILED' from variants),'missing dependency rejected');
update variants set e=jsonb_set(jsonb_set(e,'{clientBatchId}','"95000000-0000-0000-0000-000000000008"'),'{records,0,dependencies}','["95000000-0000-0000-0000-000000000013"]');
select pg_temp.denied($q$select private.station_sync_batch(e::text) from variants$q$,'22023');
select pg_temp.assert(not exists(select 1 from public.tablet_sync_batches where client_batch_id='95000000-0000-0000-0000-000000000008'),'cycle rollback');
do $$ declare ro text; begin foreach ro in array array['anon','authenticated','service_role'] loop
 if has_function_privilege(ro,'private.station_sync_batch(text)','execute') then raise exception 'batch publicly executable'; end if; end loop; end $$;
rollback;
\echo PASS private batch flow replay auth dependencies evidence and rollback
