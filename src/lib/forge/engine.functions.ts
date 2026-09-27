import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MissionAssessment, MissionState, RunResult } from "./types";
import { SHELLS, type ShellName } from "./sandbox/contract";

type Lang = "English" | "Hinglish" | "Mix both";
const lang = (v: unknown): Lang => (v === "English" || v === "Hinglish" ? v : "Mix both");

export const getMissionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { challengeId?: string; cwd?: string; language?: string }) => data)
  .handler(async ({ data, context }): Promise<MissionState> => {
    const { loadMissionState } = await import("./engine.server");
    return loadMissionState(
      context.supabase,
      context.userId,
      data.challengeId ?? "C01",
      data.cwd ?? "",
      lang(data.language),
    );
  });

export const runCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { challengeId: string; command: string; cwd: string; language?: string }) => {
    if (!data.challengeId || typeof data.command !== "string") throw new Error("Invalid lab input");
    if (data.command.length > 400) throw new Error("Command too long for the training sandbox");
    return data;
  })
  .handler(async ({ data, context }): Promise<RunResult> => {
    const { runLabCommand } = await import("./engine.server");
    return runLabCommand(
      context.supabase,
      context.userId,
      data.challengeId,
      data.command,
      data.cwd ?? "",
      lang(data.language),
    );
  });

export const assessMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { challengeId: string }) => {
    if (!data.challengeId) throw new Error("Invalid mission");
    return data;
  })
  .handler(async ({ data, context }): Promise<MissionAssessment> => {
    const { assessMission: assess } = await import("./engine.server");
    return assess(context.supabase, context.userId, data.challengeId);
  });

export const revealHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { challengeId: string }) => data)
  .handler(async ({ data, context }) => {
    const { revealNextHint } = await import("./engine.server");
    return revealNextHint(context.supabase, context.userId, data.challengeId);
  });

/** Initialise-or-restore the learner's mission, then the UI routes to it. */
export const startMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { challengeId?: string }) => data)
  .handler(async ({ data, context }): Promise<{ challengeId: string; resumed: boolean }> => {
    const { startOrRestoreMission } = await import("./engine.server");
    return startOrRestoreMission(context.supabase, context.userId, data.challengeId);
  });

export const runTerminalCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { command: string; cwd: string; shell?: string; sessionId?: string }) => {
    if (!data.command || data.command.length > 4000)
      throw new Error("Command is empty or too long.");
    if (data.shell && !(SHELLS as readonly string[]).includes(data.shell))
      throw new Error("Unsupported shell.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { runTerminalCommand: run } = await import("./engine.server");
    return run(
      context.supabase,
      context.userId,
      data.command,
      data.cwd ?? "",
      (data.shell as ShellName | undefined) ?? "bash",
      data.sessionId,
    );
  });

export const sendTerminalInput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { data: string; cwd: string; shell?: string; sessionId?: string }) => {
    if (data.data.length > 16_000) throw new Error("Terminal input is too long.");
    if (data.shell && !(SHELLS as readonly string[]).includes(data.shell))
      throw new Error("Unsupported shell.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { sendTerminalInputToLab } = await import("./engine.server");
    return sendTerminalInputToLab(
      context.supabase,
      context.userId,
      data.data,
      data.cwd ?? "",
      (data.shell as ShellName | undefined) ?? "bash",
      data.sessionId,
    );
  });

export const sendTerminalSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { signal: string; cwd: string; shell?: string; sessionId?: string }) => {
    const allowed = ["SIGINT", "SIGTERM", "EOF", "SIGTSTP"];
    if (!allowed.includes(data.signal)) throw new Error("Unsupported terminal signal.");
    if (data.shell && !(SHELLS as readonly string[]).includes(data.shell))
      throw new Error("Unsupported shell.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { sendTerminalSignalToLab } = await import("./engine.server");
    return sendTerminalSignalToLab(
      context.supabase,
      context.userId,
      data.signal,
      data.cwd ?? "",
      (data.shell as ShellName | undefined) ?? "bash",
      data.sessionId,
    );
  });

/** Mint a short-lived, runtime-scoped browser PTY ticket. Runtime credentials never reach the browser. */
export const createTerminalTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { sessionId: string; shell?: string; cwd?: string }) => {
    if (!data.sessionId || data.sessionId.length > 128)
      throw new Error("Invalid terminal session.");
    if (data.shell && !(SHELLS as readonly string[]).includes(data.shell))
      throw new Error("Unsupported shell.");
    if ((data.cwd ?? "").length > 4096) throw new Error("Terminal path is too long.");
    return {
      sessionId: data.sessionId,
      shell: (data.shell as ShellName | undefined) ?? "bash",
      cwd: data.cwd ?? "/home/linuxforge",
    };
  })
  .handler(async ({ data, context }) => {
    const { issueTerminalTicket } = await import("./sandbox/terminal-ticket.server");
    return issueTerminalTicket(context.supabase, context.userId, data);
  });

/** Close a learner-owned persistent terminal session through the server control plane. */
export const closeTerminalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { sessionId: string }) => {
    if (!data.sessionId || data.sessionId.length > 128) {
      throw new Error("Invalid terminal session.");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<void> => {
    const { closeTerminalSession: close } = await import("./sandbox/terminal-control.server");
    await close(context.supabase, context.userId, data.sessionId);
  });

/** Run M5 semantic verification against authoritative isolated-environment evidence. */
export const verifyLabExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      labId: string;
      environmentId: string;
      attemptId?: string;
      contract: import("./verification/types").ExerciseContract;
      hintsUsed?: number;
      solutionRevealed?: boolean;
      tutorInterventionCount?: number;
    }) => {
      if (!data.labId || !data.environmentId) {
        throw new Error("Lab and environment are required.");
      }
      if (
        data.hintsUsed !== undefined &&
        (!Number.isInteger(data.hintsUsed) || data.hintsUsed < 0 || data.hintsUsed > 100)
      ) {
        throw new Error("Invalid hint count.");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { verifyLabExercise: verify } = await import("./verification/verification.server");
    return verify({ db: context.supabase, userId: context.userId, ...data });
  });
