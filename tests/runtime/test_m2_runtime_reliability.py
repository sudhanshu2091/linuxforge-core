import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import importlib.util
import sys

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "runtime" / "qemu-runtime.py"
spec = importlib.util.spec_from_file_location("linuxforge_qemu_runtime_m2", MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


def env(manager, env_id="m2-env", state="STOPPED"):
    directory = manager._environment_dir(env_id)
    return module.Environment(
        environmentId=env_id,
        userId="user1",
        labId="lab1",
        status="STOPPED" if state in {"STOPPED", "DESTROYED"} else "ERROR" if state in {"FAILED", "QUARANTINED"} else state,
        imageRef="kali-2026.2-arm64",
        diskPath=str(directory / "root.qcow2"),
        seedPath=str(directory / "seed.iso"),
        sshKeyPath=str(directory / "id_ed25519"),
        sshPublicKeyPath=str(directory / "id_ed25519.pub"),
        qemuPid=None,
        sshPort=2222,
        createdAt=module.now_iso(),
        updatedAt=module.now_iso(),
        snapshotId=None,
        cpus=2,
        memoryMiB=2048,
        storageMiB=20480,
        network="none",
        lifecycleState=state,
    )


class M2RuntimeReliabilityTests(unittest.TestCase):
    def test_lifecycle_transition_gate_is_strict(self):
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.dict(os.environ, {"FORGE_RUNTIME_DATA_DIR": directory}, clear=False):
                manager = module.RuntimeManager()
                runtime = env(manager)
                manager._envs[runtime.environmentId] = runtime
                manager._transition(runtime, "CREATING")
                manager._transition(runtime, "BOOTING")
                manager._transition(runtime, "READY")
                manager._transition(runtime, "RUNNING")
                manager._transition(runtime, "STOPPING")
                manager._transition(runtime, "STOPPED")
                self.assertEqual(runtime.lifecycleState, "STOPPED")
                with self.assertRaisesRegex(RuntimeError, "Invalid runtime lifecycle transition"):
                    manager._transition(runtime, "RUNNING")

    def test_unexpected_process_loss_quarantines_runtime(self):
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.dict(os.environ, {"FORGE_RUNTIME_DATA_DIR": directory}, clear=False):
                manager = RuntimeManagerWithoutWatchdog()
                runtime = env(manager, state="RUNNING")
                runtime.qemuPid = 1234
                manager._envs[runtime.environmentId] = runtime
                manager._persist(runtime)
                with mock.patch.object(module.RuntimeManager, "_pid_is_expected_qemu", return_value=False):
                    manager._reconcile_processes_once()
                self.assertEqual(runtime.lifecycleState, "QUARANTINED")
                self.assertEqual(runtime.status, "ERROR")
                self.assertIn("quarantined", runtime.error or "")

    def test_idempotency_result_survives_manager_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.dict(os.environ, {"FORGE_RUNTIME_DATA_DIR": directory}, clear=False):
                manager = RuntimeManagerWithoutWatchdog()
                runtime = env(manager)
                manager._envs[runtime.environmentId] = runtime
                result = {"handle": {"environmentId": runtime.environmentId}, "status": "STOPPED"}
                calls = {"count": 0}

                def operation():
                    calls["count"] += 1
                    return result

                first = manager._run_idempotent({"operationId": "op-1"}, runtime.environmentId, "stop", operation)
                self.assertEqual(first, result)
                second_manager = RuntimeManagerWithoutWatchdog()
                second = second_manager._run_idempotent({"operationId": "op-1"}, runtime.environmentId, "stop", lambda: {"bad": True})
                self.assertEqual(second, result)
                self.assertEqual(calls["count"], 1)

    def test_destroy_persists_tombstone_and_removes_runtime_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.dict(os.environ, {"FORGE_RUNTIME_DATA_DIR": directory}, clear=False):
                manager = RuntimeManagerWithoutWatchdog()
                runtime = env(manager, state="STOPPED")
                manager._envs[runtime.environmentId] = runtime
                runtime_dir = Path(runtime.diskPath).parent
                (runtime_dir / "root.qcow2").write_bytes(b"disk")
                (runtime_dir / "id_ed25519").write_text("secret")
                result = manager.destroy(runtime.environmentId, {"operationId": "destroy-1"})
                self.assertTrue(result["destroyed"])
                self.assertEqual(runtime.lifecycleState, "DESTROYED")
                state = json.loads((runtime_dir / "state.json").read_text())
                self.assertEqual(state["lifecycleState"], "DESTROYED")
                self.assertFalse((runtime_dir / "root.qcow2").exists())
                self.assertFalse((runtime_dir / "id_ed25519").exists())

    def test_orphan_qemu_process_under_runtime_data_is_terminated(self):
        with tempfile.TemporaryDirectory() as directory:
            manager = RuntimeManagerWithoutWatchdog()
            orphan_disk = Path(directory) / "orphan" / "root.qcow2"
            with mock.patch.dict(os.environ, {"FORGE_RUNTIME_DATA_DIR": directory}, clear=False):
                manager.data_dir = Path(directory).resolve()
                manager._envs.clear()
                process_line = f"4321 qemu-system-aarch64 -drive file={orphan_disk},if=virtio"
                with mock.patch.object(module.subprocess, "run", return_value=mock.Mock(stdout=process_line)) as run_mock, \
                     mock.patch.object(module.os, "kill") as kill_mock:
                    manager._reconcile_orphan_processes_once()
                run_mock.assert_called_once()
                kill_mock.assert_called_once_with(4321, module.signal.SIGTERM)


class RuntimeManagerWithoutWatchdog(module.RuntimeManager):
    def __init__(self):
        self.data_dir = Path(os.environ.get("FORGE_RUNTIME_DATA_DIR", "./.linuxforge-runtime")).resolve()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.base_image = Path(os.environ.get("FORGE_RUNTIME_IMAGE_PATH", "")).expanduser().resolve()
        self.approved_image_ref = os.environ.get("FORGE_RUNTIME_IMAGE_REF", "")
        self.arch = os.environ.get("FORGE_RUNTIME_ARCH", "auto")
        self.qemu_accel = os.environ.get("FORGE_QEMU_ACCEL", "auto")
        self.ssh_user = os.environ.get("FORGE_RUNTIME_SSH_USER", module.DEFAULT_SSH_USER)
        self.auth_token = os.environ.get("FORGE_RUNTIME_SERVICE_TOKEN", "")
        self.max_environments = int(os.environ.get("FORGE_RUNTIME_MAX_ENVIRONMENTS", "8"))
        self._lock = module.threading.RLock()
        self._envs = {}
        self._ptys = {}
        self._processes = {}
        self._expected_exit = set()
        self._operation_results = {}
        self._operation_ids_by_environment = {}
        self._load()


if __name__ == "__main__":
    unittest.main()

class M3TerminalGenerationTests(unittest.TestCase):
    def test_pty_rejects_stale_runtime_lifecycle_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.dict(os.environ, {"FORGE_RUNTIME_DATA_DIR": directory}, clear=False):
                manager = RuntimeManagerWithoutWatchdog()
                runtime = env(manager, state="RUNNING")
                runtime.lifecycleGeneration = 9
                manager._envs[runtime.environmentId] = runtime
                with self.assertRaisesRegex(RuntimeError, "stale.*runtime generation"):
                    manager.pty_open(
                        runtime.environmentId,
                        {
                            "sessionId": "session-1",
                            "shell": "bash",
                            "cwd": "/home/linuxforge",
                            "runtimeLifecycleGeneration": 8,
                        },
                    )
