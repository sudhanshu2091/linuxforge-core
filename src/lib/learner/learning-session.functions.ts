import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  loadLearningSession,
  startOrRestoreLearningSession,
  transitionLearningSession,
} from "./learning-session.server";
import type { VerificationStatus } from "@/lib/forge/types";

export const startLearningSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { sessionId?: string }) => data)
  .handler(({ data, context }) =>
    startOrRestoreLearningSession(context.supabase, context.userId, data.sessionId),
  );

export const getLearningSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { sessionId: string }) => {
    if (!data.sessionId) throw new Error("Session ID is required.");
    return data;
  })
  .handler(({ data, context }) =>
    loadLearningSession(context.supabase, context.userId, data.sessionId),
  );

export const transitionLearningSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      sessionId: string;
      action:
        | "teach"
        | "practice"
        | "finish-practice"
        | "assess"
        | "reflect"
        | "complete"
        | "pause"
        | "resume"
        | "abandon";
      status?: VerificationStatus;
      score?: number;
    }) => {
      if (!data.sessionId) throw new Error("Session ID is required.");
      if (data.action === "assess" && (data.status === undefined || data.score === undefined))
        throw new Error("Assessment status and score are required.");
      return data;
    },
  )
  .handler(({ data, context }) =>
    transitionLearningSession(
      context.supabase,
      context.userId,
      data.sessionId,
      data.action,
      data.action === "assess" ? { status: data.status!, score: data.score! } : undefined,
    ),
  );
