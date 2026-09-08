/**
 * Constrained mock lab executor (server-only).
 *
 * SAFETY BOUNDARY
 * ---------------
 * This is NOT a shell. Nothing here reaches a host machine, a process, a
 * network socket or a real filesystem. It is a deterministic model of a small
 * set of approved educational filesystem/permission operations over rows the
 * learner owns in `lab_world_objects`.
 *
 * FUTURE ADAPTER BOUNDARY
 * -----------------------
 * `LabExecutorAdapter` is the seam an isolated per-learner Linux sandbox would
 * plug into later. `modelExecutor` is the only implementation today.
 */

export type ModelObject = {
  objectId: string;
  objectType: "directory" | "file";
  path: string;
  name: string;
  permissions: string;
  content: string;
  /** Soft-delete flag mirrored from persistence; only active objects are modelled. */
  active: boolean;
  createdByChallenge: string | null;
  lastModifiedByChallenge: string | null;
  createdAt: string;
};


export type World = Map<string, ModelObject>;

export type Mutation =
  | { kind: "create"; path: string; objectType: "directory" | "file"; permissions: string; content: string }
  | { kind: "update"; path: string; permissions?: string; content?: string };

export type MethodEvidence = {
  /** A loop construct was used in this submission. */
  usedLoop: boolean;
  /** How many effective operations the submission performed. */
  operations: number;
  /** How many separate command invocations the learner typed. */
  invocations: number;
  commands: string[];
};

export type ExecutionResult = {
  lines: { kind: "output" | "error" | "system"; text: string }[];
  cwd: string;
  mutations: Mutation[];
  evidence: MethodEvidence;
  blocked: { reason: string } | null;
};

export type LabExecutorAdapter = {
  id: string;
  execute: (world: World, cwd: string, raw: string) => ExecutionResult;
};

/* ------------------------------------------------------------------ */
/* Safety policy                                                       */
/* ------------------------------------------------------------------ */

const BLOCKED_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bsudo\b|\bsu\b/, reason: "Privilege escalation is outside the training sandbox." },
  { re: /\brm\s+-rf?\b/, reason: "Destructive recursive deletion is blocked by lab safety policy." },
  { re: /\b(ssh|scp|telnet|ftp|nc|netcat|nmap|masscan|hydra|metasploit|msfconsole|tcpdump)\b/, reason: "Remote access and scanning tools are out of scope — this lab is defensive and local only." },
  { re: /\b(curl|wget)\b/, reason: "Outbound network calls are not available in the training sandbox." },
  { re: /\b(dd|mkfs|fdisk|shutdown|reboot|systemctl|kill|killall)\b/, reason: "Host and device level commands are not modelled in the training sandbox." },
  { re: /:\s*\(\s*\)\s*\{/, reason: "Fork bomb patterns are blocked by lab safety policy." },
  { re: /(^|\s)\/(etc|var|usr|bin|root|proc|dev|sys)(\/|\s|$)/, reason: "Only your own lab workspace is modelled — system paths are out of scope." },
  { re: /\bchmod\s+777\b/, reason: "World-writable permissions are blocked: the curriculum teaches least privilege." },
];

function safetyCheck(raw: string): string | null {
  for (const p of BLOCKED_PATTERNS) if (p.re.test(raw)) return p.reason;
  return null;
}

/* ------------------------------------------------------------------ */
/* Path handling                                                       */
/* ------------------------------------------------------------------ */

const DEFAULT_DIR_PERMS = "755";
const DEFAULT_FILE_PERMS = "644";

export function resolvePath(cwd: string, target: string): string | null {
  let t = target.trim();
  if (t === "") return cwd;
  if (t === "~" || t === "~/") return "";
  if (t.startsWith("~/")) t = t.slice(2);
  else if (t.startsWith("/home/learner")) t = t.slice("/home/learner".length).replace(/^\//, "");
  else if (t.startsWith("/")) return null; // outside the modelled workspace
  else t = cwd ? `${cwd}/${t}` : t;

  const parts: string[] = [];
  for (const seg of t.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.join("/");
}

const baseName = (p: string) => p.split("/").pop() ?? p;
const parentOf = (p: string) => p.split("/").slice(0, -1).join("/");

export function octalToSymbolic(objectType: "directory" | "file", octal: string): string {
  const map = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  const digits = octal.slice(-3).split("").map((d) => map[Number(d)] ?? "---");
  return (objectType === "directory" ? "d" : "-") + digits.join("");
}

/* ------------------------------------------------------------------ */
/* Expansion (brace ranges, seq, loops)                                */
/* ------------------------------------------------------------------ */

function expandList(list: string): string[] {
  const out: string[] = [];
  for (const tok of list.trim().split(/\s+/)) {
    const brace = tok.match(/^\{(\d+)\.\.(\d+)\}$/);
    const seq = tok.match(/^\$\(\s*seq\s+(\d+)\s+(\d+)\s*\)$/) ?? tok.match(/^`\s*seq\s+(\d+)\s+(\d+)\s*`$/);
    const range = brace ?? seq;
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(String(i));
      continue;
    }
    if (tok) out.push(tok.replace(/^["']|["']$/g, ""));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Executor                                                            */
/* ------------------------------------------------------------------ */

type Ctx = {
  world: World;
  cwd: string;
  mutations: Mutation[];
  lines: ExecutionResult["lines"];
  operations: number;
};

function ensure(ctx: Ctx, path: string, objectType: "directory" | "file", perms: string) {
  ctx.mutations.push({ kind: "create", path, objectType, permissions: perms, content: "" });
  ctx.world.set(path, {
    objectId: `pending:${path}`,
    objectType,
    path,
    name: baseName(path),
    permissions: perms,
    active: true,
    content: "",

    createdByChallenge: null,
    lastModifiedByChallenge: null,
    createdAt: new Date().toISOString(),
  });
  ctx.operations += 1;
}

function applyChmod(ctx: Ctx, mode: string, obj: ModelObject): string | null {
  if (/^[0-7]{3,4}$/.test(mode)) return mode.slice(-3);
  // simple symbolic form: u+x, g-w, o=r, a+rw (comma separated)
  const digits = obj.permissions.slice(-3).split("").map(Number) as [number, number, number];
  let touched = false;
  for (const clause of mode.split(",")) {
    const m = clause.match(/^([ugoa]*)([+\-=])([rwx]+)$/);
    if (!m) return null;
    const who = m[1] === "" || m[1] === "a" ? "ugo" : (m[1] as string);
    const op = m[2] as "+" | "-" | "=";
    const bits = (m[3] as string).split("").reduce((acc, c) => acc + (c === "r" ? 4 : c === "w" ? 2 : 1), 0);
    for (const w of who) {
      const idx = w === "u" ? 0 : w === "g" ? 1 : 2;
      if (op === "+") digits[idx] |= bits;
      else if (op === "-") digits[idx] &= ~bits & 7;
      else digits[idx] = bits;
      touched = true;
    }
  }
  void ctx;
  return touched ? digits.join("") : null;
}

function runSimple(ctx: Ctx, raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return;
  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0] as string;
  const args = tokens.slice(1);
  const flags = args.filter((a) => a.startsWith("-"));
  const operands = args.filter((a) => !a.startsWith("-"));

  const notFound = (p: string) => ctx.lines.push({ kind: "error", text: `${cmd}: cannot access '${p}': No such file or directory` });

  switch (cmd) {
    case "help":
      ctx.lines.push({
        kind: "system",
        text: "Modelled commands: pwd, ls [-l], cd, mkdir [-p], touch, cat, echo [> file], chmod, stat, tree, clear, help. for … do … done loops are supported.",
      });
      return;
    case "pwd":
      ctx.lines.push({ kind: "output", text: `/home/learner${ctx.cwd ? `/${ctx.cwd}` : ""}` });
      return;
    case "cd": {
      const target = resolvePath(ctx.cwd, operands[0] ?? "~");
      if (target === null) { ctx.lines.push({ kind: "error", text: `cd: ${operands[0]}: outside your lab workspace` }); return; }
      if (target !== "" && ctx.world.get(target)?.objectType !== "directory")
        { ctx.lines.push({ kind: "error", text: `cd: ${operands[0]}: Not a directory` }); return; }
      ctx.cwd = target;
      return;
    }
    case "ls": {
      const target = resolvePath(ctx.cwd, operands[0] ?? ".");
      if (target === null) { notFound(operands[0] ?? "."); return; }
      if (target !== "" && !ctx.world.has(target)) { notFound(operands[0] ?? "."); return; }
      const children = [...ctx.world.values()].filter((o) => parentOf(o.path) === target);
      if (children.length === 0) return;
      const long = flags.some((f) => f.includes("l"));
      children.sort((a, b) => a.name.localeCompare(b.name));
      for (const c of children) {
        ctx.lines.push({
          kind: "output",
          text: long
            ? `${octalToSymbolic(c.objectType, c.permissions)}  learner learner  ${c.objectType === "directory" ? "4096" : String(c.content.length)}  ${c.name}`
            : c.name,
        });
      }
      return;
    }
    case "tree": {
      const all = [...ctx.world.values()].sort((a, b) => a.path.localeCompare(b.path));
      if (all.length === 0) { ctx.lines.push({ kind: "system", text: "(workspace empty)" }); return; }
      for (const o of all)
        ctx.lines.push({ kind: "output", text: `${"  ".repeat(o.path.split("/").length - 1)}${o.name}${o.objectType === "directory" ? "/" : ""}` });
      return;
    }
    case "stat": {
      const target = resolvePath(ctx.cwd, operands[0] ?? "");
      const obj = target === null ? undefined : ctx.world.get(target);
      if (!obj) { notFound(operands[0] ?? ""); return; }
      ctx.lines.push({ kind: "output", text: `  File: ${obj.name}` });
      ctx.lines.push({ kind: "output", text: `Access: (0${obj.permissions}/${octalToSymbolic(obj.objectType, obj.permissions)})  Uid: learner  Gid: learner` });
      return;
    }
    case "mkdir": {
      if (operands.length === 0) { ctx.lines.push({ kind: "error", text: "mkdir: missing operand" }); return; }
      const parents = flags.some((f) => f.includes("p"));
      for (const op of operands) {
        const target = resolvePath(ctx.cwd, op);
        if (target === null || target === "") { ctx.lines.push({ kind: "error", text: `mkdir: cannot create directory '${op}': outside your lab workspace` }); return; }
        if (ctx.world.has(target)) {
          if (!parents) ctx.lines.push({ kind: "error", text: `mkdir: cannot create directory '${op}': File exists` });
          continue;
        }
        const segs = target.split("/");
        for (let i = 1; i < segs.length; i++) {
          const parent = segs.slice(0, i).join("/");
          if (!ctx.world.has(parent)) {
            if (!parents) { ctx.lines.push({ kind: "error", text: `mkdir: cannot create directory '${op}': No such file or directory` }); return; }
            ensure(ctx, parent, "directory", DEFAULT_DIR_PERMS);
          }
        }
        ensure(ctx, target, "directory", DEFAULT_DIR_PERMS);
      }
      return;
    }
    case "touch": {
      if (operands.length === 0) { ctx.lines.push({ kind: "error", text: "touch: missing file operand" }); return; }
      for (const op of operands) {
        const target = resolvePath(ctx.cwd, op);
        if (target === null || target === "") { ctx.lines.push({ kind: "error", text: `touch: cannot touch '${op}': outside your lab workspace` }); return; }
        if (ctx.world.has(target)) {
          ctx.mutations.push({ kind: "update", path: target });
          ctx.operations += 1;
          continue;
        }
        if (parentOf(target) !== "" && !ctx.world.has(parentOf(target)))
          { ctx.lines.push({ kind: "error", text: `touch: cannot touch '${op}': No such file or directory` }); return; }
        ensure(ctx, target, "file", DEFAULT_FILE_PERMS);
      }
      return;
    }
    case "echo": {
      const redirect = trimmed.match(/^echo\s+(.*?)\s*(>>?)\s*(\S+)\s*$/);
      if (!redirect) { ctx.lines.push({ kind: "output", text: args.join(" ").replace(/^["']|["']$/g, "") }); return; }
      const text = (redirect[1] as string).replace(/^["']|["']$/g, "");
      const target = resolvePath(ctx.cwd, redirect[3] as string);
      if (target === null || target === "") { ctx.lines.push({ kind: "error", text: `echo: ${redirect[3]}: outside your lab workspace` }); return; }
      if (parentOf(target) !== "" && !ctx.world.has(parentOf(target)))
        { ctx.lines.push({ kind: "error", text: `bash: ${redirect[3]}: No such file or directory` }); return; }
      const existing = ctx.world.get(target);
      const content = redirect[2] === ">>" && existing ? `${existing.content}${text}\n` : `${text}\n`;
      if (existing) {
        existing.content = content;
        ctx.mutations.push({ kind: "update", path: target, content });
        ctx.operations += 1;
      } else {
        ensure(ctx, target, "file", DEFAULT_FILE_PERMS);
        const created = ctx.world.get(target);
        if (created) created.content = content;
        ctx.mutations.push({ kind: "update", path: target, content });
      }
      return;
    }
    case "cat": {
      const target = resolvePath(ctx.cwd, operands[0] ?? "");
      const obj = target === null ? undefined : ctx.world.get(target);
      if (!obj) { notFound(operands[0] ?? ""); return; }
      if (obj.objectType === "directory") { ctx.lines.push({ kind: "error", text: `cat: ${obj.name}: Is a directory` }); return; }
      if (obj.content) for (const l of obj.content.split("\n")) if (l) ctx.lines.push({ kind: "output", text: l });
      return;
    }
    case "chmod": {
      const mode = operands[0];
      const pathArg = operands[1];
      if (!mode || !pathArg) { ctx.lines.push({ kind: "error", text: "chmod: missing operand" }); return; }
      const target = resolvePath(ctx.cwd, pathArg);
      const obj = target === null ? undefined : ctx.world.get(target);
      if (!obj || target === null) { notFound(pathArg); return; }
      const next = applyChmod(ctx, mode, obj);
      if (next === null) { ctx.lines.push({ kind: "error", text: `chmod: invalid mode: '${mode}'` }); return; }
      obj.permissions = next;
      ctx.mutations.push({ kind: "update", path: target, permissions: next });
      ctx.operations += 1;
      return;
    }
    case "clear":
      ctx.lines.push({ kind: "system", text: "__clear__" });
      return;
    default:
      ctx.lines.push({
        kind: "error",
        text: `${cmd}: command not modelled in this training sandbox. Type help to see what is available.`,
      });
  }
}

export const modelExecutor: LabExecutorAdapter = {
  id: "forge-model-v1",
  execute(world, cwd, raw) {
    const blockedReason = safetyCheck(raw);
    if (blockedReason) {
      return {
        lines: [{ kind: "error", text: `blocked: ${blockedReason}` }],
        cwd,
        mutations: [],
        evidence: { usedLoop: false, operations: 0, invocations: 1, commands: [raw.trim()] },
        blocked: { reason: blockedReason },
      };
    }

    const ctx: Ctx = { world, cwd, mutations: [], lines: [], operations: 0 };
    let usedLoop = false;
    const commands: string[] = [];
    let invocations = 0;

    const forLoop = raw.trim().match(/^for\s+(\w+)\s+in\s+(.+?)\s*;?\s*do\s+(.+?)\s*;?\s*done\s*;?$/s);
    if (forLoop) {
      usedLoop = true;
      const varName = forLoop[1] as string;
      const values = expandList(forLoop[2] as string);
      const body = forLoop[3] as string;
      if (values.length === 0) ctx.lines.push({ kind: "system", text: "loop list expanded to nothing" });
      for (const v of values) {
        for (const stmt of body.split(/;|\n/)) {
          const line = stmt.replace(new RegExp(`\\$\\{${varName}\\}|\\$${varName}`, "g"), v);
          if (!line.trim()) continue;
          commands.push(line.trim());
          runSimple(ctx, line);
        }
      }
      invocations = 1;
    } else {
      for (const stmt of raw.split(/;|&&|\n/)) {
        if (!stmt.trim()) continue;
        invocations += 1;
        commands.push(stmt.trim());
        runSimple(ctx, stmt);
      }
    }

    return {
      lines: ctx.lines,
      cwd: ctx.cwd,
      mutations: ctx.mutations,
      evidence: { usedLoop, operations: ctx.operations, invocations, commands },
      blocked: null,
    };
  },
};
