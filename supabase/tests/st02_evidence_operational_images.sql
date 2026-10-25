-- Run after unchanged tablet batch fixture; fixture data rolls back.
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','test'),('rental','SYNTHETIC','test');
create temp table operational_bytes(mime text,bytes bytea,eid uuid);
-- Real libvips/sharp encoded 2x3 red RGB images, not magic-header stubs.
insert into operational_bytes values
('image/png',decode('89504e470d0a1a0a0000000d4948445200000002000000030802000000368849d60000000970485973000003e8000003e801b57b526b0000001149444154789c63f8cfc0f09f018c11140044d005fbb05849ac0000000049454e44ae426082','hex'),'96000000-0000-0000-0000-000000000001'),
('image/jpeg',decode('ffd8ffdb00430006040506050406060506070706080a100a0a09090a140e0f0c1017141818171416161a1d251f1a1b231c1616202c20232627292a29191f2d302d283025282928ffdb0043010707070a080a130a0a13281a161a2828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828282828ffc00011080003000203012200021101031101ffc4001500010100000000000000000000000000000007ffc40014100100000000000000000000000000000000ffc4001501010100000000000000000000000000000608ffc40014110100000000000000000000000000000000ffda000c03010002110311003f009d001ca45fffd9','hex'),'96000000-0000-0000-0000-000000000002');
update batch_request set envelope=jsonb_set(envelope,'{records,1,evidence}',(select jsonb_agg(jsonb_build_object('evidenceLocalId',eid,'kind','pre_use_photo','required',true,'mimeType',mime,'byteSize',octet_length(bytes),'sha256',encode(extensions.digest(bytes,'sha256'),'hex')) order by eid) from operational_bytes));
update batch_request set response=private.station_sync_batch(envelope::text);
do $$ declare f record; p jsonb; r jsonb; again jsonb; receipt jsonb; n integer:=0; begin
 if (select jsonb_array_length(response->'accepted') from batch_request)<>3 then raise exception 'fixture parent rejected'; end if;
 for f in select * from operational_bytes order by eid loop
  if not private.station_evidence_image(f.bytes,f.mime) then raise exception 'valid encoded image rejected: %',f.mime; end if;
  p:=jsonb_build_object('evidenceLocalId',f.eid,'parentLocalId','94000000-0000-0000-0000-000000000006','parentKind','rental_start','kind','pre_use_photo','mimeType',f.mime,'byteSize',octet_length(f.bytes),'sha256',encode(extensions.digest(f.bytes,'sha256'),'hex'),'uploadedAtDevice','2026-07-28T12:00:00Z');
  set local role api08_evidence_executor;
  r:=private.station_evidence_operate('init','94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000002',p,null);
  again:=private.station_evidence_operate('init','94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000002',p,null);
  if r<>again then raise exception 'unstable reservation replay'; end if;
  p:=p||jsonb_build_object('reservationId',r->>'id');
  receipt:=private.station_evidence_operate('complete','94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000002',p,f.bytes);
  again:=private.station_evidence_operate('receipt','94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000002',p,null);
  if receipt<>again or receipt->>'attachmentId' is null then raise exception 'missing durable receipt'; end if;
  reset role;
  if (select bytes from private.station_evidence_blobs where reservation_id=(r->>'id')::uuid) is distinct from f.bytes then raise exception 'snapshot differs from verified bytes'; end if;
  n:=n+1;
  if (select sync_status from public.tablet_sync_records where local_id=p->>'parentLocalId') is distinct from (case when n=1 then 'accepted_pending_evidence' else 'accepted' end) then raise exception 'required parent transition incorrect'; end if;
 end loop;
 update public.tablet_devices set device_status='disabled' where id='94000000-0000-0000-0000-000000000004';
 set local role api08_evidence_executor;
 begin
  perform private.station_evidence_operate('receipt','94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000002',p,null);
  -- Raise outside expected SQLSTATE handler to prevent false-positive denial.
 exception when insufficient_privilege then n:=3;
 end;
 reset role;
 if n<>3 then raise exception 'revocation did not block committed replay'; end if;
end $$;
rollback;
