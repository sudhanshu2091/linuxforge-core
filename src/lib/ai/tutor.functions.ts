import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tutorReply } from "./provider.server";
import { buildMissionTutorContext } from "./tutor-context";
import { loadMissionState, loadTutorContext } from "@/lib/forge/engine.server";

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { message: string; language: string; depth: string; context?: unknown }) => {
    if (!data.message || data.message.length > 4000)
      throw new Error("Message must be between 1 and 4000 characters.");
    return data;
  })
  .handler(async ({ data, context }) => ({
    reply: await tutorReply({
      ...data,
      context: await loadTutorContext(context.supabase, context.userId),
    }),
  }));

export const askMissionTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { challengeId: string; message: string; language: string; depth: string }) => {
    if (!data.challengeId || !data.message || data.message.length > 4000)
      throw new Error("Mission tutor message must be between 1 and 4000 characters.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const state = await loadMissionState(
      context.supabase,
      context.userId,
      data.challengeId,
      "",
      data.language === "English" || data.language === "Hinglish" ? data.language : "Mix both",
    );
    const missionContext = buildMissionTutorContext(state);
    return {
      reply: await tutorReply({
        message: data.message,
        language: data.language,
        depth: data.depth,
        context: missionContext,
      }),
    };
  });
