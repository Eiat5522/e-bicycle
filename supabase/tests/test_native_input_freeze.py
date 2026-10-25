"""Durable fail-closed input-freeze unit regressions (no database)."""
import tempfile
import unittest
from pathlib import Path
from native_input_freeze import freeze_inputs, verify_inputs


class FreezeTests(unittest.TestCase):
    def test_external_and_effective_sql_mutation_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('env.json', 'foundation.json', 'bootstrap.sql', 'adapter.py', 'migration.sql'):
                target = root / name
                target.write_text('original')
            frozen = freeze_inputs(root)
            for target in root.iterdir():
                original = target.read_bytes()
                target.write_text('changed')
                with self.assertRaises(RuntimeError):
                    verify_inputs(root, frozen)
                target.write_bytes(original)
            verify_inputs(root, frozen)

    def test_added_or_removed_input_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'one.sql').write_text('select 1')
            frozen = freeze_inputs(root)
            (root / 'two.sql').write_text('select 2')
            with self.assertRaises(RuntimeError):
                verify_inputs(root, frozen)
            (root / 'two.sql').unlink()
            (root / 'one.sql').unlink()
            with self.assertRaises(RuntimeError):
                verify_inputs(root, frozen)

    def test_external_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'link.sql').symlink_to('/etc/hosts')
            with self.assertRaises(RuntimeError):
                freeze_inputs(root)


if __name__ == '__main__':
    unittest.main()
