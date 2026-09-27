import { describe, expect, it } from "vitest";
import {
  buildMissionLevels,
  getMissionCurriculumEntry,
  levelForChallengeId,
  MISSION_LEVEL_COUNT,
  MISSION_TOPICS,
  PUBLISHED_MISSION_CURRICULUM,
  topicForChallengeId,
} from "./mission-curriculum";

const contracts = [
  { id: "C01", order: 1, title: "Claim your workspace" },
  { id: "C02", order: 2, title: "Somewhere to keep the noise" },
  { id: "C03", order: 3, title: "The first log file" },
  { id: "C04", order: 4, title: "Rotate without repeating yourself" },
  { id: "C05", order: 5, title: "Lock down the logs" },
];

describe("mission curriculum", () => {
  it("has seven independent topics with fifty levels", () => {
    expect(MISSION_TOPICS).toHaveLength(7);

    for (const topic of MISSION_TOPICS) {
      expect(buildMissionLevels(topic.id, contracts)).toHaveLength(
        MISSION_LEVEL_COUNT,
      );
    }
  });

  it("places the existing executable missions explicitly", () => {
    expect(getMissionCurriculumEntry("linux-foundations", 1)?.challengeId).toBe(
      "C01",
    );
    expect(getMissionCurriculumEntry("linux-foundations", 2)?.challengeId).toBe(
      "C02",
    );
    expect(getMissionCurriculumEntry("linux-foundations", 3)?.challengeId).toBe(
      "C03",
    );
    expect(getMissionCurriculumEntry("linux-foundations", 4)?.challengeId).toBe(
      "C04",
    );

    expect(topicForChallengeId("C01")).toBe("linux-foundations");
    expect(levelForChallengeId("C01")).toBe(1);
    expect(topicForChallengeId("C04")).toBe("linux-foundations");
    expect(levelForChallengeId("C04")).toBe(4);
  });

  it("does not leak a contract into another topic through shared skills or order", () => {
    const permissions = buildMissionLevels("users-permissions", contracts);
    const bash = buildMissionLevels("bash", contracts);
    const networking = buildMissionLevels("networking", contracts);

    expect(permissions[0]?.challengeId).toBe("C06");
    expect(bash[0]?.challengeId).toBe("C07");
    expect(networking[0]?.challengeId).toBe("C09");

    expect(permissions.slice(1).every((level) => !level.challengeId)).toBe(true);
    expect(bash.slice(1).every((level) => !level.challengeId)).toBe(true);
    expect(networking.slice(1).every((level) => !level.challengeId)).toBe(true);

    expect(PUBLISHED_MISSION_CURRICULUM).not.toContainEqual({
      topicId: "users-permissions",
      level: 1,
      challengeId: "C05",
    });
  });

  it("keeps unpublished levels real rather than inventing challenge ids", () => {
    const levels = buildMissionLevels("linux-foundations", contracts);

    expect(levels[0]).toMatchObject({
      level: 1,
      challengeId: "C01",
      published: true,
    });

    expect(levels[3]).toMatchObject({
      level: 4,
      challengeId: "C04",
      published: true,
    });

    expect(levels[4]).toMatchObject({
      level: 5,
      challengeId: null,
      published: false,
    });

    expect(levels[49]).toMatchObject({
      level: 50,
      challengeId: null,
      published: false,
    });
  });
});
