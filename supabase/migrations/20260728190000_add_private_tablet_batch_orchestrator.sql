-- Bounded owner-only native orchestration. NOT public API04/05/06 delivery.
-- No policy approvals, evidence verification, pricing or payment authority.
begin;
alter table public.tablet_sync_batches add column if not exists raw_request text;
alter table public.tablet_sync_batches add column if not exists actor_profile_id uuid references public.profiles(id);
alter table public.tablet_sync_records add column if not exists raw_request text;
alter table public.tablet_sync_records add column if not exists actor_profile_id uuid references public.profiles(id);

create or replace function private.station_sync_batch(p_raw text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 e jsonb; d uuid; s public.staff_profiles; b public.tablet_sync_batches;
 old public.tablet_sync_records; r jsonb; raw_record text; sid uuid;
 pending jsonb; next_pending jsonb; processed text[] := '{}'; good text[] := '{}';
 progress boolean; blocked boolean; dep text; result jsonb; status text; code text;
 accepted jsonb := '[]'; conflicts jsonb := '[]'; rejected jsonb := '[]';
 response jsonb; item jsonb; n integer; entity text; attempt integer;
begin
 -- Batch resource order follows dependencies, so independent cross-device
 -- envelopes can invert business advisory/bike locks. Retry the ENTIRE batch
 -- exactly once, never a record. This subtransaction includes authorization,
 -- device locks, receipts and all canonical writes; deadlock rollback releases
 -- every lock/effect from the failed attempt. The original text/actor context is
 -- unchanged and all authorization/immutable receipt checks run again.
 -- No global serialization; a second 40P01 propagates to the caller.
 for attempt in 1..2 loop
 begin
 e := p_raw::jsonb;
 if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'records') is distinct from 'array'
 or jsonb_array_length(e->'records') not between 1 and 100
 or nullif(e->>'appVersion','') is null or nullif(e->>'createdAtDevice','') is null then
 raise exception 'SYNC_ENVELOPE_INVALID' using errcode='22023'; end if;
 d := (e->>'deviceId')::uuid;
 s := private.station_actor(d); -- auth.uid(), active actor/device/station + device row lock
 if (e->>'staffId')::uuid is distinct from s.id or (e->>'stationId')::uuid is distinct from s.station_id then
 raise exception 'SYNC_ACTOR_MISMATCH' using errcode='42501'; end if;
 select * into b from public.tablet_sync_batches where device_id=d and client_batch_id=(e->>'clientBatchId')::uuid;
 if found then
 if b.raw_request is distinct from p_raw or b.actor_profile_id is distinct from auth.uid() or b.staff_id is distinct from s.id or b.station_id is distinct from s.station_id then
 raise exception 'SYNC_BATCH_PAYLOAD_CONFLICT' using errcode='23505'; end if;
 if b.batch_status not in ('completed','partial') then raise exception 'SYNC_RECEIPT_NOT_FINAL' using errcode='55000'; end if;
 return b.response_payload;
 end if;
 -- Validate identities before any dispatch. Keep original JSON token text, not a
 -- reconstructed JSONB serialization, for immutable local-record replay.
 pending := '[]';
 for raw_record in select value::text from json_array_elements(p_raw::json->'records') loop
 r:=raw_record::jsonb;
 if jsonb_typeof(r) is distinct from 'object' or nullif(r->>'localId','') is null
 or jsonb_typeof(r->'payload') is distinct from 'object'
 or jsonb_typeof(r->'dependencies') is distinct from 'array'
 or jsonb_typeof(r->'evidence') is distinct from 'array'
 or nullif(r->>'occurredAtDevice','') is null
 or coalesce(r->>'recordType','') not in ('staff_auth_event','rider_registration','rental_start','rental_return','payment_reference','incident','bike_check','battery_log','manual_override','shift_closeout','evidence_file')
 or exists(select 1 from jsonb_array_elements(r->'dependencies') x where jsonb_typeof(x) <> 'string') then
 raise exception 'SYNC_RECORD_INVALID' using errcode='22023'; end if;
 perform (r->>'localId')::uuid;
 if exists(select 1 from jsonb_array_elements(pending) x where x->'record'->>'localId'=r->>'localId') then
 raise exception 'SYNC_DUPLICATE_LOCAL_ID' using errcode='22023'; end if;
 pending:=pending || jsonb_build_array(jsonb_build_object('record',r,'raw',raw_record));
 end loop;
 insert into public.tablet_sync_batches(client_batch_id,device_id,station_id,staff_id,actor_profile_id,record_count,request_payload,raw_request,batch_status)
 values((e->>'clientBatchId')::uuid,d,s.station_id,s.id,auth.uid(),jsonb_array_length(pending),e,p_raw,'processing') returning * into b;
 -- Stable topological passes; missing/cyclic/failed dependencies never dispatch.
 while jsonb_array_length(pending)>0 loop
 progress:=false; next_pending:='[]';
 for item in select value from jsonb_array_elements(pending) loop
 r:=item->'record'; raw_record:=item->>'raw';
 if exists(select 1 from jsonb_array_elements_text(r->'dependencies') x
 where not(x=any(processed)) and exists(select 1 from jsonb_array_elements(pending) y where y->'record'->>'localId'=x)) then
 next_pending:=next_pending||jsonb_build_array(item); continue; end if;
 progress:=true; status:='rejected'; code:=null; sid:=null; entity:=null;
 select * into old from public.tablet_sync_records where device_id=d and local_id=r->>'localId';
 if found then
 if old.raw_request is distinct from raw_record or old.actor_profile_id is distinct from auth.uid() or old.staff_id is distinct from s.id or old.station_id is distinct from s.station_id then
 status:='conflict'; result:=jsonb_build_object('localId',r->>'localId','conflictType','server_validation_failed','message','SYNC_LOCAL_PAYLOAD_CONFLICT','allowedActions',jsonb_build_array('manager_review'));
 else status:=old.sync_status; result:=old.response_payload; end if;
 else
 blocked:=false;
 for dep in select value from jsonb_array_elements_text(r->'dependencies') loop
 if dep=any(good) then continue; end if;
 if dep=any(processed) or not exists(select 1 from public.tablet_sync_records where device_id=d and local_id=dep and actor_profile_id=auth.uid() and staff_id=s.id and station_id=s.station_id and sync_status='accepted') then blocked:=true; end if;
 end loop;
 if blocked then code:='SYNC_DEPENDENCY_FAILED';
 elsif r->>'recordType' not in ('rider_registration','rental_start','rental_return') then code:='SYNC_UNSUPPORTED_RECORD';
 -- Until evidence policy + linkage exists, refuse all evidence references,
 -- including embedded inspections/payment refs. Do not pretend acceptance.
 elsif r->'evidence'<>'[]'::jsonb
 or coalesce(r->'payload'->'preUseInspection'->'evidenceLocalIds','[]')<>'[]'::jsonb
 or coalesce(r->'payload'->'returnInspection'->'evidenceLocalIds','[]')<>'[]'::jsonb
 or coalesce(r->'payload'->'paymentReference'->'evidenceLocalIds','[]')<>'[]'::jsonb
 then code:='SYNC_EVIDENCE_NOT_IMPLEMENTED';
 else
 begin
 case r->>'recordType'
 when 'rider_registration' then sid:=private.station_register_rider(d,r->'payload'); entity:='station_assisted_riders';
 when 'rental_start' then sid:=private.station_start_rental(d,(r->>'localId')::uuid,r->'payload'); entity:='station_assisted_rentals';
 when 'rental_return' then sid:=private.station_return_rental(d,(r->>'localId')::uuid,r->'payload'); entity:='station_assisted_rentals';
 end case;
 status:='accepted';
 exception when others then
 -- Only known processor domain errors are record outcomes. Late audit,
 -- trigger, storage, unexpected constraint or internal errors abort the batch.
 if sqlerrm = any(array[
 'STATION_REGISTRATION_INVALID','STATION_PAYLOAD_CONFLICT',
 'STATION_APPROVED_NOTICE_REQUIRED','STATION_START_INVALID','STATION_RIDER_INVALID',
 'STATION_CONSENT_MISMATCH','STATION_INSPECTION_REQUIRED','STATION_INSPECTION_FAILED',
 'STATION_PAYMENT_MUST_BE_PENDING','STATION_BIKE_UNAVAILABLE','STATION_RETURN_INVALID',
 'STATION_RETURN_UNMATCHED','STATION_RETURN_STALE','STATION_RETURN_BIKE_CONFLICT',
 'STATION_RETURN_TIME_INVALID','STATION_RETURN_INSPECTION_REQUIRED',
 'STATION_RETURN_CHECK_REQUIRED','STATION_RETURN_BLOCK_REQUIRED'
 ]) and sqlstate in ('22023','23505','23503','23514','40001','55000') then
 code:=sqlerrm;
 status:=case when sqlstate in ('23505','40001') then 'conflict' else 'rejected' end;
 elsif sqlstate in ('22P02','22007','22008') then code:='SYNC_VALUE_INVALID';
 else raise; end if;
 end;
 end if;
 if status='accepted' then
 result:=jsonb_build_object('localId',r->>'localId','recordType',r->>'recordType','serverId',sid,'serverStatus','accepted');
 if r ? 'businessId' then result:=result||jsonb_build_object('businessId',r->>'businessId'); end if;
 elsif status='conflict' then result:=jsonb_build_object('localId',r->>'localId','conflictType','server_validation_failed','message',code,'allowedActions',jsonb_build_array('manager_review'));
 else result:=jsonb_build_object('localId',r->>'localId','code',code,'message',code,'retryable',false); end if;
 insert into public.tablet_sync_records(sync_batch_id,local_id,record_type,business_id,device_id,station_id,staff_id,actor_profile_id,sync_status,server_entity_table,server_entity_id,request_payload,raw_request,response_payload,rejection_reason)
 values(b.id,r->>'localId',r->>'recordType',r->>'businessId',d,s.station_id,s.id,auth.uid(),status,entity,sid::text,r,raw_record,result,code);
 end if;
 processed:=array_append(processed,r->>'localId');
 if status='accepted' then good:=array_append(good,r->>'localId'); accepted:=accepted||jsonb_build_array(result);
 elsif status='conflict' then conflicts:=conflicts||jsonb_build_array(result);
 else rejected:=rejected||jsonb_build_array(result); end if;
 end loop;
 if not progress then
 -- Resolve remaining cycle members explicitly without dispatch on next pass.
 for item in select value from jsonb_array_elements(next_pending) loop
 r:=item->'record';
 -- A cycle is an invalid envelope, so no earlier canonical effect survives.
 raise exception 'SYNC_DEPENDENCY_CYCLE' using errcode='22023';
 end loop;
 end if;
 pending:=next_pending;
 end loop;
 response:=jsonb_build_object('serverTime',now(),'serverRevision',b.id,'accepted',accepted,'conflicts',conflicts,'rejected',rejected,'evidenceUploadRequests','[]'::jsonb);
 update public.tablet_sync_batches set batch_status=case when rejected='[]'::jsonb and conflicts='[]'::jsonb then 'completed' else 'partial' end,response_payload=response,completed_at=now() where id=b.id;
 return response;
 exception when deadlock_detected then
 if attempt=2 then raise; end if;
 -- PL/pgSQL variables are not rolled back with the SQL subtransaction.
 processed:='{}'; good:='{}'; accepted:='[]'; conflicts:='[]'; rejected:='[]';
 end;
 end loop;
end $$;
revoke all on function private.station_sync_batch(text) from public,anon,authenticated,service_role;
commit;
