import type { SkillId } from "./types";

export type MissionMode = "levels" | "infinity";

export type MissionTopicId =
  | "linux-foundations"
  | "users-permissions"
  | "bash"
  | "processes"
  | "networking"
  | "system-administration"
  | "kali-security";

export type MissionTopic = {
  id: MissionTopicId;
  name: string;
  description: string;
  skills: string[];
};

export type MissionCurriculumEntry = {
  topicId: MissionTopicId;
  level: number;
  challengeId: string | null;
};

export const MISSION_TOPICS: readonly MissionTopic[] = [
  {
    id: "linux-foundations",
    name: "Linux Foundations",
    description: "Filesystem, shell fundamentals and the core Linux workflow.",
    skills: ["filesystem", "iteration", "shell-scripting"],
  },
  {
    id: "users-permissions",
    name: "Users & Permissions",
    description: "Users, groups, ownership and Linux permissions.",
    skills: ["permissions", "hardening"],
  },
  {
    id: "bash",
    name: "Bash & Automation",
    description: "Bash scripting, loops, variables and automation.",
    skills: ["iteration", "shell-scripting"],
  },
  {
    id: "processes",
    name: "Processes & Services",
    description: "Processes, jobs, services and system activity.",
    skills: ["processes"],
  },
  {
    id: "networking",
    name: "Networking",
    description: "Linux networking, connectivity and network diagnostics.",
    skills: ["networking"],
  },
  {
    id: "system-administration",
    name: "System Administration",
    description: "Practical administration across filesystem, processes and security.",
    skills: ["filesystem", "processes", "permissions", "hardening"],
  },
  {
    id: "kali-security",
    name: "Kali & Security",
    description: "Kali Linux and practical cybersecurity fundamentals.",
    skills: ["networking", "hardening", "processes"],
  },
];

/**
 * Static curriculum placement is deliberately explicit.
 *
 * Skills are used by the learner/AI systems for mastery and adaptation;
 * they are NOT used to decide which topic owns a mission.
 *
 * Only missions with real executable contracts are published here.
 * Unpublished levels remain visible in the progression map but have no
 * challengeId and therefore cannot be launched as fake missions.
 */
export const PUBLISHED_MISSION_CURRICULUM: readonly MissionCurriculumEntry[] = [
  { topicId: "linux-foundations", level: 1, challengeId: "C01" },
  { topicId: "linux-foundations", level: 2, challengeId: "C02" },
  { topicId: "linux-foundations", level: 3, challengeId: "C03" },
  { topicId: "linux-foundations", level: 4, challengeId: "C04" },
  { topicId: "users-permissions", level: 1, challengeId: "C06" },
  { topicId: "bash", level: 1, challengeId: "C07" },
  { topicId: "processes", level: 1, challengeId: "C08" },
  { topicId: "networking", level: 1, challengeId: "C09" },
  { topicId: "system-administration", level: 1, challengeId: "C10" },
  { topicId: "kali-security", level: 1, challengeId: "C11" },
];

export const MISSION_LEVEL_COUNT = 50;

export function buildMissionLevels(
  topicId: MissionTopicId,
  published: readonly {
    id: string;
    order: number;
    title: string;
    objective?: string;
  }[] = [],
) {
  const byChallengeId = new Map(
    published.map((challenge) => [challenge.id, challenge]),
  );

  const placement = new Map(
    PUBLISHED_MISSION_CURRICULUM
      .filter((entry) => entry.topicId === topicId)
      .map((entry) => [entry.level, entry]),
  );

  return Array.from({ length: MISSION_LEVEL_COUNT }, (_, index) => {
    const level = index + 1;
    const curriculum = placement.get(level);

    const challenge = curriculum?.challengeId
      ? byChallengeId.get(curriculum.challengeId)
      : undefined;

    return {
      level,
      challengeId: curriculum?.challengeId ?? null,
      title: challenge?.title ?? `Level ${level}`,
      objective:
        challenge?.objective ??
        (curriculum?.challengeId
          ? "Complete the published mission and satisfy its deterministic verifier."
          : "This curriculum level is being prepared and is not launchable yet."),
      published: Boolean(curriculum?.challengeId && challenge),
    };
  });
}

export function getMissionCurriculumEntry(
  topicId: MissionTopicId,
  level: number,
): MissionCurriculumEntry | undefined {
  return PUBLISHED_MISSION_CURRICULUM.find(
    (entry) => entry.topicId === topicId && entry.level === level,
  );
}

export function topicForChallengeId(
  challengeId: string,
): MissionTopicId | undefined {
  return PUBLISHED_MISSION_CURRICULUM.find(
    (entry) => entry.challengeId === challengeId,
  )?.topicId;
}

export function levelForChallengeId(
  challengeId: string,
): number | undefined {
  return PUBLISHED_MISSION_CURRICULUM.find(
    (entry) => entry.challengeId === challengeId,
  )?.level;
}

/**
 * Topic inference is retained only as a compatibility helper for callers
 * that need a best-effort skill label. It is NOT used for curriculum
 * placement.
 */
export function topicForSkills(skills: readonly string[]): MissionTopicId {
  if (skills.includes("networking")) return "networking";
  if (skills.includes("processes")) return "processes";
  if (skills.includes("permissions") || skills.includes("hardening")) {
    return "users-permissions";
  }
  if (skills.includes("iteration") || skills.includes("shell-scripting")) {
    return "linux-foundations";
  }
  return "linux-foundations";
}
