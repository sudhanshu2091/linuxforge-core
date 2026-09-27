import type { Squad } from "./types";

export function createSquad(ownerId: string, name: string, squadId = crypto.randomUUID()): Squad {
  const now = new Date().toISOString();
  return {
    squadId,
    name: name.trim().slice(0, 80),
    ownerId,
    members: [{ userId: ownerId, role: "OWNER", joinedAt: now }],
  };
}

export function addSquadMember(squad: Squad, userId: string): Squad {
  if (squad.members.some((member) => member.userId === userId)) return squad;
  return {
    ...squad,
    members: [...squad.members, { userId, role: "MEMBER", joinedAt: new Date().toISOString() }],
  };
}

export function removeSquadMember(squad: Squad, userId: string): Squad {
  if (userId === squad.ownerId) throw new Error("Squad owner cannot be removed.");
  return {
    ...squad,
    members: squad.members.filter((member) => member.userId !== userId),
  };
}
