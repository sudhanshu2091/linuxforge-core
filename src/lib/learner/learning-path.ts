import type { SkillId, MissionState } from "@/lib/forge/types";

export type LearningTrack = {
  id: string;
  name: string;
  description: string;
  level: string;
  skills: SkillId[];
  challengeIds: string[];
};

export type LearningPathView = LearningTrack & {
  completed: number;
  total: number;
  progress: number;
  currentChallengeId: string | null;
};

export const LEARNING_TRACKS: LearningTrack[] = [
  {
    id: "linux",
    name: "Linux Foundations",
    description: "Filesystem, paths, files and permissions.",
    level: "Recruit",
    skills: ["filesystem", "permissions"],
    challengeIds: ["C01", "C02", "C03", "C05"],
  },
  {
    id: "shell",
    name: "Shell & Scripting",
    description: "Turn repetitive command work into reliable shell instructions.",
    level: "Operator",
    skills: ["iteration", "shell-scripting"],
    challengeIds: ["C04"],
  },
  {
    id: "networking",
    name: "Networking Essentials",
    description: "Build the networking branch next from the same evidence-driven model.",
    level: "Operator",
    skills: ["networking"],
    challengeIds: [],
  },
  {
    id: "security",
    name: "System Hardening",
    description: "Least privilege, secure defaults and defensive configuration.",
    level: "Specialist",
    skills: ["hardening"],
    challengeIds: ["C05"],
  },
  {
    id: "processes",
    name: "Processes & Operations",
    description: "Understand processes, jobs, signals and service behavior.",
    level: "Specialist",
    skills: ["processes"],
    challengeIds: [],
  },
];

export function buildLearningPath(catalogue: MissionState["catalogue"]): LearningPathView[] {
  return LEARNING_TRACKS.map((track) => {
    const entries = track.challengeIds
      .map((id) => catalogue.find((item) => item.id === id))
      .filter(Boolean);
    const completed = entries.filter((item) => item?.attempt?.status === "COMPLETE").length;
    const current =
      entries.find((item) => item?.unlocked && item?.attempt?.status !== "COMPLETE")?.id ?? null;
    return {
      ...track,
      completed,
      total: entries.length,
      progress: entries.length ? Math.round((completed / entries.length) * 100) : 0,
      currentChallengeId: current,
    };
  });
}

export function nextLearningChallenge(catalogue: MissionState["catalogue"]): string | null {
  return (
    buildLearningPath(catalogue).find((track) => track.currentChallengeId)?.currentChallengeId ??
    null
  );
}
