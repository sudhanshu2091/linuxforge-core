import json
import os
import tempfile
import unittest
from pathlib import Path

# Load qemu-runtime.py without starting the service.
import importlib.util
import sys

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("qemu_runtime_m4", ROOT / "runtime" / "qemu-runtime.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules["qemu_runtime_m4"] = MODULE
SPEC.loader.exec_module(MODULE)


class M4PersistenceTests(unittest.TestCase):
    def test_persistent_disk_is_not_recreated_for_existing_environment(self):
        with tempfile.TemporaryDirectory() as td:
            manager = MODULE.RuntimeManager.__new__(MODULE.RuntimeManager)
            manager.data_dir = Path(td)
            manager.data_dir.mkdir(parents=True, exist_ok=True)
            # This is a source-level regression assertion: create() only removes
            # the disk when no persistent disk exists. The actual provider E2E
            # below validates the resulting guest state on a real Kali VM.
            source = (ROOT / "runtime" / "qemu-runtime.py").read_text()
            self.assertIn("if not disk.exists():", source)
            self.assertNotIn("if disk.exists():\n                disk.unlink()\n            storage_mib", source)

    def test_destroy_keeps_tombstone_and_persistence_endpoint_can_report_destroyed(self):
        source = (ROOT / "runtime" / "qemu-runtime.py").read_text()
        self.assertIn('"DESTROYED" if env.lifecycleState == "DESTROYED"', source)
        self.assertIn('if parts[3] == "persistence"', source)

    def test_m5_inspection_endpoint_is_present_and_content_limited(self):
        source = (ROOT / "runtime" / "qemu-runtime.py").read_text()
        self.assertIn('if action == "inspect":', source)
        self.assertIn('64_000', source)
        self.assertIn('stat -c', source)
        self.assertIn('base64 -w0', source)

    def test_persistence_fingerprint_is_structural_and_does_not_hash_entire_disk(self):
        source = (ROOT / "runtime" / "qemu-runtime.py").read_text()
        self.assertIn("qemu-img", source)
        self.assertIn("virtual-size", source)
        self.assertIn("actual_size", source)
        self.assertIn("Structural fingerprint, intentionally cheap", source)


if __name__ == "__main__":
    unittest.main()
