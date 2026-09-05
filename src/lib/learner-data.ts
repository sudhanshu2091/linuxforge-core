/**
 * Shared frontend learner + social data models.
 *
 * INTEGRATION BOUNDARY
 * --------------------
 * Every function in this file is a frontend stand-in shaped like the future
 * API/PostgreSQL response it will replace. When auth + database wiring lands,
 * only the bodies of the `*Service` functions change — component code, types
 * and loading/empty/error handling stay exactly as they are.
 */

import { useEffect, useState } from "react";

/* ---------- Models ---------- */

export type ForgeRank = "Recruit" | "Operator" | "Engineer" | "Architect";

export type SkillKey =
  | "filesystem"
  | "permissions"
  | "processes"
  | "networking"
  | "shell-scripting"
  | "hardening";

export type Skill = {
  key: SkillKey;
  label: string;
  /** 0-100 mastery, derived from lab outcomes in the future backend. */
  mastery: number;
};

export type PersonalBest = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type ChallengeResult = {
  challengeId: string;
  title: string;
  /** 0-100 */
  score: number;
  /** seconds */
  completionTime: number;
  attempts: number;
  hintsUsed: number;
  completedAt: string;
};

export type Learner = {
  id: string;
  displayName: string;
  handle: string;
  email: string;
  initials: string;
  rank: ForgeRank;
  level: number;
  xp: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  labsCompleted: number;
  challengesCompleted: number;
  skills: Skill[];
  personalBests: PersonalBest[];
  recentBadges: { id: string; label: string; earnedAt: string }[];
  goal: string;
  path: string;
  tutorLanguage: "English" | "Hinglish" | "Mix (auto)";
  joinedAt: string;
  location?: string;
  bio?: string;
};

export type FriendRequest = {
  id: string;
  learner: Pick<Learner, "id" | "displayName" | "handle" | "initials" | "rank" | "xp">;
  direction: "incoming" | "outgoing";
  sentAt: string;
};

export type DailyChallenge = {
  id: string;
  title: string;
  focus: string;
  difficulty: "Intro" | "Core" | "Advanced";
  /** Authorized learning lab only — never a real-world target. */
  scope: "Sandboxed lab";
};

/* ---------- Helpers ---------- */

export const RANK_LADDER: ForgeRank[] = ["Recruit", "Operator", "Engineer", "Architect"];

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function strongestSkill(skills: Skill[]) {
  return skills.reduce((a, b) => (b.mastery > a.mastery ? b : a));
}

export function weakestSkill(skills: Skill[]) {
  return skills.reduce((a, b) => (b.mastery < a.mastery ? b : a));
}

export function skillAverage(skills: Skill[]) {
  return Math.round(skills.reduce((sum, s) => sum + s.mastery, 0) / skills.length);
}

/* ---------- Demo data (labelled in UI as demo / integration-ready) ---------- */

const skills = (values: number[]): Skill[] => [
  { key: "filesystem", label: "Filesystem", mastery: values[0] },
  { key: "permissions", label: "Permissions", mastery: values[1] },
  { key: "processes", label: "Processes", mastery: values[2] },
  { key: "networking", label: "Networking", mastery: values[3] },
  { key: "shell-scripting", label: "Shell scripting", mastery: values[4] },
  { key: "hardening", label: "Hardening", mastery: values[5] },
];

export const demoLearner: Learner = {
  id: "me",
  displayName: "Sudhanshu Dahiya",
  handle: "forge_sudh",
  email: "sudhanshu@example.com",
  initials: "SD",
  rank: "Operator",
  level: 7,
  xp: 4820,
  xpToNextLevel: 6000,
  currentStreak: 12,
  longestStreak: 21,
  labsCompleted: 34,
  challengesCompleted: 58,
  skills: skills([82, 74, 61, 48, 57, 39]),
  personalBests: [
    { id: "pb1", label: "Fastest permissions lab", value: "3m 12s", detail: "Lab 04 · no hints" },
    { id: "pb2", label: "Longest clean streak", value: "21 days", detail: "Feb 2026" },
    { id: "pb3", label: "Best daily challenge score", value: "96 / 100", detail: "First attempt" },
  ],
  recentBadges: [
    { id: "b1", label: "Permission Surgeon", earnedAt: "2 days ago" },
    { id: "b2", label: "Streak Keeper", earnedAt: "1 week ago" },
    { id: "b3", label: "Log Reader", earnedAt: "2 weeks ago" },
  ],
  goal: "Run a hardened Linux server confidently by June",
  path: "Linux Foundations → Defensive Hardening",
  tutorLanguage: "Mix (auto)",
  joinedAt: "Jan 2026",
  location: "Delhi, India",
  bio: "Learning Linux properly this time — filesystem to hardening, one lab a day.",
};

export const demoFriends: Learner[] = [
  {
    ...demoLearner,
    id: "f1",
    displayName: "Aarav Mehta",
    handle: "aarav_ops",
    email: "hidden",
    initials: "AM",
    rank: "Engineer",
    level: 11,
    xp: 8140,
    xpToNextLevel: 9000,
    currentStreak: 24,
    longestStreak: 31,
    labsCompleted: 62,
    challengesCompleted: 97,
    skills: skills([91, 88, 79, 72, 68, 64]),
    personalBests: [
      { id: "pb1", label: "Fastest permissions lab", value: "2m 41s", detail: "No hints" },
      { id: "pb2", label: "Longest clean streak", value: "31 days", detail: "Mar 2026" },
      { id: "pb3", label: "Best daily challenge score", value: "99 / 100", detail: "First attempt" },
    ],
    goal: "SOC analyst fundamentals",
    path: "Defensive Hardening",
    joinedAt: "Nov 2025",
  },
  {
    ...demoLearner,
    id: "f2",
    displayName: "Neha Kapoor",
    handle: "neha_shell",
    email: "hidden",
    initials: "NK",
    rank: "Operator",
    level: 8,
    xp: 5210,
    xpToNextLevel: 6000,
    currentStreak: 9,
    longestStreak: 15,
    labsCompleted: 41,
    challengesCompleted: 63,
    skills: skills([78, 71, 69, 52, 74, 44]),
    personalBests: [
      { id: "pb1", label: "Fastest permissions lab", value: "3m 05s", detail: "1 hint" },
      { id: "pb2", label: "Longest clean streak", value: "15 days", detail: "Feb 2026" },
      { id: "pb3", label: "Best daily challenge score", value: "92 / 100", detail: "Second attempt" },
    ],
    goal: "Automate everything with bash",
    path: "Shell Scripting",
    joinedAt: "Dec 2025",
  },
  {
    ...demoLearner,
    id: "f3",
    displayName: "Rohit Verma",
    handle: "rohit_grep",
    email: "hidden",
    initials: "RV",
    rank: "Recruit",
    level: 4,
    xp: 2110,
    xpToNextLevel: 3000,
    currentStreak: 3,
    longestStreak: 7,
    labsCompleted: 12,
    challengesCompleted: 19,
    skills: skills([54, 43, 38, 27, 31, 18]),
    personalBests: [
      { id: "pb1", label: "Fastest permissions lab", value: "6m 20s", detail: "2 hints" },
      { id: "pb2", label: "Longest clean streak", value: "7 days", detail: "Mar 2026" },
      { id: "pb3", label: "Best daily challenge score", value: "74 / 100", detail: "Third attempt" },
    ],
    goal: "Get comfortable in the terminal",
    path: "Linux Foundations",
    joinedAt: "Feb 2026",
  },
];

export const demoRequests: FriendRequest[] = [
  {
    id: "r1",
    direction: "incoming",
    sentAt: "2 hours ago",
    learner: { id: "u9", displayName: "Isha Rana", handle: "isha_root", initials: "IR", rank: "Operator", xp: 4460 },
  },
  {
    id: "r2",
    direction: "incoming",
    sentAt: "yesterday",
    learner: { id: "u12", displayName: "Kabir Singh", handle: "kabir_sudo", initials: "KS", rank: "Recruit", xp: 1780 },
  },
  {
    id: "r3",
    direction: "outgoing",
    sentAt: "3 days ago",
    learner: { id: "u21", displayName: "Meera Iyer", handle: "meera_net", initials: "MI", rank: "Engineer", xp: 7320 },
  },
];

export const searchDirectory: FriendRequest["learner"][] = [
  { id: "u30", displayName: "Ananya Bose", handle: "ananya_bash", initials: "AB", rank: "Operator", xp: 5030 },
  { id: "u31", displayName: "Dev Patel", handle: "dev_chmod", initials: "DP", rank: "Recruit", xp: 1420 },
  { id: "u32", displayName: "Farhan Ali", handle: "farhan_ufw", initials: "FA", rank: "Engineer", xp: 7890 },
  { id: "u33", displayName: "Simran Kaur", handle: "simran_logs", initials: "SK", rank: "Operator", xp: 4610 },
];

export const dailyChallenge: DailyChallenge = {
  id: "dc-2026-03-14",
  title: "Repair a broken sudoers permission chain",
  focus: "Permissions",
  difficulty: "Core",
  scope: "Sandboxed lab",
};

export const dailyResults: Record<string, ChallengeResult> = {
  me: {
    challengeId: dailyChallenge.id,
    title: dailyChallenge.title,
    score: 88,
    completionTime: 412,
    attempts: 2,
    hintsUsed: 1,
    completedAt: "Today, 09:14",
  },
  f1: {
    challengeId: dailyChallenge.id,
    title: dailyChallenge.title,
    score: 96,
    completionTime: 305,
    attempts: 1,
    hintsUsed: 0,
    completedAt: "Today, 07:02",
  },
  f2: {
    challengeId: dailyChallenge.id,
    title: dailyChallenge.title,
    score: 84,
    completionTime: 468,
    attempts: 2,
    hintsUsed: 2,
    completedAt: "Today, 08:40",
  },
  f3: {
    challengeId: dailyChallenge.id,
    title: dailyChallenge.title,
    score: 61,
    completionTime: 690,
    attempts: 3,
    hintsUsed: 3,
    completedAt: "Today, 10:26",
  },
};

/* ---------- Services (swap bodies for real API calls later) ---------- */

const latency = (ms = 550) => new Promise((r) => setTimeout(r, ms));

export async function getLearnerService(): Promise<Learner> {
  await latency(400);
  return demoLearner;
}

export async function getSquadService(): Promise<{ friends: Learner[]; requests: FriendRequest[] }> {
  await latency();
  return { friends: demoFriends, requests: demoRequests };
}

export async function searchLearnersService(query: string): Promise<FriendRequest["learner"][]> {
  await latency(350);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return searchDirectory.filter(
    (l) => l.displayName.toLowerCase().includes(q) || l.handle.toLowerCase().includes(q),
  );
}

/* ---------- Tiny async state hook (mirrors a future query hook) ---------- */

export type AsyncState<T> = {
  data: T | undefined;
  status: "loading" | "success" | "error";
  error?: string;
  reload: () => void;
};

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [status, setStatus] = useState<AsyncState<T>["status"]>("loading");
  const [error, setError] = useState<string | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setError(undefined);
    fn()
      .then((res) => {
        if (!alive) return;
        setData(res);
        setStatus("success");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { data, status, error, reload: () => setNonce((n) => n + 1) };
}
