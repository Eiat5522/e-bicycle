-- Follow unchanged st02_tablet_batch_fixture.sql; explicit synthetic local policy.
insert into private.station_approved_notices values ('pdpa','SYNTHETIC','test'),('rental','SYNTHETIC','test') on conflict do nothing;
insert into private.station_evidence_policy values ('image/bmp',1024,'SYNTHETIC native HTTP test only');
create temp table http_bytes as select decode('424d3a00000000000000360000002800000001000000010000000100180000000000040000000000000000000000000000000000000000000000','hex') bytes;
update batch_request set envelope=jsonb_set(envelope,'{records,1,evidence}',(select jsonb_agg(jsonb_build_object('evidenceLocalId','96000000-0000-0000-0000-'||lpad(n::text,12,'0'),'kind','pre_use_photo','required',true,'mimeType','image/bmp','byteSize',58,'sha256',(select encode(extensions.digest(bytes,'sha256'),'hex') from http_bytes)) order by n) from generate_series(1,8) n));
update batch_request set response=private.station_sync_batch(envelope::text);
do $$ begin
 if (select jsonb_array_length(response->'accepted') from batch_request)<>3 or (select jsonb_array_length(response->'evidenceUploadRequests') from batch_request)<>8 then raise exception 'invalid HTTP fixture: %',(select response from batch_request); end if;
end $$;
commit;
