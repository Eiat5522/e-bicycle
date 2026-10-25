begin;
create function pg_temp.denied(q text) returns void language plpgsql as $$
declare got text; begin
 begin execute q; exception when others then got:=sqlstate; end;
 if got is distinct from '42501' then raise exception 'expected permission denial got %: %',got,q; end if;
end $$;
do $$ declare caught boolean:=false; begin
 begin perform pg_temp.denied('select 1'); exception when raise_exception then caught:=true; end;
 if not caught then raise exception 'denial helper accepts success'; end if;
end $$;
-- Actual 27 denied statements, not just ACL metadata. Separate subtransactions
-- reset SET LOCAL ROLE after each rejected statement.
do $$ declare r text; q text; n int:=0; begin
 foreach r in array array['anon','authenticated','service_role'] loop
 foreach q in array array[
 'select * from private.station_approved_notices',
 'insert into private.station_approved_notices values (''pdpa'',''ACL'',''not authority'')',
 'update private.station_approved_notices set approval_reference=''bad''',
 'delete from private.station_approved_notices',
 'select private.station_actor(null)',
 'select private.station_notice(''pdpa'',''ACL'')',
 'select private.station_register_rider(null,''{}'')',
 'select private.station_start_rental(null,null,''{}'')',
 'select private.station_return_rental(null,null,''{}'')'
 ] loop
 perform pg_temp.denied('set local role '||r||'; '||q); n:=n+1;
 end loop; end loop;
 if n<>27 then raise exception 'probe count %',n; end if;
end $$;
rollback;
\echo PASS actual 27 private registry/helper/processor ACL denials and helper rejects success
