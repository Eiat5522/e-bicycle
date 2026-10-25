"""Real SQL negative controls: each durable regression must kill its defect.

No migration file is edited. Function replacements and injected contamination
exist only inside rolled-back local native transactions. Never hosted.
"""
import subprocess


def run_return_mutations(psql, env, workspace, name, root):
    base = [str(psql), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
    p = subprocess.run(base + ['-c', "select pg_get_functiondef('private.station_return_rental(uuid,uuid,jsonb)'::regprocedure)"], env=env, text=True, capture_output=True, timeout=20)
    if p.returncode:
        raise RuntimeError(p.stderr)
    definition = p.stdout.rstrip() + ';\n'
    fixture = (root / 'supabase/tests/st02_station_return.sql').read_text()
    fixture = fixture.replace('begin;\n', '', 1)
    cases = (root / 'supabase/tests/st02_station_return_cases.sql').read_text()
    controls = [
        ('manual-override', "p_payload ? 'manualOverride' or ", '', 'expected 22023, got <NULL>'),
        ('stale-canonical-bike', "b.status not in ('in_use','maintenance_required','out_of_service') or", '', 'expected 40001, got <NULL>'),
        ('failed-inspection-notes', "(failed and nullif(btrim(i->>'notes'),'') is null)", 'false', 'expected 23514, got 23502'),
        ('old-return-newer-active', 'return v.id; end if;', "update public.bikes set location=location||' mutant' where id=v.bike_id and exists(select 1 from public.station_assisted_rentals where bike_id=v.bike_id and returned_at_server is null); return v.id; end if;", 'old return replay with newer active rental changed rental/bike/events/audits/blocks'),
    ]
    records = []

    def reject(label, sql, expected):
        p = subprocess.run(base, input=sql, env=env, text=True, capture_output=True, timeout=30)
        (workspace / (name + '-mutation-' + label + '.log')).write_text(p.stdout+p.stderr)
        if p.returncode == 0 or expected not in p.stderr:
            raise RuntimeError('mutation not killed at intended assertion: ' + label + '\n' + p.stdout+p.stderr)
        records.append({'case': 'mutation-' + label, 'exit': 0, 'negative_control_exit': p.returncode, 'expected_diagnostic': expected})

    for label, old, new, expected in controls:
        if definition.count(old) != 1:
            raise RuntimeError('mutation anchor changed: ' + label)
        reject(label, 'begin;\n' + definition.replace(old, new, 1) + '\n' + fixture + cases, expected)
    # Demonstrate that enhanced rollback assertions reject event, audit and block
    # contamination, not merely bike status/rental closure changes.
    for label, anchor, contamination in [
        ('maintenance-event-rollback', 'maintenance context insertion rollback', "update public.bike_status_events set context=context||'{\"mutant\":true}'::jsonb;"),
        ('maintenance-audit-rollback', 'maintenance context insertion rollback', "update public.audit_logs set action_performed=action_performed||' mutant';"),
        ('audit-block-rollback', 'failed inspection audit rollback including block', "insert into private.station_return_blocks(rental_id,actor_profile_id,actor_staff_id,station_id,device_id,inspection,reason) select rental,'94000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000003','94000000-0000-0000-0000-000000000002','94000000-0000-0000-0000-000000000004',ret->'returnInspection','mutant' from request;"),
    ]:
        assertion = "select pg_temp.assert_return_unchanged('" + anchor + "');"
        if cases.count(assertion) != 1:
            raise RuntimeError('assertion anchor changed: ' + label)
        reject(label, 'begin;\n' + fixture + cases.replace(assertion, contamination + '\n' + assertion), anchor + ' changed rental/bike/events/audits/blocks')
    return records
