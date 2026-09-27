#!/usr/bin/env bash
set -euo pipefail

: "${FORGE_SANDBOX_CREDENTIAL:?Set FORGE_SANDBOX_CREDENTIAL first}"
BASE_URL="${FORGE_SANDBOX_ENDPOINT:-http://127.0.0.1:18080}"

json=$(curl -fsS -X POST "$BASE_URL/v1/environments" \
  -H "Authorization: Bearer $FORGE_SANDBOX_CREDENTIAL" \
  -H "Content-Type: application/json" \
  -d '{"userId":"v4-smoke-user","labId":"linux-basics","metadata":{"image":"kali-rolling"}}')

env_id=$(printf '%s' "$json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"]["handle"]["environmentId"])')

echo "Environment: $env_id"

result=$(curl -fsS -X POST "$BASE_URL/v1/environments/$env_id/execute" \
  -H "Authorization: Bearer $FORGE_SANDBOX_CREDENTIAL" \
  -H "Content-Type: application/json" \
  -d '{"input":{"data":"rm -rf v4-test && mkdir v4-test && cd v4-test && touch hello.txt && chmod 640 hello.txt && printf test > data.txt && ls -la && pwd"},"shell":"bash","sessionId":"v4-smoke-test"}')

printf '%s' "$result" | python3 - <<'PY'
import json, sys
x = json.load(sys.stdin)["value"]
objects = {o["path"]: o for o in x["stateAfter"]["filesystem"]["objects"]}
deltas = {d["path"]: d for d in x["deltas"]["filesystem"]}

assert x["exitCode"] == 0, x
assert x["cwdAfter"] == "v4-test", x
assert "LF_CONT_" not in x["stdout"], x["stdout"]
assert objects.get("v4-test", {}).get("objectType") == "directory", objects
assert objects.get("v4-test/hello.txt", {}).get("permissions") == "640", objects
assert objects.get("v4-test/data.txt", {}).get("content") == "test", objects
assert "v4-test" in deltas, deltas
assert "v4-test/hello.txt" in deltas, deltas
assert "v4-test/data.txt" in deltas, deltas

print("PASS")
print("exitCode:", x["exitCode"])
print("cwdAfter:", x["cwdAfter"])
print("filesystem objects:", sorted(objects))
print("filesystem deltas:", sorted(deltas))
print("prompt leakage: none")
PY
