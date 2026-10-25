-- PROPOSED ONLY — independent review required; NOT authorized for hosted execution.
-- Immediately before unchanged 20260727000000, in the same atomic deployment
-- transaction as the enum replacement and postlude. Preserve live defaults.
do $$
declare v_name text; v_default text;
begin
  foreach v_name in array array['from_status','to_status'] loop
    select pg_get_expr(d.adbin,d.adrelid) into v_default
    from pg_attribute a join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid='public.bike_status_events'::regclass and a.attname=v_name;
    if v_default is distinct from '''ready_to_rent''::bike_status' and
       v_default is distinct from '''ready_to_rent''::public.bike_status' then
      raise exception 'Unexpected hosted event status default for %: %',v_name,v_default;
    end if;
  end loop;
end $$;
alter table public.bike_status_events alter column from_status drop default,
  alter column to_status drop default;
