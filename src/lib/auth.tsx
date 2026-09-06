/**
 * Real authentication + private learner persistence.
 *
 * Identity lives with the auth provider (no duplicate credentials in our tables).
 * Learner-owned rows: learner_profiles -> learner_preferences, both keyed by the
 * auth user id and protected by row-level policies.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LearnerProfile = Database["public"]["Tables"]["learner_profiles"]["Row"];
export type LearnerPreferences = Database["public"]["Tables"]["learner_preferences"]["Row"];
export type ComfortLevel = Database["public"]["Enums"]["linux_comfort_level"];
export type TutorLanguage = Database["public"]["Enums"]["tutor_language"];

export const COMFORT_LEVELS: ComfortLevel[] = [
  "Total beginner",
  "Some terminal time",
  "Comfortable, want depth",
];
export const TUTOR_LANGUAGES: TutorLanguage[] = ["English", "Hinglish", "Mix both"];

function isComfortLevel(v: unknown): v is ComfortLevel {
  return typeof v === "string" && (COMFORT_LEVELS as string[]).includes(v);
}
function isTutorLanguage(v: unknown): v is TutorLanguage {
  return typeof v === "string" && (TUTOR_LANGUAGES as string[]).includes(v);
}

export type AuthStatus = "loading" | "signed-out" | "ready" | "error";

type AuthContextValue = {
  status: AuthStatus;
  /** Present while the database read failed but the session is valid. */
  error?: string;
  session: Session | null;
  user: User | null;
  profile: LearnerProfile | null;
  preferences: LearnerPreferences | null;
  reload: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
    comfortLevel: ComfortLevel;
    tutorLanguage: TutorLanguage;
  }) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<LearnerProfile, "display_name" | "avatar_ref" | "linux_comfort_level">>,
  ) => Promise<{ error?: string }>;
  updatePreferences: (
    patch: Partial<Omit<LearnerPreferences, "id" | "user_id" | "created_at" | "updated_at">>,
  ) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Creates the learner rows the first time we see an authenticated user. */
async function ensureLearnerRecords(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const { data: profile, error: profileError } = await supabase
    .from("learner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  let resolvedProfile = profile;
  if (!resolvedProfile) {
    const displayName =
      (typeof meta["display_name"] === "string" && meta["display_name"].trim()) ||
      user.email?.split("@")[0] ||
      "New learner";
    const { data: created, error: insertError } = await supabase
      .from("learner_profiles")
      .insert({
        user_id: user.id,
        display_name: displayName,
        email: user.email ?? "",
        linux_comfort_level: isComfortLevel(meta["linux_comfort_level"])
          ? meta["linux_comfort_level"]
          : "Total beginner",
      })
      .select("*")
      .single();
    if (insertError) throw insertError;
    resolvedProfile = created;
  }

  const { data: prefs, error: prefsError } = await supabase
    .from("learner_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (prefsError) throw prefsError;

  let resolvedPrefs = prefs;
  if (!resolvedPrefs) {
    const { data: created, error: insertError } = await supabase
      .from("learner_preferences")
      .insert({
        user_id: user.id,
        preferred_tutor_language: isTutorLanguage(meta["preferred_tutor_language"])
          ? meta["preferred_tutor_language"]
          : "Mix both",
      })
      .select("*")
      .single();
    if (insertError) throw insertError;
    resolvedPrefs = created;
  }

  return { profile: resolvedProfile, preferences: resolvedPrefs };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [preferences, setPreferences] = useState<LearnerPreferences | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Session restore + live session changes.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (!data.session) setStatus("signed-out");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the learner rows for the current session.
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setPreferences(null);
      setStatus((s) => (s === "loading" ? s : "signed-out"));
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(undefined);
    (async () => {
      try {
        const { profile: p, preferences: pref } = await ensureLearnerRecords(session.user);
        if (cancelled || !mounted.current) return;
        setProfile(p);
        setPreferences(pref);
        setStatus("ready");
      } catch (e) {
        if (cancelled || !mounted.current) return;
        setError(
          e instanceof Error
            ? e.message
            : "We couldn't load your learner profile. Please try again.",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: signInError.message };
    return {};
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (input) => {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
        data: {
          display_name: input.displayName,
          linux_comfort_level: input.comfortLevel,
          preferred_tutor_language: input.tutorLanguage,
        },
      },
    });
    if (signUpError) return { error: signUpError.message };
    if (!data.session) return { needsEmailConfirmation: true };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPreferences(null);
    setStatus("signed-out");
  }, []);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    async (patch) => {
      if (!session?.user) return { error: "You need to be signed in." };
      const { data, error: updateError } = await supabase
        .from("learner_profiles")
        .update(patch)
        .eq("user_id", session.user.id)
        .select("*")
        .single();
      if (updateError) return { error: updateError.message };
      setProfile(data);
      return {};
    },
    [session?.user?.id],
  );

  const updatePreferences = useCallback<AuthContextValue["updatePreferences"]>(
    async (patch) => {
      if (!session?.user) return { error: "You need to be signed in." };
      const { data, error: updateError } = await supabase
        .from("learner_preferences")
        .update(patch)
        .eq("user_id", session.user.id)
        .select("*")
        .single();
      if (updateError) return { error: updateError.message };
      setPreferences(data);
      return {};
    },
    [session?.user?.id],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      error,
      session,
      user: session?.user ?? null,
      profile,
      preferences,
      reload,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePreferences,
    }),
    [
      status,
      error,
      session,
      profile,
      preferences,
      reload,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePreferences,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Display helpers that never invent progress. */
export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LF";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function handleFrom(profile: LearnerProfile | null, email?: string | null) {
  const base = profile?.display_name || email?.split("@")[0] || "learner";
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
