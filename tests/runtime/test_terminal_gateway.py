import importlib.util
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "runtime" / "terminal-gateway.py"
spec = importlib.util.spec_from_file_location("linuxforge_terminal_gateway", MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

class TerminalGatewayTests(unittest.TestCase):
    def setUp(self):
        self.old = os.environ.get("FORGE_TERMINAL_TICKET_SECRET")
        os.environ["FORGE_TERMINAL_TICKET_SECRET"] = "v49-test-secret-that-is-at-least-32-bytes-long"
        module.TICKET_SECRET = os.environ["FORGE_TERMINAL_TICKET_SECRET"].encode()

    def tearDown(self):
        if self.old is None: os.environ.pop("FORGE_TERMINAL_TICKET_SECRET", None)
        else: os.environ["FORGE_TERMINAL_TICKET_SECRET"] = self.old

    def test_ticket_verification_is_scoped(self):
        payload = module.b64u(module.json.dumps({"userId":"u","labId":"l","environmentId":"e","sessionId":"s","bindingGeneration":2,"runtimeLifecycleGeneration":7,"exp":module.time.time()+60}).encode())
        sig = module.b64u(module.hmac.new(module.TICKET_SECRET,payload.encode(),module.hashlib.sha256).digest())
        claims = module.verify_ticket(payload + "." + sig)
        self.assertEqual(claims["environmentId"], "e")

    def test_tampering_is_rejected(self):
        with self.assertRaises(module.GatewayError):
            module.verify_ticket("bad.bad")

if __name__ == "__main__": unittest.main()
