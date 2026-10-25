#!/usr/bin/env python3
"""Generate public client types using the unmodified official postgres-meta entrypoint.

Requires PG_META_DB_URL pointing at an already fully migrated disposable native DB
and TYPEGEN_MIGRATION_MANIFEST pointing at its successful native harness manifest.
Dependencies are installed only in Hermes scratch, never in this workspace.
"""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import ipaddress
from urllib.parse import urlsplit, parse_qs


def validate_database_url(value):
    """Reject ambiguous/libpq overrides without including credentials in errors."""
    def local(host):
        if host == "localhost" or (host and host.startswith("/")):
            return True
        try:
            return ipaddress.ip_address(host).is_loopback
        except ValueError:
            return False
    try:
        url = urlsplit(value)
        query = parse_qs(url.query, keep_blank_values=True, strict_parsing=True)
        if url.scheme not in ("postgres", "postgresql") or not local(url.hostname):
            raise ValueError()
        # Only a socket host override is supported; reject all other libpq knobs.
        if set(query) - {"host"} or any(len(v) != 1 for v in query.values()):
            raise ValueError()
        if "host" in query and not query["host"][0].startswith("/"):
            raise ValueError()
        if url.fragment or not url.path.strip("/") or (url.port is not None and url.port == 0):
            raise ValueError()
    except (ValueError, TypeError):
        raise ValueError("PG_META_DB_URL must name a local loopback or UNIX-socket database") from None
    return value

ROOT = Path(__file__).resolve().parents[1]
REVISION = "ecc19497dcfcb4dc6a83d02e49d812f747cbf981"
SCRATCH = Path(os.environ.get("TMPDIR", str(Path.home() / ".hermes/cache/scratch")))
META = SCRATCH / "st02-postgres-meta"


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def normalize_manifest_cases(manifest):
    """Adapt legacy cases and frozen results without mutating source evidence."""
    modern = any(key in manifest for key in ("results", "input_freeze", "post_freeze_verified"))
    if not modern:
        if type(manifest.get("migration_count")) is int and manifest["migration_count"] >= 40:
            raise ValueError("Modern native manifest requires frozen results schema")
        return manifest.get("cases")
    results = manifest.get("results")
    if not isinstance(results, list) or not results:
        raise ValueError("Frozen native manifest requires nonempty results")
    if "cases" in manifest:
        # Python equality alone treats False and 0 (or 0.0) as identical.
        aliases = manifest["cases"]
        if (not isinstance(aliases, list) or aliases != results or any(
                not isinstance(case, dict) or type(case.get("exit")) is not int or case["exit"] != 0
                for case in aliases)):
            raise ValueError("Ambiguous native manifest cases/results")
    if type(manifest.get("step_count")) is not int or manifest["step_count"] != len(results):
        raise ValueError("Native manifest step count does not match results")
    foundation = manifest.get("preserved_foundation_count")
    if type(foundation) is not int or not 0 < foundation <= manifest["migration_count"]:
        raise ValueError("Invalid preserved foundation count")
    if manifest.get("public_gate") != "closed":
        raise ValueError("Native public gate must remain closed")
    if manifest.get("post_freeze_verified") is not True:
        raise ValueError("Native manifest requires completed post-freeze verification")
    freeze = manifest.get("input_freeze")
    if not isinstance(freeze, dict) or not isinstance(freeze.get("sources"), dict) or not freeze["sources"]:
        raise ValueError("Native manifest requires pre-run input freeze")
    def sha256(value):
        return isinstance(value, str) and len(value) == 64 and all(c in "0123456789abcdef" for c in value)

    for field in ("sources", "external"):
        values = freeze.get(field)
        if not isinstance(values, dict) or any(
                not isinstance(key, str) or not key or not sha256(value)
                for key, value in values.items()):
            raise ValueError("Invalid frozen input hashes")
    for field in ("effective_environment", "effective_pg_config"):
        values = freeze.get(field)
        if not isinstance(values, dict) or any(
                not isinstance(key, str) or not isinstance(value, str)
                for key, value in values.items()):
            raise ValueError("Invalid frozen environment")
    if not sha256(freeze.get("effective_bootstrap_sha256")):
        raise ValueError("Invalid frozen bootstrap hash")
    if any(not isinstance(case, dict) or not isinstance(case.get("case"), str)
           or not case["case"].strip() for case in results):
        raise ValueError("Native results require named cases")
    sources = freeze["sources"]
    migrations = {key.removeprefix("supabase/migrations/"): value
                  for key, value in sources.items() if key.startswith("supabase/migrations/")}
    if migrations != manifest["hashes"]:
        raise ValueError("Frozen migration inventory does not match manifest")
    return manifest["results"]


def validate_manifest(manifest, hashes):
    if not isinstance(manifest, dict) or not hashes or manifest.get("hashes") != hashes:
        raise ValueError("DB migration input manifest does not match checkout")
    count = manifest.get("migration_count")
    if type(count) is not int or count != len(hashes):
        raise ValueError("Migration count does not match checkout")
    cases = normalize_manifest_cases(manifest)
    if not isinstance(cases, list) or not cases or any(
        not isinstance(c, dict) or type(c.get("exit")) is not int or c["exit"] != 0
        for c in cases
    ):
        raise ValueError("Native manifest must contain nonempty successful cases")


@contextmanager
def generator_environment(database_url=None):
    env = {key: os.environ[key] for key in ("PATH", "HOME", "TMPDIR", "SYSTEMROOT")
           if key in os.environ}
    env.update(LANG="C.UTF-8", LC_ALL="C.UTF-8", npm_config_ignore_scripts="true")
    if database_url is not None:
        env.update(PG_META_DB_URL=validate_database_url(database_url),
                   PG_META_GENERATE_TYPES_INCLUDED_SCHEMAS="public",
                   PG_META_GENERATE_TYPES_DETECT_ONE_TO_ONE_RELATIONSHIPS="true")
    # npm rejects loading one path at both config levels, including /dev/null.
    # Private, newly created files cannot inherit user/global credentials.
    with tempfile.TemporaryDirectory(prefix="typegen-npm-", dir=SCRATCH) as directory:
        for level in ("user", "global"):
            config = Path(directory) / f"{level}.npmrc"
            config.touch(mode=0o600)
            env[f"npm_config_{level}config"] = str(config)
        yield env


def dependency_digest(root):
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Dependencies must be a real directory")
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_symlink():
            if not path.resolve().is_relative_to(root.resolve()):
                raise ValueError("Dependency symlink escapes installation")
            data = b"link:" + os.readlink(path).encode()
        elif path.is_file():
            data = b"file:" + path.read_bytes()
        elif path.is_dir():
            data = b"directory"
        else:
            raise ValueError("Unsupported dependency filesystem entry")
        for part in (relative.encode(), str(path.lstat().st_mode).encode(), data):
            digest.update(len(part).to_bytes(8, "big"))
            digest.update(part)
    return digest.hexdigest()


def ensure_dependencies(meta, receipt):
    inputs = dict(revision=REVISION,
                  package=hashlib.sha256((meta / "package.json").read_bytes()).hexdigest(),
                  lock=hashlib.sha256((meta / "package-lock.json").read_bytes()).hexdigest())
    modules = meta / "node_modules"
    if receipt.exists():
        recorded = json.loads(receipt.read_text())
        if recorded != dict(inputs, tree=dependency_digest(modules)):
            raise ValueError("Dependency provenance mismatch; remove cache and receipt, then retry")
        return recorded
    # An old node_modules directory without our installation receipt is never trusted.
    if modules.is_symlink():
        raise ValueError("Refusing symlinked dependency directory")
    with generator_environment() as env:
        run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=meta,
            env=env, capture_output=True)
    recorded = dict(inputs, tree=dependency_digest(modules))
    receipt.write_text(json.dumps(recorded, sort_keys=True) + "\n")
    return recorded


def publish_outputs(payloads):
    """Stage all bytes and backups first; roll back handled replacement failures."""
    staged, backups, replaced = {}, {}, []
    def stage(target, data, mode):
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".typegen-", delete=False) as stream:
            path = Path(stream.name)
            try:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
                os.chmod(path, mode)
            except BaseException:
                path.unlink(missing_ok=True)
                raise
        return path
    try:
        for target, data in payloads.items():
            if target.is_symlink():
                raise ValueError("Refusing symlinked output")
            exists = target.exists()
            mode = target.stat().st_mode & 0o777 if exists else 0o644
            backups[target] = stage(target, target.read_bytes(), mode) if exists else None
            staged[target] = stage(target, data, mode)
        try:
            for target, source in staged.items():
                os.replace(source, target)
                replaced.append(target)
        except BaseException:
            failures = []
            for target in reversed(replaced):
                backup = backups[target]
                try:
                    if backup is None:
                        target.unlink()
                    else:
                        os.replace(backup, target)
                except OSError:
                    failures.append(f"{target}: backup={backup}")
                    # Leave recovery material intact if rollback itself is blocked.
                    backups[target] = None
            if failures:
                raise RuntimeError("Output rollback failed; retain recovery backup: " + "; ".join(failures)) from None
            raise
    finally:
        for path in list(staged.values()) + list(backups.values()):
            if path is not None:
                path.unlink(missing_ok=True)


def main():
    validate_database_url(os.environ.get("PG_META_DB_URL", ""))
    manifest = json.loads(Path(os.environ["TYPEGEN_MIGRATION_MANIFEST"]).read_text())
    hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted((ROOT / "supabase/migrations").glob("*.sql"))}
    validate_manifest(manifest, hashes)
    with generator_environment() as clean_env:
        generate(manifest, hashes, clean_env)


def generate(manifest, hashes, clean_env):
    if not META.exists():
        run(["git", "clone", "https://github.com/supabase/postgres-meta.git", str(META)], env=clean_env)
        run(["git", "checkout", "--detach", REVISION], cwd=META, env=clean_env)
    if META.is_symlink():
        raise ValueError("Refusing symlinked upstream checkout")
    if run(["git", "rev-parse", "HEAD"], cwd=META, env=clean_env, capture_output=True).stdout.strip() != REVISION:
        raise ValueError("Upstream generator revision mismatch")
    status = run(["git", "status", "--porcelain", "--untracked-files=all", "--ignored=matching"],
                 cwd=META, env=clean_env, capture_output=True).stdout.splitlines()
    if any(line != "!! node_modules/" for line in status):
        raise ValueError("Upstream source must be clean, including ignored configuration")
    dependencies = ensure_dependencies(META, SCRATCH / "st02-postgres-meta-dependencies.json")
    with generator_environment(os.environ["PG_META_DB_URL"]) as env:
        generated = run(["npm", "run", "--silent", "gen:types:typescript"], cwd=META,
                        env=env, capture_output=True).stdout
    if not generated.startswith("export type Json =") or "complete_ride_recoverable:" not in generated:
        raise ValueError("Generator did not return expected public recovery types")
    if dependency_digest(META / "node_modules") != dependencies["tree"]:
        raise ValueError("Dependencies changed during generation")
    outputs = ["apps/web/src/lib/supabase/database.types.ts", "apps/mobile/src/lib/supabase.types.ts"]
    evidence = dict(generator_revision=REVISION, schemas=["public"],
                    one_to_one_relationships=True, migration_count=len(hashes), hashes=hashes,
                    output_sha256=hashlib.sha256(generated.encode()).hexdigest(), outputs=outputs,
                    dependencies=dependencies,
                    node=run(["node", "--version"], env=clean_env, capture_output=True).stdout.strip())
    destination = SCRATCH / "st02-typegen-provenance.json"
    payloads = {ROOT / target: generated.encode() for target in outputs}
    payloads[destination] = (json.dumps(evidence, indent=2) + "\n").encode()
    publish_outputs(payloads)
    print(f"Generated both clients; provenance: {destination}")


if __name__ == "__main__":
    main()
