#!/usr/bin/env python3
"""Authenticated isolated Kali lab runtime with real interactive PTYs.

The runtime is a long-lived service inside a locked-down container. Each logical
lab environment gets its own home/workspace and each browser terminal tab gets
its own PTY session. The PTY is the important difference from the old
subprocess.run implementation: interactive programs, signals, shell history,
arrow keys, Ctrl-C, Ctrl-D, vim/top/less/python REPL, and long-running commands
can now behave like a real terminal.
"""
import errno
import json
import os
import pty
import re
import select
import shutil
import signal
import struct
import subprocess
import termios
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

TOKEN = os.environ.get("SANDBOX_TOKEN", "")
RUNTIME_MODE = os.environ.get("SANDBOX_RUNTIME_MODE", "development")
RUNTIME_CLASS = os.environ.get("SANDBOX_RUNTIME_CLASS", "container-dev")
RUNTIME_VERSION = os.environ.get("SANDBOX_RUNTIME_VERSION", "dev-docker-proot-v15")

if RUNTIME_MODE == "production":
    # This service is deliberately incapable of masquerading as the final
    # production VM/microVM runtime. Production must use a dedicated VM/microVM
    # boundary rather than this shared Docker+PRoot development runtime.
    raise RuntimeError("The Docker+PRoot runtime cannot run in production mode; use a VM/microVM adapter.")
ROOT_BASE = "/var/lib/linuxforge-environments"
SNAPSHOT_DIR = "/var/lib/linuxforge-snapshots"
ENV_REGISTRY = os.path.join(ROOT_BASE, "environments.json")
MAX_OUTPUT = 64_000
COMMAND_WAIT = 0.35
TIMEOUT = 10
IDLE_EXPIRY = 60 * 60 * 12
os.makedirs(ROOT_BASE, exist_ok=True)
os.makedirs(SNAPSHOT_DIR, exist_ok=True)
lock = threading.RLock()
environments = {}
sessions = {}

def save_environment_registry():
    with lock:
        tmp = ENV_REGISTRY + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(list(environments.values()), f, separators=(",", ":"))
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, ENV_REGISTRY)

def load_environment_registry():
    if not os.path.exists(ENV_REGISTRY):
        return
    try:
        with open(ENV_REGISTRY, "r", encoding="utf-8") as f:
            items = json.load(f)
        for env in items if isinstance(items, list) else []:
            if isinstance(env, dict) and env.get("id") and os.path.isdir(os.path.join(ROOT_BASE, env["id"])):
                environments[env["id"]] = env
    except (OSError, ValueError, TypeError):
        pass

load_environment_registry()


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def env_root(env):
    root = os.path.join(ROOT_BASE, env["id"])
    os.makedirs(root, exist_ok=True)
    return root


def clean_rel(path):
    if not path or path in ("/", "~"):
        return ""
    path = path.replace("\\", "/")
    if path.startswith("/home/learner"):
        path = path[len("/home/learner") :]
    elif path.startswith("/"):
        raise ValueError("absolute paths outside /home/learner are not allowed by the lab boundary")
    parts = []
    for part in path.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if parts:
                parts.pop()
            else:
                raise ValueError("path escapes the learner lab")
        else:
            parts.append(part)
    return "/".join(parts)


def abs_path(env, rel):
    return os.path.join(env_root(env), clean_rel(rel))


def fs_objects(env):
    root = env_root(env)
    out = []
    for base, dirs, files in os.walk(root):
        if ".tmp" in dirs:
            dirs.remove(".tmp")
        for name in dirs + files:
            path = os.path.join(base, name)
            try:
                st = os.stat(path)
                typ = "directory" if os.path.isdir(path) else "file"
                rel = os.path.relpath(path, root)
                content = ""
                if typ == "file" and st.st_size <= 16384:
                    try:
                        with open(path, "r", errors="replace") as f:
                            content = f.read()
                    except Exception:
                        pass
                out.append(
                    {
                        "objectId": rel,
                        "objectType": typ,
                        "path": rel,
                        "name": name,
                        "permissions": format(st.st_mode & 0o777, "03o"),
                        "content": content,
                        "active": True,
                        "createdByChallenge": None,
                        "lastModifiedByChallenge": None,
                        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(st.st_ctime)),
                    }
                )
            except OSError:
                pass
    return out


def process_state(env):
    result = []
    with lock:
        for s in sessions.values():
            if s["env_id"] != env["id"] or s["pid"] <= 0:
                continue
            try:
                os.kill(s["pid"], 0)
                result.append({"pid": s["pid"], "command": s["shell"], "state": "running"})
            except OSError:
                pass
    return {"supported": True, "processes": result}


def service_state(env):
    processes = process_state(env)["processes"]
    services = [
        {"name": p["command"], "state": p["state"] if p["state"] in {"running", "stopped", "unknown"} else "unknown", "enabled": False}
        for p in processes
        if p["command"] not in {"bash", "zsh", "sh"}
    ]
    return {"supported": True, "services": services}

def network_state():
    # The runtime itself exposes the HTTP control port and Docker may expose
    # an internal DNS listener. Those are infrastructure, not learner-created
    # listeners, so they must never leak into the learner-facing lab state.
    # Network policy is currently "none", therefore the contract reports an
    # empty listener set even though the outer container has infrastructure
    # sockets.
    return {
        "supported": True,
        "policy": "none",
        "listeners": [],
    }

def observation(env, cwd=""):
    try:
        rel = clean_rel(cwd)
    except ValueError:
        rel = ""
    return {
        "status": env.get("status", "RUNNING"),
        "filesystem": {"root": "/home/learner", "cwd": rel, "objects": fs_objects(env), "modelled": False},
        "processes": process_state(env),
        "services": service_state(env),
        "network": network_state(),
        "environmentVariables": {
            "supported": True,
            "variables": {"HOME": "/home/learner", "USER": "learner", "SHELL": "/bin/bash"},
            "redactedKeys": ["SANDBOX_TOKEN"],
        },
        "observedAt": now(),
    }


def unsafe_shell(command):
    # The outer Docker sandbox is the security boundary. These checks additionally
    # prevent the learner shell from intentionally crossing the app's lab model.
    patterns = [
        (r"\b(chroot|mount|umount|nsenter|unshare)\b", "Namespace and mount manipulation is not available in the training lab."),
        (r"\b(sudo|su)\b", "Privilege escalation is disabled in the training lab."),
        (r"(^|\s)\.\./", "Path traversal outside the learner workspace is blocked."),
        (r"\b(curl|wget|nc|netcat|nmap|masscan|ssh|scp|telnet|ftp)\b", "Outbound networking and remote-access tools are disabled in this training lab."),
        (r"\b(shutdown|reboot|mkfs|fdisk|dd)\b", "Host/device destructive commands are disabled in the training lab."),
        (r"\b(killall)\b", "Global process control is disabled; use Ctrl-C for your foreground process."),
    ]
    for pat, reason in patterns:
        if re.search(pat, command, re.I):
            return reason
    return None


def shell_argv(shell):
    if shell == "zsh":
        return ["/usr/bin/zsh", "-f", "-i"]
    if shell == "sh":
        return ["/bin/sh", "-i"]
    return ["/bin/bash", "--noprofile", "--norc", "-i"]


def prompt_for(session_id):
    return f"\x1b]0;LinuxForge:{session_id}\x07LF_PROMPT_{session_id}_> "


def start_session(env, session_id, shell, cwd, size):
    with lock:
        old = sessions.get(session_id)
        if old:
            return old
        try:
            rel = clean_rel(cwd)
        except ValueError:
            rel = ""
        home = env_root(env)
        work = os.path.join(home, rel)
        os.makedirs(work, exist_ok=True)
        tmp_root = os.path.join(home, ".tmp")
        os.makedirs(tmp_root, exist_ok=True)
        pid, fd = pty.fork()
        if pid == 0:
            try:
                # PRoot -w establishes the learner-visible cwd. Do not chdir to
                # the physical environment path before entering PRoot.
                os.environ.clear()
                os.environ.update(
                    {
                        "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                        "HOME": "/home/learner",
                        "USER": "learner",
                        "LOGNAME": "learner",
                        "TERM": "xterm-256color",
                        "COLORTERM": "truecolor",
                        "SHELL": shell_argv(shell)[0],
                        "HISTFILE": "/home/learner/.bash_history" if shell == "bash" else "/home/learner/.zsh_history",
                        "HISTSIZE": "5000",
                        "SAVEHIST": "5000",
                        "TMPDIR": "/tmp",
                        "LANG": "C.UTF-8",
                        "LC_ALL": "C.UTF-8",
                        "PS1": prompt_for(session_id),
                        "PS2": f"LF_CONT_{session_id}_> ",
                    }
                )
                # Do not echo bytes typed by the browser; the UI renders the input line itself.
                attrs = termios.tcgetattr(0)
                attrs[3] &= ~termios.ECHO
                termios.tcsetattr(0, termios.TCSANOW, attrs)
                argv = shell_argv(shell)
                # PRoot is mandatory here. Falling back to the container's real
                # /home/learner would make filesystem observation diverge from what
                # the learner sees and could leak state between logical environments.
                proot = shutil.which("proot")
                if not proot:
                    raise RuntimeError("proot is required for isolated learner sessions")
                # IMPORTANT: do not use PRoot's -w here. PRoot's -w option
                # automatically binds the host $HOME and the requested path,
                # which would re-introduce the container's real /home/learner
                # over our per-environment bind. We set the learner-visible cwd
                # after the shell starts instead.
                proot_argv = [
                    proot,
                    "-b", f"{home}:/home/learner!",
                    "-b", f"{tmp_root}:/tmp!",
                    *argv,
                ]
                os.execvpe(proot_argv[0], proot_argv, os.environ)
            except BaseException:
                os._exit(127)
        rows, cols = size.get("rows", 24), size.get("cols", 100)
        try:
            fcntl_set_winsize(fd, rows, cols)
        except Exception:
            pass
        state = {"id": session_id, "env_id": env["id"], "shell": shell, "pid": pid, "fd": fd, "cwd": rel, "created": now()}
        sessions[session_id] = state
        # Drain the shell's initial prompt, then disable terminal echo so the
        # browser remains the single renderer of typed commands.
        try:
            read_until_prompt(fd, session_id, 0.5)
            # Establish the requested learner-visible cwd without PRoot -w.
            # This avoids PRoot's implicit $HOME bind while preserving /home/learner.
            if rel:
                safe_rel = rel.replace("'", "'\"'\"'")
                os.write(fd, f"cd -- '/home/learner/{safe_rel}'\n".encode("utf-8"))
                read_until_prompt(fd, session_id, 0.25)
            os.write(fd, b"stty -echo\n")
            read_until_prompt(fd, session_id, 0.25)
        except Exception:
            pass
        return state


def fcntl_set_winsize(fd, rows, cols):
    import fcntl
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))


def read_pty(fd, wait=0.0):
    chunks = []
    deadline = time.monotonic() + wait
    while True:
        remaining = max(0.0, deadline - time.monotonic()) if wait else 0.0
        readable, _, _ = select.select([fd], [], [], remaining)
        if not readable:
            break
        try:
            data = os.read(fd, 8192)
            if not data:
                break
            chunks.append(data.decode("utf-8", "replace"))
            if sum(len(x) for x in chunks) >= MAX_OUTPUT:
                break
        except OSError as e:
            if e.errno == errno.EIO:
                break
            raise
        if not wait:
            continue
    return "".join(chunks)[:MAX_OUTPUT]


def normalize_output(text, session_id):
    # Strip only LinuxForge's private terminal markers. Keep learner-visible
    # shell output and ANSI sequences produced by interactive applications.
    text = re.sub(r"\x1b\]0;LinuxForge:[^\x07]*\x07", "", text)
    text = text.replace(prompt_for(session_id), "")
    text = re.sub(rf"LF_PROMPT_{re.escape(session_id)}_> ", "", text)
    # PS2 is used for multiline shell input. It is an internal synchronization
    # prompt and must never leak into the terminal response returned to the app.
    text = re.sub(rf"LF_CONT_{re.escape(session_id)}_> ?", "", text)
    return text


def ensure_session(env, session_id, shell, cwd):
    with lock:
        s = sessions.get(session_id)
        if s:
            if s["env_id"] != env["id"]:
                raise ValueError("terminal session belongs to another environment")
            if s["shell"] != shell:
                terminate_session(s)
                sessions.pop(session_id, None)
            else:
                return s
    return start_session(env, session_id, shell, cwd, {"cols": 100, "rows": 24})


def terminate_session(s):
    try:
        os.killpg(os.getpgid(s["pid"]), signal.SIGTERM)
    except OSError:
        try:
            os.kill(s["pid"], signal.SIGTERM)
        except OSError:
            pass
    try:
        os.close(s["fd"])
    except OSError:
        pass
    s["pid"] = -1


def filesystem_delta(before_objects, after_objects):
    before = {o["objectId"]: o for o in before_objects}
    after = {o["objectId"]: o for o in after_objects}
    delta = []
    for object_id in sorted(set(before) | set(after)):
        old, new = before.get(object_id), after.get(object_id)
        if old is None and new is not None:
            delta.append({
                "kind": "created",
                "path": new["path"],
                "objectType": new["objectType"],
                "permissions": new["permissions"],
                "contentBytes": len(new.get("content", "").encode("utf-8")),
            })
        elif new is None and old is not None:
            delta.append({
                "kind": "deleted",
                "path": old["path"],
                "objectType": old["objectType"],
                "permissions": old["permissions"],
                "contentBytes": len(old.get("content", "").encode("utf-8")),
            })
        elif old is not None and new is not None:
            if old.get("permissions") != new.get("permissions"):
                delta.append({
                    "kind": "permissions",
                    "path": new["path"],
                    "objectType": new["objectType"],
                    "permissions": new["permissions"],
                    "contentBytes": len(new.get("content", "").encode("utf-8")),
                })
            elif old.get("objectType") != new.get("objectType") or old.get("content") != new.get("content"):
                delta.append({
                    "kind": "modified",
                    "path": new["path"],
                    "objectType": new["objectType"],
                    "permissions": new["permissions"],
                    "contentBytes": len(new.get("content", "").encode("utf-8")),
                })
    return delta

def record(env, session, input_text, kind, before, output, exit_code=-1, duration=0, blocked=None):
    cwd = session.get("cwd", "")
    after = observation(env, cwd)
    fs_delta = filesystem_delta(before["filesystem"]["objects"], after["filesystem"]["objects"])
    process_delta = after["processes"]["processes"]
    service_delta = after["services"]["services"]
    network_delta = after["network"]["listeners"]
    effective_operations = len(fs_delta) or (1 if input_text else 0)
    return {
        "shell": session["shell"],
        "provider": "real-linux-isolated-v1",
        "environmentId": env["id"],
        "input": input_text,
        "inputKind": kind,
        "cwdBefore": before["filesystem"]["cwd"],
        "cwdAfter": cwd,
        "stdout": output,
        "stderr": "",
        "exitCode": exit_code,
        "durationMs": duration,
        "chunks": ([{"seq": 0, "stream": "stdout", "text": output, "atMs": duration}] if output else []),
        "outputTruncated": len(output) >= MAX_OUTPUT,
        "blocked": blocked,
        "stateBefore": before,
        "stateAfter": after,
        "deltas": {"filesystem": fs_delta, "processes": process_delta,
                   "services": service_delta, "network": network_delta},
        "method": {
            "statements": [input_text] if input_text else [],
            "usedLoopConstruct": bool(re.search(r"\b(for|while|until)\b.+\b(do|done)\b", input_text or "", re.S)),
            "effectiveOperations": effective_operations,
            "invocations": 1 if input_text else 0,
        },
        "metadata": {"runtime": "kali", "interactivePty": "true"},
        "redactedFields": [],
    }


def read_until_prompt(fd, session_id, timeout):
    chunks = []
    marker = f"LF_PROMPT_{session_id}_> "
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        wait = max(0.01, min(0.08, deadline - time.monotonic()))
        readable, _, _ = select.select([fd], [], [], wait)
        if not readable:
            continue
        try:
            data = os.read(fd, 8192).decode("utf-8", "replace")
        except OSError as e:
            if e.errno == errno.EIO:
                break
            raise
        if not data:
            break
        chunks.append(data)
        joined = "".join(chunks)
        if marker in joined:
            return joined, True
        if sum(len(x) for x in chunks) >= MAX_OUTPUT:
            break
    return "".join(chunks)[:MAX_OUTPUT], False


def read_until_token(fd, token, timeout):
    """Read a PTY until a private sentinel appears or timeout expires.

    A sentinel is more reliable than waiting for PS1: learner commands can
    print arbitrary text, change terminal state, or take longer than the
    normal prompt window.
    """
    chunks = []
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        wait = max(0.01, min(0.08, deadline - time.monotonic()))
        readable, _, _ = select.select([fd], [], [], wait)
        if not readable:
            continue
        try:
            data = os.read(fd, 8192).decode("utf-8", "replace")
        except OSError as e:
            if e.errno == errno.EIO:
                break
            raise
        if not data:
            break
        chunks.append(data)
        joined = "".join(chunks)
        if token in joined:
            return joined, True
        if sum(len(x) for x in chunks) >= MAX_OUTPUT:
            break
    return "".join(chunks)[:MAX_OUTPUT], False


def execute(env, req):
    command = req.get("input", {}).get("data", "")
    shell = req.get("shell") or "bash"
    session_id = req.get("sessionId") or f"legacy-{env['id']}-{shell}"
    blocked = unsafe_shell(command)
    try:
        session = ensure_session(env, session_id, shell, req.get("cwd") or "")
    except Exception as e:
        raise RuntimeError(str(e))

    before = observation(env, session.get("cwd", ""))
    if blocked:
        msg = f"blocked: {blocked}"
        return record(env, session, command, "raw-shell", before, msg, 126, 1, {"reason": blocked})

    start = time.monotonic()
    # Do not depend on PS1 to decide whether a command finished. Instead, put
    # a unique, shell-generated sentinel immediately after the learner command.
    # The sentinel captures the learner command's real exit status and PWD.
    # This works for &&, pipes, redirects, multiline shell syntax, cd, and
    # commands that produce no output.
    token = f"__LF_STATE_{session_id}_{uuid.uuid4().hex}__"
    wrapped = (
        command
        + f'\n__lf_rc=$?; printf "\n{token}%s|%s\n" "$__lf_rc" "$PWD"\n'
    )
    os.write(session["fd"], wrapped.encode("utf-8"))

    raw, completed = read_until_token(session["fd"], token, max(COMMAND_WAIT, TIMEOUT))
    exit_code = -1
    if completed:
        match = re.search(re.escape(token) + r"(-?\d+)\|([^\r\n]+)", raw)
        if match:
            exit_code = int(match.group(1))
            virtual_cwd = match.group(2).strip()
            try:
                if virtual_cwd == "/home/learner":
                    session["cwd"] = ""
                elif virtual_cwd.startswith("/home/learner/"):
                    session["cwd"] = clean_rel(virtual_cwd)
                elif virtual_cwd == "/tmp":
                    session["cwd"] = "tmp"
                elif virtual_cwd.startswith("/tmp/"):
                    session["cwd"] = "tmp" + virtual_cwd[len("/tmp"):]
                # For paths in the real Kali root (/etc, /var, /usr, ...),
                # keep the last learner-workspace cwd in the contract because
                # the contract's cwd is intentionally relative to /home/learner.
            except ValueError:
                pass

        # read_until_token stops before the shell prompt. Drain that prompt so
        # the next terminal command never receives a stale prompt as output.
        prompt_raw, _ = read_until_prompt(session["fd"], session_id, 0.25)
        raw += prompt_raw

    output = normalize_output(raw, session_id)
    output = re.sub(rf"\n{re.escape(token)}-?\d+\|[^\r\n]*\r?\n?", "", output)
    # The shell may emit the private rc assignment line only through the
    # sentinel; remove any accidental marker text while preserving learner
    # output and ANSI sequences.
    output = output.replace(token, "")
    duration = max(1, int((time.monotonic() - start) * 1000))
    return record(env, session, command, "raw-shell", before, output, exit_code, duration)


def input_event(env, req):
    shell = req.get("shell") or "bash"
    session_id = req.get("sessionId") or f"legacy-{env['id']}-{shell}"
    with lock:
        session = sessions.get(session_id)
    if not session:
        session = ensure_session(env, session_id, shell, req.get("cwd") or "")
    before = observation(env, session.get("cwd", ""))
    kind = req.get("input", {}).get("kind")
    data = req.get("input", {}).get("data", "")
    if kind == "signal":
        sigmap = {"SIGINT": signal.SIGINT, "SIGTERM": signal.SIGTERM, "SIGTSTP": signal.SIGTSTP}
        if data == "EOF":
            os.write(session["fd"], b"\x04")
        else:
            sig = sigmap.get(data)
            if sig is None:
                raise ValueError("unsupported signal")
            try:
                os.killpg(os.getpgid(session["pid"]), sig)
            except OSError:
                os.write(session["fd"], {signal.SIGINT: b"\x03", signal.SIGTSTP: b"\x1a", signal.SIGTERM: b"\x03"}[sig])
    else:
        os.write(session["fd"], data.encode("utf-8"))
    raw, completed = read_until_prompt(session["fd"], session_id, 0.25)
    output = normalize_output(raw, session_id)
    return record(env, session, data, kind or "stdin", before, output, 0 if completed else -1, max(1, 200))


def descriptor(env):
    return {
        "handle": {"provider": "real-linux-isolated-v1", "environmentId": env["id"], "userId": env["userId"], "labId": env["labId"]},
        "status": env.get("status", "RUNNING"),
        "capabilities": {
            "id": "real-linux-isolated-v1", "label": "Isolated Kali Linux lab",
            "description": "A real Kali Linux shell running inside the development isolated lab runtime.",
            "realLinux": True, "modelled": False, "runtimeClass": RUNTIME_CLASS, "interactiveShell": True, "streaming": False,
            "resize": True, "processes": True, "services": True, "environmentVariables": True,
            "network": True, "snapshots": True, "pauseResume": True,
        },
        "resourcePolicy": {
            "executionTimeoutMs": TIMEOUT * 1000, "idleExpiryMs": IDLE_EXPIRY * 1000,
            "cpuMillicores": 500, "memoryMiB": 512, "storageMiB": 2048, "maxProcesses": 64,
            "maxOpenFiles": 256, "maxOutputBytes": MAX_OUTPUT, "network": "none", "egressAllowlist": [],
            "allowPrivilegeEscalation": False, "allowHostFilesystem": False,
        },
        "snapshotId": env.get("snapshotId"), "createdAt": env["createdAt"], "updatedAt": env["updatedAt"],
        "lastActiveAt": env["lastActiveAt"], "expiresAt": env.get("expiresAt"),
        "metadata": {"image": env.get("image", "kali-rolling"), "runtimeClass": RUNTIME_CLASS, "runtimeMode": RUNTIME_MODE, "runtimeVersion": RUNTIME_VERSION},
    }


def runtime_health():
    active = sum(1 for env in environments.values() if env.get("status") not in {"STOPPED", "EXPIRED"})
    return {
        "provider": "real-linux-isolated-v1",
        "runtimeClass": RUNTIME_CLASS,
        "runtimeVersion": RUNTIME_VERSION,
        "healthy": True,
        "ready": True,
        "checkedAt": now(),
        "security": {
            "networkIsolationEnforced": True,
            "hostFilesystemBlocked": True,
            "privilegeEscalationBlocked": True,
            "metadataAccessBlocked": True,
        },
        "capacity": {"activeEnvironments": active, "maxEnvironments": None},
    }


class Handler(BaseHTTPRequestHandler):
    def auth(self):
        return not TOKEN or self.headers.get("Authorization", "") == "Bearer " + TOKEN

    def send_json(self, status, payload):
        b = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        n = int(self.headers.get("content-length", "0"))
        return json.loads(self.rfile.read(n) or "{}")

    def do_GET(self):
        if not self.auth():
            return self.send_json(401, {"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Unauthorized"}})
        path = urlparse(self.path).path
        if path == "/v1/health":
            return self.send_json(200, {"ok": True, "value": runtime_health()})
        if path.startswith("/v1/environments/"):
            eid = path.split("/")[3]
            env = environments.get(eid)
            if not env:
                return self.send_json(404, {"ok": False, "error": {"code": "ENVIRONMENT_NOT_FOUND", "message": "Environment not found"}})
            return self.send_json(200, {"ok": True, "value": descriptor(env)})
        self.send_json(404, {"ok": False, "error": {"code": "NOT_FOUND", "message": "Not found"}})

    def do_POST(self):
        if not self.auth():
            return self.send_json(401, {"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Unauthorized"}})
        path = urlparse(self.path).path
        data = self.body()
        if path == "/v1/environments":
            runtime = data.get("runtime") or {}
            if runtime.get("runtimeClass") != RUNTIME_CLASS:
                return self.send_json(400, {"ok": False, "error": {"code": "SAFETY_POLICY_BLOCKED", "message": "Runtime class mismatch."}})
            if runtime.get("security", {}).get("hostFilesystem") is not False or runtime.get("security", {}).get("privilegeEscalation") is not False:
                return self.send_json(400, {"ok": False, "error": {"code": "SAFETY_POLICY_BLOCKED", "message": "Unsafe runtime security profile."}})
            eid = str(uuid.uuid4())
            t = now()
            env = {"id": eid, "userId": data["userId"], "labId": data["labId"], "createdAt": t, "updatedAt": t, "lastActiveAt": t, "status": "RUNNING", "image": runtime.get("imageRef") or data.get("metadata", {}).get("image", "kali-rolling"), "runtimeClass": RUNTIME_CLASS}
            os.makedirs(env_root(env), exist_ok=True)
            with lock: environments[eid] = env
            save_environment_registry()
            return self.send_json(200, {"ok": True, "value": descriptor(env)})
        parts = path.split("/")
        if len(parts) < 5:
            return self.send_json(404, {"ok": False, "error": {"code": "NOT_FOUND", "message": "Not found"}})
        eid, op = parts[3], parts[4]
        env = environments.get(eid)
        if not env:
            return self.send_json(404, {"ok": False, "error": {"code": "ENVIRONMENT_NOT_FOUND", "message": "Environment not found"}})
        try:
            if op == "start":
                env["status"] = "RUNNING"
                env["updatedAt"] = now()
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": descriptor(env)})
            if op == "pause":
                env["status"] = "PAUSED"
                for sid, s in list(sessions.items()):
                    if s["env_id"] == env["id"]:
                        terminate_session(s)
                        sessions.pop(sid, None)
                env["updatedAt"] = now()
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": descriptor(env)})
            if op == "resume":
                env["status"] = "RUNNING"
                env["updatedAt"] = now()
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": descriptor(env)})
            if op == "execute":
                if env.get("status") != "RUNNING":
                    return self.send_json(409, {"ok": False, "error": {"code": "ENVIRONMENT_NOT_RUNNING", "message": "Environment is paused."}})
                env["lastActiveAt"] = now()
                result = execute(env, data)
                env["updatedAt"] = now()
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": result})
            if op == "input":
                if env.get("status") != "RUNNING":
                    return self.send_json(409, {"ok": False, "error": {"code": "ENVIRONMENT_NOT_RUNNING", "message": "Environment is paused."}})
                env["lastActiveAt"] = now()
                result = input_event(env, data)
                env["updatedAt"] = now()
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": result})
            if op == "resize":
                sid = data.get("sessionId")
                size = data.get("size") or {}
                s = sessions.get(sid)
                if not s: return self.send_json(404, {"ok": False, "error": {"code": "UNSUPPORTED_OPERATION", "message": "Terminal session not found"}})
                fcntl_set_winsize(s["fd"], int(size.get("rows", 24)), int(size.get("cols", 100)))
                return self.send_json(200, {"ok": True, "value": {"cols": int(size.get("cols", 100)), "rows": int(size.get("rows", 24))}})
            if op == "filesystem": return self.send_json(200, {"ok": True, "value": observation(env, data.get("cwd") or "")["filesystem"]})
            if op == "processes": return self.send_json(200, {"ok": True, "value": observation(env, "")["processes"]})
            if op == "services": return self.send_json(200, {"ok": True, "value": observation(env, "")["services"]})
            if op == "environment": return self.send_json(200, {"ok": True, "value": observation(env, "")["environmentVariables"]})
            if op == "reset":
                for sid, s in list(sessions.items()):
                    if s["env_id"] == env["id"]:
                        terminate_session(s); sessions.pop(sid, None)
                root = env_root(env)
                for name in os.listdir(root):
                    path2 = os.path.join(root, name)
                    try: shutil.rmtree(path2) if os.path.isdir(path2) else os.remove(path2)
                    except OSError: pass
                env["updatedAt"] = now()
                env["lastActiveAt"] = env["updatedAt"]
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": descriptor(env)})
            if op == "snapshot":
                sid = "snap-" + uuid.uuid4().hex
                shutil.make_archive(os.path.join(SNAPSHOT_DIR, sid), "gztar", env_root(env))
                env["snapshotId"] = sid
                env["updatedAt"] = now()
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": {"snapshotId": sid, "createdAt": now()}})
            if op == "restore":
                sid = data.get("snapshotId"); archive = os.path.join(SNAPSHOT_DIR, sid + ".tar.gz") if sid else ""
                if not sid or not os.path.exists(archive): return self.send_json(400, {"ok": False, "error": {"code": "UNSUPPORTED_OPERATION", "message": "Snapshot not found"}})
                root = env_root(env); tmp = root + "-restore"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp); shutil.unpack_archive(archive, tmp)
                for name in os.listdir(root):
                    path2 = os.path.join(root, name)
                    try: shutil.rmtree(path2) if os.path.isdir(path2) else os.remove(path2)
                    except OSError: pass
                for name in os.listdir(tmp): shutil.move(os.path.join(tmp, name), os.path.join(root, name))
                shutil.rmtree(tmp, ignore_errors=True)
                env["updatedAt"] = now()
                env["lastActiveAt"] = env["updatedAt"]
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": descriptor(env)})
            if op == "destroy":
                for sid, s in list(sessions.items()):
                    if s["env_id"] == env["id"]: terminate_session(s); sessions.pop(sid, None)
                shutil.rmtree(env_root(env), ignore_errors=True); environments.pop(eid, None)
                save_environment_registry()
                return self.send_json(200, {"ok": True, "value": {"destroyed": True}})
            return self.send_json(200, {"ok": True, "value": descriptor(env)})
        except Exception as e:
            return self.send_json(500, {"ok": False, "error": {"code": "INTERNAL", "message": str(e)}})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
