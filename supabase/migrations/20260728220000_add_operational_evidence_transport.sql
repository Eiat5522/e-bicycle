-- API08 approved JPEG/PNG v1. Additive: accepted migrations42/43 unchanged.
-- Database bytes remain authoritative. No hosted provisioning/retention implied.
begin;
insert into private.station_evidence_policy(mime,max_bytes,approval_reference) values
 ('image/jpeg',10485760,'API08 explicit approved JPEG/PNG v1: 10MiB,25MP'),('image/png',10485760,'API08 explicit approved JPEG/PNG v1: 10MiB,25MP')
on conflict(mime) do update set max_bytes=excluded.max_bytes,approval_reference=excluded.approval_reference;

-- Structural recheck of trusted backend's fully decoded bytes. Not a SQL image
-- decoder: the reviewed backend MUST force full libvips decoding before entry.
create or replace function private.station_evidence_image(b bytea,m text)
returns boolean language plpgsql immutable set search_path='' as $$
declare n integer:=octet_length(b); o integer; l bigint; marker integer; w bigint; h bigint; seen boolean:=false; idat boolean:=false;
begin
 if b is null or n<24 or n>10485760 then return false; end if;
 if m='image/png' then
  if substring(b from 1 for 8)<>decode('89504e470d0a1a0a','hex') then return false; end if;
  o:=8;
  while o+12<=n loop
   l:=get_byte(b,o)::bigint*16777216+get_byte(b,o+1)::bigint*65536+get_byte(b,o+2)*256+get_byte(b,o+3);
   if l>n-o-12 then return false; end if;
   if o=8 then
    if l<>13 or substring(b from o+5 for 4)<>decode('49484452','hex') then return false; end if;
    w:=get_byte(b,o+8)::bigint*16777216+get_byte(b,o+9)::bigint*65536+get_byte(b,o+10)*256+get_byte(b,o+11);
    h:=get_byte(b,o+12)::bigint*16777216+get_byte(b,o+13)::bigint*65536+get_byte(b,o+14)*256+get_byte(b,o+15);
    if w<1 or h<1 or w*h>25000000 then return false; end if;
   elsif substring(b from o+5 for 4)=decode('49484452','hex') then return false;
   end if;
   -- Reject APNG: one still photograph, not animated/multiple raster pages.
   if substring(b from o+5 for 4)=decode('6163544c','hex') then return false; end if;
   if substring(b from o+5 for 4)=decode('49444154','hex') then idat:=true; end if;
   if substring(b from o+5 for 4)=decode('49454e44','hex') then return l=0 and idat and o+12=n; end if;
   o:=o+l::integer+12;
  end loop;
  return false;
 elsif m='image/jpeg' then
  if substring(b from 1 for 2)<>decode('ffd8','hex') or substring(b from n-1 for 2)<>decode('ffd9','hex') then return false; end if;
  o:=2;
  while o+4<n loop
   if get_byte(b,o)<>255 then return false; end if;
   while o<n and get_byte(b,o)=255 loop o:=o+1; end loop;
   if o+2>=n then return false; end if;
   marker:=get_byte(b,o); o:=o+1;
   l:=get_byte(b,o)*256+get_byte(b,o+1);
   if l<2 or o+l>n then return false; end if;
   if marker in (192,193,194) then
    if seen or l<8 then return false; end if;
    h:=get_byte(b,o+3)*256+get_byte(b,o+4); w:=get_byte(b,o+5)*256+get_byte(b,o+6);
    if w<1 or h<1 or w*h>25000000 then return false; end if;
    seen:=true;
   end if;
   if marker=218 then return seen and o+l<n-2; end if;
   o:=o+l::integer;
  end loop;
 end if;
 return false;
exception when others then return false;
end $$;
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
 if not (case when r.declared_mime='image/bmp' then private.station_evidence_bmp(p_bytes) else private.station_evidence_image(p_bytes,r.declared_mime) end) then raise exception 'EVIDENCE_IMAGE_INVALID' using errcode='22023'; end if;
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

-- Grant only this reviewed dispatcher to the trusted backend execution role.
-- Membership provisioning is intentionally a separate operator action.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='api08_evidence_executor') then
  create role api08_evidence_executor nologin nosuperuser nobypassrls nocreatedb nocreaterole noinherit;
 end if;
end $$;
create or replace function private.station_evidence_operate(op text,p_staff uuid,p_device uuid,p_station uuid,p jsonb,b bytea)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.staff_profiles; r private.station_evidence_reservations; cap bigint; answer jsonb;
begin
 s:=private.station_actor(p_device);
 if s.id is distinct from p_staff or s.station_id is distinct from p_station or s.profile_id is distinct from auth.uid() then
  raise exception 'EVIDENCE_ACTOR_DENIED' using errcode='42501'; end if;
 if op='init' then
  if p->>'mimeType' not in ('image/jpeg','image/png') or (p->>'byteSize')::bigint not between 1 and 10485760 then
   raise exception 'EVIDENCE_BYTES_REJECTED' using errcode='22023'; end if;
  perform 1 from private.station_evidence_policy where mime=p->>'mimeType' and max_bytes>=(p->>'byteSize')::bigint for share;
  if not found then raise exception 'EVIDENCE_POLICY_UNAVAILABLE' using errcode='55000'; end if;
  r:=private.station_evidence_upload_reserve(jsonb_build_object('deviceId',p_device,'evidenceLocalId',p->>'evidenceLocalId','parentLocalId',p->>'parentLocalId','parentKind',p->>'parentKind','kind',p->>'kind','declaredMime',p->>'mimeType','declaredSize',p->'byteSize','declaredSha256',p->>'sha256')::text);
  return to_jsonb(r);
 end if;
 r:=private.station_evidence_authorize((p->>'reservationId')::uuid);
 perform private.station_evidence_parent(r.device_id,r.parent_local_id,r.parent_kind,true);
 if r.declared_mime not in ('image/jpeg','image/png') or r.declared_size>10485760 or
 r.device_id is distinct from p_device or r.evidence_local_id::text is distinct from p->>'evidenceLocalId' or
 r.parent_local_id::text is distinct from p->>'parentLocalId' or r.parent_kind is distinct from p->>'parentKind' or
 r.declared_sha256 is distinct from p->>'sha256' or
 (p ? 'kind' and r.evidence_kind is distinct from p->>'kind') or
 (p ? 'mimeType' and r.declared_mime is distinct from p->>'mimeType') or
 (p ? 'byteSize' and r.declared_size is distinct from (p->>'byteSize')::bigint) then raise exception 'EVIDENCE_REFERENCE_DENIED' using errcode='42501'; end if;
 select max_bytes into cap from private.station_evidence_policy where mime=r.declared_mime for share;
 if cap is null or cap<r.declared_size then raise exception 'EVIDENCE_POLICY_UNAVAILABLE' using errcode='55000'; end if;
 if op='authorize' then return to_jsonb(r);
 elsif op='receipt' then
  answer:=private.station_evidence_completion_receipt(r.id);
  if answer is not null and answer->>'uploadedAtDevice' is distinct from p->>'uploadedAtDevice' then raise exception 'EVIDENCE_COMPLETION_CONFLICT' using errcode='23505'; end if;
  return answer;
 elsif op='complete' then return private.station_evidence_finalize(r.id,b,p->>'uploadedAtDevice');
 end if;
 raise exception 'EVIDENCE_OPERATION_INVALID' using errcode='22023';
end $$;
revoke all on function private.station_evidence_image(bytea,text),private.station_evidence_operate(text,uuid,uuid,uuid,jsonb,bytea) from public,anon,authenticated,service_role;
revoke all on function private.station_evidence_finalize(uuid,bytea,text) from public,anon,authenticated,service_role,api08_evidence_executor;
grant usage on schema private to api08_evidence_executor;
grant execute on function private.station_evidence_operate(text,uuid,uuid,uuid,jsonb,bytea) to api08_evidence_executor;
commit;
