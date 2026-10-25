"""Content/inventory integrity checks, not adversarial attestation."""
import hashlib
from pathlib import Path


def freeze_inputs(directory):
    root = Path(directory)
    result = {}
    for path in sorted(root.rglob('*')):
        if '__pycache__' in path.parts:
            continue
        if path.is_symlink():
            raise RuntimeError('symlink in frozen inputs: ' + str(path))
        if path.is_file():
            result[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def verify_inputs(directory, frozen):
    if freeze_inputs(directory) != frozen:
        raise RuntimeError('native verification input content or inventory changed')
