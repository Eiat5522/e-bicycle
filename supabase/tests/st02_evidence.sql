-- Runs after the unchanged batch fixture, inside its rolled-back transaction.
create function pg_temp.evidence_error(q text,code text,msg text) returns void language plpgsql as $$
declare c text; m text; begin
 begin execute q; exception when others then get stacked diagnostics c=returned_sqlstate,m=message_text; end;
 if c is distinct from code or m is distinct from msg then raise exception 'expected % %, got % %',code,msg,c,m; end if;
end $$;
create temp table evidence_request(raw text,id uuid);
insert into evidence_request(raw) values ('{"deviceId":"94000000-0000-0000-0000-000000000004","evidenceLocalId":"96000000-0000-0000-0000-000000000001","parentLocalId":"94000000-0000-0000-0000-000000000006","parentKind":"rental_start","kind":"pre_use_photo","declaredMime":"application/test-only","declaredSize":3,"declaredSha256":"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"}');
select pg_temp.evidence_error('select private.station_evidence_reserve(raw) from evidence_request','55000','EVIDENCE_POLICY_UNAVAILABLE');
insert into private.station_evidence_policy values ('application/test-only',3,'SYNTHETIC');
select pg_temp.evidence_error('select private.station_evidence_reserve(replace(raw,''"declaredSize":3'',''"declaredSize":4'')) from evidence_request','22023','EVIDENCE_SIZE_DENIED');
select pg_temp.evidence_error('select private.station_evidence_reserve(replace(raw,''94000000-0000-0000-0000-000000000004'',''94000000-0000-0000-0000-000000000099'')) from evidence_request','42501','STATION_DEVICE_DENIED');
select pg_temp.evidence_error('select private.station_evidence_reserve((raw::jsonb||''{"deviceId":null}''::jsonb)::text) from evidence_request','22023','EVIDENCE_REQUEST_INVALID');
select pg_temp.evidence_error('select private.station_evidence_reserve((raw::jsonb||''{"url":"https://untrusted.invalid"}''::jsonb)::text) from evidence_request','22023','EVIDENCE_REQUEST_INVALID');
update evidence_request set id=(private.station_evidence_reserve(raw)).id;
do $$ begin
 if (select (private.station_evidence_reserve(raw)).id<>id from evidence_request) then raise exception 'unstable exact retry'; end if;
 if (select count(*) from private.station_evidence_reservations)<>1 then raise exception 'reservation multiplicity'; end if;
end $$;
select pg_temp.evidence_error('select private.station_evidence_reserve(raw||'' '') from evidence_request','23505','EVIDENCE_PAYLOAD_CONFLICT');
select pg_temp.evidence_error('select private.station_evidence_check_bytes(id,''abcd''::bytea) from evidence_request','22023','EVIDENCE_BYTES_MISMATCH');
select pg_temp.evidence_error('select private.station_evidence_check_bytes(id,''xyz''::bytea) from evidence_request','22023','EVIDENCE_BYTES_MISMATCH');
select pg_temp.evidence_error('select private.station_evidence_check_bytes(id,null) from evidence_request','22023','EVIDENCE_BYTES_MISMATCH');
select private.station_evidence_check_bytes(id,'abc'::bytea) from evidence_request;
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','55000','EVIDENCE_PARENT_MISSING');
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','test'),('rental','SYNTHETIC','test');
select private.station_sync_batch(envelope::text) from batch_request;
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','55000','STORAGE_VERIFIER_UNAVAILABLE');
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','55000','STORAGE_VERIFIER_UNAVAILABLE');
-- Full-row snapshots prove late insert/byte-update failures are atomic.
create function pg_temp.evidence_snapshot() returns jsonb language sql as $$
 select jsonb_build_object('reservations',(select jsonb_agg(to_jsonb(t) order by id) from private.station_evidence_reservations t),'attachments',(select jsonb_agg(to_jsonb(t) order by id) from public.attachments t),'batches',(select jsonb_agg(to_jsonb(t) order by id) from public.tablet_sync_batches t),'records',(select jsonb_agg(to_jsonb(t) order by id) from public.tablet_sync_records t),'rentals',(select jsonb_agg(to_jsonb(t) order by id) from public.station_assisted_rentals t),'riders',(select jsonb_agg(to_jsonb(t) order by id) from public.station_assisted_riders t),'bikes',(select jsonb_agg(to_jsonb(t) order by id) from public.bikes t));
$$;
create temp table evidence_before as select pg_temp.evidence_snapshot() state;
create function pg_temp.evidence_fail() returns trigger language plpgsql as $$ begin raise exception 'EVIDENCE_LATE_FAILURE' using errcode='23514'; end $$;
create trigger evidence_late_failure after insert or update on private.station_evidence_reservations for each row execute function pg_temp.evidence_fail();
select pg_temp.evidence_error('select private.station_evidence_reserve(replace(raw,''96000000-0000-0000-0000-000000000001'',''96000000-0000-0000-0000-000000000002'')) from evidence_request','23514','EVIDENCE_LATE_FAILURE');
select pg_temp.evidence_error('select private.station_evidence_check_bytes(id,''abc''::bytea) from evidence_request','23514','EVIDENCE_LATE_FAILURE');
do $$ begin if (select state from evidence_before) is distinct from pg_temp.evidence_snapshot() then raise exception 'late evidence failure leaked effects'; end if; end $$;
drop trigger evidence_late_failure on private.station_evidence_reservations;
select pg_temp.evidence_error('update private.station_evidence_reservations set declared_size=2','23514','EVIDENCE_RESERVATION_IMMUTABLE');
-- Foreign receipt, canonical mismatch and null authenticated actor.
update public.tablet_sync_records set actor_profile_id=null where local_id='94000000-0000-0000-0000-000000000006';
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','EVIDENCE_PARENT_DENIED');
update public.tablet_sync_records set actor_profile_id=auth.uid(),server_entity_id='nonexistent' where local_id='94000000-0000-0000-0000-000000000006';
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','EVIDENCE_PARENT_CANONICAL_MISMATCH');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','STATION_AUTH_REQUIRED');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
update public.tablet_devices set device_status='disabled' where id='94000000-0000-0000-0000-000000000004';
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','STATION_DEVICE_DENIED');
update public.tablet_devices set device_status='active' where id='94000000-0000-0000-0000-000000000004';
update public.stations set operating_status='inactive' where id='94000000-0000-0000-0000-000000000002';
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','STATION_INACTIVE');
update public.stations set operating_status='active' where id='94000000-0000-0000-0000-000000000002';
insert into public.tablet_devices(id,device_identifier,station_id) values ('94000000-0000-0000-0000-000000000014','foreign-evidence-device','94000000-0000-0000-0000-000000000012');
select pg_temp.evidence_error('select private.station_evidence_reserve(replace(raw,''94000000-0000-0000-0000-000000000004'',''94000000-0000-0000-0000-000000000014'')) from evidence_request','42501','STATION_DEVICE_DENIED');
update public.staff_profiles set status='inactive' where id='94000000-0000-0000-0000-000000000003';
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','STATION_STAFF_DENIED');
update public.staff_profiles set status='active',profile_id='94000000-0000-0000-0000-000000000011' where id='94000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000011',true);
select pg_temp.evidence_error('select private.station_evidence_complete(id) from evidence_request','42501','EVIDENCE_RESERVATION_DENIED');
update public.staff_profiles set profile_id='94000000-0000-0000-0000-000000000001' where id='94000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
-- Actual DML and execution, not only catalog ACL predicates.
do $$ declare role_name text; t text; q text; begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
 foreach t in array array['station_evidence_policy','station_evidence_reservations'] loop
 foreach q in array array['select * from private.'||t,'delete from private.'||t,'update private.'||t||' set '||case when t='station_evidence_policy' then 'max_bytes=max_bytes' else 'declared_size=declared_size' end,'insert into private.'||t||' default values'] loop
 execute 'set local role '||role_name;
 perform pg_temp.denied(q,'42501');
 reset role;
 end loop;
 end loop;
 execute 'set local role '||role_name;
 perform pg_temp.denied('select private.station_evidence_reserve(null)','42501');
 perform pg_temp.denied('select private.station_evidence_complete(null)','42501');
 perform pg_temp.denied('select private.station_evidence_check_bytes(null,null)','42501');
 perform pg_temp.denied('select private.station_evidence_authorize(null)','42501');
 perform pg_temp.denied('select private.station_evidence_parent(null,null,null,false)','42501');
 reset role;
 end loop;
end $$;
do $$ begin
 if exists(select 1 from public.attachments) then raise exception 'fabricated attachment'; end if;
 if exists(select 1 from private.station_evidence_reservations where byte_state<>'LOCAL_BYTE_CHECK_ONLY' or observed_size<>3 or observed_sha256<>declared_sha256) then raise exception 'false byte state'; end if;
end $$;
rollback;
