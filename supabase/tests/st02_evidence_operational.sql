-- Run against a disposable full-history database. Fails before migration44.
begin;
do $$ begin
 if not exists(select 1 from private.station_evidence_policy where mime='image/jpeg' and max_bytes=10485760) or
 not exists(select 1 from private.station_evidence_policy where mime='image/png' and max_bytes=10485760) then raise exception 'operational policy absent'; end if;
 if private.station_evidence_image(decode('89504e470d0a1a0a','hex'),'image/png') then raise exception 'truncated PNG accepted'; end if;
 if private.station_evidence_image(decode('ffd8ffd9','hex'),'image/jpeg') then raise exception 'empty JPEG accepted'; end if;
 if private.station_evidence_image(decode('424d','hex'),'image/bmp') then raise exception 'operational BMP accepted'; end if;
 if exists(select 1 from pg_roles where rolname='api08_evidence_executor' and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolcanlogin)) then raise exception 'unsafe executor'; end if;
 if has_table_privilege('api08_evidence_executor','public.attachments','INSERT') then raise exception 'direct attachment write'; end if;
 if has_function_privilege('authenticated','private.station_evidence_operate(text,uuid,uuid,uuid,jsonb,bytea)','EXECUTE') or
 has_function_privilege('service_role','private.station_evidence_operate(text,uuid,uuid,uuid,jsonb,bytea)','EXECUTE') then raise exception 'public dispatcher grant'; end if;
end $$;
rollback;
