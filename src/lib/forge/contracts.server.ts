/**
 * Challenge contracts (server-only).
 *
 * Verification rules, hint ladders and remediation live here so solutions are
 * never shipped in the browser bundle. The learner-facing subset is projected
 * into `ChallengeBrief` by the engine.
 */

import type { MethodEvidence, World } from "./executor.server";
import type { ChallengeBrief, LearnerContext, ObjectiveResult, SkillId } from "./types";

export type VerifyOutcome = {
  objectives: ObjectiveResult[];
  /** The required skill was actually exercised (not bypassed). */
  skillDemonstrated: boolean;
  /** Skill applied competently but to the wrong target/end state. */
  skillAppliedToWrongTarget?: boolean;
};

export type Contract = {
  id: string;
  order: number;
  title: string;
  storyIntro: string;
  objective: string;
  requiredSkills: SkillId[];
  allowedApproaches: string[];
  bannedShortcuts: string[];
  difficulty: number;
  prerequisites: string[];
  previousReferences: string[];
  contextRequirements: (keyof LearnerContext)[];
  xpReward: number;
  /** Progressive hints: concept → direction → command → near solution → solution. */
  hints: string[];
  successStory: string;
  failureStory: string;
  remediation: string[];
  verify: (world: World, evidence: MethodEvidence) => VerifyOutcome;
};

const dir = (world: World, path: string) => {
  const o = world.get(path);
  return o && o.objectType === "directory" && o.active !== false ? o : undefined;
};
const file = (world: World, path: string) => {
  const o = world.get(path);
  return o && o.objectType === "file" ? o : undefined;
};

export const CONTRACTS: Contract[] = [
  {
    id: "C01",
    order: 1,
    title: "Claim your workspace",
    storyIntro:
      "You have just joined the Forge crew. Before anything else, every operator carves out their own project space on the box — that folder becomes the home of everything you build in this story.",
    objective: "Create a directory named project in your home directory.",
    requiredSkills: ["filesystem"],
    allowedApproaches: ["mkdir project", "mkdir ~/project", "mkdir -p project"],
    bannedShortcuts: ["Asking the tutor to type the answer before you try once"],
    difficulty: 1,
    prerequisites: [],
    previousReferences: [],
    contextRequirements: ["learner_level", "current_lab_state", "desired_difficulty"],
    xpReward: 120,
    hints: [
      "A directory is just a labelled container in the filesystem. You need one, at the top of your home directory.",
      "There is a single command whose whole job is making directories. Think 'make directory'.",
      "The command is mkdir. It takes the name of the directory you want as its argument.",
      "You want: mkdir followed by the name project, run from your home directory.",
      "Run: mkdir project — then confirm it with ls.",
    ],
    successStory: "Your workspace exists. From here on, everything the crew asks for lives inside project/.",
    failureStory: "Nothing named project sits in your home directory yet, so the crew has nowhere to put your work.",
    remediation: ["Run pwd to confirm you are in your home directory, then create the directory and verify with ls."],
    verify(world, evidence) {
      const target = dir(world, "project");
      return {
        objectives: [
          {
            label: "project exists as a directory in home",
            met: Boolean(target),
            evidence: target
              ? `project is a directory at /home/learner/project, permissions ${target.permissions}`
              : "no directory named project found in /home/learner",
          },
        ],
        skillDemonstrated: evidence.commands.some((c) => /^mkdir\b/.test(c)) || Boolean(target),
      };
    },
  },
  {
    id: "C02",
    order: 2,
    title: "Somewhere to keep the noise",
    storyIntro:
      "Your first service is about to start writing output. The crew keeps logs out of the way, in their own folder inside the project you just created.",
    objective: "Create a directory named logs inside project.",
    requiredSkills: ["filesystem"],
    allowedApproaches: ["mkdir project/logs", "cd project && mkdir logs", "mkdir -p project/logs"],
    bannedShortcuts: ["Creating logs somewhere other than inside project"],
    difficulty: 1,
    prerequisites: ["C01"],
    previousReferences: ["C01"],
    contextRequirements: ["relevant_previous_objects", "current_lab_state", "prerequisites"],
    xpReward: 140,
    hints: [
      "Directories nest. logs belongs inside the project directory you already own, not beside it.",
      "You can either move into project first, or name the nested path in one go.",
      "mkdir accepts a path, not just a name: parent/child.",
      "You want mkdir with the path project/logs (or cd project, then mkdir logs).",
      "Run: mkdir project/logs — then ls project to confirm.",
    ],
    successStory: "logs/ now lives inside your project. The service has somewhere to write.",
    failureStory: "There is no logs directory inside project yet.",
    remediation: ["Check ls project to see what is actually inside your project directory."],
    verify(world, evidence) {
      const target = dir(world, "project/logs");
      const strayLogs = !target && Boolean(dir(world, "logs"));
      return {
        objectives: [
          {
            label: "project/logs exists as a directory",
            met: Boolean(target),
            evidence: target
              ? `logs is a directory at /home/learner/project/logs, created during ${target.createdByChallenge ?? "this mission"}`
              : strayLogs
                ? "a logs directory exists, but at /home/learner/logs — outside project"
                : "no logs directory found inside project",
          },
        ],
        skillDemonstrated: evidence.commands.some((c) => /^mkdir\b/.test(c)) || Boolean(target),
        skillAppliedToWrongTarget: strayLogs,
      };
    },
  },
  {
    id: "C03",
    order: 3,
    title: "The first log file",
    storyIntro:
      "The service needs somewhere to record failures. The crew always looks for the same filename first, so get it exactly right.",
    objective: "Create an empty file named error.log inside project/logs.",
    requiredSkills: ["filesystem"],
    allowedApproaches: ["touch project/logs/error.log", "cd project/logs && touch error.log", "> redirection into the file"],
    bannedShortcuts: ["Naming it errors.log, error.txt or log.error"],
    difficulty: 2,
    prerequisites: ["C02"],
    previousReferences: ["C01", "C02"],
    contextRequirements: ["relevant_previous_objects", "relevant_story_events", "current_lab_state"],
    xpReward: 160,
    hints: [
      "An empty file is still a real object in the filesystem — it can exist with no content at all.",
      "There is a command that creates an empty file (or updates its timestamp if it already exists).",
      "The command is touch, and it takes the path of the file you want.",
      "You want touch with the path project/logs/error.log.",
      "Run: touch project/logs/error.log — then ls -l project/logs to confirm.",
    ],
    successStory: "error.log is in place inside the logs directory you built. The service has a place to fail loudly.",
    failureStory: "error.log is not sitting inside project/logs yet.",
    remediation: ["Filenames are exact and case sensitive. ls project/logs shows what you actually created."],
    verify(world, evidence) {
      const target = file(world, "project/logs/error.log");
      const nearMiss = [...world.values()].find(
        (o) => o.objectType === "file" && !target && /error|log/i.test(o.name) && o.path !== "project/logs/error.log",
      );
      return {
        objectives: [
          {
            label: "project/logs/error.log exists as a file",
            met: Boolean(target),
            evidence: target
              ? `error.log is a file at /home/learner/project/logs/error.log, permissions ${target.permissions}`
              : nearMiss
                ? `closest match found is ${nearMiss.path} — not project/logs/error.log`
                : "no error.log found inside project/logs",
          },
        ],
        skillDemonstrated: evidence.commands.some((c) => /^(touch|echo)\b/.test(c)) || Boolean(target),
        skillAppliedToWrongTarget: Boolean(nearMiss),
      };
    },
  },
  {
    id: "C04",
    order: 4,
    title: "Rotate without repeating yourself",
    storyIntro:
      "Ops wants five rotated log slots ready before the next deploy. Typing the same command five times is not how the crew works — the shell can repeat for you.",
    objective: "Create app1.log through app5.log inside project/logs using a shell loop.",
    requiredSkills: ["iteration", "shell-scripting"],
    allowedApproaches: [
      "for i in 1 2 3 4 5; do touch project/logs/app$i.log; done",
      "for i in {1..5}; do touch project/logs/app$i.log; done",
      "for i in $(seq 1 5); do touch project/logs/app$i.log; done",
    ],
    bannedShortcuts: ["Typing touch five separate times — the end state would be right, the skill would not be shown"],
    difficulty: 3,
    prerequisites: ["C03"],
    previousReferences: ["C03"],
    contextRequirements: ["current_mastery", "weak_skills", "recent_mistakes", "desired_difficulty"],
    xpReward: 220,
    hints: [
      "When the same operation repeats with only one value changing, that value is a variable and the repetition is a loop.",
      "A loop needs three things: a variable, a list of values, and a body that runs once per value.",
      "In bash: for VAR in LIST; do COMMAND; done — and $VAR inside the body holds the current value.",
      "Your list is the numbers 1 to 5 and your body is a touch on project/logs/app$i.log.",
      "Run: for i in 1 2 3 4 5; do touch project/logs/app$i.log; done — {1..5} and $(seq 1 5) work as the list too.",
    ],
    successStory: "Five rotated slots, one instruction. That is the difference between using a shell and typing at it.",
    failureStory: "The five rotated log files are not all in place yet.",
    remediation: [
      "Check ls project/logs for the exact filenames app1.log … app5.log.",
      "If the files exist but you typed each one, redo it as a single for loop — this mission scores the loop, not the files.",
    ],
    verify(world, evidence) {
      const expected = [1, 2, 3, 4, 5].map((i) => `project/logs/app${i}.log`);
      const present = expected.filter((p) => file(world, p));
      return {
        objectives: [
          {
            label: "app1.log … app5.log exist inside project/logs",
            met: present.length === expected.length,
            evidence:
              present.length === expected.length
                ? "all five rotated log files exist in /home/learner/project/logs"
                : `${present.length} of 5 rotated log files found (${present.map((p) => p.split("/").pop()).join(", ") || "none"})`,
          },
          {
            label: "the files were created with a loop",
            met: evidence.usedLoop,
            evidence: evidence.usedLoop
              ? "a for loop was used, so the repetition was expressed once"
              : `${evidence.invocations} separate command${evidence.invocations === 1 ? "" : "s"} recorded, no loop construct`,
          },
        ],
        skillDemonstrated: evidence.usedLoop,
      };
    },
  },
  {
    id: "C05",
    order: 5,
    title: "Lock down the logs",
    storyIntro:
      "An audit lands next week. Those logs you created back at the start of the story are readable by anyone with an account on this box. Go back to the same logs directory you built and secure it properly.",
    objective: "Set project/logs to 750 and project/logs/error.log to 640.",
    requiredSkills: ["permissions", "hardening"],
    allowedApproaches: [
      "chmod 750 project/logs and chmod 640 project/logs/error.log",
      "Symbolic equivalents such as chmod g-w,o-rwx project/logs",
    ],
    bannedShortcuts: ["chmod 777 anything — world-writable is blocked by lab safety policy"],
    difficulty: 3,
    prerequisites: ["C03"],
    previousReferences: ["C02", "C03"],
    contextRequirements: [
      "relevant_previous_objects",
      "relevant_story_events",
      "current_lab_state",
      "current_mastery",
      "prerequisites",
    ],
    xpReward: 240,
    hints: [
      "Permissions answer three questions at once: what may the owner do, the group do, and everyone else do?",
      "Least privilege means others should get nothing here, and the group only what it truly needs.",
      "chmod sets the mode. Numerically each digit is owner, group, others, where read=4, write=2, execute=1.",
      "A directory needs execute to be entered, so 750 on the directory; the log itself only needs reading, so 640.",
      "Run: chmod 750 project/logs and chmod 640 project/logs/error.log — confirm with ls -l project.",
    ],
    successStory: "The directory you built in the opening act is now the tightest thing in your workspace. That is hardening.",
    failureStory: "project/logs or its error.log is still more open than the audit will allow.",
    remediation: [
      "ls -l project shows the directory mode; ls -l project/logs shows the file mode.",
      "Remember the execute bit on a directory means 'may enter', not 'may run'.",
    ],
    verify(world, evidence) {
      const logsDir = dir(world, "project/logs");
      const errorLog = file(world, "project/logs/error.log");
      const usedChmod = evidence.commands.some((c) => /^chmod\b/.test(c));
      const dirOk = logsDir?.permissions === "750";
      const fileOk = errorLog?.permissions === "640";
      return {
        objectives: [
          {
            label: "project/logs is set to 750",
            met: Boolean(dirOk),
            evidence: logsDir
              ? `project/logs currently has permissions ${logsDir.permissions} (created during ${logsDir.createdByChallenge ?? "an earlier mission"})`
              : "project/logs does not exist — it was expected from mission C02",
          },
          {
            label: "project/logs/error.log is set to 640",
            met: Boolean(fileOk),
            evidence: errorLog
              ? `error.log currently has permissions ${errorLog.permissions} (created during ${errorLog.createdByChallenge ?? "an earlier mission"})`
              : "project/logs/error.log does not exist — it was expected from mission C03",
          },
        ],
        skillDemonstrated: usedChmod || Boolean(dirOk && fileOk),
        skillAppliedToWrongTarget: usedChmod && !(dirOk && fileOk),
      };
    },
  },
];

export const contractById = (id: string) => CONTRACTS.find((c) => c.id === id);

export const toBrief = (c: Contract): ChallengeBrief => ({
  id: c.id,
  order: c.order,
  title: c.title,
  storyIntro: c.storyIntro,
  objective: c.objective,
  requiredSkills: c.requiredSkills,
  allowedApproaches: c.allowedApproaches,
  bannedShortcuts: c.bannedShortcuts,
  difficulty: c.difficulty,
  prerequisites: c.prerequisites,
  previousReferences: c.previousReferences,
  xpReward: c.xpReward,
  hintLevels: c.hints.length,
});
