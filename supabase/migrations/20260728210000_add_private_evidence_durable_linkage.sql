-- API08 local engineering: transactional PostgreSQL byte snapshot, not provider WORM.
-- No production policy or public RPC grants. No bucket or retention approval implied.
begin;
alter table public.attachments drop constraint if exists attachments_entity_table_check;
alter table public.attachments add constraint attachments_entity_table_check check(entity_table in
 ('rental_transactions','payments','maintenance_logs','incidents','audit_logs','batteries','bikes','stations','station_assisted_riders','station_assisted_rentals'));
-- Restrictive policy closes inherited broad attachment policies for the new
-- station entity kinds. Public clients cannot select or mutate these rows.
drop policy if exists station_evidence_owner_only on public.attachments;
create policy station_evidence_owner_only on public.attachments as restrictive for all to anon,authenticated
 using(entity_table not in ('station_assisted_riders','station_assisted_rentals'))
 with check(entity_table not in ('station_assisted_riders','station_assisted_rentals'));
-- service_role bypasses RLS; an invoker trigger additionally requires the table
-- owner for new station-entity INSERT/retargeting. SECURITY DEFINER finalization
-- executes as that owner. No request-set GUC can bypass this check.
create or replace function private.station_evidence_attachment_owner()
returns trigger language plpgsql set search_path='' as $$ begin
 if new.entity_table in ('station_assisted_riders','station_assisted_rentals') and
 current_user is distinct from (select pg_get_userbyid(relowner) from pg_catalog.pg_class where oid='public.attachments'::regclass) then
 raise exception 'EVIDENCE_OWNER_REQUIRED' using errcode='42501'; end if;
 return new;
end $$;
drop trigger if exists station_evidence_attachment_owner on public.attachments;
create trigger station_evidence_attachment_owner before insert or update on public.attachments for each row execute function private.station_evidence_attachment_owner();
revoke all on function private.station_evidence_attachment_owner() from public,anon,authenticated,service_role;

create table if not exists private.station_evidence_requirements (
 device_id uuid not null references public.tablet_devices(id),
 evidence_local_id uuid not null,
 parent_record_id uuid not null references public.tablet_sync_records(id),
 reference jsonb not null,
 primary key(device_id,evidence_local_id)
);
create table if not exists private.station_evidence_blobs (
 reservation_id uuid primary key references private.station_evidence_reservations(id),
 attachment_id uuid not null unique references public.attachments(id),
 bytes bytea not null,
 uploaded_at_device text not null,
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 receipt jsonb not null,
 check(octet_length(bytes)>0),
 check(encode(extensions.digest(bytes,'sha256'),'hex')=sha256)
);
alter table private.station_evidence_requirements enable row level security;
alter table private.station_evidence_blobs enable row level security;
revoke all on private.station_evidence_requirements,private.station_evidence_blobs from public,anon,authenticated,service_role;

create or replace function private.station_evidence_refs_valid(r jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare x jsonb; ids text[]:='{}'; embedded jsonb; item jsonb;
begin
 if jsonb_typeof(r->'evidence') is distinct from 'array' or jsonb_array_length(r->'evidence')>100 then return false; end if;
 for x in select value from jsonb_array_elements(r->'evidence') loop
 if jsonb_typeof(x) is distinct from 'object' or
 (select array_agg(k order by k) from jsonb_object_keys(x) k) is distinct from array['byteSize','evidenceLocalId','kind','mimeType','required','sha256']::text[] or
 jsonb_typeof(x->'required') is distinct from 'boolean' or
 coalesce(x->>'evidenceLocalId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
 x->>'evidenceLocalId'=any(ids) or
 coalesce(x->>'sha256','') !~ '^[0-9a-f]{64}$' or
 coalesce(x->>'kind','') not in ('pre_use_photo','return_photo','payment_slip','incident_photo','bike_check_photo','battery_photo','backup_form_photo') or
 jsonb_typeof(x->'byteSize') is distinct from 'number' or coalesce(x->>'byteSize','') !~ '^[1-9][0-9]{0,8}$' or
 not exists(select 1 from private.station_evidence_policy where mime=x->>'mimeType' and max_bytes>=(x->>'byteSize')::bigint)
 then return false; end if;
 ids:=array_append(ids,x->>'evidenceLocalId');
 end loop;
 foreach embedded in array array[coalesce(r->'payload'->'preUseInspection'->'evidenceLocalIds','[]'),coalesce(r->'payload'->'returnInspection'->'evidenceLocalIds','[]'),coalesce(r->'payload'->'paymentReference'->'evidenceLocalIds','[]')] loop
 if jsonb_typeof(embedded) is distinct from 'array' then return false; end if;
 if (select count(*)<>count(distinct value) from jsonb_array_elements(embedded)) then return false; end if;
 for item in select value from jsonb_array_elements(embedded) loop
 if jsonb_typeof(item) is distinct from 'string' or ((item#>>'{}')=any(ids)) is distinct from true then return false; end if;
 end loop;
 end loop;
 return true;
exception when invalid_parameter_value then return false;
end $$;

create or replace function private.station_evidence_register_refs(p_device uuid,p_local text,p_refs jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare r public.tablet_sync_records; x jsonb;
begin
 perform private.station_actor(p_device);
 select * into strict r from public.tablet_sync_records where device_id=p_device and local_id=p_local for update;
 if r.actor_profile_id is distinct from auth.uid() then raise exception 'EVIDENCE_PARENT_DENIED' using errcode='42501'; end if;
 for x in select value from jsonb_array_elements(p_refs) loop
 insert into private.station_evidence_requirements values(p_device,(x->>'evidenceLocalId')::uuid,r.id,x);
 end loop;
end $$;

-- Transactional revalidation also permits a canonical parent awaiting required files.
create or replace function private.station_evidence_parent(p_device uuid,p_local uuid,p_kind text,p_required boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; r public.tablet_sync_records; target uuid;
begin
 s:=private.station_actor(p_device);
 select * into r from public.tablet_sync_records where device_id=p_device and local_id=p_local::text for share;
 if not found then
 if p_required then raise exception 'EVIDENCE_PARENT_MISSING' using errcode='55000'; end if;
 return null;
 end if;
 if r.actor_profile_id is distinct from auth.uid() or r.staff_id is distinct from s.id or r.station_id is distinct from s.station_id
 or r.record_type is distinct from p_kind or r.sync_status not in ('accepted','accepted_pending_evidence') then
 raise exception 'EVIDENCE_PARENT_DENIED' using errcode='42501'; end if;
 if p_kind='rider_registration' and r.server_entity_table='station_assisted_riders' then
 select id into target from public.station_assisted_riders where id::text=r.server_entity_id and device_id=p_device and rider_local_id=p_local and station_id=s.station_id and registered_by_staff_id=s.id for share;
 elsif p_kind='rental_start' and r.server_entity_table='station_assisted_rentals' then
 select id into target from public.station_assisted_rentals where id::text=r.server_entity_id and device_id=p_device and start_local_id=p_local and start_station_id=s.station_id and started_by_staff_id=s.id for share;
 elsif p_kind='rental_return' and r.server_entity_table='station_assisted_rentals' then
 select id into target from public.station_assisted_rentals where id::text=r.server_entity_id and return_device_id=p_device and return_local_id=p_local and return_station_id=s.station_id and returned_by_staff_id=s.id for share;
 end if;
 if target is null then raise exception 'EVIDENCE_PARENT_CANONICAL_MISMATCH' using errcode='42501'; end if;
 return target;
end $$;

-- Fail closed against every ordinary UPDATE/DELETE, including owner SQL. A superuser
-- can disable triggers: this is durable application immutability, not privileged WORM.
create or replace function private.station_evidence_blob_immutable()
returns trigger language plpgsql set search_path='' as $$ begin
 raise exception 'EVIDENCE_DURABLE_IMMUTABLE' using errcode='23514';
end $$;
drop trigger if exists station_evidence_blob_immutable on private.station_evidence_blobs;
create trigger station_evidence_blob_immutable before update or delete on private.station_evidence_blobs for each row execute function private.station_evidence_blob_immutable();
drop trigger if exists station_evidence_blob_no_truncate on private.station_evidence_blobs;
create trigger station_evidence_blob_no_truncate before truncate on private.station_evidence_blobs for each statement execute function private.station_evidence_blob_immutable();
drop trigger if exists station_evidence_requirements_immutable on private.station_evidence_requirements;
create trigger station_evidence_requirements_immutable before update or delete on private.station_evidence_requirements for each row execute function private.station_evidence_blob_immutable();
drop trigger if exists station_evidence_requirements_no_truncate on private.station_evidence_requirements;
create trigger station_evidence_requirements_no_truncate before truncate on private.station_evidence_requirements for each statement execute function private.station_evidence_blob_immutable();
create or replace function private.station_evidence_attachment_immutable()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from private.station_evidence_blobs where attachment_id=old.id) then
 raise exception 'EVIDENCE_DURABLE_IMMUTABLE' using errcode='23514'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
drop trigger if exists station_evidence_attachment_immutable on public.attachments;
create trigger station_evidence_attachment_immutable before update or delete on public.attachments for each row execute function private.station_evidence_attachment_immutable();

create or replace function private.station_evidence_upload_reserve(p_raw text)
returns private.station_evidence_reservations language plpgsql security definer set search_path='' as $$
declare r private.station_evidence_reservations; ref jsonb; rec uuid;
begin
 r:=private.station_evidence_reserve(p_raw);
 perform private.station_evidence_parent(r.device_id,r.parent_local_id,r.parent_kind,true);
 select id into rec from public.tablet_sync_records where device_id=r.device_id and local_id=r.parent_local_id::text;
 select reference into ref from private.station_evidence_requirements where device_id=r.device_id and evidence_local_id=r.evidence_local_id and parent_record_id=rec;
 if ref is null or ref->>'kind'<>r.evidence_kind or ref->>'mimeType'<>r.declared_mime or (ref->>'byteSize')::bigint<>r.declared_size or ref->>'sha256'<>r.declared_sha256 then
 raise exception 'EVIDENCE_REFERENCE_MISMATCH' using errcode='42501'; end if;
 return r;
end $$;

create or replace function private.station_evidence_completion_receipt(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.station_evidence_reservations; answer jsonb;
begin
 r:=private.station_evidence_authorize(p_id);
 perform private.station_evidence_parent(r.device_id,r.parent_local_id,r.parent_kind,true);
 select receipt into answer from private.station_evidence_blobs where reservation_id=r.id;
 return answer;
end $$;

-- Read little-endian BMP header fields without trusting caller MIME claims.
create or replace function private.station_evidence_u32(b bytea,o integer)
returns bigint language sql immutable set search_path='' as $$
 select get_byte(b,o)::bigint+get_byte(b,o+1)::bigint*256+get_byte(b,o+2)::bigint*65536+get_byte(b,o+3)::bigint*16777216
$$;
create or replace function private.station_evidence_bmp(b bytea)
returns boolean language plpgsql immutable set search_path='' as $$
declare w bigint; h bigint; raster bigint;
begin
 if b is null or octet_length(b)<54 then return false; end if;
 if substring(b from 1 for 2)<>decode('424d','hex') or private.station_evidence_u32(b,2)<>octet_length(b) or
 private.station_evidence_u32(b,6)<>0 or private.station_evidence_u32(b,10)<>54 or private.station_evidence_u32(b,14)<>40 or
 get_byte(b,26)<>1 or get_byte(b,27)<>0 or get_byte(b,28)<>24 or get_byte(b,29)<>0 or private.station_evidence_u32(b,30)<>0 or
 private.station_evidence_u32(b,46)<>0 or private.station_evidence_u32(b,50)<>0 then return false; end if;
 w:=private.station_evidence_u32(b,18); h:=private.station_evidence_u32(b,22);
 if w not between 1 and 2147483647 or h not between 1 and 2147483647 then return false; end if;
 -- Reject before multiplication can overflow a bigint.
 if w>octet_length(b) or h>octet_length(b) then return false; end if;
 raster:=((w*3+3)/4)*4*h;
 return raster=octet_length(b)-54 and private.station_evidence_u32(b,34) in (0,raster);
end $$;

-- Actual bytes, not a caller-supplied observed hash. Owner transport supplies the
-- same bounded image bytes it verified. Snapshot and link commit atomically.
create or replace function private.station_evidence_finalize(p_id uuid,p_bytes bytea,p_uploaded_at_device text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.station_evidence_reservations; target uuid; a uuid; answer jsonb;
 rec public.tablet_sync_records; ref jsonb; cap bigint;
begin
 r:=private.station_evidence_authorize(p_id);
 target:=private.station_evidence_parent(r.device_id,r.parent_local_id,r.parent_kind,true);
 select * into strict rec from public.tablet_sync_records where device_id=r.device_id and local_id=r.parent_local_id::text for update;
 select max_bytes into cap from private.station_evidence_policy where mime=r.declared_mime for share;
 if cap is null then raise exception 'EVIDENCE_POLICY_UNAVAILABLE' using errcode='55000'; end if;
 if p_bytes is null or octet_length(p_bytes)<>r.declared_size or octet_length(p_bytes)>cap or
 encode(extensions.digest(p_bytes,'sha256'),'hex')<>r.declared_sha256 then
 raise exception 'EVIDENCE_BYTES_MISMATCH' using errcode='22023'; end if;
 if r.declared_mime<>'image/bmp' or not private.station_evidence_bmp(p_bytes) then raise exception 'EVIDENCE_IMAGE_INVALID' using errcode='22023'; end if;
 select reference into ref from private.station_evidence_requirements where device_id=r.device_id and evidence_local_id=r.evidence_local_id and parent_record_id=rec.id;
 if ref is null or ref->>'kind'<>r.evidence_kind or ref->>'mimeType'<>r.declared_mime or (ref->>'byteSize')::bigint<>r.declared_size or ref->>'sha256'<>r.declared_sha256 then
 raise exception 'EVIDENCE_REFERENCE_MISMATCH' using errcode='42501'; end if;
 select receipt into answer from private.station_evidence_blobs where reservation_id=p_id;
 if found then
 if answer->>'uploadedAtDevice' is distinct from p_uploaded_at_device then raise exception 'EVIDENCE_COMPLETION_CONFLICT' using errcode='23505'; end if;
 return answer; end if;
 if p_uploaded_at_device is null or not isfinite(p_uploaded_at_device::timestamptz) or p_uploaded_at_device::timestamptz>clock_timestamp()+interval '60 seconds' then
 raise exception 'EVIDENCE_UPLOAD_TIME_INVALID' using errcode='22023'; end if;
 -- Never label this URL a Supabase download or expose an inaccessible Storage URL.
 a:=extensions.gen_random_uuid();
 insert into public.attachments(id,entity_table,entity_id,attachment_type,file_url,content_type,uploaded_by_profile_id)
 values(a,rec.server_entity_table,target::text,case when r.evidence_kind='payment_slip' then 'payment_slip' else 'photo_evidence' end,'evidence-db:'||a::text,r.declared_mime,auth.uid());
 answer:=jsonb_build_object('attachmentId',a,'serverAttachmentId',a,'evidenceLocalId',r.evidence_local_id,'uploadedAtDevice',p_uploaded_at_device,'reservationId',p_id,'state','DURABLE_DATABASE_SNAPSHOT','linked',true,'sha256',r.declared_sha256,'byteSize',r.declared_size);
 insert into private.station_evidence_blobs(reservation_id,attachment_id,bytes,uploaded_at_device,sha256,receipt) values(p_id,a,p_bytes,p_uploaded_at_device,r.declared_sha256,answer);
 if not exists(select 1 from private.station_evidence_requirements q
 where q.parent_record_id=rec.id and (q.reference->>'required')::boolean and not exists(
 select 1 from private.station_evidence_blobs b join private.station_evidence_reservations e on e.id=b.reservation_id
 where e.device_id=q.device_id and e.evidence_local_id=q.evidence_local_id and e.parent_local_id=r.parent_local_id)) then
 update public.tablet_sync_records set sync_status='accepted',response_payload=jsonb_set(response_payload,'{serverStatus}','"accepted"') where id=rec.id;
 end if;
 return answer;
end $$;
revoke all on function private.station_evidence_upload_reserve(text),private.station_evidence_completion_receipt(uuid),private.station_evidence_u32(bytea,integer),private.station_evidence_bmp(bytea),private.station_evidence_refs_valid(jsonb),private.station_evidence_register_refs(uuid,text,jsonb),private.station_evidence_finalize(uuid,bytea,text),private.station_evidence_blob_immutable(),private.station_evidence_attachment_immutable() from public,anon,authenticated,service_role;
-- Batch replacement follows, preserving original raw request identity and retry logic.
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
 if dep=any(processed) or not exists(select 1 from public.tablet_sync_records where device_id=d and local_id=dep and actor_profile_id=auth.uid() and staff_id=s.id and station_id=s.station_id and sync_status in ('accepted','accepted_pending_evidence')) then blocked:=true; end if;
 end loop;
 if blocked then code:='SYNC_DEPENDENCY_FAILED';
 elsif r->>'recordType' not in ('rider_registration','rental_start','rental_return') then code:='SYNC_UNSUPPORTED_RECORD';
 elsif not private.station_evidence_refs_valid(r) then code:='SYNC_EVIDENCE_NOT_IMPLEMENTED';
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
 if exists(select 1 from jsonb_array_elements(r->'evidence') x where (x->>'required')::boolean) then status:='accepted_pending_evidence'; end if;
 result:=jsonb_build_object('localId',r->>'localId','recordType',r->>'recordType','serverId',sid,'serverStatus',status);
 if r ? 'businessId' then result:=result||jsonb_build_object('businessId',r->>'businessId'); end if;
 elsif status='conflict' then result:=jsonb_build_object('localId',r->>'localId','conflictType','server_validation_failed','message',code,'allowedActions',jsonb_build_array('manager_review'));
 else result:=jsonb_build_object('localId',r->>'localId','code',code,'message',code,'retryable',false); end if;
 insert into public.tablet_sync_records(sync_batch_id,local_id,record_type,business_id,device_id,station_id,staff_id,actor_profile_id,sync_status,server_entity_table,server_entity_id,request_payload,raw_request,response_payload,rejection_reason)
 values(b.id,r->>'localId',r->>'recordType',r->>'businessId',d,s.station_id,s.id,auth.uid(),status,entity,sid::text,r,raw_record,result,code);
 if status in ('accepted','accepted_pending_evidence') then perform private.station_evidence_register_refs(d,r->>'localId',r->'evidence'); end if;
 end if;
 processed:=array_append(processed,r->>'localId');
 if status in ('accepted','accepted_pending_evidence') then good:=array_append(good,r->>'localId'); accepted:=accepted||jsonb_build_array(result);
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
 response:=jsonb_build_object('serverTime',now(),'serverRevision',b.id,'accepted',accepted,'conflicts',conflicts,'rejected',rejected,'evidenceUploadRequests',coalesce((select jsonb_agg(jsonb_build_object('evidenceLocalId',q.evidence_local_id,'parentLocalId',t.local_id,'reason',case when (q.reference->>'required')::boolean then 'required' else 'not_linked' end) order by t.local_id,q.evidence_local_id) from private.station_evidence_requirements q join public.tablet_sync_records t on t.id=q.parent_record_id where t.sync_batch_id=b.id),'[]'::jsonb));
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
