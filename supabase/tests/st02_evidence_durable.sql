create function pg_temp.finish_evidence(p_id uuid,p_bytes bytea) returns jsonb language sql as $$select private.station_evidence_finalize(p_id,p_bytes,'2026-07-28T12:00:00Z')$$;
-- Synthetic BMP policy and byte-snapshot acceptance; never operational approval.
-- Run after the unchanged batch fixture. All changes roll back.
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','test'),('rental','SYNTHETIC','test');
insert into private.station_evidence_policy values ('image/bmp',1024,'SYNTHETIC local durable snapshot');
create temp table durable_bytes as select decode('424d3a00000000000000360000002800000001000000010000000100180000000000040000000000000000000000000000000000000000000000','hex') bytes;
-- One required file on rental_start. Original record text must survive intact.
update batch_request set envelope=jsonb_set(envelope,'{records,1,evidence}',jsonb_build_array(jsonb_build_object('evidenceLocalId','96000000-0000-0000-0000-000000000001','kind','pre_use_photo','required',true,'mimeType','image/bmp','byteSize',58,'sha256',(select encode(extensions.digest(bytes,'sha256'),'hex') from durable_bytes))));
update batch_request set envelope=jsonb_set(envelope,'{records,1,evidence}',(envelope->'records'->1->'evidence')||jsonb_build_array(jsonb_set(envelope->'records'->1->'evidence'->0,'{evidenceLocalId}','"96000000-0000-0000-0000-000000000002"')));
do $$ declare invalid jsonb; begin
 foreach invalid in array array['[null]'::jsonb,'[42]'::jsonb,'[true]'::jsonb,'["96000000-0000-0000-0000-000000000099"]'::jsonb,'["96000000-0000-0000-0000-000000000001","96000000-0000-0000-0000-000000000001"]'::jsonb] loop
 if (select private.station_evidence_refs_valid(jsonb_set(envelope->'records'->1,'{payload,preUseInspection,evidenceLocalIds}',invalid)) from batch_request) then raise exception 'malformed embedded references accepted: %',invalid; end if;
 end loop;
end $$;
update batch_request set response=private.station_sync_batch(envelope::text);
do $$ begin
 if (select jsonb_array_length(response->'rejected') from batch_request)<>0 then raise exception 'evidence parent rejected: %',(select response from batch_request); end if;
 if (select sync_status from public.tablet_sync_records where local_id='94000000-0000-0000-0000-000000000006')<>'accepted_pending_evidence' then raise exception 'missing pending state'; end if;
 if (select response->'evidenceUploadRequests' from batch_request) is distinct from '[{"evidenceLocalId":"96000000-0000-0000-0000-000000000001","parentLocalId":"94000000-0000-0000-0000-000000000006","reason":"required"},{"evidenceLocalId":"96000000-0000-0000-0000-000000000002","parentLocalId":"94000000-0000-0000-0000-000000000006","reason":"required"}]'::jsonb then raise exception 'missing sync request'; end if;
end $$;
create temp table durable_reservation as select (private.station_evidence_reserve(jsonb_build_object('deviceId','94000000-0000-0000-0000-000000000004','evidenceLocalId','96000000-0000-0000-0000-000000000001','parentLocalId','94000000-0000-0000-0000-000000000006','parentKind','rental_start','kind','pre_use_photo','declaredMime','image/bmp','declaredSize',58,'declaredSha256',(select encode(extensions.digest(bytes,'sha256'),'hex') from durable_bytes))::text)).*;
-- Reviewed boundary regressions: even null/self uploader cannot forge station links.
set local role authenticated;
select pg_temp.denied($q$insert into public.attachments(entity_table,entity_id,attachment_type,file_url,uploaded_by_profile_id) values('station_assisted_rentals','foreign','photo_evidence','https://untrusted.invalid',null)$q$,'42501');
select pg_temp.denied($q$insert into public.attachments(entity_table,entity_id,attachment_type,file_url,uploaded_by_profile_id) values('station_assisted_riders','foreign','photo_evidence','https://untrusted.invalid','94000000-0000-0000-0000-000000000001')$q$,'42501');
reset role;
select pg_temp.denied('select pg_temp.finish_evidence(id,''bad''::bytea) from durable_reservation','22023');
create temp table durable_result(receipt jsonb);
-- A late failure after attachment insert must roll back the entire link/snapshot.
create function pg_temp.fail_durable_insert() returns trigger language plpgsql as $$ begin raise exception 'synthetic late failure' using errcode='23514'; end $$;
create trigger fail_durable_insert before insert on private.station_evidence_blobs for each row execute function pg_temp.fail_durable_insert();
select pg_temp.denied('select pg_temp.finish_evidence(id,(select bytes from durable_bytes)) from durable_reservation','23514');
do $$ begin if exists(select 1 from public.attachments) or exists(select 1 from private.station_evidence_blobs) then raise exception 'late failure leaked attachment'; end if; end $$;
drop trigger fail_durable_insert on private.station_evidence_blobs;
insert into durable_result select pg_temp.finish_evidence(id,(select bytes from durable_bytes)) from durable_reservation;
do $$ declare a uuid; begin
 a:=(select (receipt->>'attachmentId')::uuid from durable_result);
 if a is null or (select count(*) from public.attachments where id=a)<>1 then raise exception 'no canonical attachment'; end if;
 if (select bytes from private.station_evidence_blobs where attachment_id=a) is distinct from (select bytes from durable_bytes) then raise exception 'not actual durable bytes'; end if;
 if (select pg_temp.finish_evidence(id,(select bytes from durable_bytes)) from durable_reservation) is distinct from (select receipt from durable_result) then raise exception 'unstable completion replay'; end if;
 if (select sync_status from public.tablet_sync_records where local_id='94000000-0000-0000-0000-000000000006')<>'accepted_pending_evidence' then raise exception 'partial evidence incorrectly cleared pending'; end if;
end $$;
select pg_temp.finish_evidence((private.station_evidence_upload_reserve(replace(raw_request,'96000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000002'))).id,(select bytes from durable_bytes)) from durable_reservation;
do $$ begin if (select sync_status from public.tablet_sync_records where local_id='94000000-0000-0000-0000-000000000006')<>'accepted' then raise exception 'all required files did not clear pending'; end if; end $$;
select pg_temp.denied('truncate private.station_evidence_blobs','23514');
select pg_temp.denied('truncate private.station_evidence_requirements','23514');
select pg_temp.denied('delete from private.station_evidence_requirements','23514');
select pg_temp.denied($q$update private.station_evidence_requirements set reference=jsonb_set(reference,'{required}','false')$q$,'23514');
set local role service_role;
select pg_temp.denied($q$insert into public.attachments(entity_table,entity_id,attachment_type,file_url) values('station_assisted_rentals','foreign','photo_evidence','https://untrusted.invalid')$q$,'42501');
reset role;
select pg_temp.denied('update private.station_evidence_blobs set bytes=''bad''::bytea','23514');
select pg_temp.denied('delete from private.station_evidence_blobs','23514');
select pg_temp.denied('update public.attachments set file_url=''https://untrusted.invalid'' where id=(select (receipt->>''attachmentId'')::uuid from durable_result)','23514');
select pg_temp.denied('delete from public.attachments where id=(select (receipt->>''attachmentId'')::uuid from durable_result)','23514');
-- Receipt replay reauthorizes and revalidates canonical parent, even after success.
update public.tablet_devices set device_status='disabled' where device_identifier='native-start';
select pg_temp.denied('select pg_temp.finish_evidence(id,(select bytes from durable_bytes)) from durable_reservation','42501');
update public.tablet_devices set device_status='active' where device_identifier='native-start';
update public.tablet_sync_records set server_entity_id='missing' where local_id='94000000-0000-0000-0000-000000000006';
select pg_temp.denied('select pg_temp.finish_evidence(id,(select bytes from durable_bytes)) from durable_reservation','42501');
do $$ declare role_name text; begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
 execute 'set local role '||role_name;
 perform pg_temp.denied('select * from private.station_evidence_blobs','42501');
 perform pg_temp.denied('select private.station_evidence_finalize(null,null,null)','42501');
 reset role;
 end loop;
end $$;
rollback;
