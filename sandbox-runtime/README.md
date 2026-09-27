# LinuxForge isolated Kali runtime — v15 development adapter

This runtime is the real-Linux execution adapter used by `real-linux-isolated-v1`.
It runs a genuine Kali Linux userland and exposes **interactive PTY sessions** rather than calling `subprocess.run()` for every command.

### What this build now provides

- Bash, Zsh and `/bin/sh` shells.
- One persistent PTY per LinuxForge terminal tab (`sessionId`).
- Shell state persists inside a tab: `cd`, shell variables, aliases, foreground processes and interactive programs remain alive.
- Interactive programs can receive stdin and terminal control signals: Ctrl-C, Ctrl-D/EOF, Ctrl-Z and Ctrl-L.
- Arrow keys and other terminal escape sequences can be forwarded to the PTY while an interactive process is running.
- `vim`, `top`, `less`, Python REPLs and long-running commands are no longer rejected as "modelled" commands.
- Zsh is installed in the Kali image; `vim-tiny`, `less`, `procps`, `iproute2` and other basic terminal tooling are installed too.
- Each logical environment has its own home directory and private `/tmp` mapping through PRoot.
- The outer Docker container is a development boundary only: no external network, dropped Linux capabilities, no-new-privileges, process and memory limits. This runtime explicitly identifies itself as `container-dev` and refuses production mode.
- The application keeps the learner-facing terminal history separate from each tab's PTY state.

### Important architecture note

This is a **local/early isolated runtime**, not the final production multi-tenant VM orchestrator. A production deployment should run each learner environment in a dedicated VM/microVM/container boundary and expose the PTY over an authenticated streaming transport (WebSocket/WebTransport). The provider contract is already shaped for that next step.

## Start locally

```bash
export FORGE_SANDBOX_CREDENTIAL='replace-with-a-long-random-token'
docker compose up -d --build
```

Then configure the LinuxForge app:

```text
FORGE_SANDBOX_PROVIDER=real-linux-isolated-v1
FORGE_SANDBOX_ENDPOINT=http://localhost:18080
FORGE_SANDBOX_CREDENTIAL=<same-token>
FORGE_SANDBOX_IMAGE=kali-rolling
```

If the app itself is running in Docker Compose, use the service name instead of `localhost`:

```text
FORGE_SANDBOX_ENDPOINT=http://kali-lab:8080
```

Never expose the runtime directly to the public internet. Put it behind a private authenticated network.


## Persistence and runtime state

Environment metadata is persisted in the `kali-environments` Docker volume, so a normal
`docker compose down` / `up` cycle does not invalidate existing environment IDs. Learner
files remain in the same environment volume. Use `docker compose down -v` only when you
intentionally want to delete the lab data.

Execution responses include contract-shaped filesystem deltas (created/deleted/modified/
permission changes), the learner-visible cwd, the real shell command exit status, and
empty learner-facing network listeners while network policy is `none`. Command completion
uses a private per-execution sentinel rather than relying on the prompt timeout, which makes
`cd`, failing commands, chained commands and commands with no output observable reliably.
The runtime still uses the container as its security boundary and does not expose the
learner workspace to the host.

### Smoke test

After starting the runtime, create an environment and use the returned `environmentId`:

```bash
export ENV_ID='<returned-environment-id>'
curl -sS -X POST "http://127.0.0.1:18080/v1/environments/$ENV_ID/execute" \
  -H "Authorization: Bearer $FORGE_SANDBOX_CREDENTIAL" \
  -H "Content-Type: application/json" \
  -d '{"input":{"data":"rm -rf test-folder && mkdir test-folder && cd test-folder && touch hello.txt && ls -la && pwd"},"shell":"bash","sessionId":"smoke-test"}'
```

The response should show `exitCode: 0`, `cwdAfter: "test-folder"`, and filesystem deltas
for `test-folder` and `test-folder/hello.txt`. The learner-facing network listener list
should be empty.


## v15 production boundary

v15 makes the production handoff explicit. The application now sends a provider-neutral `runtime` launch specification containing the runtime class, immutable image reference, resource policy and security profile. Production admission accepts only `vm` or `microvm` and an immutable `image@sha256:<digest>` reference over HTTPS.

The Docker+PRoot service in this directory remains a development adapter and cannot be switched into production mode. The next production implementation is a dedicated per-environment VM/microVM runtime implementing the same HTTP contract and reporting `/v1/health`. It must enforce host-filesystem isolation, disabled privilege escalation, blocked metadata access, resource quotas and network policy outside the guest.

The app must never expose the runtime endpoint directly to learners; only the authenticated LinuxForge server/provider boundary may call it.
