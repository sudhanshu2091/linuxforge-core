import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MissionState, RunResult } from "./types";

type Lang = "English" | "Hinglish" | "Mix both";
const lang = (v: unknown): Lang => (v === "English" || v === "Hinglish" ? v : "Mix both");

export const getMissionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { challengeId?: string; cwd?: string; language?: string }) => data)
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
  .inputValidator((data: { challengeId: string; command: string; cwd: string; language?: string }) => {
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

export const revealHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { challengeId: string }) => data)
  .handler(async ({ data, context }) => {
    const { revealNextHint } = await import("./engine.server");
    return revealNextHint(context.supabase, context.userId, data.challengeId);
  });

/** Initialise-or-restore the learner's mission, then the UI routes to it. */
export const startMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { challengeId?: string }) => data)
  .handler(async ({ data, context }): Promise<{ challengeId: string; resumed: boolean }> => {
    const { startOrRestoreMission } = await import("./engine.server");
    return startOrRestoreMission(context.supabase, context.userId, data.challengeId);
  });
